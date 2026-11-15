import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(),port=Number(process.env.PORT||3000),model=process.env.OPENAI_MODEL||'';
app.disable('x-powered-by');app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com','data:'],imgSrc:["'self'",'data:'],connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'64kb'}));
app.use('/api/',rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Слишком много запросов. Подождите минуту и попробуйте снова.'}}));
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const instructions=`Ты — персональный тренер по силовым тренировкам в приложении-дневнике. Используй профиль и историю тренировок. Анализируй прогрессию нагрузок, объём, частоту, восстановление и баланс мышечных групп. Давай конкретные реалистичные рекомендации, не выдумывай прошлые результаты. Если данных мало, скажи об этом. Не ставь диагнозов и не назначай лечение. При боли, травмах или хронических заболеваниях рекомендуй консультацию врача. Не поощряй опасные максимальные попытки и тренировку через боль. Отвечай на языке, указанном в запросе, понятно и по делу, обычно до 250 слов.`;
app.get('/api/health',(_req,res)=>res.json({ok:true,configured:Boolean(client&&model),apiKeyConfigured:Boolean(client),modelConfigured:Boolean(model)}));
app.post('/api/coach',async(req,res)=>{
 if(!client||!model)return res.status(503).json({error:'ИИ-тренер не настроен: добавьте OPENAI_API_KEY и OPENAI_MODEL в переменные окружения сервера.'});
 const language=({ru:'русском',en:'английском',de:'немецком',es:'испанском',fr:'французском',zh:'китайском',ja:'японском',hi:'хинди'})[req.body?.language]||'русском';
 const message=typeof req.body?.message==='string'?req.body.message.trim():'',context=typeof req.body?.context==='string'?req.body.context.slice(0,18000):'',history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];
 if(!message||message.length>4000)return res.status(400).json({error:'Сообщение должно содержать от 1 до 4000 символов.'});
 const input=history.filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,4000)}));
 input.push({role:'user',content:`Данные журнала тренировок:\n${context||'Нет данных профиля и истории.'}\n\nВопрос пользователя:\n${message}`});
 try{const response=await client.responses.create({model,instructions:instructions+` Отвечай строго на ${language} языке. Не переключайся на русский, если выбран другой язык.`,input,max_output_tokens:700});const reply=response.output_text?.trim();if(!reply)return res.status(502).json({error:'Модель вернула пустой ответ. Попробуйте ещё раз.'});res.json({reply});}
 catch(error){console.error('OpenAI API error:',error?.status||'',error?.message||error);if(error?.status===401)return res.status(502).json({error:'OpenAI отклонил API-ключ. Проверьте OPENAI_API_KEY.'});if(error?.status===429)return res.status(429).json({error:'Лимит или баланс OpenAI API исчерпан. Проверьте настройки оплаты API.'});res.status(502).json({error:'Не удалось получить ответ от OpenAI. Проверьте модель и доступ к API.'});}
});
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(port,()=>console.log(`Training Journal listening on port ${port}`));