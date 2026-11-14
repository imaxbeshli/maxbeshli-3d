"""Portrait composition, text clearance, responsive focus and section return."""
from pathlib import Path
import functools,http.server,threading
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BOUNDS='''()=>{
 const m=__MB;m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);
 const tiles=m.slateObjects.map(o=>{
  const mesh=o.holder.children[0];mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,points=[];
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
   const p=new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(m.camera);
   points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});
  }
  const c=o.holder.getWorldPosition(new THREE.Vector3()).project(m.camera);
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),x:(c.x+1)*innerWidth/2,y:(1-c.y)*innerHeight/2};
 });
 return {tiles,textBottom:heroLeft.getBoundingClientRect().bottom,textTop:heroLeft.getBoundingClientRect().top,headerBottom:mainHeader.getBoundingClientRect().bottom,scale:orbitGroup.scale.x,origin:orbitGroup.position.toArray()};
}'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':400,'height':680},device_scale_factor=1,is_mobile=True,has_touch=True)
    page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.locator('#loaderBtn').tap();page.wait_for_function("__MB.state.phase==='orbit'")
    print('PASS main enters',flush=True)
    for w,h in [(320,480),(320,568),(375,667),(400,680),(390,844),(430,932),(760,1024)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
        for i in range(3):
            page.evaluate('(i)=>{mouseX=mouseY=0;currentProgress=targetProgress=i;velocity=coastVelocity=0}',i)
            page.wait_for_timeout(300)
            r=page.evaluate(BOUNDS);a=r['tiles'][i]
            assert r['textTop']>=r['headerBottom']+8,(w,h,r)
            assert min(t['top'] for t in r['tiles'])>=r['textBottom']+12,(w,h,i,r)
            assert a['left']>=8 and a['right']<=w-8,(w,h,i,r)
            assert abs(a['x']-w/2)<10,(w,h,i,r)
            assert a['bottom']<h-95,(w,h,i,r)
            if (w,h)==(400,680) and i==1:
                page.evaluate('__MB.slateObjects[1].architectureDemo.seek(16)');page.wait_for_timeout(200)
                page.screenshot(path='/workspace/artifacts/max-beshli-mobile-centered-final.png')
        print(f'PASS {w}x{h}: all three tiles centered, fully visible and clear of text',flush=True)
    # Desktop and wide landscape retain the original orbit transformation.
    for w,h in [(1440,900),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
        r=page.evaluate(BOUNDS)
        assert r['scale']==1 and r['origin']==[2.45,.28,-.35],r
    page.set_viewport_size({'width':400,'height':680});page.wait_for_timeout(250)
    page.evaluate('mouseX=mouseY=0;currentProgress=targetProgress=1;velocity=coastVelocity=0');page.wait_for_timeout(300)
    a=page.evaluate(BOUNDS)['tiles'][1];page.touchscreen.tap(a['x'],a['y'])
    page.wait_for_function("__MB.state.phase==='focused'&&__MB.state.selectedIndex===1")
    for w,h in [(400,680),(390,844),(844,390),(400,680)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
        a=page.evaluate(BOUNDS)['tiles'][1]
        assert a['left']>=8 and a['right']<=w-8 and a['top']>=8 and a['bottom']<=h-8,(w,h,a)
    page.touchscreen.tap(a['x'],a['y']);page.wait_for_function("__MB.state.phase==='section'")
    page.locator('#modalCloseBtn').click();page.wait_for_function("__MB.state.phase==='focused'")
    page.locator('#webgl-canvas').focus();page.keyboard.press('Escape');page.wait_for_function("__MB.state.phase==='orbit'")
    page.wait_for_timeout(1800)
    r=page.evaluate(BOUNDS);assert r['tiles'][1]['top']>r['textBottom']+12,r
    assert not errors,errors
    print('PASS focus after tap, portrait/landscape resize, section entry and return; no JS errors',flush=True)
    browser.close()
server.shutdown()
