from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path(__file__).resolve().parents[1])))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':700,'height':600},device_scale_factor=.5);page.set_default_timeout(90000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 assert page.locator('#selectedWorks,#descentVeil,#descendHint').count()==0
 assert page.evaluate('typeof MBDescent')=='undefined'
 page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.studioEntered && __MB.state.phase==='orbit'")
 print('PASS main loads, lower scene absent',flush=True)
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(500)
 page.evaluate('window.__beforeAboutThree=window.THREE')
 page.context.set_offline(True)
 page.locator('header a[href="#about"]').click();page.wait_for_function('aboutDialog.open');page.wait_for_function('aboutDialog.dataset.glass==="ready"',timeout=180000);page.wait_for_timeout(2200)
 assert page.evaluate('window.THREE === window.__beforeAboutThree && THREE.REVISION === "128"')
 assert page.locator('.about-chapter-count').count()==0
 for i in range(3):
  r=page.locator(f'#aboutTab{i}').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.wait_for_timeout(700)
  assert page.locator('.about-chapter:visible').count()==1
  assert page.locator(f'#aboutTab{i}').get_attribute('aria-selected')=='true'
 r=page.locator('#aboutTab0').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.wait_for_timeout(800)
 page.screenshot(path='/tmp/about-final-desktop.png')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1000);page.screenshot(path='/tmp/about-final-mobile.png')
 page.keyboard.press('Escape');page.wait_for_function('!aboutDialog.open')
 assert not errors,errors
 print('PASS full site About cold start without network, chapters, mobile and return',flush=True)
 b.close()
server.shutdown()
