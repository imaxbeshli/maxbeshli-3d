"""Boat timing, shared water reflection, pause/resume and cursor wake regression."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':700,'height':600},device_scale_factor=.75);page.set_default_timeout(120000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader' in m.text or 'WebGL' in m.text) else None)
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 assert page.evaluate('!__MB.lanternBoat.root.visible && __MB.lanternBoat.state.elapsed===0')
 assert page.evaluate('''()=>{
  const s=MBLanternBoat.sample;
  return !s(9.99).visible&&s(10).opacity===0&&s(24).opacity===1&&!s(38).visible&&!s(102.99).visible&&s(103).visible&&s(103).opacity===0;
 }''')
 page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'")
 assert page.evaluate('__MB.lanternBoat.state.elapsed<10 && !__MB.lanternBoat.root.visible')
 # Advance the real update path deterministically; freeze only the boat for visual checks.
 page.evaluate('''()=>{
   const b=__MB.lanternBoat;window.boatUpdate=b.update;let now=performance.now();
   for(let i=0;i<92;i++)b.update(now+i*200,true,__MB.backdrop);
   const before=b.state.elapsed;b.update(now+19000,false,__MB.backdrop);
   if(b.state.elapsed!==before)throw Error('Boat clock advances while paused');
   b.update=()=>{};
 }''')
 assert page.evaluate('__MB.lanternBoat.root.visible && __MB.water.material.uniforms.uBoat.value.z>.9')
 page.set_viewport_size({'width':1440,'height':900});page.mouse.move(1400,850);page.wait_for_timeout(1600)
 # Align again after the responsive backdrop has settled.
 page.evaluate('boatUpdate(performance.now(),false,__MB.backdrop)')
 page.wait_for_timeout(400);page.screenshot(path='/tmp/lantern-boat-desktop.png')
 print('PASS delayed passage, pause, fade and 65-second rest',flush=True)
 print('BOAT',page.evaluate('''()=>{const b=__MB.lanternBoat,v=b.root.position.clone().project(__MB.camera);return {state:b.state,position:b.root.position.toArray(),screen:[(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}}'''),flush=True)
 before=page.evaluate('__MB.water.ripples.map(v=>v.z)')
 for x in range(200,620,35):page.mouse.move(x,770);page.wait_for_timeout(80)
 assert page.evaluate('__MB.water.ripples.map(v=>v.z)')!=before
 print('PASS cursor wakes with boat wake active',flush=True)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1000)
 page.evaluate('boatUpdate(performance.now(),false,__MB.backdrop)');page.wait_for_timeout(400)
 page.screenshot(path='/tmp/lantern-boat-mobile.png')
 assert not errors,errors
 print('PASS desktop/mobile render without shader errors',flush=True)
 b.close()
server.shutdown()
