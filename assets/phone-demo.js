/* AVTOLAB77: animated 30-second Mini App concept, entirely offline.
   Booking interactions are a presentation only; no requests are submitted. */
window.MBPhoneDemo={
  duration:30,
  create(canvas,sources,onFrame){
    const x=canvas.getContext('2d'),W=600,H=1200;
    const red='#ff1734',white='#f5f5f3',muted='#a4a7ad',images={};
    const car3d=window.MBPhoneCar3D.create();
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
    const carLayer=document.createElement('canvas');carLayer.width=W;carLayer.height=H;
    const c=carLayer.getContext('2d');
    function studio(t,groundY=738){
      base();const g=x.createRadialGradient(330,550,20,300,550,390);
      g.addColorStop(0,'#252c35');g.addColorStop(.7,'#10151b');g.addColorStop(1,'#080a0c');x.fillStyle=g;x.fillRect(0,164,W,680);
      x.save();x.globalAlpha*=.4;x.strokeStyle='#ff1734';x.lineWidth=2;x.beginPath();x.ellipse(300,groundY,250,38,0,0,Math.PI*2);x.stroke();x.restore();
      // Architectural light strips drift behind the product, keeping the UI calm.
      for(let i=0;i<3;i++){const px=70+i*230+Math.sin(t*.35)*12;line([[px,300],[px-140,650]],'#ffffff0b',2)}
    }
    function vehicle(t,y=450,mode='shine',strength=1){
      const im=car3d.render(t,true),w=600,h=420,px=0;
      c.clearRect(0,0,W,H);c.drawImage(im,px,y-85,w,h);
      c.globalCompositeOperation='source-atop';
      if(mode==='film'){
        const edge=24+552*smooth(.2,3.5,t);
        const g=c.createLinearGradient(edge-95,0,edge+12,0);g.addColorStop(0,'#a5e7ff00');g.addColorStop(.75,'#a5e7ff45');g.addColorStop(1,'#e5faffbb');
        c.fillStyle=g;c.fillRect(24,y,Math.max(0,edge-24),h);
        c.fillStyle='#e9faff';c.globalAlpha=.65*strength;c.fillRect(edge,y,2,h);c.globalAlpha=1;
      }else if(mode==='ceramic'){
        for(let i=0;i<28;i++){
          const p=((t*.24+i*.137)%1),dx=58+(i*83)%500,dy=y+60+p*155;
          c.globalAlpha=Math.sin(p*Math.PI)*strength;
          const g=c.createRadialGradient(dx-1,dy-2,0,dx,dy,5);g.addColorStop(0,'#ffffff');g.addColorStop(.35,'#bedcffbb');g.addColorStop(1,'#79aed622');
          c.fillStyle=g;c.beginPath();c.ellipse(dx,dy,3.1,5.1, -.35,0,Math.PI*2);c.fill();
        }c.globalAlpha=1;
      }
      // A soft moving reflection follows the silhouette instead of covering the screen.
      const sweep=-160+880*smooth(0,4,t%4.5),g=c.createLinearGradient(sweep-70,0,sweep+70,0);
      g.addColorStop(0,'#ffffff00');g.addColorStop(.5,mode==='polish'?'#ffffffb0':'#ffffff55');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,y,W,h);
      c.globalCompositeOperation='source-over';
      x.save();x.globalAlpha*=strength;x.drawImage(carLayer,0,0);x.restore();

    }
    function home(t){
      studio(t);text('AVTO',28,224,35,white,800);text('LAB',132,224,35,red,800);text('77',204,224,35,white,800);
      text('ДЕТЕЙЛИНГ-СТУДИЯ',30,253,15,muted,500);
      x.drawImage(car3d.render(t),0,345,600,420);
      const title=smooth(.25,.8,t);x.save();x.globalAlpha*=title;x.translate(0,(1-title)*20);
      text('Всё начинается',28,855,43,white,700);text('с деталей.',28,908,43,white,700);
      text('Защита. Блеск. Характер.',28,960,25,muted);x.restore();
      box(28,1000,544,2,'#252b32',1);box(28,1000,544*smooth(0,5.7,t),2,red,1);
      button('Преобразить автомобиль',t,5.35);
    }
    const serviceInfo=[['Плёнка','Защита без компромиссов','Прозрачный слой защиты кузова','film'],['Полировка','Блеск в каждой линии','Глубина цвета и чистые отражения','polish'],['Керамика','Вода не задерживается','Гладкость и гидрофобный эффект','ceramic']];
    function services(t){
      t*=13/7;studio(t+6,680);heading('Ваш автомобиль.','Выберите, как он будет выглядеть.');
      const selection=smooth(3.6,4.2,t)+smooth(7.6,8.2,t);
      serviceInfo.forEach((v,i)=>{
        const weight=Math.max(0,1-Math.abs(selection-i));if(weight<=0)return;
        x.save();x.globalAlpha*=weight;vehicle(Math.max(0,t-i*4),395,v[3]);x.restore();
      });
      const slideX=26+selection*186;box(26,730,548,68,'#151b22',20);
      box(slideX,730,176,68,red,18);
      serviceInfo.forEach((v,i)=>text(v[0],114+i*186,773,23,white,600,'center'));
      tap(300,762,t,3.65);tap(486,762,t,7.65);
      serviceInfo.forEach((v,i)=>{const weight=Math.max(0,1-Math.abs(selection-i));x.save();x.globalAlpha*=weight;x.translate(0,(i-selection)*45);text(v[1],28,868,30,white,650);text(v[2],28,916,22,muted);x.restore()});
      text('AVTOLAB77 / ИНДИВИДУАЛЬНЫЙ УХОД',28,985,15,'#717d8c',500);
      button('Выбрать время',t,12.3);
    }
    function care(t){
      base();heading('Комплексный уход','Снаружи и внутри — до деталей');
      [['film','Кузов','Защита и восстановление блеска'],['polish','Салон','Бережный уход за материалами'],['ceramic','Оптика','Чистота и прозрачность']].forEach(([im,title,sub],i)=>{
        const p=smooth(i*.18,.45+i*.18,t),y=310+i*228,selected=smooth(i*.8+.5,i*.8+.8,t)*(1-smooth(i*.8+1.3,i*.8+1.6,t));
        x.save();x.globalAlpha*=p;x.translate((1-p)*70,0);box(26,y,548,202,'#151b22',20);if(i===0)photo(im,40,y+15,150,172,15);
        else {box(40,y+15,150,172,'#202933',15);x.save();x.translate(68,y+51);
          if(i===1){line([[12,3],[10,69],[72,69],[82,93]],'#d9e2ed',7);line([[25,12],[30,54],[65,54]],red,6);line([[0,90],[57,90]],'#d9e2ed',6)}
          else {x.beginPath();x.ellipse(45,48,35,23,-.2,0,Math.PI*2);x.strokeStyle='#d9e2ed';x.lineWidth=4;x.stroke();for(let j=0;j<3;j++)line([[50,36+j*11],[97,30+j*15]],red,3)}
          x.restore();}
        text(title,212,y+65,31,white,650);text(sub.split(' ').slice(0,3).join(' '),212,y+109,19,muted);text(sub.split(' ').slice(3).join(' '),212,y+139,19,muted);
        x.globalAlpha*=selected;box(26,y,548,202,'transparent',20,red);x.restore();tap(390,y+90,t,i*.8+.5);
      });button('Выбрать комплекс',t,3.3);
    }
    function about(t){
      base();heading('AVTOLAB77','Внимание к вашему автомобилю');
      photo('polish',26,302,548,421,22,1+.08*smooth(0,3,t));gradient(26,530,548,193);
      text('Работаем с деталями.',45,675,31,white,650);
      [['Защита кузова','Подбор покрытия под задачу'],['Бережный подход','Уход за каждым материалом']].forEach(([a,b],i)=>{const p=smooth(.3+i*.35,.8+i*.35,t);x.save();x.globalAlpha*=p;x.translate(0,(1-p)*20);text(a,30,797+i*108,29,white,600);text(b,30,837+i*108,21,muted);x.restore()});button('Записаться',t,2.35);
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
      t*=5/4;
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
      x.drawImage(car3d.render(5.5),0,480,600,420);
      box(26,894,548,126,'#12161beF',20,'#30353b');text('Керамика',48,943,28,white,600);text('14 ноября · 14:00',48,986,24,muted);
      box(26,1062,548,76,'#20252c',18);text('Моя запись',300,1110,27,white,600,'center');
    }
    const sections=[{at:0,name:'home',draw:home},{at:6,name:'services',draw:services},{at:13,name:'care',draw:care},{at:17,name:'about',draw:about},{at:20,name:'booking',draw:booking},{at:24,name:'confirmation',draw:confirmation},{at:27,name:'contacts',draw:contacts}];
    function render(t){
      t=((t%30)+30)%30;renderedTime=t;let i=sections.length-1;while(i>0&&t<sections[i].at)i--;const local=t-sections[i].at;
      x.clearRect(0,0,W,H);box(0,0,W,H,'#080a0c',0);
      x.save();x.beginPath();x.rect(0,164,W,996);x.clip();
      if(i>0&&local<.55){sections[i-1].draw(sections[i].at-sections[i-1].at);const p=smooth(0,.55,local);x.save();x.globalAlpha*=p;x.translate((1-p)*34,0);sections[i].draw(local);x.restore()}else sections[i].draw(local);
      if(t>29.45){x.save();x.globalAlpha*=smooth(29.45,30,t);home(0);x.restore()}
      x.restore();chrome();onFrame();
    }
    const imagesReady=Promise.all(Object.entries({sheet:window.MB_PHONE_DETAILING_SHEET}).filter(([,src])=>src).map(([key,src])=>new Promise(resolve=>{const im=new Image();images[key]=im;im.onload=resolve;im.onerror=()=>{console.warn('Phone demo image unavailable:',key);resolve()};im.src=src})));
    const ready=Promise.all([imagesReady,car3d.ready]).then(()=>render(time));
    render(0);document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {ready,render,update(running,now=performance.now()){
      running=Boolean(running&&!document.hidden);if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;last=now;active=running;
      if(running&&now-lastPaint>=1000/60-.5){render(time);lastPaint=now}
    },get state(){return {time,active,duration:30,renderedTime,car:car3d.state,section:[...sections].reverse().find(s=>renderedTime>=s.at).name}}};
  }
};
