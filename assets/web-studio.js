/* FORMA opens the story; the completed AVTOLAB site plays below it. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const video=document.getElementById('webReadyVideo');
  let demo=null,view=-1,playing=false;
  video.muted=video.defaultMuted=true;
  function playback(active,retry=false){
    if(active===playing&&!retry)return;
    playing=active;
    if(active)video.play().catch(()=>{});else video.pause();
  }
  function visible(id){
    const r=document.getElementById(id).getBoundingClientRect();
    return r.bottom>90&&r.top<innerHeight-70&&r.right>0&&r.left<innerWidth;
  }
  function allowed(){return !reduced.matches&&!document.hidden&&window.MBSections?.state.active&&MBSections.state.index===1&&!document.getElementById('infoDialog').open&&!document.getElementById('aboutDialog').open}
  function suspend(){demo?.update(false);playback(false)}
  reduced.addEventListener('change',()=>{if(reduced.matches){suspend();demo?.seek(18)}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});
  window.addEventListener('pointerup',()=>{if(allowed()&&visible('webReadyVideo')&&video.paused)playback(true,true)},{passive:true});
  window.MBWebStudio={
    open(source){demo=source;view=0;suspend();if(reduced.matches)demo.seek(18)},
    setView(n){view=n},suspend,
    update(now){
      const active=allowed();
      demo?.update(active&&visible('architectureSlot'),now);
      playback(active&&visible('webReadyVideo'));
    },
    get state(){return {view,paused:reduced.matches,time:demo?.state.time??0,videoTime:video.currentTime,videoPaused:video.paused}}
  };
})();
