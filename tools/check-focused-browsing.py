"""Real desktop wheel/drag and mobile touch navigation after the first tile click."""
from pathlib import Path
import argparse, functools, http.server, threading
parser=argparse.ArgumentParser();parser.add_argument("--mobile-only",action="store_true");args=parser.parse_args()
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

root = Path(__file__).resolve().parents[1]
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    for mobile in ([True] if args.mobile_only else [False, True]):
        context = browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800}, device_scale_factor=.5, is_mobile=mobile, has_touch=mobile)
        page = context.new_page(); page.set_default_timeout(120000)
        errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('https://fonts.**', lambda r: r.abort())
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='domcontentloaded', timeout=180000)
        page.wait_for_function('window.__MB && MBLoading.ready')
        page.locator('#loaderBtn').tap() if mobile else page.locator('#loaderBtn').click()
        page.wait_for_function("__MB.state.phase==='orbit'")
        def tile_click():
            xy=page.evaluate('''()=>{const m=__MB,s=m.state,i=s.phase==='orbit'?s.activeIndex:s.selectedIndex;
                m.camera.updateMatrixWorld();m.scene.updateMatrixWorld(true);
                const v=m.slateObjects[i].holder.getWorldPosition(new THREE.Vector3()).project(m.camera);
                return [Math.max(18,Math.min(innerWidth-18,(v.x+1)*innerWidth/2)),Math.max(100,Math.min(innerHeight-100,(1-v.y)*innerHeight/2))];}''')
            page.touchscreen.tap(*xy) if mobile else page.mouse.click(*xy)
        def focused(index):
            try:
                page.wait_for_function("i=>__MB.state.phase==='focused'&&__MB.state.selectedIndex===i", arg=index, timeout=30000)
            except Exception:
                print('Unexpected navigation state:',page.evaluate('__MB.state'),flush=True)
                page.screenshot(path='/tmp/focused-browsing-failure.png')
                raise
            assert page.evaluate('__MB.state.zoomFactor')>.99
        tile_click();focused(0)
        print(f'PASS first {"tap" if mobile else "click"} focuses tile',flush=True)
        # Put the boat in its visible passage, then observe the real animation loop.
        page.evaluate('''()=>{const m=__MB,t=m.water.material.uniforms.uTime.value*1000;
            for(let i=0;i<360;i++)m.lanternBoat.update(t+i*50,true,m.backdrop);
        }''')
        before=page.evaluate('({time:__MB.lanternBoat.state.elapsed,x:__MB.lanternBoat.root.position.x})')
        page.wait_for_function('t=>__MB.lanternBoat.state.elapsed>t+.2', arg=before['time'])
        assert page.evaluate('__MB.lanternBoat.root.position.x')>before['x']
        if mobile:
            cdp=context.new_cdp_session(page)
            def swipe(start,end,cancel=False):
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':400}]})
                for step in range(1,9):
                    x=start+(end-start)*step/8
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':400}]})
                    page.wait_for_timeout(25)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]})
            swipe(310,80);focused(1)
            swipe(80,310);focused(0)
            swipe(310,80,cancel=True);focused(0)
        else:
            page.mouse.move(640,400)
            page.mouse.wheel(0,120)
            focused(1)
            page.mouse.move(900,400);page.mouse.down();page.mouse.move(550,400,steps=12);page.mouse.up()
            focused(2)
            page.wait_for_timeout(200);page.mouse.wheel(0,-120);focused(1)
            # Deliver a contiguous inertial burst in one browser task; slow software
            # rendering must not turn test-driver round trips into separate gestures.
            page.wait_for_timeout(200)
            page.evaluate("()=>{const c=document.getElementById('webgl-canvas');for(const deltaY of [120,35,30,25,20,15,10,5])c.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}))}")
            focused(2)
            page.locator('#webgl-canvas').focus()
            page.keyboard.press('ArrowRight');focused(0)
        # A new tap/click after a swipe still enters the chosen section.
        page.screenshot(path=f'/tmp/focused-browsing-{"mobile" if mobile else "desktop"}.png')
        tile_click();page.wait_for_function("__MB.state.phase==='section'")
        assert page.locator('#ecosystem-modal').get_attribute('data-scene')=='0'
        paused=page.evaluate('__MB.lanternBoat.state.elapsed');page.wait_for_timeout(350)
        assert page.evaluate('__MB.lanternBoat.state.elapsed')==paused
        page.locator('#modalCloseBtn').click();focused(0)
        page.wait_for_function('t=>__MB.lanternBoat.state.elapsed>t+.15',arg=paused)
        page.locator('#webgl-canvas').focus();page.keyboard.press('Escape')
        page.wait_for_function("__MB.state.phase==='orbit'")
        assert not errors,errors
        print(f'PASS {"mobile touch" if mobile else "desktop wheel, drag and keyboard"}: focused browsing, boat motion, second click, section pause and return',flush=True)
        context.close()
    browser.close()
server.shutdown()
