"""All tiles finish camera transitions in equal wall time, even with a slow simulation clock."""
from pathlib import Path
import functools, http.server, threading
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

root = Path(__file__).resolve().parents[1]
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1280, 'height':800}, device_scale_factor=.4)
    page.set_default_timeout(120000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('https://fonts.**', lambda r: r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='domcontentloaded', timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.locator('#loaderBtn').click()
    page.wait_for_function("__MB.state.phase==='orbit'")
    # Reproduce a simulation clock falling behind real elapsed time. A camera
    # driven by accumulated simulation deltas must fail the wall-time assertions.
    page.evaluate('window.originalCameraTestDelta=clock.getDelta.bind(clock);clock.getDelta=()=>{originalCameraTestDelta();return .005}')

    def transition(action, index, expected_phase, seconds):
        page.evaluate('''({action,index})=>{
          const started=performance.now();
          if(action==='in')__MB.focusTile(index);
          else if(action==='out')__MB.returnToOrbit();
          else if(action==='enter')__MB.startDive();
          else document.getElementById('modalCloseBtn').click();
          const journey=travel, from=journey.from.clone(), distance=from.distanceTo(journey.to);
          const moving=phase;
          window.cameraCheck={duration:journey.duration,samples:[{time:0,motionTime:0,position:0}],done:false};
          function sample(){
            cameraCheck.samples.push({time:(performance.now()-started)/1000,motionTime:journey.elapsed,position:camera.position.distanceTo(from)/distance});
            if(phase===moving)requestAnimationFrame(sample);
            else {cameraCheck.phase=phase;cameraCheck.done=true;}
          }
          requestAnimationFrame(sample);
        }''', {'action':action, 'index':index})
        page.wait_for_function('cameraCheck.done')
        data = page.evaluate('cameraCheck')
        assert data['phase'] == expected_phase, data
        assert abs(data['duration']-seconds) < .001, data
        samples = data['samples']
        gaps = [b['time']-a['time'] for a,b in zip(samples,samples[1:])]
        # Completion is quantized to rendered frames, not to simulation steps.
        assert seconds-.04 <= samples[-1]['time'] <= seconds+max(gaps)+.25, data
        assert abs(samples[-1]['position']-1) < .001, data
        for a,b in zip(samples,samples[1:]):
            step=b['position']-a['position']
            # Position is updated before rendering, while this callback runs
            # after it. Use the position's timestamp for the easing bound.
            assert -.001 <= step <= 1.875*(b['motionTime']-a['motionTime'])/seconds+.025, data
        return round(samples[-1]['time'], 3)

    for width,height in [(1280,800),(400,680)]:
        page.set_viewport_size({'width':width,'height':height})
        for index in range(3):
            page.evaluate('(i)=>{mouseX=mouseY=0;currentProgress=targetProgress=i;velocity=coastVelocity=0}', index)
            page.wait_for_timeout(250)
            timings = {}
            timings['approach'] = transition('in',index,'focused',2)
            timings['enter'] = transition('enter',index,'section',2)
            assert page.locator('#ecosystem-modal').get_attribute('data-scene') == str(index)
            page.wait_for_function('getComputedStyle(document.getElementById("ecosystem-modal")).opacity==="1"')
            timings['exit'] = transition('exit',index,'focused',2)
            timings['retreat'] = transition('out',index,'orbit',3)
            assert page.evaluate('__MB.state.zoomFactor===0')
            print('PASS', width, 'tile', index, 'wall-time seconds', timings, flush=True)
        page.evaluate('__MB.focusTile(0)')
        page.wait_for_function('__MB.state.zoomFactor>.2 && __MB.state.phase==="focusing"')
        transition('out',0,'orbit',3)
        assert page.evaluate('__MB.state.zoomFactor===0 && camera.position.distanceTo(BASE_CAM_POS)<.001')
        print('PASS', width, 'interrupted approach returns home without slowing down', flush=True)
    page.evaluate('clock.getDelta=originalCameraTestDelta')
    assert not errors, errors
    browser.close()
server.shutdown()
