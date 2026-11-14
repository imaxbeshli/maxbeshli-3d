"""All card shapes approach and retreat gently, including an interrupted approach."""
from pathlib import Path
import functools,http.server,threading
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=.4)
    page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'")
    for width,height in [(1280,800),(400,680)]:
        page.set_viewport_size({'width':width,'height':height})
        for index in range(3):
            page.evaluate('(i)=>{mouseX=mouseY=0;currentProgress=targetProgress=i;velocity=coastVelocity=0}',index)
            page.wait_for_timeout(200)
            for direction in ['in','out']:
                page.evaluate('''({index,direction})=>{
                  direction==='in'?__MB.focusTile(index):__MB.returnToOrbit();
                  window.journey={duration:travel.duration,from:camera.position.clone(),distance:travel.from.distanceTo(travel.to),samples:[0],zoom:[zoomFactor]};
                  const expected=phase;
                  function sample(){journey.samples.push(camera.position.distanceTo(journey.from)/journey.distance);journey.zoom.push(zoomFactor);if(phase===expected)requestAnimationFrame(sample);else journey.done=true;}
                  requestAnimationFrame(sample);
                }''',{'index':index,'direction':direction})
                page.wait_for_function('journey.done')
                data=page.evaluate('({duration:journey.duration,samples:journey.samples,zoom:journey.zoom})')
                samples=data['samples'];steps=[b-a for a,b in zip(samples,samples[1:])]
                assert data['duration']>=1.9,(width,index,direction,data)
                assert abs(samples[-1]-1)<.0001,(width,index,direction,samples)
                assert min(steps)>-.0001 and max(steps)<.055,(width,index,direction,steps)
                assert max(steps[:3])<.012 and max(steps[-3:])<.012,(width,index,direction,steps)
                assert max(abs(b-a) for a,b in zip(data['zoom'],data['zoom'][1:]))<.055
            print('PASS',width,'tile',index,'smooth approach and retreat',flush=True)
        page.evaluate('__MB.focusTile(0)')
        page.wait_for_function('__MB.state.zoomFactor>.25')
        page.evaluate('__MB.returnToOrbit()')
        page.wait_for_function("__MB.state.phase==='orbit'")
        assert page.evaluate('__MB.state.zoomFactor===0 && camera.position.distanceTo(BASE_CAM_POS)<.001')
        print('PASS',width,'interrupted approach returns home',flush=True)
    assert not errors,errors
    browser.close()
server.shutdown()
