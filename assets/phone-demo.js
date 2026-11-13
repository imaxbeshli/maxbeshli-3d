/* AVTOLAB77: animated 30-second Mini App concept, entirely offline.
   Booking interactions are a presentation only; no requests are submitted. */
window.MBPhoneDemo={
  duration:30,
  create(canvas,sources,onFrame){
    const x=canvas.getContext('2d'),W=600,H=1200;
    const red='#ff1734',white='#f5f5f3',muted='#a4a7ad',images={};
    let brandCrop=null;
    let time=0,active=false,last=0,lastPaint=-Infinity,renderedTime=0;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*p*(p*(p*6-15)+10)};
    function box(px,py,w,h,color,r=20,stroke){x.beginPath();x.roundRect(px,py,w,h,r);x.fillStyle=color;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=2;x.stroke()}}
    function text(value,px,py,size=26,color=white,weight=400,align='left'){x.font=`${weight} ${size}px Inter,Arial,sans-serif`;x.fillStyle=color;x.textAlign=align;x.textBaseline='alphabetic';x.fillText(value,px,py)}
    function line(points,color=white,width=3){x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.strokeStyle=color;x.lineWidth=width;x.lineCap='round';x.lineJoin='round';x.stroke()}
    function circle(px,py,r,color){x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fillStyle=color;x.fill()}
    const crops={film:[1,0],polish:[0,1],ceramic:[1,1]};
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
    function brand(px,py,w){
      if(images.logo?.naturalWidth){
        const im=images.logo,b=brandCrop||[0,0,im.naturalWidth,im.naturalHeight];
        x.drawImage(im,...b,px,py,w,w*b[3]/b[2]);
      }else text('AVTOLAB77',px,py+38,38,white,700);
    }
    function home(t){
      base();brand(28,190,544);
      photo('hero',26,310,548,440,22,1+.035*smooth(0,7,t));
      gradient(26,620,548,130);
      text('Уход, который',28,824,43,white,700);
      text('видно в деталях.',28,878,43,white,700);
      text('Защита кузова и безупречный блеск.',28,932,23,muted);
      text('Выберите услугу и удобное время.',28,970,23,muted);
      button('Записаться в студию',t,6.35);
    }
    const serviceInfo=[['Плёнка','Защита без компромиссов','Прозрачный слой защиты кузова','film'],['Полировка','Блеск в каждой линии','Глубина цвета и чистые отражения','polish'],['Керамика','Вода не задерживается','Гладкость и гидрофобный эффект','ceramic']];
    function services(t){
      base();heading('Забота о вашем авто','Выберите подходящую услугу');
      const selection=smooth(1.7,2.3,t)+smooth(3.7,4.3,t);
      serviceInfo.forEach((v,i)=>{
        const weight=Math.max(0,1-Math.abs(selection-i));if(weight<=0)return;
        x.save();x.globalAlpha*=weight;photo(v[3],26,310,548,420,22,1+.025*smooth(0,6,t));x.restore();
      });
      box(26,758,548,66,'#15181d',18);box(30+selection*182,762,176,58,red,15);
      serviceInfo.forEach((v,i)=>text(v[0],118+i*182,800,23,white,600,'center'));
      tap(300,791,t,1.75);tap(482,791,t,3.75);
      serviceInfo.forEach((v,i)=>{
        const weight=Math.max(0,1-Math.abs(selection-i));if(weight<=0)return;
        x.save();x.globalAlpha*=weight;text(v[1],28,894,29,white,600);text(v[2],28,939,22,muted);x.restore();
      });
      text('Индивидуальный подбор покрытия',28,1000,20,'#7f858e');
      button('Выбрать время',t,5.5);
    }
    function contacts(t){
      base();heading('До встречи в студии','Москва · AVTOLAB77');
      box(26,307,548,283,'#141b22',22);text('Ермакова роща,',49,365,31,white,600);text('7А, строение 2',49,410,31,white,600);
      text('Ежедневно 10:00–19:00',49,478,24,muted);text('+7 (926) 300-32-56',49,534,29,white,500);
      x.save();x.beginPath();x.roundRect(26,620,548,367,22);x.clip();box(26,620,548,367,'#111820',0);
      for(let i=0;i<6;i++)line([[30+i*100,620],[90+i*100,987]],'#293541',14);
      for(let i=0;i<4;i++)line([[26,660+i*95],[574,630+i*95]],'#293541',12);
      const path=smooth(.1,1.2,t);line([[90,920],[90+200*Math.min(path*2,1),920],[290,920-135*Math.max(0,path*2-1)]],red,5);
      circle(290,785,19+Math.sin(t*4)*3,'#ff173433');circle(290,785,10,red);x.restore();button('Построить маршрут',t,1.6);
    }
    function booking(t){
      t*=5/7;
      base();heading('Запись в студию');
      box(26,266,548,134,'#15181d',20,'#2a2e34');photo('ceramic',40,280,108,106,12);text('Керамика',170,320,27,white,600);text('Блеск и защита покрытия',170,358,18,muted);
      text('Выберите день',28,459,27,white,600);
      for(let i=0;i<5;i++){const chosen=i===2?smooth(.5,.8,t):0;box(26+i*112,482,100,94,'#171b20',16,'#292e34');x.save();x.globalAlpha*=chosen;box(26+i*112,482,100,94,red,16);x.restore();text(String(12+i),76+i*112,525,28,white,600,'center');text('НОЯ',76+i*112,556,16,muted,500,'center')}
      tap(300,527,t,.5);
      text('Удобное время',28,638,27,white,600);
      ['10:00','12:00','14:00','16:00'].forEach((v,i)=>{box(26+i*140,663,128,63,'#171b20',15,'#292e34');x.save();x.globalAlpha*=i===2?smooth(1.3,1.6,t):0;box(26+i*140,663,128,63,red,15);x.restore();text(v,90+i*140,704,24,white,500,'center')});tap(370,694,t,1.3);
      text('Ваше имя',28,787,21,muted);box(26,803,548,66,'#14171b',14,'#292e34');text('Александр'.slice(0,Math.floor(smooth(2,2.8,t)*9)),46,846,25);
      text('Телефон',28,917,21,muted);box(26,933,548,66,'#14171b',14,'#292e34');text('+7 (900) 000-00-00'.slice(0,Math.floor(smooth(2.8,3.7,t)*18)),46,976,25);
      button('Записаться',t,4.25);
    }
    function confirmation(t){
      base();const p=smooth(.15,1.05,t);
      x.beginPath();x.arc(300,272,57,-Math.PI/2,-Math.PI/2+Math.PI*2*p);x.strokeStyle=red;x.lineWidth=3;x.stroke();
      x.save();x.beginPath();x.rect(264,240,75*smooth(.6,1.15,t),65);x.clip();line([[272,271],[292,289],[330,252]],red,5);x.restore();
      text('Вы записаны',300,388,43,white,700,'center');text('Ждём вас в AVTOLAB77',300,435,24,muted,400,'center');
      photo('hero',26,482,548,364,22,1+.025*smooth(0,5,t));
      box(26,894,548,126,'#12161beF',20,'#30353b');text('Керамика',48,943,28,white,600);text('14 ноября · 14:00',48,986,24,muted);
      box(26,1062,548,76,'#20252c',18);text('Моя запись',300,1110,27,white,600,'center');
    }
    const sections=[{at:0,name:'home',draw:home},{at:7,name:'services',draw:services},{at:13,name:'booking',draw:booking},{at:20,name:'confirmation',draw:confirmation},{at:25,name:'contacts',draw:contacts}];
    function render(t){
      t=((t%30)+30)%30;renderedTime=t;let i=sections.length-1;while(i>0&&t<sections[i].at)i--;const local=t-sections[i].at;
      x.clearRect(0,0,W,H);box(0,0,W,H,'#080a0c',0);
      x.save();x.beginPath();x.rect(0,164,W,996);x.clip();
      if(i>0&&local<.55){sections[i-1].draw(sections[i].at-sections[i-1].at);const p=smooth(0,.55,local);x.save();x.globalAlpha*=p;x.translate((1-p)*34,0);sections[i].draw(local);x.restore()}else sections[i].draw(local);
      if(t>29.45){x.save();x.globalAlpha*=smooth(29.45,30,t);home(0);x.restore()}
      x.restore();chrome();onFrame();
    }
    const imagesReady=Promise.all(Object.entries({sheet:window.MB_PHONE_DETAILING_SHEET,hero:window.MB_PHONE_CAR_STUDIO,logo:window.MB_PHONE_BRAND}).filter(([,src])=>src).map(([key,src])=>new Promise(resolve=>{const im=new Image();images[key]=im;im.onload=resolve;im.onerror=()=>{console.warn('Phone demo image unavailable:',key);resolve()};im.src=src})));
    const ready=imagesReady.then(()=>{
      // Preserve the supplied artwork; trim only its empty margins in the layout.
      const im=images.logo;
      if(im?.naturalWidth){
        const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
        const cx=c.getContext('2d');cx.drawImage(im,0,0);const d=cx.getImageData(0,0,c.width,c.height).data;
        let left=c.width,top=c.height,right=0,bottom=0;
        for(let y=0;y<c.height;y++)for(let px=0;px<c.width;px++){
          const i=(y*c.width+px)*4;
          if(d[i+3]>128&&((d[i]>160&&d[i+1]<100)||(d[i]>170&&d[i+1]>170&&d[i+2]>170))){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        }
        if(right>left&&bottom>top){left=Math.max(0,left-5);top=Math.max(0,top-5);brandCrop=[left,top,Math.min(c.width-left,right-left+6),Math.min(c.height-top,bottom-top+6)];}
      }
      render(time);
    });
    render(0);document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {ready,render,update(running,now=performance.now()){
      running=Boolean(running&&!document.hidden);if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;last=now;active=running;
      if(running&&now-lastPaint>=1000/30-.5){render(time);lastPaint=now}
    },get state(){return {time,active,duration:30,renderedTime,car:{style:'studio-photo',wheelVisible:false},section:[...sections].reverse().find(s=>renderedTime>=s.at).name}}};
  }
};
