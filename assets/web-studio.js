/* FORMA opens the story; the completed AVTOLAB site plays below it. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const video=document.getElementById('webReadyVideo');
  let demo=null,view=-1,playing=false;
  video.muted=video.defaultMuted=true;
  const surface=video.closest('.web-video-surface');
  let firstFrameCallback=0,fallbackFrame=0;
  function showFrame(){surface.classList.add('has-frame')}
  function waitForFirstFrame(){
    surface.classList.remove('has-frame');
    if(video.requestVideoFrameCallback){
      if(firstFrameCallback)video.cancelVideoFrameCallback(firstFrameCallback);
      firstFrameCallback=video.requestVideoFrameCallback(()=>{firstFrameCallback=0;showFrame()});
    }
  }
  video.addEventListener('emptied',()=>{cancelAnimationFrame(fallbackFrame);waitForFirstFrame()});
  if(!video.requestVideoFrameCallback)video.addEventListener('playing',()=>{
    // Older browsers: allow the decoded frame to reach the compositor first.
    cancelAnimationFrame(fallbackFrame);
    fallbackFrame=requestAnimationFrame(()=>{fallbackFrame=requestAnimationFrame(()=>{
      if(video.readyState>=2&&video.videoWidth)showFrame();
    })});
  });
  waitForFirstFrame();
  function playback(active,retry=false){
    if(active===playing&&!retry)return;
    playing=active;
    document.getElementById('ecosystem-modal').classList.toggle('is-web-video-playing',active);
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
