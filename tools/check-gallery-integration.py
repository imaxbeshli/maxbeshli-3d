"""Full WebGL/touch integration check; requires Python Playwright and /usr/bin/chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools
ROOT=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Content-Security-Policy','sandbox allow-scripts allow-modals allow-pointer-lock')
  super().end_headers()
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':750},device_scale_factor=.5,has_touch=True);page.set_default_timeout(60000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader' in m.text or 'VALIDATE_STATUS' in m.text) else None)
 page.add_init_script("window.testVideos=[];const old=document.createElement.bind(document);document.createElement=function(n,...args){const e=old(n,...args);if(n==='video')testVideos.push(e);return e}")
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && window.MBLoading.ready')
 print('READY',flush=True)
 v=page.evaluate('({duration:testVideos[0].duration,muted:testVideos[0].muted,loop:testVideos[0].loop,src:testVideos[0].src})');assert abs(v['duration']-49.8)<.05 and v['muted'] and v['loop'];print(v,flush=True)
 page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.studioEntered && __MB.state.phase==='orbit'")
 # Horizontal drag rotates, wheel descends without changing orbit index.
 before=page.evaluate('__MB.state.currentProgress')
 page.mouse.move(700,370);page.mouse.down();page.mouse.move(450,370,steps=20);page.mouse.up();page.wait_for_timeout(800)
 assert abs(page.evaluate('__MB.state.currentProgress')-before)>.2
 page.mouse.wheel(0,550);page.wait_for_timeout(800)
 assert .1<page.evaluate('MBDescent.depth')<.9
 frozen=page.evaluate('__MB.state.currentProgress');page.wait_for_timeout(300)
 assert abs(page.evaluate('__MB.state.currentProgress')-frozen)<.03
 print('MID',page.evaluate('({depth:MBDescent.depth,target:MBDescent.target,opacity:getComputedStyle(selectedWorks).opacity,veil:getComputedStyle(descentVeil).opacity})'),flush=True)
 page.screenshot(path='/tmp/descent-mid.png')
 page.mouse.wheel(0,1800);page.wait_for_function('MBDescent.arrived');page.wait_for_timeout(1200)
 assert page.evaluate('testVideos[0].paused')
 page.wait_for_function('MBGalleryScene.ready && MBGalleryScene.frames>5')
 before=page.evaluate('({offset:MBGalleryScene.offsets[0],frame:MBGalleryScene.frames,light:MBGalleryScene.lightPhase})')
 page.wait_for_timeout(1800)
 after=page.evaluate('({offset:MBGalleryScene.offsets[0],frame:MBGalleryScene.frames,light:MBGalleryScene.lightPhase})')
 assert after['frame']>before['frame'] and after['light']>before['light']
 assert abs(after['offset']-before['offset'])>1,(before,after)
 page.screenshot(path='/tmp/gallery-integrated.png')
 box=page.locator('.work-card').first.bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
 assert page.evaluate('workViewer.open');page.keyboard.press('Escape');assert not page.evaluate('workViewer.open')
 page.keyboard.press('Escape');page.wait_for_function('MBDescent.depth===0');page.wait_for_timeout(500)
 assert page.evaluate('__MB.state.phase')=='orbit'
 page.locator('header a[href="#about"]').click();page.wait_for_timeout(1000);assert page.evaluate('aboutDialog.open');page.keyboard.press('Escape')
 # Mouse/keyboard still operate upper tiles after returning.
 page.locator('#webgl-canvas').focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(500)
 page.keyboard.press('PageDown');page.wait_for_timeout(700);assert page.evaluate('MBDescent.depth')>.1
 page.keyboard.press('Escape');page.wait_for_function('MBDescent.depth===0')
 assert not errors,errors
 print('PASS main drag, wheel descent, orbit freeze, media pause, viewer, return, About and keyboard',flush=True)
 # Main Works navigation and touch gestures use the same transition.
 page.locator('header a[href="#works"]').click();page.wait_for_function('MBDescent.arrived')
 assert page.evaluate('document.getElementById("webgl-canvas").inert')
 page.keyboard.press('Escape');page.wait_for_function('MBDescent.depth===0')
 assert not page.evaluate('document.getElementById("webgl-canvas").inert')
 page.set_viewport_size({'width':390,'height':844})
 cdp=page.context.new_cdp_session(page)
 def swipe(y1,y2):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':280,'y':y1}]})
  for i in range(1,13):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':280,'y':y1+(y2-y1)*i/12}]});page.wait_for_timeout(25)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 swipe(730,80);page.wait_for_function('MBDescent.arrived')
 assert not page.evaluate('workViewer.open')
 assert page.evaluate('selectedWorks.scrollLeft===0 && worksTitle.getBoundingClientRect().left>=0')
 page.screenshot(path='/tmp/gallery-mobile-integrated.png')
 page.evaluate('galleryContent.scrollTop=0')
 swipe(100,760);page.wait_for_function('MBDescent.depth===0')
 assert not errors,errors
 print('PASS Works navigation, inert state, mobile touch descent and return',flush=True)
 page.set_viewport_size({'width':1000,'height':750})
 b.close()
server.shutdown()
