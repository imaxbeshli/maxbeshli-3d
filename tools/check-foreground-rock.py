"""Foreground opacity, soft silhouette and waterfall alignment during navigation."""
from pathlib import Path
import base64, functools, http.server, io, json, re, sys, threading
import numpy as np
from PIL import Image
from scipy.ndimage import binary_erosion
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
baseline='--baseline' in sys.argv
label='before' if baseline else 'after'
coverage_only='--coverage-only' in sys.argv
masks=[]
for name in ['MB_FOREGROUND_URL','MB_ISLAND_URL']:
    asset=re.search(r"window."+name+r"='data:image/webp;base64,([^']+)'",(root/'index.html').read_text())[1]
    alpha=np.array(Image.open(io.BytesIO(base64.b64decode(asset))).getchannel('A'))
    masks.append((binary_erosion(alpha>=32,iterations=16)[::2,::2],((alpha>0)&(alpha<224))[::2,::2]))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
    page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader' in m.text or 'WebGL' in m.text) else None)
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    if coverage_only:
        page.evaluate('__MB.rocks[1].material.userData.defocus.amount.value=7;phase="inspection"')
    else:
        page.locator('#loaderBtn').click();page.wait_for_function("__MB.state.phase==='orbit'")
    page.evaluate('mouseX=mouseY=0')
    # Bright moving content behind a solid part of the rock must not leak through.
    stats=[]
    for index,(interior,edge) in zip([1,0],masks):
        frames=page.evaluate('''index=>{
          const T=THREE,r=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
          const mat=__MB.rocks[index].material,img=mat.map.image;
          const oldDefocus=mat.userData.defocus?.amount.value;
          if(mat.userData.defocus)mat.userData.defocus.amount.value=7;
          const width=Math.ceil(img.width/2),height=Math.ceil(img.height/2);
          r.setSize(width,height);r.outputEncoding=T.sRGBEncoding;
          const sc=new T.Scene(),cam=new T.OrthographicCamera(-.5,.5,height/width/2,-height/width/2,.1,5);cam.position.z=1;
          const geo=new T.PlaneGeometry(1,height/width);sc.add(new T.Mesh(geo,mat));
          const frames=[0xff0000,0x0000ff].map(color=>{
            sc.background=new T.Color(color);r.render(sc,cam);return r.domElement.toDataURL().split(',')[1];
          });
          if(mat.userData.defocus)mat.userData.defocus.amount.value=oldDefocus;
          geo.dispose();r.dispose();r.forceContextLoss();return frames;
        }''',index)
        images=[np.array(Image.open(io.BytesIO(base64.b64decode(f))).convert('RGB'),dtype=np.int16) for f in frames]
        diff=np.max(np.abs(images[0]-images[1]),axis=2)
        item={'rock':index,'interior_pixels':int(interior.sum()),'leaking_pixels':int((diff[interior]>1).sum()),'maximum_leak':int(diff[interior].max()),'soft_edge_pixels':int((diff[edge]>1).sum())}
        stats.append(item);print('ROCK COVERAGE',item,flush=True)
        if not baseline:
            assert item['maximum_leak']<=1,item
            assert item['soft_edge_pixels']>100,item
    results=[]
    for width,height in ([] if coverage_only else [(1280,800),(2560,1080),(400,680)]):
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300)
        page.evaluate('mouseX=mouseY=0;currentProgress=targetProgress=1;velocity=coastVelocity=0')
        page.wait_for_timeout(300)
        fall=page.evaluate('''()=>{
          const b=__MB.backdrop,c=__MB.camera;
          const source=b.position.x+(MBWaterfall.center-.5)*46*b.scale.x;
          const v=new THREE.Vector3((MBWaterfall.center-.5)*46,(.5-.45)*26.6,.01);b.localToWorld(v);v.project(c);
          return {x:(v.x+1)*innerWidth/2,reflectionError:Math.abs(source-__MB.water.material.uniforms.uFallSource.value.x)};
        }''')
        assert 0<fall['x']<width and fall['reflectionError']<1e-6,(width,fall)
        results.append({'width':width,'height':height,**fall})
        page.screenshot(path=f'/workspace/artifacts/rock-{label}-{width}-orbit.png')
        if width==2560:continue
        page.evaluate('__MB.focusTile(1)');page.wait_for_function("__MB.state.phase==='focused'")
        page.screenshot(path=f'/workspace/artifacts/rock-{label}-{width}-focused.png')
        page.evaluate('__MB.returnToOrbit();mouseX=mouseY=0')
        page.wait_for_function('__MB.state.zoomFactor<.001 && camera.position.distanceTo(BASE_CAM_POS)<.002')
        # Browse all cards and return to the original tile without changing the rock.
        for i in [2,0,1]:
            page.evaluate('(i)=>{currentProgress=targetProgress=i;velocity=coastVelocity=0}',i)
            page.wait_for_timeout(200)
        print(f'PASS {width}x{height}: focus, orbit and waterfall reflection alignment',flush=True)
    Path(f'/workspace/artifacts/foreground-{label}{"-coverage" if coverage_only else ""}-metrics.json').write_text(json.dumps({'coverage':stats,'waterfall':results},indent=2))
    assert not errors,errors
    browser.close()
server.shutdown()
