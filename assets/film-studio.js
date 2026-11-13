/* Film interiors share the original showreel. Only the visible scene advances. */
(()=>{
  const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const edit=$('filmEditing'),ai=$('filmAI'),canvas=$('aiAtmosphere'),ctx=canvas.getContext('2d');
  const clocks=[0,0,0],paused=[false,false,false];let view=-1,video=null,frame=0,texture=null,dragBounds=[];
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
  const editStages=['Перенос исходного материала','Добавление звука','Цветокоррекция','Предпросмотр секвенции'];
  const arrivals=[2.1,4.2,6.3,8.4],duration=[0,22,18];
  const aiStages=['От замысла к кадру','Стекло. Свет. Фактура.','Изображение оживает'];
  function playbackButton(type,n){const b=$(type+'Playback');b.textContent=paused[n]?'Продолжить':'Пауза';b.setAttribute('aria-label',(paused[n]?'Продолжить':'Приостановить')+(n===1?' монтажную сцену':' AI-сцену'))}
  function resume(){if(video&&(view===0||view===1&&!paused[1]))video.play().catch(()=>{})}
  function setView(n,v){
    view=n;if(v)video=v;frame=0;
    ['filmShooting','filmEditing','filmAI'].forEach((id,i)=>$(id).hidden=i!==n);
    $('filmChapters').hidden=n!==0;$('filmScene').dataset.filmView=String(n);
    if(n===1)measureDrags();
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
    for(let i=0;i<4;i++){
      ctx.globalAlpha=strength*(.59-i*.075);
      const drift=Math.sin(phase*1.3+i*1.8)*w*.16,lift=Math.cos(phase*1.1+i)*h*.055;
      ctx.save();ctx.translate(w*.5+drift,h*.78+lift);ctx.rotate(Math.sin(phase+i)*.035);
      ctx.drawImage(tex,-w*(.72-i*.035),-h*.23,w*(1.44-i*.07),h*.57);ctx.restore();
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  function localBox(el){
    let x=0,y=0,node=el;while(node&&node!==edit){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent}
    return {x,y,w:el.offsetWidth,h:el.offsetHeight};
  }
  function measureDrags(){dragBounds=arrivals.map((_,i)=>({from:localBox($('editSource'+i)),to:localBox($('editTarget'+i))}))}
  function renderEdit(){
    const t=clocks[1],stage=t<7?0:t<10?1:t<14?2:3,color=smooth(10,13.8,t);
    edit.style.setProperty('--edit-color',color);
    edit.style.setProperty('--edit-audio',smooth(8.23,8.6,t));
    edit.style.setProperty('--edit-ambience',smooth(8.9,9.7,t));
    edit.style.setProperty('--edit-head',clamp((t-2.1)/18.5));
    edit.style.setProperty('--edit-reset',Math.max(1-smooth(.02,.6,t),smooth(21,22,t)));
    $('editStageLabel').textContent=editStages[stage];
    edit.querySelectorAll('.edit-workspaces span').forEach((el,i)=>el.classList.toggle('is-current',i===(stage===1?2:stage===2?1:0)));
    for(let i=0;i<3;i++)$('editTarget'+i).style.setProperty('--clip-visible',smooth(arrivals[i]-.16,arrivals[i]+.2,t));
    const ghost=edit.querySelector('.edit-drag');let moving=-1;
    arrivals.forEach((end,i)=>{if(t>=end-1.55&&t<end+.18)moving=i;$('editSource'+i).classList.toggle('is-current',t>=end-1.55&&t<end+.3)});
    if(moving<0)ghost.style.opacity='0';
    else{
      const end=arrivals[moving],u=smooth(end-1.4,end,t),bound=dragBounds[moving];
      if(bound){
        const {from,to}=bound,mix=(a,b)=>a+(b-a)*u;
        ghost.style.left='0';ghost.style.top='0';ghost.style.width=mix(from.w,to.w)+'px';ghost.style.height=mix(from.h,to.h)+'px';
        ghost.style.transform=`translate(${mix(from.x,to.x)}px,${mix(from.y,to.y)-Math.sin(u*Math.PI)*edit.clientHeight*.06}px)`;
        ghost.style.opacity=String(smooth(end-1.55,end-1.35,t)*(1-smooth(end-.05,end+.18,t)));
        ghost.classList.toggle('is-audio',moving===3);
        if(ghost.dataset.source!==String(moving)){
          ghost.dataset.source=String(moving);$('editDragName').textContent=moving===3?'Sound.wav':`A00${moving+1}.mov`;
          if(moving<3)$('editDragImage').src=window.MB_SECTION_IMAGES['film-'+moving];
        }
      }
    }
    const current=Number.isFinite(video?.currentTime)?video.currentTime:t,seconds=Math.floor(current);
    $('editTimecode').textContent=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}:${String(Math.floor(current%1*25)).padStart(2,'0')}`;
    edit.querySelectorAll('.edit-meter-pair i').forEach((el,i)=>el.style.setProperty('--level',(smooth(8.4,9,t)*(30+Math.abs(Math.sin(t*3.4+i*.7))*52))+'%'));
  }
  function renderAI(){
    const t=clocks[2],reveal=smooth(1.7,4.8,t)*(1-smooth(17,18,t)),motion=smooth(5.8,9,t)*(1-smooth(17,18,t)),stage=t<5?0:t<10?1:2;
    ai.style.setProperty('--ai-reveal',reveal);ai.style.setProperty('--ai-concept',1-reveal);
    ai.style.setProperty('--ai-scale',1+smooth(6,17.4,t)*.17);
    ai.style.setProperty('--ai-shift',(Math.sin((t-7)*.25)*motion*1.2).toFixed(3)+'%');
    ai.style.setProperty('--ai-light-shift',(-30+smooth(6,17,t)*60)+'%');
    ai.style.setProperty('--ai-glow',motion*(.45+Math.sin(t*.65)*.25));ai.style.setProperty('--ai-progress',t/18);
    $('aiStageLabel').textContent=aiStages[stage];atmosphere(t,motion);
  }
  function render(){if(view===1)renderEdit();else if(view===2)renderAI()}
  function update(now,dt){
    if(view<1||document.hidden||$('infoDialog').open)return;
    if(paused[view])return;
    clocks[view]=(clocks[view]+dt)%duration[view];
    if(now-frame<1000/30)return;frame=now;render();
  }
  ['edit','ai'].forEach((type,i)=>{
    const n=i+1;$(type+'Playback').addEventListener('click',()=>{paused[n]=!paused[n];playbackButton(type,n);if(n===1){if(paused[n])video?.pause();else resume()}});
  });
  let wave='';for(let x=0;x<600;x+=3){const a=2+Math.abs(Math.sin(x*.13)*Math.sin(x*.035))*10;wave+=`M${x} ${14-a}V${14+a}`}$('editWaveform').setAttribute('d',wave);$('editAmbienceWave').setAttribute('d',wave);
  function motionPreference(){if(reduced.matches){clocks[1]=16;clocks[2]=14;paused[1]=paused[2]=true;playbackButton('edit',1);playbackButton('ai',2);if(view===1)video?.pause()}render()}
  reduced.addEventListener('change',motionPreference);motionPreference();
  const resize=new ResizeObserver(()=>{if(view===1)measureDrags();if(view>0)render()});resize.observe(ai);resize.observe(edit);
  window.MBFilmStudio={setView,update,resume,get state(){return {view,editingTime:clocks[1],aiTime:clocks[2],paused:[...paused]}}};
})();
