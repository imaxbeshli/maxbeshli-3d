"""Repeatable local diagnosis. Chromium software GPU numbers are not hardware FPS guarantees."""
from pathlib import Path
import argparse,functools,http.server,threading,json,time
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--mobile',action='store_true');parser.add_argument('--home-only',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def handle(self):
  try:super().handle()
  except (BrokenPipeError,ConnectionResetError):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
report={'htmlBytes':(root/'index.html').stat().st_size,'mobile':args.mobile,'environment':'headless Chromium / SwiftShader','errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':390 if args.mobile else 1280,'height':844 if args.mobile else 800},device_scale_factor=2 if args.mobile else 1,is_mobile=args.mobile,has_touch=args.mobile);page.set_default_timeout(180000)
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.route('https://fonts.**',lambda r:r.abort())
 page.add_init_script("window.longTasks=[];new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true})")
 started=time.monotonic();page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 report['readyWallSeconds']=round(time.monotonic()-started,2)
 report['startup']=page.evaluate("({firstFrame:MBLoading.firstFrameAt,navigation:performance.getEntriesByType('navigation')[0].toJSON(),longTasks:longTasks,canvas:[renderer.domElement.width,renderer.domElement.height],pixelRatio:renderer.getPixelRatio(),geometry:renderer.info.memory.geometries,textures:renderer.info.memory.textures,casters:(()=>{let n=0;scene.traverse(o=>{if(o.isMesh&&o.castShadow)n++});return n})()})")
 page.evaluate("()=>{window.draws=0;window.renderMs=0;const original=renderer.render.bind(renderer);renderer.render=(...a)=>{const t=performance.now();const r=original(...a);renderMs+=performance.now()-t;draws++;return r}}")
 page.evaluate('loaderBtn.addEventListener("click",()=>{window.auditEntryStart=performance.now()},{once:true})');page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'");report['entryWallSeconds']=round(page.evaluate('(performance.now()-auditEntryStart)/1000'),2)
 def sample(label):
  result=page.evaluate('''async()=>{
   const begin=performance.now(),before=draws,tasks=longTasks.length;let last=begin,gaps=[];renderMs=0;
   await new Promise(resolve=>{function tick(now){gaps.push(now-last);last=now;if(now-begin<5000)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});
   gaps.sort((a,b)=>a-b);return {seconds:(performance.now()-begin)/1000,frames:gaps.length,medianGap:gaps[Math.floor(gaps.length*.5)],p95Gap:gaps[Math.floor(gaps.length*.95)],mainDraws:draws-before,renderMs,longTasks:longTasks.slice(tasks),canvas:[renderer.domElement.width,renderer.domElement.height]};
  }''');report[label]=result;print(label,json.dumps({k:v for k,v in result.items() if k!='longTasks'}),flush=True)
 sample('home')
 for index,label in enumerate([] if args.home_only else ['film','web','telegram']):
  page.evaluate('(i)=>{MBSections.close();phase="section";MBSections.open(i);const e=document.getElementById("ecosystem-modal");e.classList.add("active");e.inert=false;e.style.opacity=1}',index)
  page.wait_for_timeout(800);sample(label)
  if index==1:
   page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=e.scrollHeight');page.wait_for_timeout(600);sample('webVideo')
 if not args.home_only:
  page.evaluate('MBSections.close();phase="orbit";document.getElementById("ecosystem-modal").classList.remove("active");MBAbout.open()');page.wait_for_function('aboutDialog.dataset.glass==="ready"');sample('about')
  page.evaluate('MBAbout.close()');page.wait_for_function('!aboutDialog.open')
 # Force hidden state even though headless Chrome still delivers animation frames.
 page.evaluate('MBSections.close();phase="orbit";Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
 sample('hidden')
 page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
 browser.close()
server.shutdown();Path(args.output).write_text(json.dumps(report,indent=2));print('REPORT',args.output,flush=True)
