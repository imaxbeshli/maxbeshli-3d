"""Exercise production film controls, animated viewing and future work slots."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import functools,http.server,threading,re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
source=re.search(r'<script[^>]*id="showreelVideoData"[^>]*data-src="([^"]+)"',html)[1]
harness='''<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0c1420;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style><dialog id="aboutDialog"></dialog>'''+block+'''<script>(async()=>{window.v=document.createElement('video');v.src=URL.createObjectURL(await(await fetch('/FILM_SOURCE')).blob());v.muted=true;v.playsInline=true;v.loop=true;window.__MB={slateObjects:[{video:v,setPlaybackActive(){v.pause()}}]};MBSections.open(0);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1';})();</script>'''.replace('FILM_SOURCE',source)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def handle(self):
  try:super().handle()
  except (BrokenPipeError,ConnectionResetError):pass
 def do_GET(self):
  if self.path=='/__film-player-check':
   data=harness.encode();self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
artifacts=Path('/workspace/artifacts');artifacts.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,mobile in [(1440,900,False),(390,844,True)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
  page=context.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def tap(selector):
   box=page.locator(selector).bounding_box();assert box,selector
   x,y=box['x']+box['width']/2,box['y']+box['height']/2
   if mobile:page.touchscreen.tap(x,y)
   else:page.mouse.click(x,y)
  page.goto(f'http://127.0.0.1:{server.server_port}/__film-player-check')
  assert not errors,errors
  page.wait_for_function('window.v&&!v.paused&&v.readyState>=2')
  page.wait_for_timeout(450)
  assert not page.locator('#filmControls').is_visible()
  assert not page.evaluate('v.controls')
  assert page.locator('#filmChapters button:disabled').count()==3
  assert page.locator('[data-film-time]').count()==0
  assert page.locator('#filmChapters svg').count()==0
  page.mouse.move(250,250);assert not page.locator('#filmControls').is_visible()
  page.screenshot(path=str(artifacts/f'film-player-{width}-entry.png'))
  tap('#filmReveal');assert page.locator('#filmControls').is_visible()
  tap('#filmPlay');page.wait_for_function('v.paused')
  page.locator('#filmSeek').fill('25');page.wait_for_function('Math.abs(v.currentTime-v.duration*.25)<.5')
  tap('#filmMute');assert not page.evaluate('v.muted')
  tap('#filmPlay');page.wait_for_function('!v.paused')
  before=page.evaluate('v.currentTime')
  tap('#filmExpand');assert page.locator('#filmFullscreen').evaluate('e=>e.open')
  page.wait_for_timeout(180)
  mid=page.locator('#filmShooting').bounding_box()
  assert mid['width']<width and mid['width']>width*.4,(width,mid)
  page.wait_for_function('!filmShooting.getAnimations().length')
  bounds=page.locator('#filmShooting').bounding_box()
  assert abs(bounds['width']-width)<2 and abs(bounds['height']-height)<2,bounds
  assert page.evaluate('v.currentTime')>=before
  assert page.locator('#filmFullscreen video').count()==1
  assert not page.evaluate('v.controls')
  assert page.locator('#filmFullscreenClose').is_visible()
  close_style=page.locator('#filmFullscreenClose').evaluate('e=>{e.focus();const s=getComputedStyle(e);return [s.backgroundColor,s.borderTopWidth,s.outlineStyle,s.boxShadow]}')
  assert close_style==['rgba(0, 0, 0, 0)','0px','none','none'],close_style
  page.screenshot(path=str(artifacts/f'film-player-{width}-fullscreen.png'))
  if mobile:tap('#filmFullscreenClose')
  else:page.keyboard.press('Escape')
  # The video still animates home, but the close control must disappear at once.
  assert page.locator('#filmFullscreenClose').is_hidden()
  if mobile:
   page.wait_for_timeout(80)
   page.screenshot(path=str(artifacts/'film-player-mobile-closing.png'))
  page.wait_for_function('!filmFullscreen.open')
  page.wait_for_timeout(650)
  assert page.locator('#filmFullscreenClose').is_hidden()
  assert page.locator('#filmScene .film-frame #sectionVideoSlot video').count()==1
  assert page.evaluate('v.currentTime')>=before
  assert not page.evaluate('v.paused')
  # A rapid close while opening must restore the same node and leave no animation.
  tap('#filmExpand');tap('#filmFullscreenClose')
  page.wait_for_function('!filmFullscreen.open')
  assert not page.locator('#filmShooting').evaluate('e=>e.getAnimations().length')
  # Configure one future work with a real source and verify playback isolation.
  page.evaluate('(src)=>MBFilmPlayer.setWorks([{src,title:"Тестовая работа"}])','/'+source)
  tap('[data-film-work="0"]')
  page.wait_for_function('MBFilmPlayer.workOpen&&filmFullscreen.open&&filmFullscreen.querySelectorAll("video")[1].readyState>=2')
  assert page.evaluate('v.paused')
  page.wait_for_function('!filmShooting.getAnimations().length')
  tap('#filmFullscreenClose');page.wait_for_function('!filmFullscreen.open')
  assert page.locator('#filmScene video').count()==1
  assert not page.evaluate('MBFilmPlayer.workOpen')
  assert not page.evaluate('v.paused')
  # Scroll into editing: controls must stay hidden there and reset on return.
  page.evaluate('MBSections.selectTab(1)');page.wait_for_function('MBSections.state.tab===1')
  assert not page.evaluate('v.controls')
  assert page.locator('#editVideoSlot video').count()==1
  page.evaluate('MBSections.selectTab(0)');page.wait_for_function('MBSections.state.tab===0')
  assert not page.locator('#filmControls').is_visible()
  page.emulate_media(reduced_motion='reduce')
  tap('#filmReveal');tap('#filmExpand')
  page.wait_for_function('!filmShooting.getAnimations().length')
  page.evaluate('MBSections.close()');assert not page.locator('#filmFullscreen').evaluate('e=>e.open')
  assert page.locator('#filmScene video').count()==0
  page.evaluate('MBSections.open(0)');assert not page.locator('#filmControls').is_visible()
  assert not errors,errors
  print('PASS',width,'clean cards/close icon, immediate close-button removal, playback, animated open/close, works, scroll, reduced motion',flush=True)
  context.close()
 browser.close()
server.shutdown()
