"""Exercise the website previews and the real shared 3D renderer offline."""
from pathlib import Path
import re,tempfile,threading,http.server,functools,argparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--mobile',action='store_true');args=parser.parse_args()
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
 Path(folder,'assets').symlink_to(root/'assets',target_is_directory=True)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(**(p.devices['Pixel 7'] if args.mobile else {'viewport':{'width':1440,'height':960}}));page.set_default_timeout(45000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
 page.wait_for_function('MBSections.state.active && MBWebStudio.state.time>0')
 assert page.locator('#architectureSlot canvas').is_visible()
 assert page.locator('#webScene .scroll-chapter').count()==2
 assert page.locator('#webScene button,#webScene input').count()==0
 player=page.locator('#webReadyVideo')
 assert player.evaluate('v=>v.muted&&v.defaultMuted&&v.loop&&v.playsInline&&!v.controls')
 assert player.evaluate('v=>v.paused')
 for width,height in [(1440,960),(1024,768),(768,1024),(390,844),(360,740)]:
  page.set_viewport_size({'width':width,'height':height})
  page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(600)
  page.wait_for_function('!__MB.slateObjects[1].architectureDemo.state.active || MBWebStudio.state.time>0')
  t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(250)
  assert page.evaluate('MBWebStudio.state.time')!=t
  assert player.evaluate('v=>v.paused')
  assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  c=page.locator('#sectionContact').bounding_box();assert c['x']>width/2 and c['y']+c['height']<=height
  page.screenshot(path=f'/tmp/forma-{width}.png')
  page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=e.scrollHeight')
  page.wait_for_function('!webReadyVideo.paused && webReadyVideo.currentTime>0')
  page.wait_for_function('!__MB.slateObjects[1].architectureDemo.state.active')
  t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(200);assert page.evaluate('MBWebStudio.state.time')==t
  r=player.bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1 and r['y']+r['height']<height
  page.screenshot(path=f'/tmp/avtolab-ready-{width}.png')
 print('PASS FORMA then AVTOLAB on five sizes, separate visibility playback, scrolling contact and no extra controls',flush=True)
 page.locator('#sectionContact').click();page.wait_for_function('webReadyVideo.paused')
 t=player.evaluate('v=>v.currentTime');page.wait_for_timeout(300);assert player.evaluate('v=>v.currentTime')==t
 page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
 page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=e.scrollHeight');page.wait_for_function('!webReadyVideo.paused')
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function('webReadyVideo.paused')
 page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function('!webReadyVideo.paused')
 player.evaluate('v=>v.currentTime=12');page.wait_for_function('!webReadyVideo.seeking && webReadyVideo.currentTime>=12')
 page.evaluate('MBSections.close()');assert player.evaluate('v=>v.paused')
 held=player.evaluate('v=>v.currentTime')
 page.evaluate('MBSections.open(1)');page.wait_for_timeout(300);assert player.evaluate('v=>v.paused')
 page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=e.scrollHeight');page.wait_for_function('!webReadyVideo.paused')
 page.wait_for_timeout(400);assert held<=player.evaluate('v=>v.currentTime')<held+2
 player.evaluate('v=>v.currentTime=v.duration-.2');page.wait_for_function('webReadyVideo.currentTime<1 && !webReadyVideo.paused')
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('webReadyVideo.paused && MBWebStudio.state.time===18')
 assert not errors,errors
 print('PASS contact/tab pause, resume after reentry, loop, reduced motion; no JavaScript errors',flush=True)
 browser.close();server.shutdown()
