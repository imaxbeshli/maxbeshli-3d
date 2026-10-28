/* AVTOLAB77: animated 30-second Mini App concept, entirely offline.
   Booking interactions are a presentation only; no requests are submitted. */
window.MBPhoneDemo={
  duration:30,
  create(canvas,sources,onFrame){
    const x=canvas.getContext('2d'),W=600,H=1200;
    const red='#ff1734',white='#f5f5f3',muted='#a4a7ad',images={};
    let time=0,active=false,last=0,lastPaint=-Infinity,renderedTime=0;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*p*(p*(p*6-15)+10)};
    function box(px,py,w,h,color,r=20,stroke){x.beginPath();x.roundRect(px,py,w,h,r);x.fillStyle=color;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=2;x.stroke()}}
    function text(value,px,py,size=26,color=white,weight=400,align='left'){x.font=`${weight} ${size}px Inter,Arial,sans-serif`;x.fillStyle=color;x.textAlign=align;x.textBaseline='alphabetic';x.fillText(value,px,py)}
    function line(points,color=white,width=3){x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.strokeStyle=color;x.lineWidth=width;x.lineCap='round';x.lineJoin='round';x.stroke()}
    function circle(px,py,r,color){x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fillStyle=color;x.fill()}
    const crops={hero:[0,0],film:[1,0],polish:[0,1],ceramic:[1,1]};
    function photo(name,px,py,w,h,r=20,zoom=1){
      box(px,py,w,h,'#141619',r);
      const im=images[crops[name]?'sheet':name];if(!im?.naturalWidth)return;
      let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
      if(crops[name]){sw/=2;sh/=2;sx=crops[name][0]*sw;sy=crops[name][1]*sh}
      const k=Math.max(w/sw,h/sh)*zoom;
      x.save();x.beginPath();x.roundRect(px,py,w,h,r);x.clip();
      x.drawImage(im,sx,sy,sw,sh,px+(w-sw*k)/2,py+(h-sh*k)/2,sw*k,sh*k);x.restore();
    }
    function gradient(px,py,w,h){const g=x.createLinearGradient(0,py,0,py+h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.93)');x.fillStyle=g;x.fillRect(px,py,w,h)}
    function tap(px,py,t,at){const p=(t-at)/.55;if(p<0||p>1)return;x.save();x.globalAlpha*=1-p;circle(px,py,12+30*p,'#ffffff35');x.beginPath();x.arc(px,py,12+30*p,0,Math.PI*2);x.strokeStyle='#ffffffaa';x.lineWidth=2;x.stroke();x.restore()}
    function button(label,t,at,py=1062){const press=smooth(at,at+.13,t)*(1-smooth(at+.13,at+.4,t));x.save();x.translate(300,py+38);x.scale(1-.025*press,1-.025*press);box(-274,-38,548,76,red,18);text(label,0,10,27,white,600,'center');x.restore();tap(300,py+38,t,at)}
    function heading(title,subtitle){text(title,28,227,38,white,700);if(subtitle)text(subtitle,28,268,22,muted)}
    function chrome(){
      box(0,0,W,164,'#0b0d10',0);text('9:41',32,43,23,white,600);
      for(let i=0;i<4;i++)box(476+i*8,36-i*4,4,6+i*4,white,1);
      box(526,25,34,16,'#0b0d10',4,white);box(530,29,24,8,white,1);
      line([[30,94],[48,112]]);line([[48,94],[30,112]]);
      text('AVTOLAB77',300,105,27,white,650,'center');text('мини-приложение',300,137,18,muted,400,'center');
      for(let i=0;i<3;i++)circle(544+i*8,103,2,white);
      box(0,1160,W,40,'#090b0d',0);box(220,1181,160,5,'#dfdfdf',3);
    }
    function base(){box(0,164,W,996,'#080a0c',0)}
    function home(t){
      base();photo('hero',0,164,600,705,0,1+.07*smooth(0,5,t));gradient(0,620,600,260);
      text('AVTO',30,224,35,white,800);text('LAB',134,224,35,red,800);text('77',206,224,35,white,800);
      text('ДЕТЕЙЛИНГ-СТУДИЯ',32,250,15,'#b5b8bd',500);
      text('Уход, который',28,896,43,white,700);text('видно.',28,946,43,white,700);
      text('Детейлинг и защита автомобиля',28,994,23,muted);
      button('Подобрать уход',t,4.3);
    }
    function services(t){
      base();heading('Выберите услугу','Защита, блеск и внимание к деталям');
      [['film','Защитная плёнка','Защита кузова от сколов'],['polish','Полировка','Глубина цвета и зеркальный блеск'],['ceramic','Керамика','Блеск и гидрофобный эффект']].forEach(([im,title,sub],i)=>{
        const p=smooth(i*.12,.55+i*.12,t),py=301+i*236;
        x.save();x.globalAlpha*=p;x.translate(0,(1-p)*24);
        photo(im,26,py,548,216,20,1+.025*smooth(0,5,t));gradient(26,py+85,548,131);
        text(title,46,py+157,30,white,650);text(sub,46,py+191,19,'#d1d2d5');
        if(i===0){x.globalAlpha*=smooth(1.1,1.5,t);box(26,py,548,216,'transparent',20,red)}x.restore();
      });
      tap(310,410,t,1.1);button('Посмотреть работы',t,4.3);
    }
    function works(t){
      base();heading('Наши работы','Детали, которые говорят за нас');
      x.save();x.beginPath();x.rect(0,291,W,749);x.clip();const scroll=smooth(.8,3.9,t)*240;
      [['bentley','Bentley Continental GT','ДЕТЕЙЛИНГ'],['bmw','BMW E31','УХОД ЗА КУЗОВОМ'],['lexus','Lexus LX500','ЗАЩИТА И УХОД']].forEach(([im,title,sub],i)=>{
        const y=301+i*418-scroll;photo(im,26,y,548,318,20,1+.025*smooth(0,5,t));box(26,y+297,548,100,'#13161a',14);text(title,46,y+340,28,white,600);text(sub,46,y+375,16,muted,500);
      });x.restore();
      box(0,1040,W,120,'#080a0c',0);text('Откройте проект',300,1108,23,muted,400,'center');tap(300,420,t,4.25);
    }
    function project(t){
      base();text('НАШИ РАБОТЫ / 01',28,211,17,muted,500);text('Bentley Continental GT',28,262,32,white,650);
      photo('bentley',26,300,548,487,20,1+.1*smooth(0,5,t));
      // Detail crop of the same real project; no unrelated car masquerades as another angle.
      const detail=smooth(1.5,2.1,t)*(1-smooth(3.2,3.8,t));x.save();x.globalAlpha*=detail;photo('bentley',26,300,548,487,20,1.55);x.restore();
      for(let i=0;i<2;i++)box(260+i*48,762,36,4,i===(detail>.5?1:0)?red:'#ffffff55',2);
      text('Внимание к каждой детали',28,844,28,white,600);
      text('Кузов · оптика · финишный блеск',28,890,22,muted);
      box(28,930,178,46,'#171b20',12);text('AVTOLAB77',117,960,19,white,600,'center');
      button('Хочу такой уход',t,4.3);
    }
    function booking(t){
      base();heading('Запись в студию');
      box(26,266,548,134,'#15181d',20,'#2a2e34');photo('film',40,280,108,106,12);text('Защитная плёнка',170,320,27,white,600);text('Комплексная защита кузова',170,358,18,muted);
      text('Выберите день',28,459,27,white,600);
      for(let i=0;i<5;i++){const chosen=i===2?smooth(.5,.8,t):0;box(26+i*112,482,100,94,'#171b20',16,'#292e34');x.save();x.globalAlpha*=chosen;box(26+i*112,482,100,94,red,16);x.restore();text(String(12+i),76+i*112,525,28,white,600,'center');text('НОЯ',76+i*112,556,16,muted,500,'center')}
      tap(300,527,t,.5);
      text('Удобное время',28,638,27,white,600);
      ['10:00','12:00','14:00','16:00'].forEach((v,i)=>{box(26+i*140,663,128,63,'#171b20',15,'#292e34');x.save();x.globalAlpha*=i===2?smooth(1.3,1.6,t):0;box(26+i*140,663,128,63,red,15);x.restore();text(v,90+i*140,704,24,white,500,'center')});tap(370,694,t,1.3);
      text('Ваше имя',28,787,21,muted);box(26,803,548,66,'#14171b',14,'#292e34');text('Александр'.slice(0,Math.floor(smooth(2,2.8,t)*9)),46,846,25);
      text('Телефон',28,917,21,muted);box(26,933,548,66,'#14171b',14,'#292e34');text('+7 (900) 000-00-00'.slice(0,Math.floor(smooth(2.8,3.7,t)*18)),46,976,25);
      button('Записаться',t,5.25);
    }
    function confirmation(t){
      base();const p=smooth(.15,1.05,t);
      x.beginPath();x.arc(300,272,57,-Math.PI/2,-Math.PI/2+Math.PI*2*p);x.strokeStyle=red;x.lineWidth=3;x.stroke();
      x.save();x.beginPath();x.rect(264,240,75*smooth(.6,1.15,t),65);x.clip();line([[272,271],[292,289],[330,252]],red,5);x.restore();
      text('Вы записаны',300,388,43,white,700,'center');text('Ждём вас в AVTOLAB77',300,435,24,muted,400,'center');
      photo('hero',0,471,600,466,0,1.07+.06*smooth(0,4,t));gradient(0,799,600,138);
      box(26,894,548,126,'#12161beF',20,'#30353b');text('Защитная плёнка',48,943,28,white,600);text('14 ноября · 14:00',48,986,24,muted);
      box(26,1062,548,76,'#20252c',18);text('Моя запись',300,1110,27,white,600,'center');
    }
    const sections=[{at:0,name:'home',draw:home},{at:5,name:'services',draw:services},{at:10,name:'works',draw:works},{at:15,name:'project',draw:project},{at:20,name:'booking',draw:booking},{at:26,name:'confirmation',draw:confirmation}];
    function render(t){
      t=((t%30)+30)%30;renderedTime=t;let i=sections.length-1;while(i>0&&t<sections[i].at)i--;const local=t-sections[i].at;
      x.clearRect(0,0,W,H);box(0,0,W,H,'#080a0c',0);
      x.save();x.beginPath();x.rect(0,164,W,996);x.clip();
      if(i>0&&local<.55){sections[i-1].draw(sections[i].at-sections[i-1].at);const p=smooth(0,.55,local);x.save();x.globalAlpha*=p;x.translate((1-p)*34,0);sections[i].draw(local);x.restore()}else sections[i].draw(local);
      if(t>29.45){x.save();x.globalAlpha*=smooth(29.45,30,t);home(0);x.restore()}
      x.restore();chrome();onFrame();
    }
    const ready=Promise.all(Object.entries({...sources,sheet:window.MB_PHONE_DETAILING_SHEET}).filter(([,src])=>src).map(([key,src])=>new Promise(resolve=>{const im=new Image();images[key]=im;im.onload=resolve;im.onerror=()=>{console.warn('Phone demo image unavailable:',key);resolve()};im.src=src}))).then(()=>render(time));
    render(0);document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {ready,render,update(running,now=performance.now()){
      running=Boolean(running&&!document.hidden);if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;last=now;active=running;
      if(running&&now-lastPaint>=1000/60-.5){render(time);lastPaint=now}
    },get state(){return {time,active,duration:30,renderedTime,section:[...sections].reverse().find(s=>renderedTime>=s.at).name}}};
  }
};
