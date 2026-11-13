/* One shared WebGL renderer paints the MAIN-page glass geometry behind HTML.
   The helper createAboutFramedGlass is already embedded by embed-about.py and
   shares the main tile's rounded bevel, .36 depth and physical face/edge setup.
   Per-panel 2D canvases receive the result; no extra WebGL context per tile. */
window.createTelegramGlass=function(root){
  let engine=null,loading=false,failed=false,lastPaint=0,dirty=true;
  const records=new Map(),hosts=[...root.querySelectorAll('.tg-glass-host')];
  function hull(points){
    points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const lower=[],upper=[];for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}
    for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}lower.pop();upper.pop();return lower.concat(upper);
  }
  async function init(){
    if(loading||engine||failed)return;loading=true;
    try{
      const T=window.THREE;if(!T||typeof createAboutFramedGlass!=='function')throw new Error('Shared tile geometry unavailable');
      const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.1));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.01,1000),environment=createAboutFrameEnvironment(T);scene.environment=environment;
      scene.add(new T.AmbientLight(0x9aaec5,.48));const key=new T.DirectionalLight(0xe5f4ff,3.2);key.position.set(6.5,7.5,5.5);scene.add(key);
      const rim=new T.DirectionalLight(0xffffff,3);rim.position.set(-5,3,6);scene.add(rim);
      const world=document.querySelector('.section-environment'),url=getComputedStyle(world).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if(!url)throw new Error('Section environment unavailable');
      const background=await new T.TextureLoader().loadAsync(url);background.encoding=T.sRGBEncoding;
      const backdrop=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:background,toneMapped:false}));scene.add(backdrop);
      engine={T,renderer,scene,camera,environment,world,background,backdrop,key,flip:new T.Matrix4().makeScale(1,-1,1)};
      renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hosts.forEach(h=>h.classList.remove('glass-ready'))});
      renderer.domElement.addEventListener('webglcontextrestored',()=>{failed=false;dirty=true});
      root.dataset.glass='ready';dirty=true;
    }catch(e){failed=true;root.dataset.glass='fallback';console.warn('Telegram glass fallback:',e.message)}finally{loading=false}
  }
  function disposeRecord(record){record.pane.geometry.dispose();record.pane.material.forEach(m=>m.dispose())}
  function paint(host,now){
    const e=engine,panel=host.querySelector('.tg-glass-panel'),canvas=host.querySelector('.tg-glass-canvas'),w=panel.offsetWidth,h=panel.offsetHeight;
    if(!w||!h)return;
    const css=getComputedStyle(panel),pad=innerWidth<901?14:32,unit=w/6,cw=w+pad*2,ch=h+pad*2,perspective=parseFloat(getComputedStyle(host).perspective)||1400;
    let r=records.get(host);
    if(!r||r.w!==w||r.h!==h||r.pad!==pad){
      if(r)disposeRecord(r);
      const pane=createAboutFramedGlass(e.T,{width:6,height:h/unit,environment:e.environment});pane.matrixAutoUpdate=false;
      const positions=pane.geometry.attributes.position,unique=new Map();
      for(let i=0;i<positions.count;i++){const v=new e.T.Vector3().fromBufferAttribute(positions,i);unique.set(v.toArray().map(n=>n.toFixed(4)).join(','),v)}
      r={w,h,pad,pane,vertices:[...unique.values()],transform:null,outline:null};records.set(host,r);
      canvas.style.cssText=`left:${-pad}px;top:${-pad}px;width:${cw}px;height:${ch}px`;
    }
    if(e.renderWidth!==cw||e.renderHeight!==ch){e.renderer.setSize(cw,ch,false);e.renderWidth=cw;e.renderHeight=ch}
    const dpr=e.renderer.getPixelRatio();
    if(canvas.width!==Math.round(cw*dpr)||canvas.height!==Math.round(ch*dpr)){canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr)}
    e.camera.fov=2*Math.atan(ch/(2*perspective))*180/Math.PI;e.camera.aspect=cw/ch;e.camera.position.set(0,0,perspective/unit);e.camera.lookAt(0,0,0);e.camera.updateProjectionMatrix();e.camera.updateMatrixWorld();
    if(r.transform!==css.transform){
      const matrix=new e.T.Matrix4().fromArray(new DOMMatrix(css.transform).toFloat64Array());matrix.elements[12]/=unit;matrix.elements[13]/=unit;matrix.elements[14]/=unit;matrix.premultiply(e.flip).multiply(e.flip);
      r.pane.matrix.copy(matrix);r.pane.updateMatrixWorld(true);
      r.outline=hull(r.vertices.map(v=>{const p=v.clone().applyMatrix4(matrix).project(e.camera);return [(p.x+1)*cw/2,(1-p.y)*ch/2]}));r.transform=css.transform;
    }
    // Use the background's actual cover/crop and parallax position for refraction.
    const world=e.world.getBoundingClientRect(),box=host.getBoundingClientRect(),img=e.background.image,cover=Math.max(world.width/img.width,world.height/img.height),depth=8,factor=1+depth/e.camera.position.z;
    e.backdrop.position.set(((world.left+world.width/2)-(box.left+w/2))/unit*factor,-((world.top+world.height/2)-(box.top+h/2))/unit*factor,-depth);
    e.backdrop.scale.set(img.width*cover/unit*factor,img.height*cover/unit*factor,1);
    e.key.position.x=6.5+(matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(now*.00018)*.8);
    e.scene.add(r.pane);e.renderer.render(e.scene,e.camera);e.scene.remove(r.pane);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);ctx.save();ctx.beginPath();r.outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(e.renderer.domElement,0,0,cw,ch);ctx.restore();host.classList.add('glass-ready');
  }
  return {invalidate(){dirty=true;init()},update(now){
    if(!engine){init();return}if(failed||document.hidden||(!dirty&&now-lastPaint<(innerWidth<541?66:42)))return;
    lastPaint=now;dirty=false;hosts.forEach(h=>{if(h.getClientRects().length&&!h.closest('[hidden]'))paint(h,now)});
  }};
};
