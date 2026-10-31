// Close water surface masks the change of cave; no simultaneous scene crossfade.
(()=>{
 const veil=document.getElementById('descentVeil'),canvas=document.createElement('canvas');canvas.className='descent-water-canvas';veil.append(canvas);
 const ctx=canvas.getContext('2d'),water=new Image();water.src=getComputedStyle(document.querySelector('.gallery-world')).backgroundImage.slice(5,-2);
 let w=0,h=0,clock=0,last=performance.now();
 const clamp=v=>Math.max(0,Math.min(1,v));
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;
  const p=window.MBDescent?.depth||0;if(document.hidden||p<.01||p>.94)return;clock+=dt;
  if(w!==innerWidth||h!==innerHeight){w=innerWidth;h=innerHeight;canvas.width=Math.round(w*.7);canvas.height=Math.round(h*.7);ctx.setTransform(.7,0,0,.7,0,0)}
  ctx.globalAlpha=1;ctx.fillStyle='#14313a';ctx.fillRect(0,0,w,h);
  if(water.complete&&water.naturalWidth){
   const cropH=water.naturalHeight*.25,cropX=water.naturalWidth*.16,cropW=water.naturalWidth*.68;
   ctx.globalAlpha=1;
   for(let y=0;y<h;y+=12){const wave=Math.sin(y/h*11+clock*.9+p*4)*10+Math.sin(y/h*23-clock*.6)*3;ctx.drawImage(water,cropX,cropH*(y/h),cropW,cropH*14/h,-18+wave,y,w+36,14)}
  }
  ctx.globalAlpha=1;
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,`rgba(7,30,40,${.08+p*.3})`);shade.addColorStop(1,`rgba(4,21,31,${.35+p*.4})`);ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  // A broad, curved meniscus passes the lens; it does not travel as a straight band.
  const line=h*(1.25-clamp((p-.12)/.42)*1.5);
  const edge=[];for(let i=0;i<=30;i++){const x=w*i/30,y=line+Math.sin(x/w*6.28+clock*.7)*h*.014+Math.sin(x/w*13-clock)*3;edge.push(`${i/30*100}% ${y/h*100}%`)}
  veil.style.clipPath=line<-h*.02?'none':`polygon(${edge.join(',')},100% 100%,0% 100%)`;
  ctx.beginPath();for(let x=-20;x<=w+20;x+=20){const y=line+Math.sin(x/w*6.28+clock*.7)*h*.014+Math.sin(x/w*13-clock)*3;if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
  ctx.strokeStyle='rgba(205,246,232,.28)';ctx.lineWidth=7;ctx.shadowBlur=20;ctx.shadowColor='#c2ede6';ctx.stroke();ctx.shadowBlur=0;
  const bubbleOpacity=Math.sin(clamp((p-.25)/.6)*Math.PI)*.28;
  for(let i=0;i<4;i++){const x=w*(.14+i*.24)+Math.sin(clock+i)*8,y=h*(1.2-p*1.7+i*.09);ctx.beginPath();ctx.ellipse(x,y,3+i,5+i,Math.sin(clock+i)*.2,0,Math.PI*2);ctx.strokeStyle=`rgba(220,244,235,${bubbleOpacity})`;ctx.lineWidth=1;ctx.stroke()}
 }
 requestAnimationFrame(frame);
})();
