import * as THREE from './vendor/three.module.min.js';
import {RGBELoader} from './vendor/RGBELoader.js';
const canvas=document.querySelector('#scene'),loading=document.querySelector('#loading');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){loading.textContent='Для просмотра нужен браузер с поддержкой WebGL.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color('#181b1c');scene.fog=new THREE.FogExp2('#181b1c',.018);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,70);
const target=new THREE.Vector3(0,2.75,0);
function mesh(geometry,material,parent=scene,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
const standard=(color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
// Captured studio lighting: the same HDR environment drives background and glass reflections.
const hdr=await new RGBELoader().loadAsync('./studio-small-08.hdr');hdr.mapping=THREE.EquirectangularReflectionMapping;
const lightStudio=new THREE.Scene();lightStudio.background=hdr;
const lightRig=new THREE.Group();lightRig.quaternion.setFromEuler(new THREE.Euler(.15,Math.PI/4,0)).invert();lightStudio.add(lightRig);
const overhead=mesh(new THREE.PlaneGeometry(4,.65),new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,.97).multiplyScalar(3),side:THREE.DoubleSide}),lightRig,-3.7,.9,8);overhead.lookAt(0,0,0);
const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(lightStudio,0,.1,100);
overhead.geometry.dispose();overhead.material.dispose();
scene.environment=environment.texture;scene.environmentRotation.set(.15,Math.PI/4,0);scene.background=new THREE.Color('#171b1d');pmrem.dispose();
const wall=standard('#15191b',.86);
mesh(new THREE.BoxGeometry(35,18,.4),wall,scene,0,7,-5.5);
for(const x of [-5,3.3,7])mesh(new THREE.BoxGeometry(.12,9,.16),standard('#141a1c',.4,.3),scene,x,4,-4.9);
mesh(new THREE.BoxGeometry(.035,8,.035),new THREE.MeshBasicMaterial({color:new THREE.Color('#d5e5ef').multiplyScalar(2)}),scene,6.4,4,-4.7);
mesh(new THREE.BoxGeometry(19,.035,.04),new THREE.MeshBasicMaterial({color:new THREE.Color('#c79c70').multiplyScalar(1.2)}),scene,0,1.65,-5.15);
const ambient=new THREE.HemisphereLight(0xdce9ee,0x32332d,.8);scene.add(ambient);
const key=new THREE.DirectionalLight(0xf3f3e8,2.2);key.position.set(-3,9,5);scene.add(key);
const warm=new THREE.PointLight(0xeab477,12,15,2);warm.position.set(-5,2,-3);scene.add(warm);
const cool=new THREE.PointLight(0xc5e2f2,16,17,2);cool.position.set(6,4,1);scene.add(cool);
// Deterministic subtle stone texture, generated locally (no external assets).
const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=512;
const ctx=textureCanvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=617;
for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=100+(seed>>>27);pixels.data[i]=v;pixels.data[i+1]=v+2;pixels.data[i+2]=v+3;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
const stone=new THREE.CanvasTexture(textureCanvas);stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.repeat.set(12,12);stone.colorSpace=THREE.SRGBColorSpace;stone.anisotropy=renderer.capabilities.getMaxAnisotropy();
const floor=mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:'#44494a',map:stone,bumpMap:stone,bumpScale:.008,roughness:.67,metalness:.06}));floor.rotation.x=-Math.PI/2;
// Soft ambient contact shadow, separate from glass optics (not an opaque shadow of the pane).
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
const sc=shadowCanvas.getContext('2d'),grad=sc.createRadialGradient(128,128,5,128,128,126);grad.addColorStop(0,'rgba(0,0,0,.65)');grad.addColorStop(.45,'rgba(0,0,0,.28)');grad.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=grad;sc.fillRect(0,0,256,256);
const shadow=mesh(new THREE.PlaneGeometry(8,2.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,0,.008,.1);shadow.rotation.x=-Math.PI/2;
// One closed, manifold extruded shape. Only outline corners are rounded; no rolled bevel.
const width=6,height=4.2,radius=.22,depth=.30;
const x=-width/2,y=-height/2,s=new THREE.Shape();s.moveTo(x+radius,y);s.lineTo(x+width-radius,y);s.quadraticCurveTo(x+width,y,x+width,y+radius);s.lineTo(x+width,y+height-radius);s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);s.lineTo(x+radius,y+height);s.quadraticCurveTo(x,y+height,x,y+height-radius);s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);
const geometry=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:32,steps:1});geometry.translate(0,0,-depth/2);
const glass=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.035,transmission:1,thickness:depth,ior:1.52,attenuationColor:new THREE.Color('#d5e2dc'),attenuationDistance:3.5,envMapIntensity:.7,side:THREE.DoubleSide});
const sides=glass.clone();sides.envMapIntensity=.45;sides.attenuationColor.set('#a5c4b6');sides.attenuationDistance=1.2;
const pane=mesh(geometry,[glass,sides],scene,0,2.8,0);
// The back surface and the 90-degree side normals remain part of the same closed solid.
let yaw=0,pitch=0,currentYaw=0,currentPitch=0,drag=null,visible=true;
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;const distance=Math.max(10.2,6.2/(2*Math.tan(Math.PI/10)*camera.aspect*.88));camera.position.set(distance*.43,3.5,distance*.903);camera.lookAt(target);camera.updateProjectionMatrix();}
resize();addEventListener('resize',resize);
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true})});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;yaw=THREE.MathUtils.clamp(yaw+dx*.007,-1.5,1.5);pitch=THREE.MathUtils.clamp(pitch+dy*.005,-.65,.65);drag={x:e.clientX,y:e.clientY};});
function release(){drag=null;}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
function reset(){yaw=0;pitch=0;}document.querySelector('#reset').onclick=reset;
let lighting=0;document.querySelector('#light').onclick=()=>{lighting=(lighting+1)%3;scene.environmentRotation.y=[Math.PI/4,Math.PI*1.25,Math.PI*1.75][lighting]};
canvas.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','0'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='0')reset();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch-=.08;if(e.key==='ArrowDown')pitch+=.08;yaw=THREE.MathUtils.clamp(yaw,-1.5,1.5);pitch=THREE.MathUtils.clamp(pitch,-.65,.65)});
const comparison=document.querySelector('#comparison');document.querySelector('#reference').onclick=()=>comparison.showModal();document.querySelector('#closeReference').onclick=()=>comparison.close();comparison.addEventListener('click',e=>{if(e.target===comparison)comparison.close()});comparison.addEventListener('close',()=>document.querySelector('#reference').focus());
const reduced=matchMedia('(prefers-reduced-motion:reduce)');let last=0,time=0,ready=false;
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now()});
function animate(now){requestAnimationFrame(animate);if(!visible||comparison.open)return;const dt=Math.min((now-last)/1000,.25);last=now;time+=dt;const damping=1-Math.exp(-8*dt);currentYaw=THREE.MathUtils.lerp(currentYaw,yaw,damping);currentPitch=THREE.MathUtils.lerp(currentPitch,pitch,damping);pane.rotation.set(currentPitch,currentYaw,0);pane.position.y=2.8+(reduced.matches?0:Math.sin(time*.6)*.035);renderer.render(scene,camera);if(!ready){ready=true;loading.hidden=true;document.body.dataset.ready='true';}}
requestAnimationFrame(animate);
window.glassPrototype={pane,camera,renderer,scene,reset};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;loading.hidden=false;loading.textContent='Обновите страницу, чтобы восстановить 3D-просмотр.'});
