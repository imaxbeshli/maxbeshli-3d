from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path(__file__).resolve().parents[1])))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':700,'height':600},device_scale_factor=.5);page.set_default_timeout(90000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 assert page.locator('#selectedWorks,#descentVeil,#descendHint').count()==0
 assert page.evaluate('typeof MBDescent')=='undefined'
 page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.studioEntered && __MB.state.phase==='orbit'")
 print('PASS main loads, lower scene absent',flush=True)
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(500)
 page.evaluate('window.__beforeAboutThree=window.THREE')
 page.context.set_offline(True)
 page.locator('header a[href="#about"]').click();page.wait_for_function('aboutDialog.open');page.wait_for_function('aboutDialog.dataset.glass==="ready"',timeout=180000);page.wait_for_timeout(2200)
 assert page.evaluate('window.THREE === window.__beforeAboutThree && THREE.REVISION === "128"')
 assert page.locator('.about-chapter-count').count()==0
 # Seek across the reveal boundary with non-zero parallax: it must not snap.
 jump=page.evaluate("""()=>{const host=document.querySelector('.about-panel-position');
  host.style.transition='none';aboutDialog.style.setProperty('--px','32px');aboutDialog.style.setProperty('--py','16px');
  host.style.animation='none';void host.offsetWidth;host.style.animation='';
  const entry=host.getAnimations().find(a=>a.animationName==='aboutPanelIn');
  if(!entry)throw new Error('Missing panel reveal animation');
  entry.pause();const timing=entry.effect.getTiming();entry.currentTime=timing.delay+timing.duration-1;
  const before=host.getBoundingClientRect();entry.finish();const after=host.getBoundingClientRect();
  host.style.transition='';aboutDialog.style.setProperty('--px','0px');aboutDialog.style.setProperty('--py','0px');
  return {x:Math.abs(after.x-before.x),y:Math.abs(after.y-before.y)};
 }""")
 assert max(jump.values())<.5,jump
 print('PASS reveal ends without a parallax position jump',flush=True)
 # Exercise abrupt cursor reversals and pointer leave in the real rendered scene.
 trajectory=page.evaluate("""async()=>{
  const value=()=>parseFloat(aboutDialog.style.getPropertyValue('--px'))||0;
  const settle=target=>new Promise((resolve,reject)=>{const start=performance.now(),samples=[];
   function frame(t){samples.push({t,x:value()});if(t-start>700&&Math.abs(value()-target)<.06)resolve(samples);
    else if(t-start>6000)reject(new Error('Parallax did not settle'));else requestAnimationFrame(frame)}
   requestAnimationFrame(frame);
  });
  aboutDialog.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));await settle(0);
  const phases=[];
  for(const [clientX,target] of [[innerWidth,14],[0,-14]]){
   const before=value();aboutDialog.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX,clientY:innerHeight/2}));
   if(Math.abs(value()-before)>.001)throw new Error('Pointer event jumped immediately');
   phases.push(await settle(target));
  }
  const before=value();aboutDialog.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));
  if(Math.abs(value()-before)>.001)throw new Error('Pointer leave snapped to centre');
  phases.push(await settle(0));
  let maxSpeed=0;for(const samples of phases)for(let i=1;i<samples.length;i++){
   const dt=(samples[i].t-samples[i-1].t)/1000;if(dt>0)maxSpeed=Math.max(maxSpeed,Math.abs(samples[i].x-samples[i-1].x)/dt);
  }
  const world=getComputedStyle(document.querySelector('.about-world')),portrait=getComputedStyle(document.querySelector('.about-portrait-motion'));
  return {maxSpeed,counts:phases.map(p=>p.length),end:value(),transitions:[world.transitionProperty,portrait.transitionProperty]};
 }""")
 assert trajectory['maxSpeed']<125 and min(trajectory['counts'])>=4,trajectory
 assert abs(trajectory['end'])<.06,trajectory
 print('PASS inertial pointer reversals and smooth return: '+str(trajectory),flush=True)
 for i in range(3):
  r=page.locator(f'#aboutTab{i}').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.wait_for_timeout(700)
  assert page.locator('.about-chapter:visible').count()==1
  assert page.locator(f'#aboutTab{i}').get_attribute('aria-selected')=='true'
 r=page.locator('#aboutTab0').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.wait_for_timeout(800)
 page.screenshot(path='/tmp/about-final-desktop.png')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1000);page.screenshot(path='/tmp/about-final-mobile.png')
 page.keyboard.press('Escape');page.wait_for_function('!aboutDialog.open')
 assert not errors,errors
 print('PASS full site About cold start without network, chapters, mobile and return',flush=True)
 b.close()
server.shutdown()
