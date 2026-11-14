"""Exercise the website previews and the real shared 3D renderer offline."""
from pathlib import Path
import re,tempfile,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
three=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html) if len(m.group(1))>200000 and 'REVISION' in m.group(1) and 'Copyright 2010-2021 Three.js Authors' in m.group(1))
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
harness='''<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#111;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style><dialog id="aboutDialog"></dialog>'''
harness+='<script>'+three+'</script>'+block+'<script>'+(root/'assets/architecture-demo.js').read_text()+'</script>'
harness+='''<script>const c=document.createElement('canvas');c.width=1200;c.height=750;const demo=MBArchitectureDemo.create(c,THREE,()=>{});window.__MB={slateObjects:[{setPlaybackActive(){}},{setPlaybackActive(a){if(!a)demo.update(false)},architectureDemo:demo,screenMat:{map:{image:c}}}]};MBSections.open(1);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1';</script>'''
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
with tempfile.TemporaryDirectory(prefix='mb-web-') as folder,sync_playwright() as p:
 Path(folder,'index.html').write_text(harness)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(45000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html');page.wait_for_function('window.__MB && MBSections.state.active')
 page.wait_for_function('[...document.querySelectorAll("#webScene img")].every(i=>i.complete&&i.naturalWidth>0)')
 page.context.set_offline(True)
 def go(n):
  assert page.evaluate('(n)=>MBSections.selectTab(n)',n)
  page.wait_for_timeout(250)
 def click(selector):
  el=page.locator(selector);el.focus();page.wait_for_timeout(100);el.click()
 page.wait_for_timeout(900)
 assert page.locator('#webScene .scroll-chapter').count()==1
 assert page.locator('#sectionOptions').is_hidden()
 assert page.locator('#webScene button,#webScene input,#webScene .web-delivery').count()==0
 canvas=page.locator('#architectureSlot canvas');assert canvas.is_visible()
 r=canvas.bounding_box();assert r['y']>=75 and r['y']+r['height']<960,r
 t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(600)
 assert page.evaluate('MBWebStudio.state.time')>t
 assert page.evaluate('__MB.slateObjects[1].architectureDemo.state.renderedTime')>0
 page.screenshot(path='/tmp/web-simple-desktop.png')
 print('PASS original FORMA canvas plays on entry, no controls or duplicate contact buttons',flush=True)
 contact_before=page.locator('.section-footer').bounding_box()
 click('#sectionContact');t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(300)
 assert page.evaluate('MBWebStudio.state.time')==t
 assert page.locator('#contactTelegram').get_attribute('href')=='https://t.me/IMAXBESHLI'
 page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open');page.wait_for_timeout(250)
 assert page.evaluate('MBWebStudio.state.time')>t
 assert page.locator('.section-footer').bounding_box()==contact_before
 print('PASS fixed contact opens, pauses animation and restores playback',flush=True)
 for width,height in [(1440,960),(1024,768),(768,1024),(390,844),(360,740)]:
  page.set_viewport_size({'width':width,'height':height})
  page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(500)
  dims=page.locator('#ecosystem-modal').evaluate('e=>[e.clientWidth,e.scrollWidth]');assert dims[1]<=dims[0]+1,(width,dims)
  r=canvas.bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1,(width,r)
  assert r['y']+r['height']<height,(width,height,r)
  t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(250)
  assert page.evaluate('MBWebStudio.state.time')!=t,(width,t)
  if width in [1440,390]:page.screenshot(path=f'/tmp/web-simple-{width}.png')
 page.emulate_media(reduced_motion='reduce')
 page.wait_for_function('MBWebStudio.state.paused && MBWebStudio.state.time===18')
 t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(300);assert page.evaluate('MBWebStudio.state.time')==t
 page.evaluate('MBSections.close();MBSections.open(1)')
 assert page.locator('#webScene .scroll-chapter').count()==1
 assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')==0
 assert page.evaluate('MBWebStudio.state.paused')
 page.emulate_media(reduced_motion='no-preference');page.evaluate('MBSections.close();MBSections.open(1)');page.wait_for_timeout(500)
 assert page.evaluate('MBWebStudio.state.time')>0
 assert not errors,errors
 print('PASS visible canvas at five screen sizes, reduced motion, reentry and no JavaScript errors',flush=True)
 browser.close();server.shutdown()
