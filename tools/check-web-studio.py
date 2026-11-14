"""Check the shared AVTOLAB video, visibility lifecycle and unchanged frame layout."""
from pathlib import Path
import re,tempfile,threading,http.server,functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
three=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html) if len(m.group(1))>200000 and 'REVISION' in m.group(1) and 'Copyright 2010-2021 Three.js Authors' in m.group(1))
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
harness='''<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#111;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style><dialog id="aboutDialog"></dialog>'''
tile_art=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html) if 'window.MBTileArt={' in m.group(1))
harness+='<script>'+three+'</script>'+block+'<script>'+tile_art+'</script>'
harness+='''<script>window.MBLoading={};const tile=MBTileArt.textureSet(THREE,'web_3d');tile.screenMat={map:tile.sharpTex};window.__MB={slateObjects:[{setPlaybackActive(){}},tile]};MBSections.open(1);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1';</script>'''
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
with tempfile.TemporaryDirectory(prefix='mb-web-') as folder,sync_playwright() as p:
 Path(folder,'index.html').write_text(harness)
 Path(folder,'assets').symlink_to(root/'assets',target_is_directory=True)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(45000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html');page.wait_for_function('window.__MB && MBSections.state.active')
 page.wait_for_function('[...document.querySelectorAll("#webScene img")].every(i=>i.complete&&i.naturalWidth>0)')
 page.wait_for_function('__MB.slateObjects[1].video.readyState>=3 && !__MB.slateObjects[1].video.paused')
 def go(n):
  assert page.evaluate('(n)=>MBSections.selectTab(n)',n)
  page.wait_for_timeout(250)
 def click(selector):
  el=page.locator(selector);el.focus();page.wait_for_timeout(100);el.click()
 page.wait_for_timeout(900)
 assert page.locator('#webScene .scroll-chapter').count()==1
 assert page.locator('#sectionOptions').is_hidden()
 assert page.locator('#webScene button,#webScene input,#webScene .web-delivery').count()==0
 player=page.locator('#architectureSlot video');assert player.is_visible()
 assert player.evaluate('(v)=>v===__MB.slateObjects[1].video && v.muted && v.defaultMuted && v.loop && v.playsInline && !v.controls')
 assert player.evaluate('(v)=>v.currentSrc.endsWith("assets/avtolab77-intro-scroll-60fps.mp4")')
 assert player.evaluate('(v)=>getComputedStyle(v).objectFit')=='contain'
 r=player.bounding_box();assert r['y']>=75 and r['y']+r['height']<960,r
 t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(600)
 assert page.evaluate('MBWebStudio.state.time')>t
 assert page.evaluate('__MB.slateObjects[1].architectureDemo===null')
 page.screenshot(path='/tmp/web-simple-desktop.png')
 print('PASS shared AVTOLAB video plays silently on entry, loops, has no controls or extra renderer',flush=True)
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
  r=player.bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1,(width,r)
  assert r['y']+r['height']<height,(width,height,r)
  t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(250)
  assert page.evaluate('MBWebStudio.state.time')!=t,(width,t)
  if width in [1440,390]:page.screenshot(path=f'/tmp/web-simple-{width}.png')
 page.emulate_media(reduced_motion='reduce')
 page.wait_for_function('MBWebStudio.state.paused')
 t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(300);assert page.evaluate('MBWebStudio.state.time')==t
 page.evaluate('MBSections.close();MBSections.open(1)')
 assert page.locator('#webScene .scroll-chapter').count()==1
 assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')==0
 assert page.evaluate('MBWebStudio.state.paused')
 page.emulate_media(reduced_motion='no-preference');page.evaluate('MBSections.close();MBSections.open(1)');page.wait_for_timeout(500)
 assert page.evaluate('MBWebStudio.state.time')>0
 assert not errors,errors
 # Going out of view pauses, returning resumes from the same position.
 player.evaluate("v=>v.parentElement.style.transform='translateY(2000px)'")
 page.wait_for_function('__MB.slateObjects[1].video.paused')
 t=page.evaluate('MBWebStudio.state.time');page.wait_for_timeout(200)
 assert page.evaluate('MBWebStudio.state.time')==t
 player.evaluate("v=>v.parentElement.style.transform=''")
 page.wait_for_function('!__MB.slateObjects[1].video.paused')
 # Tab visibility and leaving the section also stop the shared player.
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function('__MB.slateObjects[1].video.paused')
 page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function('!__MB.slateObjects[1].video.paused')
 page.evaluate('MBSections.close()')
 assert page.evaluate('__MB.slateObjects[1].video.paused')
 assert page.locator('#architectureSlot video').count()==0
 page.evaluate('MBSections.open(1)');page.wait_for_function('!__MB.slateObjects[1].video.paused')
 assert page.locator('#architectureSlot video').count()==1
 player.evaluate('(v)=>v.currentTime=v.duration-.2')
 page.wait_for_function('__MB.slateObjects[1].video.currentTime<1 && !__MB.slateObjects[1].video.paused')
 assert not errors,errors
 print('PASS five sizes, reduced motion, offscreen/tab pause, clean close and repeat entry',flush=True)
 browser.close();server.shutdown()
