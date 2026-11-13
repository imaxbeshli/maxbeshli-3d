from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
def data(name):return 'data:image/png;base64,'+base64.b64encode((root/name).read_bytes()).decode()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':620,'height':1220},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<body style="margin:0;background:#06080a"><canvas id="phone" width="600" height="1200"></canvas></body>')
 page.evaluate('(v)=>{window.MB_PHONE_DETAILING_SHEET=v[0];window.MB_PHONE_CAR_STUDIO=v[1]}',[data('assets/phone-detailing-sheet.png'),data('assets/phone-car-studio.png')])
 page.add_script_tag(path=str(root/'assets/phone-demo.js'))
 page.evaluate('window.demo=MBPhoneDemo.create(phone,{},()=>{});demo.ready')
 for t,name in [(0,'home'),(8,'film'),(10,'polish'),(12,'ceramic'),(18.9,'booking'),(22,'confirmation'),(27,'contacts')]:
  page.evaluate('(t)=>demo.render(t)',t)
  page.locator('#phone').screenshot(path=f'/tmp/phone-new-{name}.png')
 assert page.evaluate('typeof MBPhoneCar3D')=='undefined'
 # Progress freezes when the tile is inactive and resumes from the same point.
 page.evaluate('demo.update(true,0);demo.update(true,1000);demo.update(false,2000)')
 before=page.evaluate('demo.state.time')
 page.evaluate('demo.update(false,20000);demo.update(true,21000)')
 assert page.evaluate('demo.state.time')==before
 page.evaluate('demo.update(true,22000)');assert abs(page.evaluate('demo.state.time')-before-1)<.001
 page.evaluate('demo.render(30)');assert page.evaluate('demo.state.renderedTime')==0
 assert not errors,errors
 print('PASS five-screen loop, ready images, inactive pause/resume, no 3D dependency')
 b.close()
