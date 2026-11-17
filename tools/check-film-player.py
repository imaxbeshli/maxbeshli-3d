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
  assert page.locator('#filmChapters button:disabled').count()==0
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
  assert page.locator('#filmFullscreenClose').count()==0
  page.screenshot(path=str(artifacts/f'film-player-{width}-fullscreen.png'))
  page.evaluate('''()=>{
   window.returnFrames=[];const start=performance.now();
   const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
   function sample(){returnFrames.push({open:filmFullscreen.open,box:rect(filmShooting),bar:rect(filmControls)});if(performance.now()-start<1100)requestAnimationFrame(sample)}
   sample();
  }''')
  if mobile:tap('#filmExpand')
  else:page.keyboard.press('Escape')
  assert page.locator('#filmFullscreenClose').count()==0
  if mobile:
   page.wait_for_timeout(80)
   page.screenshot(path=str(artifacts/'film-player-mobile-closing.png'))
  page.wait_for_function('!filmFullscreen.open')
  page.wait_for_timeout(650)
  assert page.locator('#filmFullscreenClose').count()==0
  frames=page.evaluate('returnFrames');end=next(i for i,f in enumerate(frames) if not f['open'])
  for key in ['box','bar']:
   jump=max(abs(a-b) for a,b in zip(frames[end-1][key],frames[end][key]))
   assert jump<.4,(width,key,'Jump when returning',jump)
  offsets=[f['bar'][1]-f['box'][1] for f in frames[end:]]
  assert max(offsets)-min(offsets)<.4,(width,'Controls replayed an entrance slide',offsets)
  assert page.locator('#filmScene .film-frame #sectionVideoSlot video').count()==1
  assert page.evaluate('v.currentTime')>=before
  assert not page.evaluate('v.paused')
  # A rapid close while opening must restore the same node and leave no animation.
  tap('#filmExpand');page.keyboard.press('Escape')
  page.wait_for_function('!filmFullscreen.open')
  assert not page.locator('#filmShooting').evaluate('e=>e.getAnimations().length')
  # Browse the rail using genuine wheel and touch input.
  rail=page.locator('#filmChapters');rail.scroll_into_view_if_needed()
  bounds=rail.bounding_box();x=bounds['x']+bounds['width']*.75;y=bounds['y']+25
  if mobile:
   cdp=context.new_cdp_session(page)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for dx in [30,60,90,120,150]:
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-dx,'y':y}]});page.wait_for_timeout(30)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:
   page.evaluate("""()=>{window.railSamples=[];const start=performance.now();function sample(){railSamples.push(filmChapters.scrollLeft);if(performance.now()-start<700)requestAnimationFrame(sample)}sample()}""")
   page.mouse.move(x,y);page.mouse.wheel(0,220)
   page.wait_for_timeout(800)
   samples=page.evaluate('railSamples')
   assert len(set(round(n) for n in samples))>5,samples
   assert max(abs(b-a) for a,b in zip(samples,samples[1:]))<60,samples
   assert 60<rail.evaluate('e=>e.scrollLeft')<rail.evaluate('e=>e.scrollWidth-e.clientWidth')
   # Drag across an image: gradual movement, no native image drag or accidental playback.
   before=rail.evaluate('e=>e.scrollLeft')
   page.mouse.move(x,y);page.mouse.down()
   for dx in [8,16,24,32,40]:
    page.mouse.move(x+dx,y);page.wait_for_timeout(35)
   page.mouse.up();page.wait_for_timeout(500)
   after=rail.evaluate('e=>e.scrollLeft')
   assert 25<before-after<55,(before,after)
   assert not page.evaluate('MBFilmPlayer.workOpen')
   assert not rail.evaluate('e=>e.classList.contains("is-dragging")')
  page.wait_for_function('filmChapters.scrollLeft>20')
  assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  # Verify all real works, captions and independent playback on desktop and mobile.
  for index,title,category_text in [(0,'FINISTAUTO','Рекламный ролик'),(1,'ПСКОВ','Культурный проект'),(2,'BACKSTAGE','Как это было'),(3,'ВНУТРЕННЯЯ СИЛА','Мотивационный ролик')]:
   selector=f'[data-film-work="{index}"]'
   page.locator(selector).scroll_into_view_if_needed()
   page.wait_for_timeout(150)
   assert page.locator(selector+' b').inner_text()==title
   assert page.locator(selector+' small').inner_text()==category_text
   assert page.locator(selector+' b').is_visible()
   assert page.locator(selector+' b').evaluate('(e)=>getComputedStyle(e).fontWeight')==page.locator('[data-film-work="0"] b').evaluate('(e)=>getComputedStyle(e).fontWeight')
   caption=page.locator(selector+' .film-work-caption').bounding_box()
   picture=page.locator(selector+' img').bounding_box()
   assert caption['y']>=picture['y']+picture['height']-2
   client=page.locator(selector+' b').bounding_box()
   category=page.locator(selector+' small').bounding_box()
   assert client['x']+client['width']<=category['x'],(client,category)
   page.screenshot(path=str(artifacts/f'film-work-{index}-{width}-card.png'))
   tap(selector)
   page.wait_for_function('MBFilmPlayer.workOpen&&!filmFullscreen.open&&sectionVideoSlot.querySelectorAll("video")[1].readyState>=2')
   assert page.evaluate('v.paused')
   assert page.locator('#sectionVideoSlot video').last.evaluate('(v)=>!v.hasAttribute("poster")&&v.autoplay')
   expected='/assets/'+['finistauto','pskov','backstage','inner-strength'][index]+'.mp4'
   assert page.locator('#sectionVideoSlot video').last.evaluate('(v)=>new URL(v.currentSrc).pathname')==expected
   page.wait_for_function('!sectionVideoSlot.querySelectorAll("video")[1].paused&&sectionVideoSlot.querySelectorAll("video")[1].currentTime>0')
   page.wait_for_function('!filmShooting.getAnimations().length')
   assert not page.locator('#filmControls').is_visible()
   tap('#filmReveal');tap('#filmExpand')
   page.wait_for_function('filmFullscreen.open&&!filmShooting.getAnimations().length')
   assert page.locator('#filmFullscreen video').last.evaluate('(v)=>new URL(v.currentSrc).pathname')==expected
   tap('#filmExpand');page.wait_for_function('!filmFullscreen.open')
   assert page.locator('#sectionVideoSlot video').count()==2
   assert page.evaluate('MBFilmPlayer.workOpen&&v.paused')
  assert page.locator('#filmChapters').evaluate('e=>e.scrollLeft>0&&e.scrollWidth>e.clientWidth')
  assert page.locator('#filmShowreel').count()==0
  assert page.locator('.film-control-row > :first-child').get_attribute('id')=='filmPlay'
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
  print('PASS',width,'no fullscreen cross, steady return geometry, playback, animated open/close, works, scroll, reduced motion',flush=True)
  context.close()
 browser.close()
server.shutdown()
