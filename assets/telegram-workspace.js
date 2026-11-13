/* Local portfolio workspace. Initial examples and visitor bookings stay in this
   browser session. No messaging service, studio or external CRM is contacted. */
(()=>{
  const $=id=>document.getElementById(id),root=$('telegramScene');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return dayKey(d)};
  const dateLabel=s=>new Date(s+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  const clockLabel=()=>new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const slots=['10:00','12:00','14:00','16:00','18:00'];
  const services={protection:{name:'Защита кузова',info:'Защитная плёнка помогает сохранить покрытие от сколов и мелких повреждений. Подберём зоны оклейки под ваш автомобиль.'},polish:{name:'Полировка',info:'Оцениваем состояние лакокрасочного покрытия, подбираем составы и возвращаем поверхности глубину цвета и блеск.'},interior:{name:'Уход за салоном',info:'Бережная очистка кожи, текстиля и пластика. Состав работ подбирается по материалам и состоянию салона.'}};
  const statusNames={new:'Новая',working:'В работе',confirmed:'Подтверждена',cancelled:'Отменена'};
  const seed=[
    {id:'seed-tg',name:'Александр',car:'BMW X5',service:'protection',source:'Telegram',status:'confirmed',date:day(1),time:'12:00',onCalendar:true,reminder:true,assignee:'Администратор',origin:'seed',history:['Интересует защита передней части кузова.','Подобрали услугу и время визита.']},
    {id:'seed-wa',name:'Мария',car:'Mercedes-Benz C',service:'polish',source:'WhatsApp',status:'new',date:'',time:'',onCalendar:false,reminder:false,assignee:'Администратор',origin:'seed',history:['Здравствуйте! Хочу освежить цвет автомобиля. Можно записаться на полировку?']},
    {id:'seed-ig',name:'Даниил',car:'Porsche Macan',service:'interior',source:'Instagram',status:'working',date:'',time:'',onCalendar:false,reminder:false,assignee:'Администратор',origin:'seed',history:['Увидел ваши работы. Подскажите по уходу за кожаным салоном.','Уточняем состояние материалов и пожелания.']}
  ];
  let state={version:1,leads:seed,rules:{assign:true,calendar:true,reminder:true},activity:[]};
  try{
    const saved=JSON.parse(sessionStorage.getItem('mb-telegram-workspace'));
    if(saved?.version===1&&Array.isArray(saved.leads)&&saved.leads.length<=30&&Array.isArray(saved.activity)&&
      ['assign','calendar','reminder'].every(k=>typeof saved.rules?.[k]==='boolean')&&
      saved.leads.every(l=>l&&services[l.service]&&statusNames[l.status]&&['Telegram','WhatsApp','Instagram'].includes(l.source)&&
        ['id','name','car','date','time'].every(k=>typeof l[k]==='string')&&Array.isArray(l.history)&&l.history.every(t=>typeof t==='string')))state=saved;
  }catch(e){}
  let view=0,crmView='leads',selected=state.leads[0]?.id,source='all',query='',sequence=0,lastToast=0;
  let botStep='menu',draft={},replyTimer=0,replyToken=0,typing=false;
  function persist(){try{sessionStorage.setItem('mb-telegram-workspace',JSON.stringify(state))}catch(e){}}
  function log(text){state.activity.unshift({text,time:clockLabel()});state.activity=state.activity.slice(0,12);persist();renderActivity()}
  function badge(source){return `<span class="crm-source-icon source-${source.toLowerCase()}">${source==='Telegram'?'↗':source==='WhatsApp'?'W':'◎'}</span>`}
  function toast(text){$('crmToast').textContent=text;$('crmToast').classList.add('visible');lastToast=performance.now()}
  function current(){return state.leads.find(l=>l.id===selected)}
  function free(date,exclude=''){
    return slots.filter(time=>new Date(date+'T'+time+':00').getTime()>Date.now()&& !state.leads.some(l=>l.id!==exclude&&l.status==='confirmed'&&l.date===date&&l.time===time));
  }
  function reminderText(l){return `${l.name}, ждём вас ${dateLabel(l.date)} в ${l.time}. Услуга: ${services[l.service].name}. Если планы изменились, сообщите студии.`}
  function applyConfirmation(l,date,time){
    if(!date||!time||!free(date,l.id).includes(time))return false;
    const old=l.status==='confirmed'&&l.date?`${dateLabel(l.date)}, ${l.time}`:'';
    l.status='confirmed';l.date=date;l.time=time;l.onCalendar=state.rules.calendar;l.reminder=state.rules.reminder;
    l.history.push(old?`Запись перенесена с ${old} на ${dateLabel(date)}, ${time}.`:`Запись подтверждена: ${dateLabel(date)}, ${time}.`);
    log(`${l.name}: ${old?'перенос записи':'запись подтверждена'} · ${dateLabel(date)}, ${time}`);
    if(l.reminder)log(`${l.name}: подготовлен текст напоминания`);
    return true;
  }
  const bookingLimit=3;
  const visitorCount=()=>state.leads.filter(l=>l.origin==='visitor').length;
  function updateBookingLimit(){
    const used=visitorCount();$('botBookingLimit').textContent=used?`Создано записей: ${Math.min(used,bookingLimit)} из ${bookingLimit}.`:'Можно создать до 3 записей и посмотреть их в CRM.';
  }
  function limitReached(){
    if(visitorCount()<bookingLimit)return false;
    botStep='limit';updateBookingLimit();
    reply('Вы создали три записи. Теперь их можно посмотреть, перенести или отменить в CRM.',()=>choices([['Посмотреть записи в CRM',()=>openCRM(state.leads.find(l=>l.origin==='visitor')?.id)]]));return true;
  }
  function addLead(data){
    if(data.origin==='visitor'&&visitorCount()>=bookingLimit)return null;
    const l={id:'lead-'+Date.now().toString(36)+'-'+(++sequence),status:'new',date:'',time:'',onCalendar:false,reminder:false,assignee:state.rules.assign?'Администратор':'Не назначен',history:[],...data};
    if(state.leads.length>=30){const i=state.leads.findIndex(x=>x.origin==='seed'&&x.status!=='confirmed');if(i>=0)state.leads.splice(i,1);else return null}
    state.leads.unshift(l);updateBookingLimit();log(`${l.source}: новое обращение · ${l.name}`);renderList();return l;
  }
  // Chat: choices branch into service information, booking and the shared CRM.
  function scrollChat(){const el=$('botMessages');el.scrollTo({top:el.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  function bubble(text,user=false){
    const el=document.createElement('div');el.className='tg-message'+(user?' is-user':'');
    const body=document.createElement('p');body.textContent=text;const time=document.createElement('small');time.textContent=clockLabel()+(user?' ✓✓':'');el.append(body,time);$('botMessages').append(el);
    while($('botMessages').children.length>60)$('botMessages').firstElementChild.remove();scrollChat();
  }
  function cancelReply(){clearTimeout(replyTimer);replyTimer=0;replyToken++;typing=false;$('botTyping')?.remove();$('botPresence').textContent='бот';$('botComposer').querySelector('button').disabled=false}
  function choices(items){
    $('botActions').replaceChildren(...items.map(([text,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>{if(!typing)fn()});return b}));
  }
  function reply(text,next){
    cancelReply();const token=replyToken;typing=true;$('botActions').replaceChildren();$('botPresence').textContent='печатает…';$('botComposer').querySelector('button').disabled=true;
    const el=document.createElement('div');el.id='botTyping';el.className='tg-typing';el.setAttribute('aria-label','Бот печатает');el.innerHTML='<i></i><i></i><i></i>';$('botMessages').append(el);scrollChat();
    replyTimer=setTimeout(()=>{if(token!==replyToken)return;cancelReply();bubble(text);next?.();scrollChat()},520);
  }
  function menu(){botStep='menu';$('botInput').placeholder='Написать сообщение';choices([['Подобрать услугу',()=>startServices()],['Записаться',()=>startServices()],['Стоимость',()=>command('price')],['Адрес и время',()=>command('address')]])}
  function startServices(){if(limitReached())return;bubble('Хочу подобрать услугу',true);reply('Что хотите сделать для автомобиля?',()=>{botStep='service';choices(Object.entries(services).map(([key,s])=>[s.name,()=>chooseService(key)]))})}
  function chooseService(key){if(limitReached())return;draft.service=key;delete draft.confirmedId;bubble(services[key].name,true);reply(services[key].info,()=>{botStep='service-info';choices([['Что входит?',()=>{bubble('Что входит в услугу?',true);reply(services[key].info+' Перед началом работ обсуждаем состояние автомобиля и согласуем состав услуги.',serviceNext)}],['Перейти к записи',askCar],['Выбрать другую услугу',startServices]])})}
  function serviceNext(){choices([['Перейти к записи',askCar],['Другие услуги',startServices],['Как определяется стоимость?',()=>command('price')]])}
  function askCar(){if(limitReached())return;reply('Какая у вас марка и модель автомобиля?',()=>{botStep='car';$('botInput').placeholder='Например, Audi A6';choices([['Audi A6',()=>acceptCar('Audi A6')],['Volvo XC60',()=>acceptCar('Volvo XC60')],['Lexus RX',()=>acceptCar('Lexus RX')]])})}
  function acceptCar(car){draft.car=car;bubble(car,true);reply('Как к вам обращаться?',()=>{botStep='name';$('botInput').placeholder='Ваше имя';choices([['Артём',()=>acceptName('Артём')],['Анна',()=>acceptName('Анна')]])})}
  function acceptName(name){draft.name=name;bubble(name,true);askDay()}
  function askDay(){reply(`${draft.name}, выберите день визита.`,()=>{botStep='date';$('botInput').placeholder='Например, завтра';choices([0,1,2,3].filter(n=>free(day(n)).length).map(n=>[n===0?'Сегодня':n===1?'Завтра':dateLabel(day(n)),()=>chooseDay(day(n))]));if(!$('botActions').children.length)choices([['Посмотреть следующие дни',()=>chooseDay(day(4))]])})}
  function chooseDay(date){draft.date=date;bubble(dateLabel(date),true);askTime()}
  function askTime(){reply('Выберите удобное свободное время:',()=>{botStep='time';const available=free(draft.date);choices([...available.map(time=>[time,()=>chooseTime(time)]),['Другой день',askDay]])})}
  function chooseTime(time){draft.time=time;bubble(time,true);showSummary()}
  function showSummary(){
    reply(`${draft.name}, проверьте запись:\n\n${services[draft.service].name}\n${draft.car}\n${dateLabel(draft.date)} · ${draft.time}`,()=>{botStep='confirm';choices([['Подтвердить запись',confirmBooking],['Изменить время',askDay],['Изменить услугу',startServices]])});
  }
  function confirmBooking(){
    if(draft.confirmedId){openCRM(draft.confirmedId);return}
    if(limitReached())return;
    if(!free(draft.date).includes(draft.time)){reply('Это время уже занято. Подберём другой свободный вариант.',askTime);return}
    bubble('Подтверждаю запись',true);
    const l=addLead({name:draft.name,car:draft.car,service:draft.service,source:'Telegram',origin:'visitor',history:[`Подобрали услугу: ${services[draft.service].name}.`,`Автомобиль: ${draft.car}.`]});
    if(!l){reply('Список заполнен. Вы можете посмотреть и изменить существующие записи.',()=>choices([['Открыть CRM',()=>openCRM()]]));return}
    applyConfirmation(l,draft.date,draft.time);draft.confirmedId=l.id;selected=l.id;source='all';query='';$('crmSource').value='all';$('crmSearch').value='';persist();renderList();renderDetail();
    reply(`Готово, ${draft.name}!\n${services[draft.service].name} · ${dateLabel(draft.date)}, ${draft.time}.\n\nКарточка записи теперь доступна в CRM.`,()=>{botStep='done';choices([['Посмотреть запись в CRM',()=>openCRM(l.id)],...(visitorCount()<bookingLimit?[['Новая запись',resetBot]]:[])])});
  }
  function command(key){
    if(typing)return;
    botStep='info';
    if(key==='menu'){bubble('Главное меню',true);reply('Чем могу помочь?',menu);return}
    if(key==='price'){bubble('Как определяется стоимость?',true);reply('Стоимость зависит от автомобиля, состояния поверхности и объёма работ. Сначала подберём услугу, затем специалист сможет уточнить расчёт.',()=>choices([['Подобрать услугу',startServices],...(draft.service?[['Продолжить запись',()=>draft.car&&draft.name?askDay():askCar()]]:[])]));return}
    bubble('Адрес и время работы',true);reply('Ермакова роща, 7А, строение 2.\nСтудия работает с 10:00 до 19:00.\nДля визита удобно заранее выбрать услугу и время.',()=>choices([['Записаться',()=>draft.service?askCar():startServices()],['Главное меню',()=>command('menu')]]));
  }
  function resetBot(){cancelReply();draft={};$('botMessages').replaceChildren();$('botInput').value='';updateBookingLimit();if(limitReached())return;bubble('Здравствуйте! Помогу выбрать услугу и записаться в студию. С чего начнём?');menu()}
  $('botReset').addEventListener('click',resetBot);
  document.querySelectorAll('[data-bot-command]').forEach(b=>b.addEventListener('click',()=>command(b.dataset.botCommand)));
  $('botComposer').addEventListener('submit',e=>{
    e.preventDefault();if(typing)return;const text=$('botInput').value.trim();if(!text)return;$('botInput').value='';
    if(botStep==='car'){acceptCar(text);return}if(botStep==='name'){acceptName(text);return}
    const lower=text.toLowerCase();
    if(/стоим|цен/.test(lower)){command('price');return}if(/адрес|работа|наход/.test(lower)){command('address');return}
    if(botStep==='date'&&/завтра|сегодня/.test(lower)){chooseDay(day(lower.includes('завтра')?1:0));return}
    if(botStep==='time'&&free(draft.date).includes(text)){chooseTime(text);return}
    if(botStep==='confirm'&&/да|подтвер/.test(lower)){confirmBooking();return}
    if(/полир/.test(lower)){chooseService('polish');return}if(/защит|плён|плен/.test(lower)){chooseService('protection');return}if(/салон/.test(lower)){chooseService('interior');return}
    bubble(text,true);reply('Помогу с услугами и записью. Выберите следующий шаг:',menu);
  });

  // CRM views share the same records as the chat, including calendar occupancy.
  function setCRMView(name){
    crmView=name;for(const [key,id] of [['leads','crmLeadsView'],['calendar','crmCalendarView'],['rules','crmRulesView']])$(id).hidden=name!==key;
    document.querySelectorAll('[data-crm-view]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.crmView===name));b.tabIndex=b.dataset.crmView===name?0:-1});
    if(name==='leads'){renderList();renderDetail()}if(name==='calendar')renderCalendar();if(name==='rules')renderActivity();
  }
  async function openCRM(id){
    if(id)selected=id;source='all';query='';$('crmSource').value='all';$('crmSearch').value='';setCRMView('leads');
    const opened=await window.MBSections.selectTab(2);
    if(opened&&window.MBSections.state.active&&window.MBSections.state.tab===2){
      const detail=$('crmLeadDetail');detail.tabIndex=-1;detail.focus({preventScroll:true});
      const list=$('crmLeadList'),item=list.querySelector('.selected');
      if(item)list.scrollTop+=item.getBoundingClientRect().top-list.getBoundingClientRect().top;
      if(innerWidth<=900)detail.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }
  document.querySelectorAll('[data-crm-view]').forEach(b=>b.addEventListener('click',()=>setCRMView(b.dataset.crmView)));
  function matching(){return state.leads.filter(l=>(source==='all'||l.source===source)&&(`${l.name} ${l.car} ${services[l.service].name}`).toLowerCase().includes(query.toLowerCase()))}
  function renderList(){
    const list=matching(),scroll=$('crmLeadList').scrollTop;if(!list.some(l=>l.id===selected))selected=list[0]?.id;
    $('crmCount').textContent=String(state.leads.length);
    $('crmLeadList').innerHTML=list.length?list.map(l=>`<button class="crm-lead${l.id===selected?' selected':''}" data-lead="${esc(l.id)}" aria-pressed="${l.id===selected}">${badge(l.source)}<span class="crm-lead-copy"><strong>${esc(l.name)}</strong><span>${esc(l.car)}</span><small>${esc(l.source)} · ${esc(services[l.service].name)}</small></span><i class="crm-lead-dot ${esc(l.status)}" title="${esc(statusNames[l.status])}"></i></button>`).join(''):'<p class="crm-empty">Обращений по этому запросу нет.</p>';
    $('crmLeadList').scrollTop=scroll;
    $('crmLeadList').querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.lead;renderList();renderDetail();$('crmLeadList').querySelector(`[data-lead="${selected}"]`)?.focus({preventScroll:true})}));
  }
  function renderDetail(){
    const l=current();if(!l){$('crmLeadDetail').innerHTML='<p class="crm-empty">Выберите заявку слева.</p>';return}
    const date=l.date&&l.date>=day(0)?l.date:day(1);
    $('crmLeadDetail').innerHTML=`<div class="crm-person"><span class="tg-avatar">${esc(l.name.charAt(0))}</span><div><h3>${esc(l.name)}</h3><p>${esc(l.car)} · ${esc(l.source)}</p></div><span class="crm-status ${esc(l.status)}">${esc(statusNames[l.status])}</span></div>
      <div class="crm-detail-service">${esc(services[l.service].name)}<small>Ответственный: ${esc(l.assignee)}</small></div>
      <div class="crm-history">${l.history.slice(-3).map(t=>`<p>${esc(t)}</p>`).join('')}</div>
      <form id="crmBookingForm"><div class="crm-booking-fields"><label>День<input id="crmBookingDay" type="date" min="${day(0)}" max="${day(30)}" value="${date}" required></label><label>Время<select id="crmBookingTime" required></select></label></div><p id="crmBookingError" class="crm-error" role="alert"></p><div class="crm-detail-actions">${l.status==='new'?'<button type="button" id="crmTake" class="crm-secondary">Взять в работу</button>':''}<button type="submit" class="crm-primary">${l.status==='confirmed'?'Перенести запись':'Подтвердить запись'}</button></div></form>
      ${l.status==='confirmed'?`<div class="crm-record-tools">${!l.onCalendar?'<button id="crmAddCalendar">Добавить в расписание</button>':''}<button id="crmReminder">Текст напоминания</button><button id="crmCancel">Отменить запись</button></div><p id="crmReminderText" class="crm-reminder" hidden></p>`:''}`;
    function refreshTimes(){const times=free($('crmBookingDay').value,l.id);$('crmBookingTime').replaceChildren(...times.map(t=>{const o=document.createElement('option');o.value=o.textContent=t;return o}));if(times.includes(l.time))$('crmBookingTime').value=l.time;$('crmBookingError').textContent=times.length?'':'На этот день свободного времени нет. Выберите другой день.'}
    refreshTimes();$('crmBookingDay').addEventListener('change',refreshTimes);
    $('crmTake')?.addEventListener('click',()=>{l.status='working';l.history.push('Администратор взял обращение в работу.');log(`${l.name}: заявка взята в работу`);renderList();renderDetail()});
    $('crmBookingForm').addEventListener('submit',e=>{e.preventDefault();if(!applyConfirmation(l,$('crmBookingDay').value,$('crmBookingTime').value)){$('crmBookingError').textContent='Выберите свободное время. Эта запись уже занята.';return}persist();renderList();renderDetail();toast(`${l.name} · ${dateLabel(l.date)}, ${l.time}`)});
    $('crmCancel')?.addEventListener('click',()=>{l.status='cancelled';l.onCalendar=false;l.reminder=false;l.history.push('Запись отменена, время освобождено.');log(`${l.name}: запись отменена`);renderList();renderDetail();toast('Время освобождено')});
    $('crmAddCalendar')?.addEventListener('click',()=>{l.onCalendar=true;log(`${l.name}: запись добавлена в расписание`);renderDetail();toast('Запись в расписании')});
    $('crmReminder')?.addEventListener('click',()=>{$('crmReminderText').textContent=reminderText(l);$('crmReminderText').hidden=!$('crmReminderText').hidden});
  }
  $('crmSearch').addEventListener('input',e=>{query=e.target.value;renderList();renderDetail()});
  $('crmSource').addEventListener('change',e=>{source=e.target.value;renderList();renderDetail()});
  $('crmCalendarDay').value=day(1);$('crmCalendarDay').addEventListener('change',renderCalendar);
  function renderCalendar(){
    const date=$('crmCalendarDay').value;
    $('crmSchedule').innerHTML=slots.map(t=>{const l=state.leads.find(l=>l.status==='confirmed'&&l.onCalendar&&l.date===date&&l.time===t);return `<div class="crm-slot"><time>${t}</time>${l?`<button data-calendar-lead="${esc(l.id)}">${badge(l.source)}<span><strong>${esc(l.name)}</strong><small>${esc(l.car)} · ${esc(services[l.service].name)}</small></span><span class="crm-slot-action">Изменить</span></button>`:'<span class="crm-free">Свободно</span>'}</div>`}).join('');
    $('crmSchedule').querySelectorAll('[data-calendar-lead]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.calendarLead;source='all';query='';$('crmSource').value='all';$('crmSearch').value='';setCRMView('leads');$('crmBookingDay').focus({preventScroll:true})}));
  }
  function renderActivity(){if(!$('crmActivity'))return;$('crmActivity').innerHTML=state.activity.length?state.activity.map(a=>`<li><time>${esc(a.time)}</time><span>${esc(a.text)}</span></li>`).join(''):'<li><span>Здесь появятся действия по вашим заявкам.</span></li>'}
  document.querySelectorAll('[data-crm-rule]').forEach(input=>{input.checked=state.rules[input.dataset.crmRule];input.addEventListener('change',()=>{state.rules[input.dataset.crmRule]=input.checked;log(`${input.closest('label').querySelector('h4').textContent}: ${input.checked?'включено':'выключено'}`)})});
  // SVG endpoints come from transformed DOM anchors, not fixed coordinates.
  function connections(now){
    const app=$('telegramApp'),r=app.getBoundingClientRect();if(!r.width||!r.height)return;
    const svg=$('telegramConnections');svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
    const point=el=>{const b=el.getBoundingClientRect();return {x:b.x+b.width/2-r.x,y:b.y+b.height/2-r.y}};
    const mobile=innerWidth<=540,ends=[...root.querySelectorAll('.flow-port')].map(point),start=point(root.querySelector('.phone-bottom-port'));
    const spine=10;
    $('flowTrunk').setAttribute('d',mobile?`M${start.x},${start.y} C${start.x},${start.y+25} ${spine},${start.y+15} ${spine},${start.y+42} L${spine},${ends[2].y}`:'');
    root.querySelectorAll('.connection').forEach((g,i)=>{
      const s=mobile?{x:spine,y:ends[i].y}:point(root.querySelector(`[data-port="${i}"]`)),e=ends[i],bend=Math.max(14,(e.x-s.x)*.48);
      const d=mobile?`M${spine},${e.y} L${e.x},${e.y}`:`M${s.x},${s.y} C${s.x+bend},${s.y} ${e.x-bend},${e.y} ${e.x},${e.y}`;
      const path=g.children[0],route=g.children[1],dot=g.children[2];path.setAttribute('d',d);
      route.setAttribute('d',mobile?`M${start.x},${start.y} C${start.x},${start.y+25} ${spine},${start.y+15} ${spine},${start.y+42} L${spine},${e.y} L${e.x},${e.y}`:d);
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,p=((now/4700+i*.32)%1),pos=route.getPointAtLength(route.getTotalLength()*p);
      dot.setAttribute('cx',pos.x);dot.setAttribute('cy',pos.y);dot.style.opacity=reduced?'0':String(Math.sin(p*Math.PI)*.85);
    });
  }
  let glass=null;
  function setView(n){view=n;$('ecosystem-modal').dataset.telegramTab=String(n);if(!glass)glass=window.createTelegramGlass(root);if(n===2){renderList();renderDetail();if(crmView==='calendar')renderCalendar()}glass?.invalidate()}
  function update(now,dt){
    if(view===0)connections(now);
    glass?.update(now);
    if(lastToast&&now-lastToast>4000){$('crmToast').classList.remove('visible');lastToast=0}
  }
  resetBot();renderList();renderDetail();renderActivity();
  window.MBTelegramStudio={setView,update,get state(){return {view,crmView,bookingLimit,visitorCount:visitorCount(),botStep,typing,selected,leads:JSON.parse(JSON.stringify(state.leads)),rules:{...state.rules}}}};
})();
