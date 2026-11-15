"""Check rendered video geometry and opaque edges throughout fullscreen transitions."""
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
from PIL import Image
import io
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,mobile in [(1440,900,False),(390,844,True)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
  page.goto(f'http://127.0.0.1:{server.server_port}/__film-player-check')
  page.wait_for_function('window.v&&!v.paused&&v.readyState>=2')
  # A real circular video image reveals any unequal X/Y scaling, independent
  # of which CSS properties implement the transition. Magenta behind it
  # reveals stale poster/canvas pixels leaking into the letterbox area.
  page.evaluate("""async()=>{
   const c=document.createElement('canvas');c.width=640;c.height=360;
   const ctx=c.getContext('2d');ctx.fillStyle='#050607';ctx.fillRect(0,0,640,360);
   ctx.fillStyle='#10ff20';ctx.beginPath();ctx.arc(320,180,70,0,Math.PI*2);ctx.fill();
   window.geometryStream=c.captureStream(1);v.srcObject=geometryStream;await v.play();
   sectionVideoSlot.style.backgroundImage='linear-gradient(#ff00ff,#ff00ff)';
   const still=document.createElement('canvas');still.className='film-held-frame';still.width=640;still.height=360;
   still.getContext('2d').fillStyle='#ff00ff';still.getContext('2d').fillRect(0,0,640,360);sectionVideoSlot.prepend(still);
  }""")
  page.wait_for_function('v.videoWidth===640&&v.videoHeight===360')
  page.wait_for_timeout(700)
  def check(label):
   rect=page.locator('#sectionVideoSlot').bounding_box()
   raw=page.screenshot();(artifacts/f'geometry-debug-{width}-{label}.png').write_bytes(raw)
   image=Image.open(io.BytesIO(raw)).convert('RGB')
   x0,y0,x1,y1=[round(n) for n in (rect['x']+2,rect['y']+2,rect['x']+rect['width']-2,rect['y']+rect['height']-2)]
   image=image.crop((max(0,x0),max(0,y0),min(width,x1),min(height,y1)))
   green=[];pink=0
   for y in range(image.height):
    for x in range(image.width):
     r,g,b=image.getpixel((x,y))
     if g>180 and r<60 and b<80:green.append((x,y))
     if r>170 and b>170 and g<80:pink+=1
   assert green,(width,label,'No circle in visible video')
   circle_width=max(x for x,y in green)-min(x for x,y in green)+1
   circle_height=max(y for x,y in green)-min(y for x,y in green)+1
   ratio=circle_width/circle_height
   print(width,label,'circle ratio',round(ratio,4),'leaked pixels',pink,flush=True)
   assert abs(ratio-1)<.035,(width,label,'Video distorted',ratio)
   assert pink==0,(width,label,'Poster/held frame showing through video',pink)
   if label=='closing-middle':image.save(str(artifacts/f'film-geometry-{width}-closing.png'))
  def freeze(time):
   page.evaluate('(time)=>{const a=filmShooting.getAnimations()[0];a.pause();a.currentTime=time}',time)
   page.wait_for_timeout(35)
  # Check the normal frame as well as both directions at intermediate times.
  check('inline')
  page.locator('#filmReveal').click(force=True);page.locator('#filmExpand').click(force=True)
  freeze(260);check('opening-middle')
  page.evaluate('filmShooting.getAnimations()[0].finish()');page.wait_for_function('!filmShooting.getAnimations().length')
  check('fullscreen')
  page.locator('#filmExpand').click(force=True)
  freeze(260);check('closing-middle')
  freeze(510);check('closing-end')
  assert page.locator('#filmFullscreenClose').count()==0
  page.evaluate('filmShooting.getAnimations()[0].finish()');page.wait_for_function('!filmFullscreen.open')
  check('returned')
  page.evaluate('geometryStream.getTracks().forEach(track=>track.stop())')
  page.close()
 browser.close()
server.shutdown()
