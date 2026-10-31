(()=>{
  const root=document.getElementById('selectedWorks'),content=document.getElementById('galleryContent'),grid=document.getElementById('galleryGrid'),hint=document.getElementById('descendHint'),veil=document.getElementById('descentVeil'),viewer=document.getElementById('workViewer'),viewerMedia=document.getElementById('workViewerMedia');
  const upper=document.querySelector('.ui-layer'),canvas=document.getElementById('webgl-canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  root.querySelector('.gallery-water').style.backgroundImage=getComputedStyle(root.querySelector('.gallery-world')).backgroundImage;
  const works=window.MBSelectedWorks||[],videos=[];
  let depth=0,target=0,last=performance.now(),arrived=false,opener=null,touch=null,lastTop=false,suppressClickUntil=0,wasActive=false,paintedDepth=-1,soundSide=false,lastWaterSound=-2000;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x)};
  const blocked=()=>!!document.querySelector('dialog[open]')||!window.__MB?.state.studioEntered||['entering','diving','returning','section'].includes(window.__MB?.state.phase);
  function stopVideos(){videos.forEach(v=>v.pause())}
  function setTarget(value){
    if(blocked())return;
    if(window.__MB.state.phase!=='orbit')window.__MB.returnToOrbit();
    window.__MB.cancelOrbitDrag?.();target=clamp(value);
    if(target<1)stopVideos();
  }
  function add(delta){setTarget(target+delta/Math.max(1100,innerHeight*1.8))}
  function mediaFor(work,preview){
    if(!work.video){const img=new Image();img.src=work.poster;img.alt=preview?'':work.title;img.draggable=false;return img}
    const video=document.createElement('video');video.src=work.video;video.poster=work.poster;video.playsInline=true;video.preload='metadata';video.muted=preview;video.loop=preview;video.controls=!preview;
    if(preview)videos.push(video);return video;
  }
  function closeViewer(){viewerMedia.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load()});viewer.close();viewerMedia.replaceChildren()}
  works.forEach(work=>{
    const card=document.createElement('button');card.type='button';card.className='work-card';card.dataset.work=work.id;card.setAttribute('aria-label',`${work.title} — ${work.video?'смотреть видео':'открыть демонстрационное превью'}`);
    const frame=document.createElement('span');frame.className='work-frame';frame.style.setProperty('--aspect',work.format.replace(':',' / '));
    const media=mediaFor(work,true);frame.append(media);
    const caption=document.createElement('span');caption.className='work-caption';caption.textContent=work.title;
    card.append(frame,caption);grid.append(card);
    card.addEventListener('pointerenter',()=>{if(media.tagName==='VIDEO'&&arrived)media.play().catch(()=>{})});
    card.addEventListener('pointerleave',()=>{if(media.tagName==='VIDEO')media.pause()});
    card.addEventListener('click',()=>{
      stopVideos();opener=card;document.getElementById('workViewerTitle').textContent=work.title;
      document.getElementById('workViewerNote').textContent='';
      const large=mediaFor(work,false);viewerMedia.replaceChildren(large);viewer.showModal();document.getElementById('workViewerClose').focus({preventScroll:true});if(large.tagName==='VIDEO')large.play().catch(()=>{});
    });
  });
  document.getElementById('workViewerClose').addEventListener('click',closeViewer);
  viewer.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();closeViewer()});viewer.addEventListener('close',()=>opener?.focus({preventScroll:true}));
  viewer.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();if(e.key==='Tab'){const controls=[...viewer.querySelectorAll('button,video[controls]')];if(controls.length===1){e.preventDefault();controls[0].focus()}}});
  hint.addEventListener('click',()=>setTarget(1));
  function routeScroll(delta){
    if(arrived&&content.scrollHeight>content.clientHeight+2){
      if(delta>0||content.scrollTop>1){content.scrollTop+=delta;return}
    }
    add(delta);
  }
  window.addEventListener('wheel',e=>{
    if(blocked())return;
    e.preventDefault();e.stopImmediatePropagation();
    routeScroll(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));
  },{passive:false,capture:true});
  window.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||blocked()||(e.target.closest('button,a')&&!e.target.closest('.work-card')))return;
    touch={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientY,axis:null};
  },true);
  window.addEventListener('pointermove',e=>{
    if(!touch||touch.id!==e.pointerId||blocked())return;
    const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
    if(!touch.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)touch.axis=Math.abs(dy)>Math.abs(dx)?'y':'x';
    if(touch.axis!=='y')return;
    // Keep the gesture alive when the departing scene becomes inert.
    if(!document.documentElement.hasPointerCapture(e.pointerId))document.documentElement.setPointerCapture(e.pointerId);
    e.preventDefault();e.stopImmediatePropagation();window.__MB.cancelOrbitDrag?.();routeScroll((touch.last-e.clientY)*2.4);touch.last=e.clientY;
  },{capture:true,passive:false});
  window.addEventListener('pointerup',e=>{if(touch?.id===e.pointerId){if(touch.axis==='y'){suppressClickUntil=performance.now()+400;e.preventDefault();e.stopImmediatePropagation();window.__MB.cancelOrbitDrag?.()}touch=null}},true);
  window.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  window.addEventListener('pointercancel',()=>{touch=null},true);
  window.addEventListener('keydown',e=>{
    if(blocked()||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.key===' '&&e.target.closest('button,a'))return;
    if(['PageDown','ArrowDown',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();routeScroll(e.key==='ArrowDown'?120:innerHeight*.75)}
    if(['PageUp','ArrowUp'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();routeScroll(e.key==='ArrowUp'?-120:-innerHeight*.75)}
    if(e.key==='Escape'&&depth>.001){e.preventDefault();e.stopImmediatePropagation();setTarget(0)}
  },true);
  root.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType==='touch')return;root.style.setProperty('--gx',`${(e.clientX/innerWidth-.5)*24}px`);root.style.setProperty('--gy',`${(e.clientY/innerHeight-.5)*14}px`)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVideos()});
  const saved={x:0,y:0,z:0,qx:0,qy:0,qz:0,qw:1};
  window.MBDescent={get depth(){return depth},get target(){return target},get arrived(){return arrived},setTarget,add,isRestingBelow:()=>depth>=.56,
    beforeRender(camera){
      const p=smooth(0,.8,depth);saved.x=camera.position.x;saved.y=camera.position.y;saved.z=camera.position.z;Object.assign(saved,{qx:camera.quaternion.x,qy:camera.quaternion.y,qz:camera.quaternion.z,qw:camera.quaternion.w});
      camera.position.y-=p*3.8;camera.position.z-=p*1.2;camera.rotateX(-p*.13);camera.updateMatrixWorld();
    },afterRender(camera){camera.position.set(saved.x,saved.y,saved.z);camera.quaternion.set(saved.qx,saved.qy,saved.qz,saved.qw);camera.updateMatrixWorld()}
  };
  function tick(now){
    requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.08);last=now;
    if(document.hidden)return;
    depth+=(target-depth)*(1-Math.exp(-8*dt));if(Math.abs(target-depth)<.0006)depth=target;
    const underSurface=depth>=.36;
    if(underSurface!==soundSide){
      if(now-lastWaterSound>1200){window.__MB?.playWaterSound?.(underSurface);lastWaterSound=now}
      soundSide=underSurface;
    }
    const active=depth>.001,ready=depth>.965&&target===1;
    hint.style.display=!blocked()&&!active&&window.__MB?.state.phase==='orbit'?'flex':'none';
    if(depth===paintedDepth)return;paintedDepth=depth;
    document.body.classList.toggle('is-descending',active);
    if(active!==wasActive){canvas.inert=active;wasActive=active;}
    if(upper){upper.inert=active;upper.style.setProperty('--upper-opacity',1-smooth(0,.32,depth));upper.style.setProperty('--upper-y',`${-depth*110}px`)}
    // Swap opaque scenes only while the water veil fully covers the viewport.
    root.style.visibility=depth>=.56?'visible':'hidden';root.style.opacity=depth>=.56?1:0;root.style.pointerEvents=active?'auto':'none';
    root.style.transform='none';
    grid.style.opacity=smooth(.68,.97,depth);grid.style.transform=`translateY(${(1-smooth(.65,1,depth))*55}px)`;
    root.inert=!ready;root.setAttribute('aria-hidden',String(!ready));root.classList.toggle('is-arrived',ready);root.classList.toggle('is-visible',depth>=.56);
    if(ready&&!arrived){document.getElementById('worksTitle').focus({preventScroll:true});lastTop=false}
    arrived=ready;
    if(!active&&!lastTop&&window.__MB?.state.studioEntered){canvas.focus({preventScroll:true});lastTop=true;content.scrollTop=0}
    const crossing=smooth(.12,.48,depth)*(1-smooth(.60,.94,depth));
    veil.classList.toggle('is-crossing',active&&depth<.94);veil.style.visibility=active?'visible':'hidden';veil.style.opacity=crossing;veil.style.setProperty('--waterline',`${110-smooth(.12,.54,depth)*150}%`);veil.style.setProperty('--tint',smooth(.20,.46,depth));veil.style.setProperty('--mist',Math.sin(smooth(.22,.8,depth)*Math.PI)*.78);
    document.getElementById('descentDisplacement').setAttribute('scale',String(crossing*(reduced.matches?5:22)));
    canvas.style.filter=crossing>.02?'url(#descentRefraction)':'none';

  }
  requestAnimationFrame(tick);
})();
