/* Offline 3D car stage, shared by the Mini App intro and service effects. */
window.MBPhoneCar3D={create(){
  const T=window.THREE;window.MBInstallCarLoaders();
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setSize(600,420,false);renderer.setPixelRatio(1);renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.setClearColor(0,0);
  renderer.localClippingEnabled=true;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,600/420,.1,40);
  camera.position.set(-7.4,2.5,0);camera.lookAt(0,.5,0);
  scene.add(new T.HemisphereLight('#e9f2ff','#343a46',.7));
  const key=new T.DirectionalLight('#fff4e8',1.2);key.position.set(-4,6,-4);scene.add(key);
  const rim=new T.DirectionalLight('#a8c6ff',.6);rim.position.set(4,4,2);scene.add(rim);
  const red=new T.DirectionalLight('#ff2146',.25);red.position.set(-1,1,5);scene.add(red);
  // Procedural studio environment produces legible reflections on black paint.
  const envScene=new T.Scene();envScene.background=new T.Color('#202630');
  [[0,5,0,8,.1,4],[0,1,-5,7,2,.1],[-4,2,0,.1,3,8],[4,3,0,.1,2,7]].forEach(([a,b,c,w,h,d])=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:'#eeeeee'}));m.position.set(a,b,c);envScene.add(m);
  });
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene).texture;scene.environment=environment;pmrem.dispose();
  const group=new T.Group();scene.add(group);
  const clip=new T.Plane(new T.Vector3(0,-1,0),-1),materials=[];let model,wheel,originalWheel,loaded=false,lamps=[],lastState={};
  const clamp=v=>Math.max(0,Math.min(1,v));const ease=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*p*(p*(p*6-15)+10)};
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const draco=new T.DRACOLoader();draco.setWorkerLimit(1);
  draco._loadLibrary=(url,type)=>Promise.resolve(type==='arraybuffer'?bytes(window.MB_CAR3D.wasm).buffer:window.MB_CAR3D.decoder);
  const loader=new T.GLTFLoader();loader.setDRACOLoader(draco);
  const ready=new Promise((resolve,reject)=>loader.parse(bytes(window.MB_CAR3D.model).buffer,'',gltf=>{
    model=gltf.scene;group.add(model);
    const paint=new T.MeshPhysicalMaterial({color:'#15191e',metalness:.9,roughness:.22,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.8});
    model.getObjectByName('body').material=paint;
    model.getObjectByName('glass').material=new T.MeshPhysicalMaterial({color:'#111821',metalness:.2,roughness:.12,transparent:true,opacity:.94,envMapIntensity:.35});
    model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.clippingPlanes=[clip];materials.push(o.material);o.material.envMapIntensity=.5;if(/leather|carpet|interior|carbon/i.test(o.name)){o.material.color.set('#121416');o.material.envMapIntensity=.15}if(o.name==='tire'){o.material.color.set('#111111');o.material.metalness=0;o.material.roughness=.9}}});
    model.updateMatrixWorld(true);originalWheel=model.getObjectByName('wheel_fl');originalWheel.traverse(o=>{if(o.isMesh)o.material.clippingPlanes=[]});wheel=originalWheel.clone(true);
    originalWheel.matrixWorld.decompose(wheel.position,wheel.quaternion,wheel.scale);
    wheel.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.clippingPlanes=[]}});scene.add(wheel);
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gx=glowCanvas.getContext('2d'),g=gx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffffff');g.addColorStop(.12,'#d8ecffdd');g.addColorStop(.4,'#c1e0ff55');g.addColorStop(1,'#acd9ff00');gx.fillStyle=g;gx.fillRect(0,0,64,64);
    const map=new T.CanvasTexture(glowCanvas);
    [-.62,.62].forEach(a=>{const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));sprite.position.set(a,.55,-2.05);sprite.scale.set(.85,.85,1);group.add(sprite);lamps.push(sprite)});
    loaded=true;draco.dispose();render(0);resolve();
  },reject));
  function render(t,service=false){
    if(!loaded)return renderer.domElement;
    const turn=service?.82:ease(2.25,4.5,t),light=service?1:ease(4.5,5.2,t);
    group.rotation.y=turn*Math.PI/2;
    clip.constant=service?4:-.15+2.2*ease(1.1,2.15,t);
    originalWheel.visible=service||t>=1.1;wheel.visible=!service&&t<1.1;
    if(wheel.visible){
      const dock=ease(.05,1.1,t),target=new T.Vector3();originalWheel.getWorldPosition(target);
      wheel.position.set(target.x,target.y+(1-dock)*.3,2.7+(target.z-2.7)*dock);
      wheel.scale.setScalar(1+1.2*(1-dock));wheel.rotation.set(dock*Math.PI*4,0,0);
    }
    lamps.forEach(o=>o.material.opacity=light*.8);
    const lights=model.getObjectByName('lights');if(lights?.material.emissive){lights.material.emissive.set('#d3eaff');lights.material.emissiveIntensity=light*2}
    camera.position.set(-7.4+(service?.25:turn*1.5),1.8,0);camera.lookAt(0,.5,0);
    renderer.render(scene,camera);lastState={loaded,turn,light,clip:clip.constant,wheelVisible:wheel.visible};return renderer.domElement;
  }
  return {ready,render,get state(){return lastState}};
}};
