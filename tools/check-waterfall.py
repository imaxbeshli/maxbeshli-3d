from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,functools,json,base64,io
from PIL import Image, ImageChops, ImageStat
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path(__file__).resolve().parents[1])))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':700,'height':600},device_scale_factor=.5);page.set_default_timeout(120000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' and ('Shader' in msg.text or 'WebGL' in msg.text) else None)
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'")
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(1500)
 assert page.locator('#logoGlitch').count()==1
 assert page.locator('#mainHeader nav').count()==0
 assert page.locator('#mainHeader a,#mainHeader button').count()==3
 page.screenshot(path='/tmp/waterfall-desktop.png')
 print('SOURCE',page.evaluate('({time:MBWaterfall.uniforms.uFallTime.value,source:__MB.water.material.uniforms.uFallSource.value.toArray(),scale:__MB.backdrop.scale.x})'),flush=True)
 # Project the actual fall and impact from plate UV into screen space.
 bounds=page.evaluate('''()=>{const b=__MB.backdrop,c=__MB.camera;return [[.309,.265],[.309,.582]].map(([x,y])=>{let v=new THREE.Vector3((x-.5)*46,(.5-y)*26.6,.01);b.localToWorld(v);v.project(c);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]})}''')
 print('FALL PROJECTION',json.dumps(bounds),flush=True)
 assert 430<bounds[0][0]<600, bounds
 t=page.evaluate('MBWaterfall.uniforms.uFallTime.value');page.wait_for_timeout(1300)
 assert page.evaluate('MBWaterfall.uniforms.uFallTime.value')>t
 page.screenshot(path='/tmp/waterfall-desktop-later.png')
 # Render the same photographic material twice in an isolated, fixed camera.
 # Only fluid pixels may change; the source cliffs must remain perfectly still.
 frames=page.evaluate("""()=>{
  const T=THREE,r=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});r.setSize(836,471);r.outputEncoding=T.sRGBEncoding;
  const sc=new T.Scene(),cam=new T.OrthographicCamera(-.5,.5,.5,-.5,.1,5);cam.position.z=1;
  const m=MBWaterfall.material(T,__MB.backdrop.material.map),geo=new T.PlaneGeometry(1,1);sc.add(new T.Mesh(geo,m));
  const frames=[0,.8].map(t=>{MBWaterfall.update(t);r.render(sc,cam);return r.domElement.toDataURL().split(',')[1]});
  geo.dispose();m.dispose();r.dispose();r.forceContextLoss();return frames;
 }""")
 images=[Image.open(io.BytesIO(base64.b64decode(f))).convert('RGB') for f in frames]
 diff=ImageChops.difference(*images)
 flowing=ImageStat.Stat(diff.crop((247,125,267,267))).mean
 cliffs=ImageStat.Stat(diff.crop((400,50,800,240))).mean
 assert max(flowing)>1,flowing
 assert max(cliffs)==0,cliffs
 print('PASS flowing water changes, cliffs remain stationary',flowing,flush=True)
 # Existing pointer event path must still stamp real world-space cursor wakes.
 before=page.evaluate('__MB.water.ripples.map(v=>v.z)')
 page.mouse.move(300,730)
 for x in range(300,680,35):page.mouse.move(x,740);page.wait_for_timeout(80)
 after=page.evaluate('__MB.water.ripples.map(v=>v.z)')
 assert before!=after,'Pointer water wakes stopped'
 page.locator('#logoGlitch').click();page.wait_for_function('__MB.state.glitchActive');print('PASS logo glitch and pointer wakes',flush=True)
 page.wait_for_function('!__MB.state.glitchActive')
 for width,height in [(390,844),(320,568)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(1100)
  for selector in ['#logoGlitch','#soundToggle','#mainHeader .cta-btn']:
   r=page.locator(selector).bounding_box();assert r['x']>=-1 and r['x']+r['width']<=width+1,(width,r)
  point=page.evaluate('''()=>{let v=new THREE.Vector3((MBWaterfall.center-.5)*46,(.5-.45)*26.6,.01);__MB.backdrop.localToWorld(v);v.project(__MB.camera);return (v.x+1)*innerWidth/2}''')
  assert 0<point<width,(width,point)
  page.screenshot(path=f'/tmp/waterfall-mobile-{width}.png')
  print('PASS viewport',width,flush=True)
 assert not errors,errors
 b.close()
server.shutdown()
