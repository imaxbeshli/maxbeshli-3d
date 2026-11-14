/* One shared, silent website video in the existing floating frame. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let tile=null,view=-1;
  reduced.addEventListener('change',()=>{if(reduced.matches)tile?.setPlaybackActive(false)});
  window.MBWebStudio={
    open(source){
      tile=source;view=0;tile.setPlaybackActive(false);
      const video=tile.video;
      video.controls=false;video.muted=true;video.loop=true;video.playsInline=true;
    },
    setView(n){view=n},
    suspend(){tile?.setPlaybackActive(false)},
    update(){
      const r=document.getElementById('architectureSlot').getBoundingClientRect();
      tile?.setPlaybackActive(!reduced.matches&&!document.hidden&&r.bottom>90&&r.top<innerHeight&&r.right>0&&r.left<innerWidth);
    },
    get state(){return {view,paused:tile?.video.paused??true,time:tile?.video.currentTime??0}}
  };
})();
