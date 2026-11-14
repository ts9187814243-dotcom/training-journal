
const KEY='wlog-v1';
let S={workouts:[],logs:[]};
try{const r=localStorage.getItem(KEY);if(r)S=JSON.parse(r)}catch(e){}
S.body=S.body||[];S.profile=S.profile||{};S.settings=Object.assign({language:'ru',theme:'system',units:'kg',rest:90,notifications:false},S.settings||{});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const LANGS=[['ru','Русский'],['en','English'],['de','Deutsch'],['zh','中文'],['ja','日本語'],['fr','Français'],['hi','हिन्दी'],['es','Español']];
const WORDS={en:{'Планы':'Plans','Запись':'Log','Прогресс':'Progress','Тренер':'Coach','Профиль':'Profile','Настройки':'Settings','Язык':'Language','Тема оформления':'Appearance','Системная':'System','Светлая':'Light','Тёмная':'Dark','Единицы измерения':'Units','Килограммы (кг)':'Kilograms (kg)','Фунты (lb)':'Pounds (lb)','Таймер отдыха':'Rest timer','Уведомления':'Notifications','Сохранить настройки':'Save settings','Назад в профиль':'Back to profile','Редактировать':'Edit'},de:{'Планы':'Pläne','Запись':'Training','Прогресс':'Fortschritt','Тренер':'Trainer','Профиль':'Profil','Настройки':'Einstellungen','Язык':'Sprache','Тема оформления':'Darstellung','Системная':'System','Светлая':'Hell','Тёмная':'Dunkel','Единицы измерения':'Einheiten','Килограммы (кг)':'Kilogramm (kg)','Фунты (lb)':'Pfund (lb)','Таймер отдыха':'Pausentimer','Уведомления':'Mitteilungen','Назад в профиль':'Zurück zum Profil','Редактировать':'Bearbeiten'},es:{'Планы':'Planes','Запись':'Registrar','Прогресс':'Progreso','Тренер':'Entrenador','Профиль':'Perfil','Настройки':'Ajustes','Язык':'Idioma','Тема оформления':'Apariencia','Системная':'Sistema','Светлая':'Claro','Тёмная':'Oscuro','Единицы измерения':'Unidades','Килограммы (кг)':'Kilogramos (kg)','Фунты (lb)':'Libras (lb)','Таймер отдыха':'Temporizador de descanso','Уведомления':'Notificaciones','Назад в профиль':'Volver al perfil','Редактировать':'Editar'},fr:{'Планы':'Programmes','Запись':'Séance','Прогресс':'Progression','Тренер':'Coach','Профиль':'Profil','Настройки':'Paramètres','Язык':'Langue','Тема оформления':'Apparence','Системная':'Système','Светлая':'Clair','Тёмная':'Sombre','Единицы измерения':'Unités','Килограммы (кг)':'Kilogrammes (kg)','Фунты (lb)':'Livres (lb)','Таймер отдыха':'Minuteur de repos','Уведомления':'Notifications','Назад в профиль':'Retour au profil','Редактировать':'Modifier'},zh:{'Планы':'训练计划','Запись':'训练记录','Прогресс':'进度','Тренер':'教练','Профиль':'个人资料','Настройки':'设置','Язык':'语言','Тема оформления':'外观','Системная':'跟随系统','Светлая':'浅色','Тёмная':'深色','Единицы измерения':'计量单位','Килограммы (кг)':'千克 (kg)','Фунты (lb)':'磅 (lb)','Таймер отдыха':'休息计时器','Уведомления':'通知','Назад в профиль':'返回个人资料','Редактировать':'编辑'},ja:{'Планы':'トレーニング計画','Запись':'記録','Прогресс':'進捗','Тренер':'コーチ','Профиль':'プロフィール','Настройки':'設定','Язык':'言語','Тема оформления':'テーマ','Системная':'システム','Светлая':'ライト','Тёмная':'ダーク','Единицы измерения':'単位','Килограммы (кг)':'キログラム (kg)','Фунты (lb)':'ポンド (lb)','Таймер отдыха':'休憩タイマー','Уведомления':'通知','Назад в профиль':'プロフィールに戻る','Редактировать':'編集'},hi:{'Планы':'योजनाएँ','Запись':'वर्कआउट दर्ज करें','Прогресс':'प्रगति','Тренер':'ट्रेनर','Профиль':'प्रोफ़ाइल','Настройки':'सेटिंग्स','Язык':'भाषा','Тема оформления':'थीम','Системная':'सिस्टम','Светлая':'हल्की','Тёмная':'गहरी','Единицы измерения':'इकाइयाँ','Килограммы (кг)':'किलोग्राम (kg)','Фунты (lb)':'पाउंड (lb)','Таймер отдыха':'आराम टाइमर','Уведомления':'सूचनाएँ','Назад в профиль':'प्रोफ़ाइल पर वापस','Редактировать':'संपादित करें'}};
const tr=t=>(WORDS[S.settings.language]||{})[t]||t;
const applyTheme=()=>{const t=S.settings.theme;document.documentElement.dataset.theme=t==='system'?'':t};applyTheme();
const uid=()=>Math.random().toString(36).slice(2,9);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fd=s=>new Date(s+'T12:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)&&n>0?n:0};
function h(t,a,...c){const e=document.createElement(t);for(const k in a||{}){const v=a[k];if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='class')e.className=v;else if(v!=null&&v!==false)e.setAttribute(k,v===true?'':v)}
c.flat(9).forEach(x=>{if(x==null||x===false)return;e.append(x.nodeType?x:document.createTextNode(x))});return e}
let tab='plans',draft=null,sess=null,sel=null,err='';
let fresh=false;const go=t=>{tab=t;err='';fresh=true;render()};
const e1=(w,r)=>w*(1+r/30);
const lastSets=ex=>{for(let i=S.logs.length-1;i>=0;i--){const en=S.logs[i].entries.find(x=>x.ex===ex);if(en)return en.sets.map(s=>({w:s.w,r:s.r}))}return [{w:'',r:''}]};

const EX=[
['Жим штанги лёжа','Грудь','Штанга','bench'],['Жим гантелей лёжа','Грудь','Гантели','bench'],['Жим штанги на наклонной скамье','Грудь','Штанга','bench'],['Отжимания от пола','Грудь','Свой вес','pushup'],['Сведение рук в тренажёре «бабочка»','Грудь','Тренажёр','fly'],
['Становая тяга','Спина','Штанга','dead'],['Подтягивания','Спина','Свой вес','pull'],['Тяга штанги в наклоне','Спина','Штанга','row'],['Тяга гантели в наклоне','Спина','Гантели','row'],['Тяга верхнего блока к груди','Спина','Блок','down'],['Тяга нижнего блока к поясу','Спина','Блок','row'],
['Присед со штангой','Ноги','Штанга','squat'],['Жим ногами','Ноги','Тренажёр','lpress'],['Выпады с гантелями','Ноги','Гантели','lunge'],['Разгибание ног в тренажёре','Ноги','Тренажёр','lext'],['Сгибание ног в тренажёре','Ноги','Тренажёр','lcurl'],['Румынская тяга','Ноги','Штанга','dead'],['Подъём на носки стоя','Ноги','Тренажёр','calf'],
['Жим штанги стоя','Плечи','Штанга','ohp'],['Жим гантелей сидя','Плечи','Гантели','ohp'],['Махи гантелей в стороны','Плечи','Гантели','lat'],
['Подъём штанги на бицепс','Руки','Штанга','curl'],['Сгибание рук с гантелями','Руки','Гантели','curl'],['Разгибание рук на верхнем блоке','Руки','Блок','pdown'],['Французский жим лёжа','Руки','Штанга','bench'],['Отжимания на брусьях','Руки','Свой вес','dips'],
['Скручивания','Пресс','Свой вес','crunch'],['Планка','Пресс','Свой вес','plank'],['Подъём ног в висе','Пресс','Свой вес','pull']
].map(([n,g,e,p])=>({n,g,e,p}));
const EXM=Object.fromEntries(EX.map(x=>[x.n,x]));
const P={
bench:{h:[27,50],b:['34,56 68,56 84,64 84,80','40,56 40,44 40,32'],s:`<path d='M22 60H96M30 60V82M90 60V82'/>`,e:`<path d='M26 32H56M26 25V39M56 25V39'/>`},
pushup:{h:[22,38],b:['28,44 88,62 98,72','36,46 36,70']},
fly:{h:[50,22],b:['50,30 50,58 70,58 70,79','52,36 72,38 72,48'],s:`<path d='M42 60V80'/>`,e:`<path d='M76 28V56'/>`},
dead:{h:[34,36],b:['40,40 70,48 72,62 66,79','44,42 48,64'],e:`<circle cx='48' cy='66' r='9'/>`},
pull:{h:[60,22],b:['52,10 57,28','68,10 63,28','60,29 60,54 56,76','60,54 64,76'],e:`<path d='M28 10H92'/>`},
row:{h:[36,34],b:['42,38 72,46 74,60 68,79','46,40 54,52'],e:`<path d='M50 46H60M50 46V58M60 46V58'/>`},
down:{h:[60,20],b:['60,28 60,56 80,57 80,79','60,32 47,12','60,32 73,12'],s:`<path d='M48 60H92'/>`,e:`<path d='M44 12H76M60 12V2'/>`},
squat:{h:[60,17],b:['60,25 55,49 73,57 63,79','60,27 48,28'],e:`<path d='M36 26H84M36 20V32M84 20V32'/>`},
lpress:{h:[18,66],b:['22,70 44,62 62,44 80,32'],s:`<path d='M14 74L46 64'/>`,e:`<path d='M76 20L90 44'/>`},
lunge:{h:[60,16],b:['60,23 60,50','60,50 78,54 78,79','60,50 44,64 34,79','60,25 60,40']},
lext:{h:[46,22],b:['46,30 46,58 68,58 88,48'],s:`<path d='M36 62H74M36 62V80'/>`,e:`<circle cx='88' cy='48' r='4'/>`},
lcurl:{h:[20,54],b:['26,60 70,60 88,60 80,42'],s:`<path d='M14 66H96'/>`,e:`<circle cx='80' cy='42' r='4'/>`},
calf:{h:[60,17],b:['60,25 60,52 58,72 63,76','60,27 48,28'],e:`<path d='M36 27H84'/>`},
ohp:{h:[60,28],b:['60,34 60,58 55,79','60,58 65,79','60,36 49,22 49,8','60,36 71,22 71,8'],e:`<path d='M36 7H84M36 1V13M84 1V13'/>`},
lat:{h:[60,18],b:['60,24 60,52 55,79','60,52 65,79','60,28 42,38','60,28 78,38'],e:`<circle cx='40' cy='40' r='5'/><circle cx='80' cy='40' r='5'/>`},
curl:{h:[60,16],b:['60,22 60,50 56,79','60,50 64,79','60,25 62,40 74,26'],e:`<circle cx='74' cy='26' r='5'/>`},
pdown:{h:[60,16],b:['60,22 60,50 56,79','60,50 64,79','60,25 58,40 66,52'],e:`<path d='M68 2V52M62 52H74'/>`},
dips:{h:[56,20],b:['56,28 56,52 66,64 62,79','56,30 50,46'],s:`<path d='M34 50H60M34 50V80'/>`},
crunch:{h:[36,48],b:['64,74 42,55','64,74 80,58 92,74']},
plank:{h:[22,54],b:['28,59 88,66 98,79','30,60 30,76 44,76']}
};
function pic(k){const p=P[k];return `<svg viewBox='0 0 120 90' aria-hidden='true' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M6 82H114' stroke='var(--line)' stroke-width='2'/><g stroke='var(--mut)' stroke-width='2'>`+(p.s||'')+`</g><g stroke='var(--ink)' stroke-width='4'>`+p.b.map(l=>`<polyline points='`+l+`'/>`).join('')+`<circle cx='`+p.h[0]+`' cy='`+p.h[1]+`' r='6' fill='var(--ink)'/></g><g stroke='var(--acc)' stroke-width='4'>`+(p.e||'')+`</g></svg>`}
function thumb(n,sm){const x=EXM[n];if(!x)return null;const s=h('span',{class:'th'+(sm?' sm':'')});s.innerHTML=pic(x.p);return s}
const pko={plans:false,log:false};
function exPicker(k,onPick){
 const q=h('input',{type:'search',placeholder:'Поиск упражнения','aria-label':'Поиск упражнения'});
 const g=h('select',{'aria-label':'Группа мышц'},['Все',...new Set(EX.map(x=>x.g))].map(x=>h('option',{value:x},x)));
 const list=h('div',{class:'pk'});
 const fill=()=>{const s=q.value.trim().toLowerCase();list.replaceChildren(...EX.filter(x=>(g.value==='Все'||x.g===g.value)&&x.n.toLowerCase().includes(s)).map(x=>h('button',{class:'pi',type:'button',onclick:()=>onPick(x.n)},thumb(x.n),h('span',{},h('b',{},x.n),h('small',{},x.g+', '+x.e)))));if(!list.children.length)list.append(h('p',{class:'mut'},'Ничего не нашлось. Введите своё название в поле выше.'))};
 q.addEventListener('input',fill);g.addEventListener('change',fill);fill();
 const panel=h('div',{class:'card',hidden:!pko[k]},h('div',{class:'row'},h('div',{class:'grow'},q),h('div',{style:'width:40%'},g)),list);
 return h('div',{},h('button',{class:'b',type:'button',style:'margin-top:8px;width:100%',onclick:()=>{pko[k]=!pko[k];panel.hidden=!pko[k]}},'Выбрать из списка с картинками'),panel);
}
function plans(){
 if(draft){
  const inp=h('input',{placeholder:'Например, жим лёжа',enterkeyhint:'done'});
  const add=()=>{const v=inp.value.trim();if(v&&!draft.ex.includes(v)){draft.ex.push(v);draft.name=nm.value;render();document.querySelector('#v input:not(#nm)')?.focus()}};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add()}});
  const nm=h('input',{id:'nm',placeholder:'Название, например «Грудь и трицепс»',value:draft.name});
  return h('div',{},h('h2',{},draft.id?'Редактировать тренировку':'Новая тренировка'),
   h('div',{class:'card'},nm,
    h('div',{class:'row',style:'margin-top:10px'},h('div',{class:'grow'},inp),h('button',{class:'b',onclick:add},'Добавить')),
    exPicker('plans',n=>{draft.name=nm.value;if(!draft.ex.includes(n))draft.ex.push(n);render()}),
    h('div',{class:'chips'},draft.ex.map((x,i)=>h('span',{class:'chip'},x,h('button',{class:'x','aria-label':'Убрать '+x,onclick:()=>{draft.name=nm.value;draft.ex.splice(i,1);render()}},'✕')))),
    draft.ex.length?null:h('p',{class:'mut'},'Добавьте упражнения в том порядке, в каком будете их делать.'),
    err&&h('p',{class:'err'},err),
    h('div',{class:'row'},h('button',{class:'b p',onclick:()=>{const n=nm.value.trim();if(!n||!draft.ex.length){err='Введите название и добавьте хотя бы одно упражнение.';draft.name=nm.value;return render()}
      if(draft.id){const w=S.workouts.find(x=>x.id===draft.id);if(w){w.name=n;w.ex=[...draft.ex]}}else S.workouts.push({id:uid(),name:n,ex:[...draft.ex]});save();draft=null;err='';render()}},'Сохранить тренировку'),h('button',{class:'b',onclick:()=>{draft=null;err='';render()}},'Отмена'))));
 }
 return h('div',{},calV(),h('h2',{},'Мои тренировки'),
  S.workouts.length?S.workouts.map(w=>h('div',{class:'card'},h('h3',{},w.name),h('p',{class:'mut',style:'margin:6px 0 12px'},w.ex.join(', ')),
    h('div',{class:'row'},h('button',{class:'b p',onclick:()=>startSess(w)},'Начать'),h('button',{class:'b',onclick:()=>{draft={id:w.id,name:w.name,ex:[...w.ex]};render()}},'Редактировать'),h('button',{class:'b',onclick:()=>ask(planText(w))},'Спросить тренера'),h('span',{class:'grow'}),
     h('button',{class:'x',onclick:()=>{if(confirm('Удалить тренировку «'+w.name+'»? Записанные результаты останутся.')){S.workouts=S.workouts.filter(x=>x!==w);save();render()}}},'Удалить')))):
   h('p',{class:'mut'},'Пока пусто. Составьте первую тренировку: название и список упражнений.'),
  h('button',{class:'b p',onclick:()=>{draft={name:'',ex:[]};render()}},'Составить тренировку'));
}
function startSess(w){sess={wid:w.id,name:w.name,date:today(),entries:w.ex.map(ex=>({ex,sets:lastSets(ex)}))};go('log')}

function log(){
 if(!sess)return h('div',{},h('h2',{},'Записать тренировку'),
  S.workouts.length?[h('p',{class:'mut'},'Выберите тренировку. Подходы подставятся из прошлого раза.'),S.workouts.map(w=>h('button',{class:'b',style:'display:block;width:100%;text-align:left;margin:8px 0',onclick:()=>startSess(w)},w.name)),
   h('button',{class:'b',style:'margin-top:8px',onclick:()=>{sess={wid:null,name:'Свободная тренировка',date:today(),entries:[]};render()}},'Без плана')]:
  [h('p',{class:'mut'},'Сначала составьте тренировку, либо запишите свободную.'),h('button',{class:'b p',onclick:()=>go('plans')},'К тренировкам'),' ',h('button',{class:'b',onclick:()=>{sess={wid:null,name:'Свободная тренировка',date:today(),entries:[]};render()}},'Без плана')]);
 const ni=h('input',{placeholder:'Добавить упражнение'});
 const addEx=()=>{const v=ni.value.trim();if(v&&!sess.entries.some(e=>e.ex===v)){sess.entries.push({ex:v,sets:lastSets(v)});render()}};
 ni.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addEx()}});
 return h('div',{},h('h2',{},sess.name),
  h('div',{class:'row'},h('input',{type:'date',value:sess.date,'aria-label':'Дата',onchange:e=>sess.date=e.target.value||today()})),
  h('div',{class:'row',style:'margin-top:10px'},h('button',{class:'b grow',onclick:()=>startRest(Number(S.settings.rest)||90)},'Отдых '+(S.settings.rest>=60?(S.settings.rest/60)+' мин':S.settings.rest+' с'))),
  sess.entries.map(en=>h('div',{class:'card'},h('div',{class:'row'},thumb(en.ex,1),h('h3',{class:'grow'},en.ex),h('button',{class:'x',onclick:()=>{sess.entries=sess.entries.filter(x=>x!==en);render()}},'Убрать')),
   h('div',{class:'sets'},h('span'),h('span',{class:'hd'},'Вес, кг'),h('span',{class:'hd'},'Повторы'),h('span'),
    en.sets.map((s,i)=>[h('span',{class:'hd'},i+1),
     h('input',{type:'text',inputmode:'decimal',value:s.w,'aria-label':'Вес, подход '+(i+1),oninput:e=>s.w=e.target.value,style:'text-align:center'}),
     h('input',{type:'text',inputmode:'numeric',value:s.r,'aria-label':'Повторы, подход '+(i+1),oninput:e=>s.r=e.target.value,style:'text-align:center'}),
     h('button',{class:'x','aria-label':'Удалить подход',onclick:()=>{en.sets.splice(i,1);render()}},'✕')])),
   h('button',{class:'b',onclick:()=>{const l=en.sets[en.sets.length-1]||{w:'',r:''};en.sets.push({w:l.w,r:l.r});render()}},'Добавить подход'))),
  h('div',{class:'row'},h('div',{class:'grow'},ni),h('button',{class:'b',onclick:addEx},'Добавить')),
  exPicker('log',n=>{if(!sess.entries.some(e=>e.ex===n))sess.entries.push({ex:n,sets:lastSets(n)});render()}),
  err&&h('p',{class:'err'},err),
  h('div',{class:'row',style:'margin-top:16px'},h('button',{class:'b p',onclick:()=>{
    const entries=sess.entries.map(e=>({ex:e.ex,sets:e.sets.map(s=>({w:num(s.w),r:num(s.r)})).filter(s=>s.r>0)})).filter(e=>e.sets.length);
    if(!entries.length){err='Укажите повторы хотя бы в одном подходе.';return render()}
    S.logs.push({id:uid(),date:sess.date,name:sess.name,entries});S.logs.sort((a,b)=>a.date.localeCompare(b.date));save();sel=entries[0].ex;sess=null;err='';go('progress')},},'Сохранить результат'),
   h('button',{class:'b',onclick:()=>{sess=null;err='';render()}},'Отмена')));
}

function chart(pts,unit){
 if(pts.length<2)return h('p',{class:'mut'},'График появится после двух тренировок с этим упражнением.');
 const W=320,H=150,p=30,vs=pts.map(x=>x.v),mn=Math.min(...vs),mx=Math.max(...vs),rg=mx-mn||1;
 const X=i=>p+i*(W-2*p)/(pts.length-1),Y=v=>H-p-(v-mn)/rg*(H-2*p);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('class','chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','График: '+unit);
 const r=n=>Math.round(n*10)/10;
 svg.innerHTML='<line x1="'+p+'" x2="'+(W-p)+'" y1="'+(H-p)+'" y2="'+(H-p)+'" stroke="var(--line)"/>'+
  '<polyline fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" points="'+pts.map((q,i)=>X(i)+','+Y(q.v)).join(' ')+'"/>'+
  pts.map((q,i)=>'<circle cx="'+X(i)+'" cy="'+Y(q.v)+'" r="'+(q.v===mx?5:3.5)+'" fill="'+(q.v===mx?'var(--pr)':'var(--acc)')+'"/>').join('')+
  '<g font-size="11" fill="var(--mut)" font-family="Barlow,sans-serif"><text x="4" y="'+(Y(mx)+4)+'">'+r(mx)+'</text><text x="4" y="'+(Y(mn)+4)+'">'+r(mn)+'</text>'+
  '<text x="'+p+'" y="'+(H-8)+'">'+pts[0].d+'</text><text x="'+(W-p)+'" y="'+(H-8)+'" text-anchor="end">'+pts[pts.length-1].d+'</text></g>';
 return svg;
}
let rest={end:0,iv:null};
function stopRest(){clearInterval(rest.iv);document.getElementById('rest').hidden=true}
document.getElementById('rs').addEventListener('click',stopRest);
function startRest(sec){clearInterval(rest.iv);rest.end=Date.now()+sec*1000;const t=document.getElementById('rt');document.getElementById('rest').hidden=false;
 const tick=()=>{const l=Math.ceil((rest.end-Date.now())/1000);if(l<=0){t.textContent='Отдых закончен';clearInterval(rest.iv);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}if(S.settings.notifications&&'Notification'in window&&Notification.permission==='granted')new Notification('Журнал тренировок',{body:'Время отдыха закончилось. Следующий подход!'});return}t.textContent='Отдых '+Math.floor(l/60)+':'+String(l%60).padStart(2,'0')};
 tick();rest.iv=setInterval(tick,500)}
function body(){
 const bi=h('input',{type:'text',inputmode:'decimal',placeholder:'Вес тела, кг','aria-label':'Вес тела, кг'});
 const last=S.body[S.body.length-1];
 return h('div',{},h('h2',{},'Вес тела'),h('div',{class:'card'},
  h('div',{class:'row'},h('div',{class:'grow'},bi),h('button',{class:'b',onclick:()=>{const w=num(bi.value);if(!w)return;const d=today();S.body=S.body.filter(b=>b.date!==d);S.body.push({date:d,w});S.body.sort((a,b)=>a.date.localeCompare(b.date));save();render()}},'Записать')),
  last?h('p',{class:'mut'},'Последняя запись: '+last.w+' кг, '+fd(last.date)):h('p',{class:'mut'},'Записывайте вес раз в несколько дней, и здесь появится график.'),
  S.body.length>1?chart(S.body.map(b=>({d:fd(b.date),v:b.w})),'вес тела'):null));
}
let bk=null;
function backup(){
 if(bk===null)return h('div',{},h('h2',{},'Резервная копия'),h('p',{class:'mut'},'Скопируйте данные и сохраните в заметках. Чтобы перенести их на другое устройство, вставьте текст там и нажмите «Загрузить».'),h('button',{class:'b',onclick:()=>{bk=JSON.stringify(S);render()}},'Показать данные'));
 const ta=h('textarea',{rows:6,'aria-label':'Данные'});ta.value=bk;const em=h('p',{class:'err'});
 return h('div',{},h('h2',{},'Резервная копия'),ta,em,h('div',{class:'row'},
  h('button',{class:'b',onclick:()=>{ta.select();try{navigator.clipboard.writeText(ta.value)}catch(e){try{document.execCommand('copy')}catch(e2){}}}},'Копировать'),
  h('button',{class:'b p',onclick:()=>{try{const o=JSON.parse(ta.value);if(!Array.isArray(o.workouts)||!Array.isArray(o.logs))throw 0;if(!confirm('Заменить текущие данные загруженными?'))return;S={workouts:o.workouts,logs:o.logs,body:Array.isArray(o.body)?o.body:[],profile:o.profile&&typeof o.profile==='object'?o.profile:{}};save();bk=null;render()}catch(e){em.textContent='Не удалось прочитать данные. Вставьте текст копии целиком.'}}},'Загрузить'),
  h('button',{class:'b',onclick:()=>{bk=null;render()}},'Скрыть')));
}
function progress(){
 const exs=[...new Set(S.logs.flatMap(l=>l.entries.map(e=>e.ex)))];
 if(!exs.length)return h('div',{},h('h2',{},'Прогресс'),h('p',{class:'mut'},'Здесь появятся рекорды и графики после первой записанной тренировки.'),h('button',{class:'b p',onclick:()=>go('log')},'Записать тренировку'),body(),backup());
 if(!exs.includes(sel))sel=exs[0];
 const hist=S.logs.map(l=>({l,en:l.entries.find(e=>e.ex===sel)})).filter(x=>x.en);
 const all=hist.flatMap(x=>x.en.sets),hasW=all.some(s=>s.w>0);
 const pts=hist.map(x=>({d:fd(x.l.date),v:hasW?Math.max(...x.en.sets.map(s=>e1(s.w,s.r))):Math.max(...x.en.sets.map(s=>s.r))}));
 const mw=Math.max(...all.map(s=>s.w)),mr=Math.max(...all.map(s=>s.r)),vol=all.reduce((a,s)=>a+(s.w||1)*s.r,0);
 const st=(l,v,c)=>h('div',{class:'stat '+(c||'')},l,h('b',{},v));
 return h('div',{},h('h2',{},'Прогресс'),
  h('select',{'aria-label':'Упражнение',onchange:e=>{sel=e.target.value;render()}},exs.map(x=>h('option',{value:x,selected:x===sel},x))),
  h('div',{class:'stats'},hasW?st('Рекорд веса',mw+' кг','pr'):st('Рекорд повторов',mr,'pr'),hasW?st('Расчётный максимум на 1 раз',Math.round(Math.max(...all.map(s=>e1(s.w,s.r))))+' кг'):st('Тренировок',hist.length),
   st('Объём за всё время',Math.round(vol).toLocaleString('ru-RU')+(hasW?' кг':' повт.')),st('Тренировок с ним',hist.length)),
  h('div',{class:'card'},h('p',{class:'mut',style:'margin:0 0 6px'},hasW?'Расчётный максимум на 1 раз по формуле Эпли, кг':'Лучший подход, повторы'),chart(pts,hasW?'расчётный максимум':'повторы')),
  body(),
  h('h2',{},'История'),
  hist.slice().reverse().map(x=>h('div',{class:'card'},h('div',{class:'row'},h('b',{class:'grow'},fd(x.l.date)+' · '+x.l.name),h('button',{class:'b',onclick:()=>ask(sessText(x.l))},'Тренеру'),h('button',{class:'x',onclick:()=>{if(confirm('Удалить эту тренировку из журнала?')){S.logs=S.logs.filter(l=>l!==x.l);save();render()}}},'Удалить')),
   h('div',{class:'mut'},x.en.sets.map(s=>(s.w?s.w+'×':'')+s.r).join(', ')))),backup());
}
const COACH_SYS='Ты персональный тренер по силовым тренировкам в приложении-дневнике. Отвечай по-русски, коротко и конкретно (до 200 слов), с цифрами из записей пользователя. Давай рекомендации по прогрессии нагрузки, объёму, отдыху и балансу групп мышц, учитывая цель, опыт и ограничения из профиля. Без Markdown-разметки: обычный текст, короткие списки через тире. Не ставь диагнозов; при боли, травмах или хронических заболеваниях советуй очную консультацию врача или тренера. Если данных мало, скажи об этом и предложи, что записывать.';
const CH={msgs:[],busy:false,err:'',prov:'openai',ext:''};let cDraft='';
const sx=e=>e.ex+': '+e.sets.map(s=>(s.w?s.w+'×':'')+s.r).join(', ');
const sessText=l=>'Оцени мою тренировку от '+fd(l.date)+' «'+l.name+'»: '+l.entries.map(sx).join('; ')+'. Сравни с предыдущими записями: что получилось хорошо и что изменить в следующий раз?';
const planText=w=>'Оцени мой план «'+w.name+'»: '+w.ex.join(', ')+'. Сбалансирован ли он для моей цели? Что добавить или убрать?';
function ctx(){
 const p=S.profile||{};
 const L=['Профиль: '+([['имя',p.name],['пол',p.sex],['возраст',p.age],['рост, см',p.h],['цель',p.goal],['опыт',p.exp],['тренировок в неделю',p.days],['травмы и ограничения',p.inj],['талия, см',p.waist],['грудь, см',p.chest],['бёдра, см',p.hips],['бицепс, см',p.arm]].filter(x=>x[1]).map(x=>x[0]+': '+x[1]).join('; ')||'не заполнен')];
 L.push('Вес тела, кг: '+(S.body.slice(-10).map(b=>b.w+' ('+b.date+')').join(', ')||'нет записей'));
 L.push('Планы: '+(S.workouts.map(w=>w.name+' ['+w.ex.join(', ')+']').join('; ')||'нет'));
 L.push('Последние тренировки (вес×повторы):');
 S.logs.slice(-15).forEach(l=>L.push(l.date+' '+l.name+': '+l.entries.map(sx).join(' | ')));
 if(!S.logs.length)L.push('нет записей');
 return L.join('\n');
}
const cerr=e=>e&&e.code==='not_granted'?'Доступ тренера не разрешён. Повторите и подтвердите запрос.':e&&e.code==='rate_limited'?'Слишком много запросов. Подождите немного и повторите.':e&&e.code==='none'?'Тренер доступен только на опубликованной странице в Claude.':'Не удалось получить ответ. Попробуйте ещё раз.';
async function ask(text){
 if(CH.busy)return;
 if(CH.prov!=='openai'){CH.ext=extPrompt(text);tab='coach';render();window.scrollTo({top:0});return}
 CH.msgs.push({r:'u',t:text},{r:'a',t:''});CH.busy=true;CH.err='';tab='coach';render();window.scrollTo({top:document.body.scrollHeight});
 const ai=CH.msgs[CH.msgs.length-1];
 try{
  const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:CH.msgs.slice(-12,-2).map(m=>({role:m.r==='u'?'user':'assistant',content:m.t})),context:ctx(),language:'ru'})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Не удалось получить ответ от ИИ-тренера.');
  ai.t=data.reply||'Модель вернула пустой ответ.';
 }catch(e){CH.err=e.message||'Ошибка соединения с сервером. Проверьте подключение и попробуйте ещё раз.';if(!ai.t)CH.msgs.pop()}
 CH.busy=false;render();window.scrollTo({top:document.body.scrollHeight});
}
const PROV={chatgpt:['ChatGPT','https://chatgpt.com/'],gemini:['Gemini','https://gemini.google.com/app']};
const extPrompt=t=>COACH_SYS+'\n\nДанные пользователя:\n'+ctx()+'\n\nВопрос: '+t;
function provSel(){const s=h('select',{'aria-label':'Нейросеть',style:'width:auto'},[['openai','ИИ-тренер (API)'],['chatgpt','ChatGPT (вручную)'],['gemini','Gemini (вручную)']].map(([k,t])=>h('option',{value:k,selected:CH.prov===k},t)));s.addEventListener('change',()=>{CH.prov=s.value;render()});return s}
function extCard(){
 const [nm,url]=PROV[CH.prov];
 const ta=h('textarea',{rows:9,'aria-label':'Запрос для '+nm,placeholder:'Нажмите быстрый запрос или напишите вопрос ниже, и здесь появится готовый текст с вашими данными.'});
 ta.value=CH.ext;ta.addEventListener('input',()=>CH.ext=ta.value);
 const st=h('span',{class:'mut'});
 const cp=()=>{ta.select();const done=()=>{st.textContent='Скопировано'},fail=()=>{st.textContent='Выделите текст и скопируйте вручную'};const old=()=>{try{document.execCommand('copy')?done():fail()}catch(e){fail()}};try{navigator.clipboard.writeText(ta.value).then(done,old)}catch(e){old()}};
 return h('div',{class:'card'},h('p',{class:'mut',style:'margin-top:0'},nm+' нельзя встроить в эту страницу. Приложение готовит запрос с вашими данными: скопируйте его и вставьте в чат '+nm+'. Данные обрабатываются этим сервисом по его правилам.'),ta,
  h('div',{class:'row',style:'margin-top:8px'},h('button',{class:'b',onclick:cp},'Скопировать'),h('a',{class:'b p',href:url,target:'_blank',rel:'noopener noreferrer'},'Открыть '+nm),st));
}
function coachV(){
 const inp=h('input',{placeholder:'Спросите тренера','aria-label':'Сообщение тренеру',value:cDraft,enterkeyhint:'send'});
 inp.addEventListener('input',()=>cDraft=inp.value);
 const send=()=>{const t=inp.value.trim();if(t){cDraft='';ask(t)}};
 inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send()}});
 const off=CH.busy;
 return h('div',{},h('div',{class:'row',style:'justify-content:space-between;margin-top:20px'},h('h2',{style:'margin:0'},'ИИ-тренер'),provSel()),
  h('div',{class:'aic'},spark(),h('p',{class:'mut',style:'margin:0'},'Тренер видит ваш профиль, вес тела, планы и последние тренировки, когда вы отправляете сообщение. Это не медицинская консультация.')),
  CH.prov==='openai'?h('p',{class:'mut'},'Для работы ИИ-тренера нужны серверные настройки OPENAI_API_KEY и OPENAI_MODEL.'):null,
  h('div',{class:'chips'},['Проанализируй мой прогресс','Составь план на неделю','Какие веса взять в следующий раз?','Чего не хватает в моих тренировках?'].map(t=>h('button',{class:'b',disabled:off,onclick:()=>ask(t)},t))),
  CH.prov!=='openai'?extCard():CH.msgs.map((m,i)=>{const last=CH.busy&&i===CH.msgs.length-1;return h('div',{class:'msg '+m.r,id:last?'stream':null},m.t||(last?'Думаю…':''))}),
  CH.err&&h('p',{class:'err'},CH.err),
  h('div',{class:'row',style:'margin-top:10px'},h('div',{class:'grow'},inp),h('button',{class:'b p',disabled:off,onclick:send},'Отправить')),
  CH.msgs.length?h('button',{class:'x',onclick:()=>{if(!CH.busy){CH.msgs=[];CH.err='';render()}}},'Очистить диалог'):null);
}
function fld(l,k,o,nm){
 const p=S.profile;
 const el=o?h('select',{},['',...o].map(x=>h('option',{value:x,selected:x===(p[k]||'')},x||'Не выбрано'))):h('input',{type:'text',inputmode:nm?'decimal':null,value:p[k]||''});
 el.addEventListener(o?'change':'input',()=>{p[k]=el.value.trim();save()});
 return h('label',{class:'fl'},l,el);
}
let settingsOpen=false;
function settingsV(){
 const box=h('div',{},h('h2',{},tr('Настройки')));
 const lang=h('select',{'aria-label':tr('Язык')},LANGS.map(([v,n])=>h('option',{value:v,selected:S.settings.language===v},n)));
 lang.addEventListener('change',()=>{S.settings.language=lang.value;save();render()});
 const theme=h('select',{'aria-label':tr('Тема оформления')},[['system','Системная'],['light','Светлая'],['dark','Тёмная']].map(([v,n])=>h('option',{value:v,selected:S.settings.theme===v},tr(n))));theme.addEventListener('change',()=>{S.settings.theme=theme.value;applyTheme();save()});
 const units=h('select',{'aria-label':tr('Единицы измерения')},[['kg','Килограммы (кг)'],['lb','Фунты (lb)']].map(([v,n])=>h('option',{value:v,selected:S.settings.units===v},tr(n))));units.addEventListener('change',()=>{S.settings.units=units.value;save()});
 const timer=h('select',{'aria-label':tr('Таймер отдыха')},[30,45,60,90,120,150,180,240].map(v=>h('option',{value:v,selected:Number(S.settings.rest)===v},v+' сек.')));timer.addEventListener('change',()=>{S.settings.rest=Number(timer.value);save()});
 const notify=h('input',{type:'checkbox',checked:S.settings.notifications,'aria-label':tr('Уведомления')});notify.addEventListener('change',async()=>{if(notify.checked&&'Notification'in window){const p=await Notification.requestPermission();S.settings.notifications=p==='granted';if(!S.settings.notifications)notify.checked=false}else{S.settings.notifications=false;notify.checked=false}save()});
 box.append(h('div',{class:'card'},h('label',{class:'fl'},tr('Язык'),lang),h('label',{class:'fl'},tr('Тема оформления'),theme),h('label',{class:'fl'},tr('Единицы измерения'),units),h('label',{class:'fl'},tr('Таймер отдыха'),timer),h('label',{class:'fl row'},h('span',{class:'grow'},tr('Уведомления')),notify),h('p',{class:'mut'},'Уведомление отправляется при окончании таймера отдыха, пока браузер открыт. Браузер должен поддерживать уведомления.')));
 box.append(h('button',{class:'b',onclick:()=>{settingsOpen=false;render()}},tr('Назад в профиль')));return box;
}
function profileV(){
 if(settingsOpen)return settingsV();
 const p=S.profile,lb=S.body[S.body.length-1],hh=num(p.h),bmi=lb&&hh?(lb.w/Math.pow(hh/100,2)).toFixed(1):null;
 return h('div',{},h('div',{class:'row',style:'justify-content:space-between'},h('h2',{},'Личный кабинет'),h('button',{class:'settings-round',type:'button','aria-label':tr('Настройки'),title:tr('Настройки'),onclick:()=>{settingsOpen=true;render()}},'⚙')),
  h('div',{class:'card'},fld('Имя','name'),fld('Пол','sex',['Мужской','Женский']),fld('Возраст','age',null,1),fld('Рост, см','h',null,1),
   fld('Цель','goal',['Набрать мышечную массу','Похудеть','Стать сильнее','Развить выносливость','Поддерживать форму']),
   fld('Опыт тренировок','exp',['Новичок','Средний','Продвинутый']),fld('Тренировок в неделю','days',['1','2','3','4','5','6','7']),fld('Травмы и ограничения','inj')),
  h('h2',{},'Замеры'),
  h('div',{class:'card'},fld('Талия, см','waist',null,1),fld('Грудь, см','chest',null,1),fld('Бёдра, см','hips',null,1),fld('Бицепс, см','arm',null,1),
   h('p',{class:'mut'},lb?'Вес тела: '+lb.w+' кг ('+fd(lb.date)+')'+(bmi?', индекс массы тела '+bmi:'')+'. Новый вес записывается во вкладке «Прогресс».':'Вес тела записывается во вкладке «Прогресс».')),
  h('p',{class:'mut'},'Данные хранятся только в этом браузере. ИИ-тренер получает их, только когда вы отправляете ему сообщение.'));
}
const TC={plans:'#3b82f6',log:'#16a34a',progress:'#d97706',coach:'#a855f7',profile:'#ec4899'};
const IC={plans:`<rect x='4' y='3' width='16' height='18' rx='3'/><path d='M8 8h8M8 12h8M8 16h5'/>`,log:`<circle cx='12' cy='12' r='9'/><path d='M12 8v8M8 12h8'/>`,progress:`<path d='M4 19V5M4 19h16'/><path d='M8 15l3-4 3 2 5-6'/>`,coach:`<path d='M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z'/><path d='M9 12h.01M12 12h.01M15 12h.01'/>`,profile:`<circle cx='12' cy='8' r='4'/><path d='M4 21c1-4 4-6 8-6s7 2 8 6'/>`};
function spark(){const s=h('span',{class:'spark'});s.innerHTML=`<svg viewBox='0 0 24 24' width='34' height='34' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linejoin='round'><path d='M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10z'/></svg>`;return s}
document.getElementById('av').hidden=true;
let selDay=today();
function calV(){
 const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10))}
 const wd=['вс','пн','вт','ср','чт','пт','сб'];
 const sl=S.logs.filter(l=>l.date===selDay);
 return h('div',{},h('h2',{},'Мой календарь'),
  h('div',{class:'cal'},days.map(d=>h('button',{class:'day'+(d===selDay?' on':'')+(S.logs.some(l=>l.date===d)?' has':''),'aria-pressed':String(d===selDay),onclick:()=>{selDay=d;render()}},h('small',{},wd[new Date(d+'T12:00').getDay()]),h('b',{},String(+d.slice(8)))))),
  sl.length?sl.map(l=>h('div',{class:'card'},h('b',{},l.name),h('p',{class:'mut',style:'margin:6px 0 0'},l.entries.map(sx).join('; ')))):h('p',{class:'mut'},selDay===today()?'Сегодня тренировок ещё нет.':'В этот день тренировок нет.'));
}
function ico(k){const s=h('span',{style:'display:flex'});s.innerHTML=`<svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>`+IC[k]+`</svg>`;return s}
function render(){
 document.documentElement.lang=S.settings.language||'ru';
 const nav=document.getElementById('nav');nav.replaceChildren(...[['plans',tr('Планы')],['log',tr('Запись')],['progress',tr('Прогресс')],['coach',tr('Тренер')],['profile',tr('Профиль')]].map(([k,t])=>h('button',{'aria-current':String(tab===k),style:'--c:'+TC[k],onclick:()=>go(k)},ico(k),h('span',{},t))));
 {const av=document.getElementById('av'),n=((S.profile||{}).name||'').trim();av.replaceChildren(n?n[0].toUpperCase():ico('profile'))}const vv=document.getElementById('v');vv.className=fresh?'in':'';fresh=false;vv.style.setProperty('--c',TC[tab]);vv.replaceChildren({plans,log,progress,coach:coachV,profile:profileV}[tab]());
}
render();
