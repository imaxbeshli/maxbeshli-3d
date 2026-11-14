"""The foreground support is closed and seals the old gaps above water level."""
from pathlib import Path
import functools,http.server,threading
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':700,'height':600},device_scale_factor=.5);page.set_default_timeout(120000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader' in m.text or 'WebGL' in m.text) else None)
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.ready')
 result=page.evaluate('''()=>{
   const rock=__MB.rocks[1],body=rock.getObjectByName('Closed foreground rock base'),g=body.geometry,edges=new Map();
   const idx=g.index.array;
   for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){
     const a=idx[i+j],b=idx[i+(j+1)%3],key=Math.min(a,b)+':'+Math.max(a,b);
     edges.set(key,(edges.get(key)||0)+1);
   }
   rock.updateWorldMatrix(true,true);
   const pos=g.attributes.position;let rays=0,beforeLeaks=0,afterLeaks=0;
   for(let column=1;column<320;column++){
     const ridge=new THREE.Vector3().fromBufferAttribute(pos,column*25);
     if(ridge.y<.06)continue;
     for(const height of [.005,.025,.05]){
       const origin=new THREE.Vector3(ridge.x,height,2);rock.localToWorld(origin);
       const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1));
       rays++;if(!ray.intersectObject(rock,false).length)beforeLeaks++;
       if(!ray.intersectObject(rock,true).length)afterLeaks++;
     }
   }
   return {rays,beforeLeaks,afterLeaks,openEdges:[...edges.values()].filter(n=>n!==2).length,
     opaque:!body.material.transparent&&body.material.depthWrite};
 }''')
 print(result,flush=True)
 assert result['openEdges']==0 and result['opaque'],result
 assert result['rays']>500 and result['beforeLeaks']>0 and result['afterLeaks']==0,result
 # Sample the real approach, including changing defocus and both aspect ratios.
 page.locator('#loaderBtn').click()
 page.evaluate("clock.getDelta=()=>0;preloader.hidden=true;preloader.classList.add('hidden');mouseX=mouseY=parallaxX=parallaxY=0")
 for width,height in [(1280,800),(400,680)]:
  page.set_viewport_size({'width':width,'height':height})
  for progress in [0,.35,.7,1]:
   page.evaluate("p=>{phase='entering';entryElapsed=ENTRY_DURATION*p}",progress)
   page.wait_for_timeout(200)
   page.screenshot(path=f'/workspace/artifacts/entry-after-{width}-{progress}.png')
  print('PASS entry render',width,flush=True)
 assert not errors,errors
 b.close()
server.shutdown()
