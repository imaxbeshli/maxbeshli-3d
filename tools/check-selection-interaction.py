"""Home parallax, frozen selection, touch water wakes and live boat navigation."""
from pathlib import Path
import functools,http.server,threading
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
STILL='''()=>{
 const m=__MB;m.camera.updateMatrixWorld(true);m.scene.updateMatrixWorld(true);
 return {camera:m.camera.position.toArray(),rotation:m.camera.quaternion.toArray(),
 rocks:m.rocks.map(r=>[...r.position.toArray(),...r.position.clone().project(m.camera).toArray()]),
 backdrop:[...m.backdrop.position.toArray(),...m.backdrop.scale.toArray()]};
}'''
CENTER='''()=>{
 const m=__MB,i=m.state.phase==='orbit'?m.state.activeIndex:m.state.selectedIndex;
 m.camera.updateMatrixWorld(true);m.scene.updateMatrixWorld(true);
 const c=m.slateObjects[i].holder.getWorldPosition(new THREE.Vector3()).project(m.camera);
 return [(c.x+1)*innerWidth/2,(1-c.y)*innerHeight/2];
}'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    for mobile in [False,True]:
        width,height=(400,680) if mobile else (1280,800)
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=.5,is_mobile=mobile,has_touch=mobile)
        page=context.new_page();page.set_default_timeout(120000)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('https://fonts.**',lambda r:r.abort())
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
        page.wait_for_function('window.__MB && MBLoading.ready')
        if mobile:page.locator('#loaderBtn').tap()
        else:page.locator('#loaderBtn').click()
        page.wait_for_function("__MB.state.phase==='orbit'")
        def pointer_sweep():
            for x,y in [(15,85),(width-15,height-100),(width-15,85),(15,height-100),(width/2,height/2)]:
                page.mouse.move(x,y);page.wait_for_timeout(120)
        before=page.evaluate(STILL);pointer_sweep()
        after=page.evaluate(STILL)
        assert after['camera']!=before['camera'] and after['rocks']!=before['rocks'],'Home parallax is disabled'
        # Select the card through the real pointer/touch handler.
        xy=page.evaluate(CENTER);page.mouse.move(*xy);page.wait_for_timeout(250)
        xy=page.evaluate(CENTER)
        if mobile:page.touchscreen.tap(*xy)
        else:page.mouse.click(*xy)
        if page.evaluate("__MB.state.phase==='focusing'"):
            rocks=page.evaluate('__MB.rocks.map(r=>r.position.toArray())')
            page.mouse.move(15,85);page.wait_for_timeout(100)
            assert page.evaluate('__MB.rocks.map(r=>r.position.toArray())')==rocks,'Parallax changes during approach'
        page.wait_for_function("__MB.state.phase==='focused'")
        before=page.evaluate(STILL);boat=page.evaluate('__MB.lanternBoat.state.elapsed')
        pointer_sweep()
        # Find visible water rather than stamping through the card or rock.
        points=page.evaluate('''()=>{
          const m=__MB,points=[];m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);
          const blockers=[...hitMeshes,...m.rocks],ray=new THREE.Raycaster();
          for(const y of [.65,.75,.85,.93])for(const x of [.1,.25,.5,.75,.9]){
            const px=x*innerWidth,py=y*innerHeight;if(document.elementFromPoint(px,py)!==canvas)continue;
            ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),m.camera);
            const waterHit=ray.intersectObject(m.water.mesh)[0],block=ray.intersectObjects(blockers,true)[0];
            if(waterHit&&(!block||block.distance>waterHit.distance))points.push([px,py]);
          }
          return points;
        }''')
        assert len(points)>=2,points
        stamps=page.evaluate('__MB.water.ripples.map(r=>r.toArray())')
        t=page.evaluate('__MB.water.material.uniforms.uTime.value')
        page.wait_for_function('t=>__MB.water.material.uniforms.uTime.value>t+.35',arg=t)
        first,last=points[0],points[-1]
        if mobile:
            cdp=context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':first[0],'y':first[1]}]})
            for step in [.25,.5,.75,1]:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':first[0]+(last[0]-first[0])*step,'y':first[1]+(last[1]-first[1])*step}]})
                page.wait_for_timeout(120)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else:
            page.mouse.move(*first);page.mouse.down();page.mouse.move(*last,steps=6);page.mouse.up()
        assert page.evaluate('__MB.water.ripples.map(r=>r.toArray())')!=stamps,'Water touch wakes disabled after selection'
        assert page.evaluate(STILL)==before,'Scene follows the pointer after selection'
        assert page.evaluate("__MB.state.phase==='focused' && __MB.state.selectedIndex===0")
        page.wait_for_function('t=>__MB.lanternBoat.state.elapsed>t+.2',arg=boat)
        xy=page.evaluate(CENTER)
        if mobile:page.touchscreen.tap(*xy)
        else:page.mouse.click(*xy)
        page.wait_for_function("__MB.state.phase==='section'")
        page.locator('#modalCloseBtn').click();page.wait_for_function("__MB.state.phase==='focused'")
        page.locator('#webgl-canvas').focus();page.keyboard.press('Escape')
        page.evaluate('mouseX=mouseY=0')
        page.wait_for_function("__MB.state.phase==='orbit' && __MB.state.zoomFactor<.001 && camera.position.distanceTo(BASE_CAM_POS)<.002")
        home=page.evaluate(STILL);pointer_sweep();assert page.evaluate(STILL)!=home,'Home parallax did not resume'
        # The intentional carousel controls are still available.
        previous=page.evaluate('__MB.state.targetProgress');page.keyboard.press('ArrowRight')
        page.wait_for_function('p=>__MB.state.targetProgress>p+.5',arg=previous)
        assert not errors,errors
        print(f'PASS {"mobile" if mobile else "desktop"}: home parallax resumes; selection stays fixed, water strokes work, boat moves, section entry/return and carousel work',flush=True)
        context.close()
    browser.close()
server.shutdown()
