const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
function inline(parent, text){
 const source=String(text||"");
 const re=/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;let last=0,match;
 while((match=re.exec(source))){
  if(match.index>last)parent.append(document.createTextNode(source.slice(last,match.index)));
  const token=match[0];
  if(token.startsWith("`"))parent.append(el("code","coach-inline-code",token.slice(1,-1)));
  else parent.append(el(token.startsWith("**")?"strong":"em","",token.replace(/^\*\*?|\*\*?$/g,"")));
  last=re.lastIndex;
 }
 if(last<source.length)parent.append(document.createTextNode(source.slice(last)));
}
function markdown(parent, source){
 const lines=String(source||"").replace(/\r/g,"").split("\n");let i=0;
 while(i<lines.length){
  const line=lines[i].trim();
  if(!line){i++;continue;}
  if(line.startsWith("```")){const code=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("```"))code.push(lines[i++]);i++;const pre=el("pre","coach-code");pre.textContent=code.join("\n");parent.append(pre);continue;}
  if(/^\|.*\|$/.test(line)&&i+1<lines.length&&/^\|?[\s:|-]+\|?$/.test(lines[i+1].trim())){
   const rows=[];while(i<lines.length&&/^\|.*\|$/.test(lines[i].trim())){const row=lines[i].trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());if(!row.every(x=>/^:?-{3,}:?$/.test(x)))rows.push(row);i++;}
   if(rows.length){const wrap=el("div","coach-table-wrap"),table=el("table","coach-table");rows.forEach((row,ri)=>{const tr=el("tr");row.forEach(cell=>{const td=el(ri===0?"th":"td");inline(td,cell);tr.append(td)});table.append(tr)});wrap.append(table);parent.append(wrap);}continue;
  }
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){const h=el("h"+Math.min(heading[1].length+2,4),"coach-md-heading");inline(h,heading[2]);parent.append(h);i++;continue;}
  if(/^[-*]\s+/.test(line)){const ul=el("ul","coach-md-list");while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){const li=el("li");inline(li,lines[i++].replace(/^\s*[-*]\s+/,""));ul.append(li)}parent.append(ul);continue;}
  if(/^\d+[.)]\s+/.test(line)){const ol=el("ol","coach-md-list");while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){const li=el("li");inline(li,lines[i++].replace(/^\s*\d+[.)]\s+/,""));ol.append(li)}parent.append(ol);continue;}
  const p=el("p","coach-md-paragraph");inline(p,line);parent.append(p);i++;
 }
}
function actionButton(label,cls,callback){const b=el("button","coach-action "+(cls||""),label);b.type="button";b.addEventListener("click",callback);return b;}
function renderCoachMessage(message, actions={}){
 const root=el("div","coach-response");
 const data=message&&message.structured;
 if(!data){markdown(root,message&&message.t||"");}
 else{
  if(data.title){const title=el("h3","coach-response-title",data.title);root.append(title);}
  if(data.summary){const summary=el("div","coach-summary");markdown(summary,data.summary);root.append(summary);}
  (data.sections||[]).forEach(section=>{const block=el("section","coach-section");if(section.title)block.append(el("h4","coach-section-title",section.title));markdown(block,section.content);root.append(block)});
  (data.exercises||[]).forEach(exercise=>{
   const card=el("article","coach-exercise-card"),head=el("div","coach-exercise-head");
   head.append(el("h4","coach-exercise-name",exercise.name));
   if(exercise.recommendation)head.append(el("span","coach-recommendation",exercise.recommendation));
   card.append(head);
   if(exercise.current)card.append(el("p","coach-current","Текущий результат: "+exercise.current));
   if(exercise.sets&&exercise.sets.length){
    const wrap=el("div","coach-table-wrap"),table=el("table","coach-table");
    const hr=el("tr");["Подход","Вес","Повторения"].forEach(x=>hr.append(el("th","",x)));table.append(hr);
    exercise.sets.forEach((set,index)=>{const tr=el("tr");tr.append(el("td","",index+1),el("td","",set.weight||"—"),el("td","",set.reps||"—"));table.append(tr)});
    wrap.append(table);card.append(wrap);
   }
   if(exercise.reason){const reason=el("p","coach-reason");inline(reason,exercise.reason);card.append(reason)}
   root.append(card);
  });
  if(data.tips&&data.tips.length){const box=el("section","coach-callout coach-tips");box.append(el("h4","","Советы тренера"));const ul=el("ul","coach-md-list");data.tips.forEach(t=>{const li=el("li");inline(li,t);ul.append(li)});box.append(ul);root.append(box)}
  if(data.warnings&&data.warnings.length){const box=el("section","coach-callout coach-warnings");box.append(el("h4","","Важно"));const ul=el("ul","coach-md-list");data.warnings.forEach(t=>{const li=el("li");inline(li,t);ul.append(li)});box.append(ul);root.append(box)}
 }
 const bar=el("div","coach-actions");
 if(actions.onCopy)bar.append(actionButton("Копировать","",actions.onCopy));
 if(actions.onRetry)bar.append(actionButton("Повторить","",actions.onRetry));
 if(actions.onClarify)bar.append(actionButton("Уточнить","",actions.onClarify));
 if(actions.onAddPlan&&data&&data.exercises&&data.exercises.length)bar.append(actionButton("Создать план","coach-action-primary",actions.onAddPlan));
 if(bar.childElementCount)root.append(bar);
 return root;
}
export { renderCoachMessage };
