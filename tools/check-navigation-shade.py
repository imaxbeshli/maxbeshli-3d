"""Check viewport-wide navigation shading in the full animated 3D app.

Requires Python Playwright and /usr/bin/chromium. Reduced motion must remain
unset: an isolated sections harness missed the sticky-header clipping bug.
"""
from pathlib import Path
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
    page.evaluate('__MB.startDive()')
    page.wait_for_function("__MB.state.phase==='section'")
    page.wait_for_timeout(1500)
    for w,h in [(1600,765),(1920,1080),(3440,1440),(5120,1440),(1366,768),(1024,600),(390,844),(320,568),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(300)
        for scene in range(3):
            page.evaluate('(n)=>{MBSections.close();MBSections.open(n)}',scene)
            for y in [0,300]:
                page.locator('#ecosystem-modal').evaluate('(e,y)=>e.scrollTop=y',y)
                page.wait_for_timeout(150)
                r=page.locator('.section-top-shade').bounding_box()
                assert r['x']==0 and r['y']==0 and r['width']==w and r['height']==(140 if w<=540 else 160),(w,scene,y,r)
                assert page.locator('.section-header .section-top-shade').count()==0
                assert page.locator('.section-header').evaluate("e=>getComputedStyle(e,'::before').content")=='none'
                assert page.locator('.section-top-shade').evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
                assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
                back=page.locator('#modalCloseBtn').bounding_box();assert 0<=back['y']<80
                cta=page.locator('#sectionContact').bounding_box()
                assert 0<=h-cta['y']-cta['height']<=30,(w,scene,y,cta)
                assert cta['x']>=0 and cta['x']+cta['width']<=w
                brand=page.locator('.section-brand').bounding_box()
                if y==0:
                    start_brand=brand['y'];start_back=back['y'];start_cta=cta['y']
                else:
                    scroll=page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')
                    assert abs(brand['y']-(start_brand-scroll))<1,(w,scene,y,brand)
                    assert abs(back['y']-start_back)<1 and abs(cta['y']-start_cta)<1
                # The solid portion of the fade extends below the entire back button.
                assert back['y']+back['height']<=r['height']*.45+1
                if scene==0 and w in [1600,390]:
                    page.wait_for_timeout(1500)
                    page.screenshot(path=f'/tmp/navigation-shade-{w}-{y}.png')
        print(f'PASS full app at {w}x{h}: all three sections, top and scrolled, viewport bounds and no clipping',flush=True)
    # Contact is reachable while scrolled, and closing it preserves the position.
    scroll=page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')
    page.locator('#sectionContact').click()
    page.wait_for_function('infoDialog.open')
    page.keyboard.press('Escape')
    page.wait_for_function('!infoDialog.open')
    assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')==scroll
    # Back navigation remains clickable through the decorative layer.
    page.locator('#modalCloseBtn').click()
    page.wait_for_function("__MB.state.phase==='focused'")
    assert not errors,errors
    print('PASS back navigation; no JavaScript errors',flush=True)
    browser.close()
server.shutdown()
