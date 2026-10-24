/* AVTOLAB77 demo: 15 seconds of bot automation + 15 seconds of Mini App.
   Embedded in index.html for offline playback; no Telegram messages are sent. */
window.MBPhoneDemo = {
  duration: 30,
  create(canvas, sources, onFrame) {
    const x = canvas.getContext('2d'), W = 600, H = 1200;
    const red = '#ff002b', white = '#f6f7fa', muted = '#93a0b1';
    const images = {};
    let time = 0, active = false, last = 0, lastPaint = -Infinity;
    const clamp = v => Math.max(0, Math.min(1, v));
    const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
    function box(px, py, w, h, color, radius = 20, stroke) {
      x.beginPath(); x.roundRect(px, py, w, h, radius);
      x.fillStyle = color; x.fill();
      if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1.5; x.stroke(); }
    }
    function text(value, px, py, size = 28, color = white, weight = 400, align = 'left') {
      x.fillStyle = color; x.font = `${weight} ${size}px Inter, Arial, sans-serif`;
      x.textAlign = align; x.textBaseline = 'alphabetic'; x.fillText(value, px, py);
    }
    function line(points, color, width = 3) {
      x.beginPath(); points.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py));
      x.strokeStyle = color; x.lineWidth = width; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke();
    }
    function dot(px, py, r, color) {
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fillStyle = color; x.fill();
    }
    function photo(name, px, py, w, h, radius = 18) {
      const im = images[name];
      box(px, py, w, h, '#121416', radius);
      if (!im?.naturalWidth) return;
      x.save(); x.beginPath(); x.roundRect(px, py, w, h, radius); x.clip();
      const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      x.drawImage(im, px + (w - im.naturalWidth * k) / 2, py + (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
      x.restore();
    }
    function logo(y, w = 360) {
      const im = images.logo;
      if (im?.naturalWidth) x.drawImage(im, (W - w) / 2, y, w, w * im.naturalHeight / im.naturalWidth);
      else { text('AVTO', 118, y + 40, 40, white, 800); text('LAB77', 230, y + 40, 40, red, 800); }
    }
    function chrome(mini = false, typing = false) {
      box(0, 0, W, 172, '#17212d', 0);
      text('9:41', 38, 48, 24, white, 600);
      for (let i = 0; i < 4; i++) box(474 + i * 8, 42 - i * 5, 5, 8 + i * 5, white, 1);
      box(528, 27, 33, 17, 'transparent', 4, white); box(532, 31, 24, 9, white, 1);
      line([[38, 100], [24, 114], [38, 128]], '#71bcf5', 3);
      if (mini) {
        text('AVTOLAB77', 300, 108, 28, white, 600, 'center');
        text('мини-приложение', 300, 143, 20, muted, 400, 'center');
      } else {
        dot(94, 116, 30, '#080b0f'); text('A', 94, 127, 30, red, 800, 'center');
        text('AVTOLAB77', 140, 108, 29, white, 600);
        text(typing ? 'печатает…' : 'бот · отвечает автоматически', 140, 143, 18, typing ? '#71bcf5' : muted);
      }
      for (let i = 0; i < 3; i++) dot(562, 105 + i * 10, 2, white);
      box(220, 1177, 160, 6, '#e4e8ec', 3);
    }
    function tap(px, py, t, at) {
      const p = (t - at) / .65;
      if (p < 0 || p > 1) return;
      x.save(); x.globalAlpha *= 1 - p;
      dot(px, py, 14 + p * 34, '#ffffff55');
      x.beginPath(); x.arc(px, py, 14 + p * 34, 0, Math.PI * 2); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
      x.restore();
    }
    function bubble(lines, y, start, t, outgoing = false, width = 468) {
      const p = ease((t - start) / .38); if (!p) return;
      const h = lines.length * 36 + 42, px = outgoing ? W - 24 - width : 24;
      x.save(); x.globalAlpha *= p; x.translate(0, (1 - p) * 18);
      box(px, y, width, h, outgoing ? '#2b5278' : '#202e3e', 22);
      lines.forEach((v, i) => text(v, px + 20, y + 35 + i * 36, 27));
      text(outgoing ? '12:41  ✓✓' : '12:41', px + width - 16, y + h - 12, 16, '#9badc1', 400, 'right');
      x.restore();
    }
    function chat(t) {
      box(0, 0, W, H, '#0d1825', 0);
      // A subtle Telegram-like chat pattern, kept below the text.
      for (let i = 0; i < 14; i++) line([[20 + (i % 3) * 210, 215 + i * 68], [38 + (i % 3) * 210, 204 + i * 68]], '#172536', 2);
      const typing = (t > 1.3 && t < 2.3) || (t > 5.1 && t < 6.3);
      x.save(); x.beginPath(); x.rect(0, 172, W, 943); x.clip();
      const scroll = ease((t - 8.0) / .65) * 210;
      x.translate(0, -scroll);
      box(218, 195, 164, 32, '#203044', 16); text('Сегодня', 300, 218, 18, '#adbdce', 400, 'center');
      bubble(['Здравствуйте! Хочу', 'защитить кузов плёнкой.'], 248, .35, t, true, 448);
      bubble(['Здравствуйте! Подскажите,', 'какой у вас автомобиль?'], 391, 2.3, t);
      bubble(['BMW X5'], 534, 4.2, t, true, 230);
      bubble(['Отлично! Посмотрите работы', 'или оставьте заявку —', 'подберём вариант защиты.'], 641, 6.3, t);
      if (t >= 6.8) {
        x.save(); x.globalAlpha *= ease((t - 6.8) / .3);
        box(24, 801, 228, 60, '#233c53', 12); text('Наши работы', 138, 840, 24, '#7ec4ff', 500, 'center');
        box(264, 801, 228, 60, t > 8.1 ? '#306691' : '#233c53', 12); text('Оставить заявку', 378, 840, 23, '#8bceff', 500, 'center');
        tap(385, 833, t, 8.1); x.restore();
      }
      bubble(['Заявка на защиту · BMW X5'], 891, 8.8, t, true, 480);
      bubble(['Спасибо! Менеджер свяжется', 'с вами здесь, в Telegram.'], 998, 10.0, t);
      x.restore();
      if (t >= 11.5) {
        const p = ease((t - 11.5) / .45);
        x.save(); x.globalAlpha *= p; x.translate(0, (1 - p) * 30);
        box(20, 794, 560, 278, '#101b29', 24, '#38516b');
        dot(54, 833, 6, '#65d3b0'); text('ВЛАДЕЛЬЦУ · CRM', 74, 840, 20, '#a4bacd', 600);
        text('Новая заявка', 42, 892, 34, white, 600);
        text('BMW X5 · защита кузова', 42, 936, 26);
        text('Ответить клиенту в Telegram', 42, 976, 23, muted);
        box(42, 1000, 232, 46, '#173b35', 12);
        text(t > 13.2 ? '✓ Заявка сохранена' : 'Сохраняем заявку…', 58, 1031, 21, '#7de0b7', 500);
        x.restore();
      }
      box(0, 1115, W, 85, '#17212d', 0); box(22, 1130, 490, 42, '#233344', 21);
      text('Сообщение', 45, 1158, 22, muted); dot(552, 1151, 23, '#4d9fda');
      line([[542, 1150], [561, 1141], [555, 1161], [551, 1152], [542, 1150]], '#fff', 2);
      chrome(false, typing);
      if (typing) {
        const yy = t < 2.3 ? 405 : 650;
        box(24, yy, 104, 42, '#202e3e', 20);
        for (let i = 0; i < 3; i++) dot(50 + i * 23, yy + 21, 4, `rgba(140,180,214,${.35 + .5 * (1 + Math.sin(t * 9 - i)) / 2})`);
      }
    }
    function appHeader(title) {
      logo(197, 350);
      if (title) {
        line([[39, 234], [27, 246], [39, 258]], '#fff', 3);
        text(title, 300, 337, 34, white, 700, 'center');
      }
    }
    function home(t) {
      box(0, 0, W, H, '#000', 0); appHeader();
      photo('bentley', 0, 292, 600, 440, 0);
      text('ПРЕМИАЛЬНОЕ РЕШЕНИЕ', 300, 785, 30, white, 700, 'center');
      text('ДЛЯ ВАШЕГО АВТОМОБИЛЯ', 300, 826, 29, white, 700, 'center');
      box(20, 860, 560, 72, red, 16); text('КАК ДОБРАТЬСЯ', 300, 905, 26, white, 700, 'center');
      [['bmw','НАШИ РАБОТЫ'],['lexus','КОНТАКТЫ'],['bentley','О СТУДИИ']].forEach(([im,label],i)=>{
        const px=20+i*192;photo(im,px,957,176,123,14);box(px,1064,176,55,'#101010',10,'#303030');text(label,px+88,1099,18,white,600,'center');
      });
      tap(108, 1020, t, 3.45); chrome(true);
    }
    function works(t) {
      box(0, 0, W, H, '#000', 0);
      x.save();x.beginPath();x.rect(0,370,W,790);x.clip();
      const scroll= ease((t-.8)/4.8)*660;
      [['bmw','BMW E31'],['bentley','Bentley Continental GT'],['lexus','Lexus LX500']].forEach(([im,label],i)=>{
        const py=380+i*440-scroll;
        box(22,py,556,414,'#111',22,'#303030');photo(im,23,py+1,554,330,21);
        text(label,44,py+382,29,white,600);
      });
      x.restore();box(0,172,W,194,'#000',0);appHeader('НАШИ РАБОТЫ');chrome(true);
    }
    function contacts(t) {
      box(0,0,W,H,'#000',0);appHeader('КОНТАКТЫ');
      box(24,385,552,151,'#101010',20,'#303030');
      text('ТЕЛЕФОН',300,432,19,muted,400,'center');text('+7 (926) 300-32-56',300,487,33,white,500,'center');
      ['TG','ЧАТ','VK'].forEach((v,i)=>{box(135+i*115,574,94,86,'#101010',18,'#303030');dot(182+i*115,616,27,red);text(v,182+i*115,624,19,white,700,'center')});
      box(24,700,552,151,'#101010',20,'#303030');text('РЕЖИМ РАБОТЫ',300,746,20,muted,400,'center');text('10:00–19:00',300,801,34,white,500,'center');
      box(24,893,552,76,red,16);text('КАК ДОБРАТЬСЯ',300,941,26,white,700,'center');
      text('Москва · Ермакова роща',300,1022,24,muted,400,'center');tap(300,935,t,2.0);chrome(true);
    }
    function route(t) {
      box(0,0,W,H,'#000',0);appHeader('КАК ДОБРАТЬСЯ');
      text('Ермакова роща, 7А, строение 2',300,389,25,white,400,'center');
      x.save();x.beginPath();x.roundRect(24,425,552,620,20);x.clip();box(24,425,552,620,'#20262c',0);
      x.save();x.translate(300,730);x.rotate(-.25);
      for(let r=-2;r<3;r++)for(let c=-2;c<3;c++)box(c*130+20,r*140+12,92,92,'#2b333a',5,'#39434b');
      for(let i=-1;i<3;i++)line([[-440,i*160],[440,i*160]],'#58616a',18);
      line([[-70,-420],[-70,430]],'#59646b',28);line([[-70,-420],[-70,430]],'#6c8d79',4);
      line([[-70,250],[-70,10],[25,10]],'#ff3757',6);x.restore();
      text('Ермакова роща',110,958,20,'#aab2bb');
      const pulse=(Math.sin(t*4)+1)/2;dot(310,732,38+pulse*13,'#ff002b22');dot(310,732,26,red);
      box(338,694,186,71,'#fff',12);text('Автолаб',355,723,24,'#161b20',600);text('До 19:00',355,748,18,'#606970');
      x.restore();box(24,1070,552,74,red,16);text('ОТКРЫТЬ В ЯНДЕКС КАРТАХ',300,1115,22,white,700,'center');chrome(true);
    }
    const sections=[{at:0,draw:chat},{at:15,draw:home},{at:19,draw:works},{at:25,draw:contacts},{at:27.5,draw:route}];
    function render(t) {
      t=((t%30)+30)%30;
      let i=sections.length-1;while(i>0&&t<sections[i].at)i--;
      const local=t-sections[i].at;
      x.save();x.clearRect(0,0,W,H);
      if(local<.4&&i>0){
        const prev=sections[(i+sections.length-1)%sections.length];
        const end=i?sections[i].at:30;prev.draw(end-prev.at-.001);
        x.globalAlpha=ease(local/.4);
      }
      sections[i].draw(local);if(t>29.6){x.globalAlpha=ease((t-29.6)/.4);chat(0)}x.restore();onFrame();
    }
    const ready=Promise.all(Object.entries(sources).map(([key,src])=>new Promise(resolve=>{
      const im=new Image();images[key]=im;im.onload=resolve;im.onerror=()=>{console.warn('Phone demo image unavailable:',key);resolve()};im.src=src;
    }))).then(()=>render(time));
    render(0);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {
      ready, render,
      update(running, now=performance.now()) {
        running=Boolean(running&&!document.hidden);
        if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;
        last=now;active=running;
        if(running&&now-lastPaint>=1000/30){render(time);lastPaint=now;}
      },
      get state(){return {time,active,duration:30};}
    };
  }
};
