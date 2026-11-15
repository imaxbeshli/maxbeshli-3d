/* Limit GPU pixel work, then adapt only during a settled home orbit. */
window.MBRenderQuality = {
  create(renderer) {
    let scale=1,last=0,since=0,frames=0,total=0,lastChange=0;
    function maximum(){return Math.min(devicePixelRatio,innerWidth<760?1.4:1.75,Math.sqrt((innerWidth<760?1000000:2400000)/(innerWidth*innerHeight)))}
    function apply(){const ratio=maximum()*scale;if(Math.abs(renderer.getPixelRatio()-ratio)>.01)renderer.setPixelRatio(ratio)}
    function reset(now=0){last=now;since=now;frames=total=0}
    function resize(){apply();renderer.setSize(innerWidth,innerHeight);reset()}
    function observe(now,settled){
      if(!settled){reset(now);return}
      if(!last){reset(now);return}
      const gap=now-last;last=now;
      if(gap<=0||gap>3000){reset(now);return}
      total+=Math.min(gap,250);frames++;
      if(now-since<1800||frames<4)return;
      const average=total/frames;
      // Hysteresis avoids oscillation and visible resolution changes during travel.
      if(average>28&&scale>.65&&now-lastChange>2200){scale=Math.max(.65,scale-.12);apply();lastChange=now;}
      else if(average<18&&scale<1&&now-lastChange>12000){scale=Math.min(1,scale+.06);apply();lastChange=now;}
      reset(now);
    }
    resize();
    return {observe,resize,reset,get state(){return {scale,pixelRatio:renderer.getPixelRatio(),maximum:maximum()}}};
  }
};
