/* A self-playing website showcase, with no additional controls or duplicate contacts. */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let demo=null,view=-1;
  reduced.addEventListener('change',()=>{if(reduced.matches){demo?.update(false);demo?.seek(18)}});
  window.MBWebStudio={
    open(source){demo=source;view=0;demo.update(false);demo.seek(reduced.matches?18:0)},
    setView(n){view=n},
    suspend(){demo?.update(false)},
    update(now){
      const r=document.getElementById('architectureSlot').getBoundingClientRect();
      if(reduced.matches||document.hidden||r.bottom<90||r.top>innerHeight){demo?.update(false);return}
      demo?.update(true,now);
    },
    get state(){return {view,paused:reduced.matches,time:demo?.state.time??0}}
  };
})();
