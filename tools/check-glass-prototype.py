from playwright.sync_api import sync_playwright
from pathlib import Path
import threading,http.server,functools
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':850},device_scale_factor=1);page.set_default_timeout(120000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/prototypes/glass/');page.wait_for_function('document.body.dataset.ready==="true"');page.wait_for_timeout(1500)
 page.screenshot(path='/tmp/glass-prototype-front.png')
 print('ready',errors,flush=True)
 page.mouse.move(600,400);page.mouse.down();page.mouse.move(730,430,steps=12);page.mouse.up();page.wait_for_timeout(1800)
 page.screenshot(path='/tmp/glass-prototype-rotated.png')
 assert abs(page.evaluate('glassPrototype.pane.rotation.y'))>.4
 page.click('#reset');page.wait_for_function('Math.abs(glassPrototype.pane.rotation.y)<.05')
 before=page.evaluate('glassPrototype.scene.environmentRotation.y');page.click('#light');assert before!=page.evaluate('glassPrototype.scene.environmentRotation.y')
 page.click('#reference');assert page.locator('#comparison').evaluate('(e)=>e.open');page.keyboard.press('Escape');page.wait_for_timeout(500)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1200);page.screenshot(path='/tmp/glass-prototype-mobile.png')
 bounds=page.evaluate('''()=>{const {pane,camera}=glassPrototype;pane.geometry.computeBoundingBox();pane.updateMatrixWorld();const b=pane.geometry.boundingBox;return [b.min.clone(),b.max.clone()].map(p=>p.applyMatrix4(pane.matrixWorld).project(camera).toArray())}''')
 assert all(abs(p[0])<.95 and abs(p[1])<.9 for p in bounds),bounds
 page.locator('#scene').focus();page.keyboard.press('ArrowLeft');page.wait_for_function('Math.abs(glassPrototype.pane.rotation.y)>.05')
 assert not errors,errors
 print('PASS render, drag, reset, reference modal, mobile',flush=True)
 b.close()

server.shutdown()
