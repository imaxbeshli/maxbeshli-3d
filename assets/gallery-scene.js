// The lower scene uses the upper scene's glass factory, not a CSS imitation.
(()=>{
 const root=document.getElementById('selectedWorks'),cards=[...root.querySelectorAll('.work-card')];
 const rays=document.createElement('canvas');rays.className='gallery-live-rays';rays.setAttribute('aria-hidden','true');root.prepend(rays);
 const ctx=rays.getContext('2d');let renderer,scene,camera,tiles=[],key,fill,lastW=0,lastH=0,time=0,last=performance.now(),failed=false;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const metrics=window.MBGalleryScene={frames:0,lightFrames:0,ready:false,offsets:[],lightPhase:0};
 function init(){
  if(renderer||failed||!window.__MB?.createGalleryTile)return;
  try{
   const T=window.THREE;renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.setClearColor(0,0);
   renderer.domElement.className='gallery-glass-canvas';renderer.domElement.setAttribute('aria-hidden','true');root.prepend(renderer.domElement);
   scene=new T.Scene();camera=new T.OrthographicCamera(-1,1,1,-1,.1,4000);camera.position.z=1800;
   scene.add(new T.AmbientLight(0xd0e8eb,1.1));
   key=new T.DirectionalLight(0xe1f3ed,2.2);key.position.set(-150,600,800);scene.add(key);
   fill=new T.DirectionalLight(0xffd8ad,.65);fill.position.set(650,-250,350);scene.add(fill);
   cards.forEach((card,i)=>{
    const media=card.querySelector('img,video'),tex=media.tagName==='VIDEO'?new T.VideoTexture(media):new T.Texture(media);
    tex.encoding=T.sRGBEncoding;tex.minFilter=media.tagName==='VIDEO'?T.LinearFilter:T.LinearMipmapLinearFilter;tex.generateMipmaps=media.tagName!=='VIDEO';tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(media.tagName==='IMG'){if(media.complete)tex.needsUpdate=true;else media.addEventListener('load',()=>tex.needsUpdate=true,{once:true})}
    const ratio=window.MBSelectedWorks[i].format.split(':').map(Number),aspect=ratio[0]/ratio[1];
    const tile=window.__MB.createGalleryTile(tex,aspect);scene.add(tile.group);tiles.push(tile);
    card.querySelector('.work-frame').style.setProperty('--aspect',String(tile.width/tile.height));
   });
  }catch(e){failed=true;renderer?.dispose();renderer?.domElement.remove();renderer=null;console.warn('Gallery glass fallback',e)}
 }
 function light(w,h){
  ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){
   const origin=w*(.24+i*.13),sway=Math.sin(time*.36+i*1.5)*w*.045,end=origin+w*(.1-i*.045)+sway;
   const spread=w*(.035+i*.004),strength=.075+.055*(.5+.5*Math.sin(time*.62+i));
   const g=ctx.createLinearGradient(origin,0,end,h*.85);g.addColorStop(0,`rgba(207,239,229,${strength})`);g.addColorStop(.38,`rgba(183,224,214,${strength*.65})`);g.addColorStop(1,'rgba(130,195,190,0)');
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(origin-12,-10);ctx.lineTo(origin+12,-10);ctx.lineTo(end+spread,h*.88);ctx.lineTo(end-spread,h*.88);ctx.closePath();ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';metrics.lightFrames++;metrics.lightPhase=time;
 }
 function tick(now){
  requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.25);last=now;
  if(document.hidden||!root.classList.contains('is-visible'))return;
  time+=dt*(reduced.matches?.45:1);init();
  const w=innerWidth,h=innerHeight;
  if(w!==lastW||h!==lastH){lastW=w;lastH=h;rays.width=Math.round(w*.6);rays.height=Math.round(h*.6);ctx.setTransform(.6,0,0,.6,0,0);if(renderer){renderer.setSize(w,h,false);camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix()}}
  cards.forEach((card,i)=>{const y=Math.sin(time*(.95+i*.13)+i*2.1)*(reduced.matches?4:13);card.style.transform=`translate3d(0,${y}px,0)`;metrics.offsets[i]=y});
  light(w,h);
  if(!renderer)return;
  tiles.forEach((tile,i)=>{const r=cards[i].querySelector('.work-frame').getBoundingClientRect();tile.group.position.set(r.x+r.width/2-w/2,h/2-r.y-r.height/2,0);tile.group.scale.setScalar(r.width/tile.width)});
  key.position.x=Math.sin(time*.36)*w*.45;key.intensity=2.1+Math.sin(time*.62)*.45;fill.intensity=.65+Math.sin(time*.44+1)*.14;
  renderer.render(scene,camera);metrics.frames++;metrics.ready=true;root.classList.add('has-webgl');
 }
 requestAnimationFrame(tick);
})();
