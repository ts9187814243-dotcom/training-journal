import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(),port=Number(process.env.PORT||3000);
app.disable('x-powered-by');app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com','data:'],imgSrc:["'self'",'data:'],connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'64kb'}));
app.use('/api/',rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Слишком много запросов. Подождите минуту и попробуйте снова.'}}));

const GEMINI_KEY=process.env.GEMINI_API_KEY||'';
const GEMINI_MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const GROQ_KEY=process.env.GROQ_API_KEY||'';
const GROQ_MODEL=process.env.GROQ_MODEL||'openai/gpt-oss-120b';
const instructions=`Ты — персональный тренер по силовым тренировкам в приложении-дневнике. Используй профиль и историю тренировок. Анализируй прогрессию нагрузок, объём, частоту, восстановление и баланс мышечных групп. Давай конкретные реалистичные рекомендации, не выдумывай прошлые результаты. Если данных мало, скажи об этом. Не ставь диагнозов и не назначай лечение. При боли, травмах или хронических заболеваниях рекомендуй консультацию врача. Не поощряй опасные максимальные попытки и тренировку через боль. Отвечай понятно и по делу, обычно до 250 слов.`;
const providers={
 gemini:{key:GEMINI_KEY,model:GEMINI_MODEL},
 groq:{key:GROQ_KEY,model:GROQ_MODEL}
};
async function callGemini(messages,language){
 const prompt=messages.map(m=>(m.role==='assistant'?'Тренер':'Пользователь')+': '+m.content).join('\n\n');
 const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(GEMINI_MODEL)+':generateContent?key='+encodeURIComponent(GEMINI_KEY);
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:instructions+' Отвечай строго на '+language+' языке.'}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:700,temperature:0.7}},signal:AbortSignal.timeout(35000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(data.error?.message||'Gemini API error');error.status=response.status;throw error}
 const reply=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
 if(!reply)throw new Error('Gemini вернул пустой ответ');
 return reply;
}
async function callGroq(messages,language){
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+GROQ_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:GROQ_MODEL,messages:[{role:'system',content:instructions+' Отвечай строго на '+language+' языке.'},...messages],max_tokens:700,temperature:0.7}),signal:AbortSignal.timeout(35000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(data.error?.message||'Groq API error');error.status=response.status;throw error}
 const reply=data.choices?.[0]?.message?.content?.trim();
 if(!reply)throw new Error('Groq вернул пустой ответ');
 return reply;
}
app.get('/api/health',(_req,res)=>res.json({ok:true,providers:{gemini:Boolean(GEMINI_KEY),groq:Boolean(GROQ_KEY)}}));
app.post('/api/coach',async(req,res)=>{
 const language=({ru:'русском',en:'английском',de:'немецком',es:'испанском',fr:'французском',zh:'китайском',ja:'японском',hi:'хинди'})[req.body?.language]||'русском';
 const message=typeof req.body?.message==='string'?req.body.message.trim():'',context=typeof req.body?.context==='string'?req.body.context.slice(0,18000):'',history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];
 if(!message||message.length>4000)return res.status(400).json({error:'Сообщение должно содержать от 1 до 4000 символов.'});
 const input=history.filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,4000)}));
 input.push({role:'user',content:'Данные журнала тренировок:\n'+(context||'Нет данных профиля и истории.')+'\n\nВопрос пользователя:\n'+message});
 const requested=['auto','gemini','groq'].includes(req.body?.provider)?req.body.provider:'auto';
 const order=requested==='auto'?['gemini','groq']:[requested];
 const errors=[];
 for(const name of order){
  if(!providers[name].key){errors.push(name+': API-ключ не настроен');continue}
  try{
   const reply=name==='gemini'?await callGemini(input,language):await callGroq(input,language);
   return res.json({reply,provider:name});
  }catch(error){
   console.error(name+' API error:',error?.status||'',error?.message||error);
   errors.push(name+': '+(error?.status===429?'достигнут лимит запросов':error?.status===401||error?.status===403?'ключ недействителен или доступ запрещён':'сервис временно недоступен'));
  }
 }
 const messageError=errors.length?errors.join('; '):'Нет доступного ИИ-провайдера';
 const status=order.length===1&&errors[0]?.includes('лимит')?429:503;
 res.status(status).json({error:'Не удалось получить ответ от ИИ-тренера. '+messageError+'. Проверьте API-ключи и лимиты.'});
});
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(port,()=>console.log('Training Journal listening on port '+port));
