"""Boat timing, shared water reflection, pause/resume and cursor wake regression."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools,base64,io
from PIL import Image,ImageChops
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
 # A mirror render is required for EVERY visible frame, including steady state.
 # This reproduces the former half-rate path without relying on wall-clock FPS.
 assert page.evaluate("""()=>{
   let renders=0;const T=THREE,scene=new T.Scene();
   const renderer={getRenderTarget:()=>null,setRenderTarget:()=>{},clear:()=>{},render:()=>renders++};
   const w=MBEnvironment.water(T,scene,renderer,-2.02);
   for(let i=0;i<12;i++)w.update(i/60,__MB.camera,1);
   const map=w.material.uniforms.uReflection.value;
   return renders===12&&map.generateMipmaps&&map.minFilter===T.LinearMipmapLinearFilter;
 }""")
 print('PASS reflection refreshed on every frame with mip filtering',flush=True)
 # Advance the real update path deterministically; freeze only the boat for visual checks.
 page.evaluate('''()=>{
   const b=__MB.lanternBoat;window.boatUpdate=b.update;let now=elapsed*1000;
   for(let i=0;i<370;i++)b.update(now+i*50,true,__MB.backdrop);
   const before=b.state.elapsed;b.update(now+19000,false,__MB.backdrop);
   if(b.state.elapsed!==before)throw Error('Boat clock advances while paused');
   b.update=()=>{};
 }''')
 assert page.evaluate('__MB.lanternBoat.root.visible && __MB.water.material.uniforms.uBoat.value.z>.9')
 page.set_viewport_size({'width':1440,'height':900});page.mouse.move(1400,850);page.wait_for_timeout(1600)
 # Align again after the responsive backdrop has settled.
 page.evaluate('boatUpdate(elapsed*1000,false,__MB.backdrop)')
 page.wait_for_timeout(400);page.screenshot(path='/tmp/lantern-boat-desktop.png')
 # Compare identical renders: the visible wake must affect water behind the stern.
 frames=page.evaluate("""()=>{
   const u=water.material.uniforms.uBoat.value,strength=u.z,t=elapsed;
   const frames=[strength,0].map(z=>{u.z=z;water.update(t,camera,lightReveal);renderer.render(scene,camera);return renderer.domElement.toDataURL().split(',')[1]});
   u.z=strength;
   return frames;
 }""")
 images=[Image.open(io.BytesIO(base64.b64decode(f))).convert('RGB') for f in frames]
 diff=ImageChops.difference(*images);bbox=diff.getbbox();assert bbox,'Boat wake is invisible'
 visible=sum(max(px)>4 for px in diff.getdata());assert visible>30,visible
 images[0].save('/workspace/artifacts/boat-wake-desktop.png')
 diff.save('/workspace/artifacts/boat-wake-difference.png')
 print('PASS visible trailing wake:',visible,'pixels, bounds',bbox,flush=True)
 print('PASS delayed passage, pause, fade and 65-second rest',flush=True)
 print('BOAT',page.evaluate('''()=>{const b=__MB.lanternBoat,v=b.root.position.clone().project(__MB.camera);return {state:b.state,position:b.root.position.toArray(),screen:[(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}}'''),flush=True)
 # Observe actual main/mirror passes during motion, not just a still screenshot.
 page.evaluate("""()=>{
  const b=__MB.lanternBoat;b.update=boatUpdate;boatUpdate(elapsed*1000,false,__MB.backdrop);
  window.boatPasses=[];
  b.root.getObjectByName('Smooth planked wooden hull').onBeforeRender=(_,scene,camera)=>{
   boatPasses.push({mirror:camera===__MB.water.mirror,time:__MB.water.material.uniforms.uTime.value,x:b.root.position.x});
  };
 }""")
 page.wait_for_function('new Set(boatPasses.filter(p=>!p.mirror).map(p=>p.time)).size>=12')
 assert page.evaluate("""()=>{
   const main=boatPasses.filter(p=>!p.mirror),mirror=boatPasses.filter(p=>p.mirror);
   const synchronous=main.every(p=>mirror.some(r=>r.time===p.time&&Math.abs(r.x-p.x)<1e-9));
   const xs=main.map(p=>p.x);
   return synchronous&&xs.at(-1)>xs[0]&&xs.every((x,i)=>i===0||Math.abs(x-xs[i-1])<.04);
 }"""), 'Moving boat and mirror must share the same pose on every frame'
 page.evaluate("__MB.lanternBoat.root.getObjectByName('Smooth planked wooden hull').onBeforeRender=()=>{}")
 print('PASS moving hull and reflection remain synchronous across 12 frames',flush=True)
 before=page.evaluate('__MB.water.ripples.map(v=>v.z)')
 for x in range(200,620,35):page.mouse.move(x,770);page.wait_for_timeout(80)
 assert page.evaluate('__MB.water.ripples.map(v=>v.z)')!=before
 print('PASS cursor wakes with boat wake active',flush=True)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1000)
 page.evaluate('boatUpdate(elapsed*1000,false,__MB.backdrop)');page.wait_for_timeout(400)
 page.screenshot(path='/tmp/lantern-boat-mobile.png')
 # Once the boat disappears, residual ripples fade instead of being cut off.
 assert page.evaluate("""()=>{
   const b=__MB.lanternBoat;b.update=()=>{};let now=elapsed*1000;
   boatUpdate(now,false,__MB.backdrop);
   while(b.state.elapsed<38.1){now+=50;boatUpdate(now,true,__MB.backdrop);}
   const lingering=water.material.uniforms.uBoat.value.z;
   while(b.state.elapsed<56){now+=50;boatUpdate(now,true,__MB.backdrop);}
   return !b.root.visible&&lingering>.05&&water.material.uniforms.uBoat.value.z<.001;
 }"""),'Wake must linger briefly and then disappear during the rest'
 print('PASS wake fades naturally after the boat leaves',flush=True)
 assert not errors,errors
 print('PASS desktop/mobile render without shader errors',flush=True)
 b.close()
server.shutdown()
