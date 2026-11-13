/* Entry depends on a rendered scene, not on media in a background tile. */
(()=>{
  const state=window.MBLoading={scene:false,ready:false,failed:false,firstFrameAt:0,pending:[]};
  const required=['stone','backdrop','island','foreground'];
  const bar=document.getElementById('loaderBar'),percent=document.getElementById('loaderPerc'),button=document.getElementById('loaderBtn');
  let value=0,last=performance.now();
  function fail(message){
    if(state.ready||state.failed)return;
    state.failed=true;state.error=message;
    percent.textContent='Загрузка прервана';
    document.querySelector('.loader-subtitle').textContent=message;
    button.textContent='Перезагрузить';button.disabled=false;button.classList.add('ready');
    button.onclick=()=>location.reload();
  }
  state.markFrame=()=>{
    if(!state.firstFrameAt)state.firstFrameAt=performance.now();
    state.pending=required.filter(key=>state[key]===false);
    state.scene=state.pending.length===0;
  };
  function frame(now){
    if(state.failed)return;
    // A missing essential texture must offer recovery, not an endless 90%.
    // Start the deadline after actual WebGL output, excluding download/compile time.
    if(state.firstFrameAt&&!state.scene&&now-state.firstFrameAt>15000){
      fail('Не удалось загрузить фон сцены. Нажмите «Перезагрузить», чтобы повторить.');return;
    }
    const dt=Math.min((now-last)/1000,.1);last=now;
    value=Math.min(state.scene?100:90,value+dt*38);
    bar.style.width=value+'%';percent.textContent=Math.floor(value)+'%';
    bar.parentElement.setAttribute('aria-valuenow',String(Math.floor(value)));
    if(value<100)requestAnimationFrame(frame);
    else{state.ready=true;button.disabled=false;button.classList.add('ready')}
  }
  requestAnimationFrame(frame);
  window.addEventListener('error',()=>{if(!state.scene)fail('Не удалось запустить сцену. Нажмите «Перезагрузить», чтобы повторить.')});
  document.addEventListener('webglcontextlost',event=>{
    if(event.target.id==='webgl-canvas'&&!state.ready)fail('Графика не запустилась. Нажмите «Перезагрузить», чтобы повторить.');
  },true);
})();
