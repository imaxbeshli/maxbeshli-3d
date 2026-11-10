/* Extruded rounded rectangle: square cross-section, planar front/back, actual CSS 3D side walls. */
function createAboutGlass(dialog){
  const panel=dialog.querySelector('.about-panel'),volume=dialog.querySelector('.about-glass-volume');
  let width=0,height=0;
  function rebuild(){
    const w=panel.clientWidth,h=panel.clientHeight;if(!w||!h||(w===width&&h===height))return;width=w;height=h;
    const radius=Math.min(w*.037,25),depth=w<500?25:38,points=[];
    panel.style.setProperty('--glass-radius',radius+'px');panel.style.setProperty('--glass-depth',depth+'px');
    for(const [x,y,start] of [[w-radius,radius,-90],[w-radius,h-radius,0],[radius,h-radius,90],[radius,radius,180]]){
      for(let i=0;i<=12;i++){const a=(start+i*7.5)*Math.PI/180;points.push([x+radius*Math.cos(a),y+radius*Math.sin(a)])}
    }
    volume.replaceChildren();
    const back=document.createElement('div');back.className='about-glass-back';volume.append(back);
    points.forEach((a,i)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],angle=Math.atan2(dy,dx),side=document.createElement('i');
      side.className='about-glass-side';side.style.cssText=`left:${a[0]}px;top:${a[1]}px;width:${Math.hypot(dx,dy)+.15}px;height:${depth}px;transform:rotateZ(${angle}rad) rotateX(-90deg);--edge-light:${(.18+.32*Math.abs(Math.cos(angle-.5))).toFixed(3)}`;
      volume.append(side);
    });
  }
  const observer=new ResizeObserver(rebuild);observer.observe(panel);
  return {resize:rebuild};
}
