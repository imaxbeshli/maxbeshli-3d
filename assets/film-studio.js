/* Film interiors share the original showreel. Only the visible scene advances. */
(()=>{
  const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const edit=$('filmEditing'),ai=$('filmAI'),canvas=$('aiAtmosphere'),ctx=canvas.getContext('2d');
  const clocks=[0,0,0],paused=[false,false,false];let view=-1,video=null,frame=0,texture=null;
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
  const editStages=['Сборка истории','Работа с цветом','Звук и финальные акценты'];
  const aiStages=['От замысла к кадру','Стекло. Свет. Фактура.','Изображение оживает'];
  function setButtons(type,stage){document.querySelectorAll(`[data-${type}-stage]`).forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset[type+'Stage']===stage)))}
  function playbackButton(type,n){const b=$(type+'Playback');b.textContent=paused[n]?'Продолжить':'Пауза';b.setAttribute('aria-label',(paused[n]?'Продолжить':'Приостановить')+(n===1?' монтажную сцену':' AI-сцену'))}
  function resume(){if(video&&(view===0||view===1&&!paused[1]))video.play().catch(()=>{})}
  function setView(n,v){
    view=n;if(v)video=v;frame=0;
    ['filmShooting','filmEditing','filmAI'].forEach((id,i)=>$(id).hidden=i!==n);
    ['filmChapters','editChapters','aiChapters'].forEach((id,i)=>$(id).hidden=i!==n);
    if(video){video.pause();if(n===0||n===1){$(n===0?'sectionVideoSlot':'editVideoSlot').append(video);video.controls=n===0;resume()}}
    render();
  }
  // Deterministic, soft fractal noise; built once, then moved in overlapping layers.
  function smokeTexture(){
    if(texture)return texture;
    texture=document.createElement('canvas');texture.width=256;texture.height=128;
    const c=texture.getContext('2d'),image=c.createImageData(256,128);
    const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
    const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v};
    for(let y=0;y<128;y++)for(let x=0;x<256;x++){
      let n=0,a=.55,f=1;for(let o=0;o<5;o++){n+=a*noise(x/43*f,y/29*f);a*=.5;f*=2}
      const mask=Math.pow(Math.sin(Math.PI*x/255)*Math.sin(Math.PI*y/127),1.5),i=(y*256+x)*4;
      image.data[i]=206;image.data[i+1]=194;image.data[i+2]=177;image.data[i+3]=Math.round(Math.pow(clamp((n-.22)*1.7),1.5)*mask*150);
    }
    c.putImageData(image,0,0);return texture;
  }
  function atmosphere(t,strength){
    const w=Math.min(1100,Math.round(ai.clientWidth*Math.min(devicePixelRatio||1,1.5))),h=Math.round(w*9/16);
    if(!w)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    ctx.clearRect(0,0,w,h);if(strength<.001)return;
    const tex=smokeTexture(),phase=t/18*Math.PI*2;
    ctx.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){
      ctx.globalAlpha=strength*(.22-i*.035);
      const drift=Math.sin(phase+i*2)*w*.055,lift=Math.cos(phase+i)*h*.025;
      ctx.drawImage(tex,-w*.25+drift+i*w*.1,h*.59+lift,w*1.35,h*.5);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  function renderEdit(){
    const t=clocks[1],stage=t<6?0:t<12?1:2;
    edit.style.setProperty('--edit-cut',smooth(.7,3.2,t));
    edit.style.setProperty('--edit-color',smooth(6.1,9.8,t));
    edit.style.setProperty('--edit-title',smooth(11.5,13.3,t)*(1-smooth(17,18,t)));
    edit.style.setProperty('--edit-head',t/18);
    $('editStageLabel').textContent=editStages[stage];$('editToolTitle').textContent=['Сборка','Цвет','Звук'][stage];$('editToolDetail').textContent=['Точная склейка','Свет и оттенки','Баланс дорожек'][stage];
    const current=Number.isFinite(video?.currentTime)?video.currentTime:t,seconds=Math.floor(current);
    $('editTimecode').textContent=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}:${String(Math.floor(current%1*25)).padStart(2,'0')}`;
    edit.querySelectorAll('.edit-level i').forEach((el,i)=>el.style.setProperty('--level',(22+Math.abs(Math.sin(t*3.4+i*1.7))*60)+'%'));
    setButtons('edit',stage);
  }
  function renderAI(){
    const t=clocks[2],reveal=smooth(2.2,6,t)*(1-smooth(16.3,18,t)),motion=smooth(8,11,t)*(1-smooth(16,18,t)),stage=t<5?0:t<10?1:2;
    ai.style.setProperty('--ai-reveal',reveal);ai.style.setProperty('--ai-concept',1-reveal);
    ai.style.setProperty('--ai-scale',1+motion*.045);
    ai.style.setProperty('--ai-shift',(Math.sin((t-8)*.26)*motion*7).toFixed(2)+'px');
    ai.style.setProperty('--ai-glow',motion*(.45+Math.sin(t*.65)*.25));ai.style.setProperty('--ai-progress',t/18);
    $('aiStageLabel').textContent=aiStages[stage];setButtons('ai',stage);atmosphere(t,motion);
  }
  function render(){if(view===1)renderEdit();else if(view===2)renderAI()}
  function update(now,dt){
    if(view<1||document.hidden||$('infoDialog').open)return;
    if(paused[view])return;
    clocks[view]=(clocks[view]+dt)%18;
    if(now-frame<1000/30)return;frame=now;render();
  }
  function seek(n,stage){clocks[n]=[.4,6.5,12.4][stage];render()}
  ['edit','ai'].forEach((type,i)=>{
    const n=i+1;$(type+'Playback').addEventListener('click',()=>{paused[n]=!paused[n];playbackButton(type,n);if(n===1){if(paused[n])video?.pause();else resume()}});
    document.querySelectorAll(`[data-${type}-stage]`).forEach(b=>b.addEventListener('click',()=>seek(n,+b.dataset[type+'Stage'])));
  });
  let wave='';for(let x=0;x<600;x+=3){const a=2+Math.abs(Math.sin(x*.13)*Math.sin(x*.035))*10;wave+=`M${x} ${14-a}V${14+a}`}$('editWaveform').setAttribute('d',wave);
  function motionPreference(){if(reduced.matches){clocks[1]=9;clocks[2]=12;paused[1]=paused[2]=true;playbackButton('edit',1);playbackButton('ai',2);if(view===1)video?.pause()}render()}
  reduced.addEventListener('change',motionPreference);motionPreference();
  new ResizeObserver(()=>{if(view===2)renderAI()}).observe(ai);
  window.MBFilmStudio={setView,update,resume,get state(){return {view,editingTime:clocks[1],aiTime:clocks[2],paused:[...paused]}}};
})();
