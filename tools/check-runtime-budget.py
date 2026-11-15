"""GPU pixel budget, wall-time entry, and complete suspension in a hidden tab."""
from pathlib import Path
import functools,http.server,threading,time
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
 page=browser.new_page(viewport={'width':700,'height':600},device_scale_factor=.5);page.set_default_timeout(120000)
 errors=[];requested=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requested.append(r.url))
 page.route('https://fonts.**',lambda r:r.abort())
 page.add_init_script("localStorage.setItem('mb-muted','1')")
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 assert not any('avtolab77-intro-scroll' in u or 'background-music' in u for u in requested),'Secondary video/audio downloaded before use'
 assert page.evaluate("__MB.slateObjects[0].video.src.endsWith('/assets/showreel.mp4')"),'SHOWREEL must stream instead of decoding base64'
 page.evaluate('window.realDelta=clock.getDelta.bind(clock);clock.getDelta=()=>{realDelta();return .005}')
 page.evaluate('loaderBtn.addEventListener("click",()=>{window.entryBegin=performance.now()},{once:true})');page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'")
 duration=page.evaluate('(performance.now()-entryBegin)/1000');assert 2.3<duration<5,duration
 page.evaluate('clock.getDelta=realDelta');print('PASS wall-time entry with a slow simulation clock:',round(duration,2),'s',flush=True)
 page.evaluate('''()=>{window.renderCount=0;const draw=renderer.render.bind(renderer);renderer.render=(...a)=>{renderCount++;return draw(...a)};
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
 window.hiddenSnapshot={boat:__MB.lanternBoat.state.elapsed,render:renderCount};}''')
 page.wait_for_timeout(700)
 assert page.evaluate('renderCount===hiddenSnapshot.render && __MB.lanternBoat.state.elapsed===hiddenSnapshot.boat && __MB.slateObjects[0].video.paused')
 assert page.locator('body').evaluate("e=>e.classList.contains('page-hidden')")
 page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_function('renderCount>hiddenSnapshot.render')
 print('PASS hidden tab does no lake rendering or media playback; resume works',flush=True)
 # Use the production policy with a cheap renderer to exercise 4K and slow/fast clocks.
 policy=page.evaluate('''()=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:3840});Object.defineProperty(window,'innerHeight',{configurable:true,value:2160});
  Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:2});
  let ratio=1;const fake={setPixelRatio(v){ratio=v},getPixelRatio(){return ratio},setSize(){}};
  const q=MBRenderQuality.create(fake),high=q.state.pixelRatio;
  if(3840*2160*high*high>2400001)throw Error('4K exceeds pixel budget');
  for(let t=0;t<12000;t+=50)q.observe(t,true);
  const low=q.state.pixelRatio;if(!(low<high&&low>=high*.65-.001))throw Error('No bounded adaptation');
  const held=q.state.pixelRatio;for(let t=12000;t<17000;t+=50)q.observe(t,false);
  if(q.state.pixelRatio!==held)throw Error('Resolution changes during travel');
  for(let t=17000;t<50000;t+=16.67)q.observe(t,true);
  if(q.state.pixelRatio<=low||q.state.pixelRatio>high+.001)throw Error('No gradual recovery');
  return {high,low,recovered:q.state.pixelRatio};
 }''')
 print('PASS 4K budget, bounded adaptation, stable travel, slow recovery:',policy,flush=True)
 assert not errors,errors;browser.close()
server.shutdown()
