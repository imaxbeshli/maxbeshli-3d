"""Sample focused tile transitions at 120 Hz through the production animation loop.

Requires Python Playwright and /usr/bin/chromium. Checks all six directions,
frame clearance, continuous poses and opacity, plus a queued gesture.
"""
import math
from pathlib import Path
PROBE_JS = r"""
const oldRAF=window.requestAnimationFrame;
window.requestAnimationFrame=function(cb){return cb.name==='animate'?0:oldRAF(cb)};
clock.getDelta=()=>1/120;
window.probeFrame=()=>{
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const boxes=slateObjects.map(o=>{
  const m=o.holder.children[0];m.geometry.computeBoundingBox();
  const box=m.geometry.boundingBox,center=box.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld);
  const q=m.getWorldQuaternion(new THREE.Quaternion()),scale=m.getWorldScale(new THREE.Vector3());
  return {center,axes:[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)].map(a=>a.applyQuaternion(q)),half:box.getSize(new THREE.Vector3()).multiply(scale).multiplyScalar(.5).toArray()};
 });
 const separation=(a,b)=>{
  const d=b.center.clone().sub(a.center),axes=[...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>x.clone().cross(y)))];
  return Math.max(...axes.filter(x=>x.lengthSq()>1e-10).map(x=>{x.normalize();return Math.abs(d.dot(x))-a.axes.reduce((r,v,i)=>r+Math.abs(v.dot(x))*a.half[i],0)-b.axes.reduce((r,v,i)=>r+Math.abs(v.dot(x))*b.half[i],0)}));
 };
 return {phase,progress:currentProgress,selectedIndex,opacities:slateObjects.map(o=>o.screenMat.opacity),poses:slateObjects.map(o=>({p:o.holder.position.toArray(),q:o.holder.quaternion.toArray()})),gaps:[[0,1],[0,2],[1,2]].map(([a,b])=>separation(boxes[a],boxes[b]))};
};
window.advanceProbe=(steps)=>{
 const render=renderer.render,waterUpdate=water.update;
 renderer.render=()=>{};water.update=()=>{};
 const frames=[];
 try{for(let i=0;i<steps;i++){animate();frames.push(probeFrame())}}
 finally{renderer.render=render;water.update=waterUpdate;}
 water.update(elapsed,camera,lightReveal);renderer.render(scene,camera);
 return frames;
};

"""
from playwright.sync_api import sync_playwright
import threading, http.server, functools

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':700,'height':600},device_scale_factor=.75)
    page.set_default_timeout(90000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.locator('#loaderBtn').click()
    page.wait_for_function("__MB.state.phase==='orbit'")
    print('PASS main enters, local media available',flush=True)

    page.evaluate('__MB.focusTile(0)')
    page.wait_for_function("__MB.state.phase==='focused'")
    page.wait_for_timeout(1500)
    page.evaluate(PROBE_JS)
    page.wait_for_timeout(100)
    def validate(frames):
        assert min(min(f['gaps']) for f in frames)>0, 'Glass frames intersect'
        assert min(max(f['opacities']) for f in frames)>.75, 'Both screens fade out'
        for before,after in zip(frames,frames[1:]):
            for a,b in zip(before['poses'],after['poses']):
                turn=2*math.acos(min(1,abs(sum(x*y for x,y in zip(a['q'],b['q'])))))
                assert turn<.063, ('Abrupt rotation',turn)
                assert math.dist(a['p'],b['p'])<.12, 'Abrupt translation'
            assert max(abs(a-b) for a,b in zip(before['opacities'],after['opacities']))<.12, 'Abrupt opacity change'
    for w,h in [(1280,800),(390,844)]:
        page.set_viewport_size({'width':w,'height':h})
        page.evaluate('returnToOrbit();focusTile(0)');page.evaluate('advanceProbe(1500)')
        for target in [1,2,0,2,1,0]:
            frames=[page.evaluate('probeFrame()')]
            page.evaluate('(i)=>focusTile(i)',target)
            duration=page.evaluate('__MB.state.travelDuration')
            steps=math.ceil(duration*120/7)+1
            for n in range(7):
                frames+=page.evaluate('(n)=>advanceProbe(n)',steps)
                if target==1 and n in [0,3,6]:page.screenshot(path=f'/tmp/smooth-transition-{w}-{n}.png')
            state=page.evaluate('__MB.state')
            assert state['phase']=='focused' and state['selectedIndex']==target,state
            validate(frames)
        # A new gesture waits for the current transition, without changing its pose.
        page.evaluate('focusTile(1)')
        frames=page.evaluate('advanceProbe(60)')
        page.evaluate('focusTile(2)')
        assert page.evaluate('__MB.state.selectedIndex')==1
        frames+=page.evaluate('advanceProbe(800)')
        state=page.evaluate('__MB.state')
        assert state['phase']=='focused' and state['selectedIndex']==2,state
        validate(frames)
        print(f'PASS {w}x{h}: all six transitions and queued input; no frame intersections, opacity gaps or pose jumps',flush=True)
    assert not errors,errors
    browser.close()
server.shutdown()
