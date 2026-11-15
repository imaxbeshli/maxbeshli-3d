/* Cache the main tile's beveled geometry and highlights behind each HTML panel.
   The browser composites the live background through CSS glass; never copy a
   viewport-dependent background into a canvas while the page is scrolling.
   One shared WebGL context renders only when panel geometry changes. */
window.createTelegramGlass=function(root){
  let engine=null,loading=false,failed=false;
  const records=new Map(),hosts=[...root.querySelectorAll('.tg-glass-host')];
  const pending=new Set(hosts),visible=new Set();
  const intersection=new IntersectionObserver(entries=>{
    for(const entry of entries){if(entry.isIntersecting){visible.add(entry.target);pending.add(entry.target)}else visible.delete(entry.target)}
  },{root:document.getElementById('ecosystem-modal'),rootMargin:'80px'});
  const resize=new ResizeObserver(entries=>{
    for(const entry of entries){
      const host=entry.target.closest('.tg-glass-host'),record=records.get(host);
      if(record&&(record.w!==entry.target.offsetWidth||record.h!==entry.target.offsetHeight))host.classList.remove('glass-ready');
      pending.add(host);
    }
  });
  hosts.forEach(host=>{intersection.observe(host);resize.observe(host.querySelector('.tg-glass-panel'))});
  window.addEventListener('resize',()=>hosts.forEach(host=>pending.add(host)),{passive:true});
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
      engine={T,renderer,scene,camera,environment,flip:new T.Matrix4().makeScale(1,-1,1)};
      renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;hosts.forEach(h=>h.classList.remove('glass-ready'))});
      renderer.domElement.addEventListener('webglcontextrestored',()=>{failed=false;records.forEach(r=>r.signature=null);hosts.forEach(h=>pending.add(h))});
      root.dataset.glass='ready';hosts.forEach(h=>pending.add(h));
    }catch(e){failed=true;root.dataset.glass='fallback';console.warn('Telegram glass fallback:',e.message)}finally{loading=false}
  }
  function disposeRecord(record){record.pane.geometry.dispose();record.pane.material.forEach(m=>m.dispose())}
  function paint(host){
    const e=engine,panel=host.querySelector('.tg-glass-panel'),canvas=host.querySelector('.tg-glass-canvas'),w=panel.offsetWidth,h=panel.offsetHeight;
    if(!w||!h)return;
    const css=getComputedStyle(panel),pad=innerWidth<901?14:32,unit=w/6,cw=w+pad*2,ch=h+pad*2,perspective=parseFloat(getComputedStyle(host).perspective)||1400;
    let r=records.get(host);
    const signature=[w,h,pad,perspective,css.transform].join('|');
    if(r?.signature===signature){host.classList.add('glass-ready');return}
    if(!r||r.w!==w||r.h!==h||r.pad!==pad){
      if(r)disposeRecord(r);
      const pane=createAboutFramedGlass(e.T,{width:6,height:h/unit,environment:e.environment});pane.matrixAutoUpdate=false;
      // Keep reflective faces and bevels, with true alpha over the live CSS backdrop.
      // Transmission would render an opaque snapshot and require per-scroll redraws.
      pane.material.forEach((material,index)=>{material.opacity*=index===0?.2:.4;material.transmission=0});
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
    e.scene.add(r.pane);e.renderer.render(e.scene,e.camera);e.scene.remove(r.pane);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);ctx.save();ctx.beginPath();r.outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(e.renderer.domElement,0,0,cw,ch);ctx.restore();r.signature=signature;host.classList.add('glass-ready');
  }
  return {invalidate(){hosts.forEach(h=>pending.add(h));init()},update(){
    if(!engine){init();return}if(failed||document.hidden||!pending.size)return;
    // Scrolling and CSS float/parallax need no WebGL renders or canvas readbacks.
    for(const host of pending){
      if(!visible.has(host)||host.closest('[hidden]'))continue;
      paint(host);pending.delete(host);
    }
  }};
};
