"""Real touch entry from the lake into Web, including delayed media and inline logo."""
from pathlib import Path
import functools,http.server,threading,io
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def handle(self):
  try:super().handle()
  except (BrokenPipeError,ConnectionResetError):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=.5,is_mobile=True,has_touch=True);page.set_default_timeout(120000)
 errors=[];pending=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://fonts.**',lambda r:r.abort());page.route('**/avtolab77-intro-poster.webp',lambda r:r.abort())
 page.route('**/avtolab77-intro-scroll*.mp4*',lambda r:pending.append(r))
 page.add_init_script("localStorage.setItem('mb-muted','1')")
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB&&MBLoading.ready');page.locator('#loaderBtn').tap();page.wait_for_function("phase==='orbit'")
 page.evaluate('targetProgress=1');page.wait_for_function('Math.abs(currentProgress-1)<.001')
 assert page.locator('#webgl-canvas').evaluate('c=>getComputedStyle(c).webkitTapHighlightColor')=='rgba(0, 0, 0, 0)'
 def tap_tile():
  xy=page.evaluate('''()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const v=slateObjects[1].holder.getWorldPosition(new THREE.Vector3()).project(camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}''')
  page.touchscreen.tap(*xy)
 page.evaluate('''()=>{window.earlySectionFrames=[];const sample=()=>{
  if(phase==='focusing')earlySectionFrames.push(document.getElementById('ecosystem-modal').checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));
  if(phase!=='focused')requestAnimationFrame(sample);
 };requestAnimationFrame(sample)}''')
 tap_tile();page.wait_for_function("phase==='focused'")
 assert page.evaluate('earlySectionFrames.length>0 && earlySectionFrames.every(v=>!v)')
 page.screenshot(path='/tmp/web-mobile-tile-focused.png')
 tap_tile();page.wait_for_function("phase==='section' && getComputedStyle(document.getElementById('ecosystem-modal')).opacity==='1'")
 assert page.locator('#architectureSlot canvas').is_visible()
 page.locator('#ecosystem-modal').evaluate('e=>e.scrollTo({top:e.scrollHeight,behavior:"instant"})')
 page.wait_for_function('webReadyPoster.complete && webReadyPoster.naturalWidth===1280');page.wait_for_timeout(1200)
 assert pending,'Test must reach actual video playback with the request held'
 assert page.locator('#webReadyPoster').is_visible()
 assert page.locator('#webReadyPoster').get_attribute('src').startswith('data:image/webp;base64,')
 assert page.locator('#webReadyVideo').evaluate("v=>getComputedStyle(v).opacity==='1'&&getComputedStyle(v).transform==='none'")
 shot=Image.open(io.BytesIO(page.locator('.web-video-surface').screenshot())).convert('RGB');w,h=shot.size
 logo=shot.crop((int(w*.25),int(h*.4),int(w*.75),int(h*.6)))
 assert sum(max(px)>90 for px in logo.getdata())>logo.width*logo.height*.03
 page.screenshot(path='/tmp/web-mobile-held-logo.png')
 for route in pending:route.continue_()
 page.unroute('**/avtolab77-intro-scroll*.mp4*')
 page.wait_for_function("webReadyVideo.closest('.web-video-surface').classList.contains('has-frame')")
 assert page.locator('#webReadyVideo').evaluate('v=>!v.paused && v.currentTime>=.12 && v.videoWidth===1280')
 assert not page.locator('#webReadyPoster').is_visible()
 page.wait_for_timeout(1500);page.screenshot(path='/tmp/web-mobile-video-playing.png')
 page.locator('#modalCloseBtn').tap();page.wait_for_function("phase==='focused'")
 assert page.locator('#webReadyVideo').evaluate('v=>v.paused')
 assert not errors,errors
 print('PASS full mobile touch entry/return, no early section flash or tap highlight, inline logo with blocked image and held video, decoded playback',flush=True)
 browser.close()
server.shutdown()
