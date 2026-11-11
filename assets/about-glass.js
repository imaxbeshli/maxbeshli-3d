/* Render physical glass with the main-page tile frame behind selectable HTML text.
   CSS and WebGL share one transform; the old CSS extrusion is not used. */
function createAboutGlass(dialog){
  const host=dialog.querySelector('.about-panel-position'),panel=dialog.querySelector('.about-panel'),canvas=dialog.querySelector('.about-glass-canvas'),world=dialog.querySelector('.about-world');
  let wanted=false,initializing=null,engine=null,frame=0,last=0,contextLost=false;
  function hull(points){
    points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const low=[],high=[];for(const p of points){while(low.length>1&&cross(low[low.length-2],low[low.length-1],p)<=0)low.pop();low.push(p)}
    for(let i=points.length-1;i>=0;i--){const p=points[i];while(high.length>1&&cross(high[high.length-2],high[high.length-1],p)<=0)high.pop();high.push(p)}
    low.pop();high.pop();return low.concat(high);
  }
  async function init(){
    const assets=JSON.parse(document.getElementById('aboutGlassAssets').textContent);
    const THREE=await import(assets.three),RGBELoader=createAboutRGBELoader(THREE);
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    const backgroundURL=getComputedStyle(world).backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1];
    const [hdr,background]=await Promise.all([new RGBELoader().loadAsync(assets.hdr),new THREE.TextureLoader().loadAsync(backgroundURL)]);
    background.colorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,100),environment=createApprovedGlassEnvironment(THREE,renderer,hdr);
    scene.environment=environment.texture;scene.environmentRotation.set(-.08,Math.PI/4,0);
    scene.add(new THREE.HemisphereLight(0xdce9ee,0x32332d,.8));
    const key=new THREE.DirectionalLight(0xf3f3e8,2.2);key.position.set(-3,6.2,5);scene.add(key);
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:background,color:0xd5d5d5,toneMapped:false}));scene.add(backdrop);
    engine={THREE,renderer,scene,camera,environment,frameEnvironment:createAboutFrameEnvironment(THREE),hdr,backdrop,background,pane:null,vertices:[],w:0,h:0,unit:1,pad:72,cw:1,ch:1,flip:new THREE.Matrix4().makeScale(1,-1,1)};
    resize();render();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);dialog.dataset.glass='error';dialog.querySelector('.about-glass-status').textContent='3D-просмотр приостановлен. Обновите страницу.'});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;engine.environment.dispose();engine.environment=createApprovedGlassEnvironment(THREE,renderer,hdr);scene.environment=engine.environment.texture;if(wanted){render();dialog.dataset.glass='ready';frame=requestAnimationFrame(tick)}});
    return true;
  }
  function resize(){
    if(!engine||!dialog.open)return;
    const e=engine,w=panel.offsetWidth,h=panel.offsetHeight;if(!w||!h||(w===e.w&&h===e.h))return;
    e.w=w;e.h=h;e.unit=w/6;e.cw=w+e.pad*2;e.ch=h+e.pad*2;
    canvas.style.left=-e.pad+'px';canvas.style.top=-e.pad+'px';canvas.style.width=e.cw+'px';canvas.style.height=e.ch+'px';e.renderer.setSize(e.cw,e.ch,false);
    const perspective=parseFloat(getComputedStyle(host).perspective)||1500;e.camera.fov=2*Math.atan(e.ch/(2*perspective))*180/Math.PI;e.camera.aspect=e.cw/e.ch;e.camera.position.set(0,0,perspective/e.unit);e.camera.lookAt(0,0,0);e.camera.updateProjectionMatrix();
    if(e.pane){e.scene.remove(e.pane);e.pane.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())})}
    e.pane=createAboutFramedGlass(e.THREE,{width:6,height:h/e.unit,environment:e.frameEnvironment});e.pane.matrixAutoUpdate=false;e.scene.add(e.pane);
    const positions=e.pane.geometry.attributes.position,unique=new Map();
    for(let i=0;i<positions.count;i++){const v=new e.THREE.Vector3().fromBufferAttribute(positions,i);unique.set(v.toArray().map(x=>x.toFixed(5)).join(','),v)}e.vertices=[...unique.values()];
  }
  function render(){
    if(!engine||!dialog.open||contextLost)return;
    const e=engine;resize();
    // Convert DOM coordinates (y down) to Three.js coordinates (y up), keeping the front face at z=0.
    const css=new DOMMatrix(getComputedStyle(panel).transform),matrix=new e.THREE.Matrix4().fromArray(css.toFloat64Array());
    matrix.elements[12]/=e.unit;matrix.elements[13]/=e.unit;matrix.elements[14]/=e.unit;matrix.premultiply(e.flip).multiply(e.flip);
    e.pane.matrix.copy(matrix);e.pane.updateMatrixWorld(true);e.camera.updateMatrixWorld();
    const normal=new e.THREE.Vector3(0,0,1).transformDirection(matrix),view=e.camera.position.clone().sub(new e.THREE.Vector3().setFromMatrixPosition(matrix)).normalize(),grazing=1-Math.abs(normal.dot(view));
    e.pane.userData.outerEdge.material.opacity=.09+grazing*.08;
    e.pane.userData.innerEdge.material.opacity=.02+grazing*.02;
    const outline=e.vertices.map(v=>{const p=v.clone().applyMatrix4(matrix).project(e.camera);return [(p.x+1)*e.cw/2,(1-p.y)*e.ch/2]});
    canvas.style.clipPath='polygon('+hull(outline).map(p=>p.map(n=>n.toFixed(2)+'px').join(' ')).join(',')+')';
    // Align a photographic background plane with the real cave, before the glass refracts it.
    const r=world.getBoundingClientRect(),c=canvas.getBoundingClientRect(),scale=c.width/e.cw||1,img=e.background.image,cover=Math.max(r.width/img.width,r.height/img.height),depth=8,factor=1+depth/e.camera.position.z;
    e.backdrop.position.set(((r.left+r.width/2)-(c.left+c.width/2))/scale/e.unit*factor,-((r.top+r.height/2)-(c.top+c.height/2))/scale/e.unit*factor,-depth);
    e.backdrop.scale.set(img.width*cover/scale/e.unit*factor,img.height*cover/scale/e.unit*factor,1);
    e.scene.environmentRotation.y=Math.PI/4+Math.atan2(matrix.elements[8],matrix.elements[10])+(parseFloat(dialog.style.getPropertyValue('--px'))||0)*.0015;
    e.renderer.render(e.scene,e.camera);
  }
  function tick(now){if(!wanted)return;frame=requestAnimationFrame(tick);if(document.hidden||contextLost||now-last<33)return;last=now;render();}
  const observer=new ResizeObserver(()=>{if(wanted)resize()});observer.observe(panel);
  return {resize,start(){wanted=true;dialog.dataset.glass='loading';if(!initializing)initializing=init();return initializing.then(()=>{if(wanted&&dialog.open){render();dialog.dataset.glass='ready';cancelAnimationFrame(frame);frame=requestAnimationFrame(tick)}return true}).catch(error=>{console.error('About glass:',error);dialog.dataset.glass='error';return false})},stop(){wanted=false;cancelAnimationFrame(frame)}};
}
