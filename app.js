(() => {
'use strict';
// 表示文言の唯一の参照先
let C, db=null, chosen=new Set(), search='', saved=true;
const root=document.getElementById('app');
const key='house-workbook-private-v3:'+location.pathname.replace(/index\.html$/,'');
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const add=(parent,...nodes)=>{parent.append(...nodes);return parent};
const btn=(text,fn,cls='')=>{const n=el('button','btn '+cls,text);n.type='button';n.addEventListener('click',fn);return n};
const find=(id)=>document.getElementById(id);
const label=(id)=>db.labels.find(x=>x.id===id);
const group=(id)=>label(id)?.group;
const labels=(item,g)=>item.labels.map(label).filter(x=>x&&(!g||x.group===g));
const setStatus=(text,isError=false)=>{const bar=find('state');if(bar){bar.firstChild.textContent=text;bar.classList.toggle('error',isError)}};
const verify=(v)=>{
 if(!v||v.version!==2||!Array.isArray(v.items)||!Array.isArray(v.labels)||v.items.length>5000||v.labels.length>500)return false;
 const ids=new Set();
 for(const x of v.labels){if(!x||typeof x.id!=='string'||typeof x.name!=='string'||!C.groups.includes(x.group)||x.id.length>80||x.name.length>100||ids.has(x.id))return false;ids.add(x.id)}
 const itemIds=new Set();
 for(const x of v.items){if(!x||typeof x.id!=='string'||typeof x.title!=='string'||x.id.length>80||x.title.length>400||!Array.isArray(x.labels)||x.labels.some(id=>!ids.has(id))||itemIds.has(x.id))return false;itemIds.add(x.id);for(const k of ['detail','memo'])if(x[k]!=null&&(typeof x[k]!=='string'||x[k].length>20000))return false;if(x.related!=null&&(!Array.isArray(x.related)||x.related.some(t=>typeof t!=='string'||t.length>150)))return false}
 return true;
};
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(db));saved=true;setStatus(C.statusSaved);return true}catch(e){saved=false;setStatus(C.statusError,true);return false}};
const change=(fn)=>{const previous=JSON.stringify(db);fn();if(!persist()){db=JSON.parse(previous);render();alert(C.unsaved);return false}render();return true};
const filePicker=document.createElement('input');filePicker.type='file';filePicker.accept='.json,application/json';filePicker.className='hidden';document.body.append(filePicker);
async function importFile(file){
 if(!file)return;
 if(file.size>2_000_000){alert(C.fileTooLarge);return}
 try{const obj=JSON.parse(await file.text());if(!verify(obj))throw Error(C.fileInvalid);
 if(db&&!confirm(C.confirmReplace))return;
 const previous=db;db=obj;chosen.clear();search='';if(!persist()){db=previous;alert(C.unsaved);return}render();setStatus(C.imported)}catch(e){alert(C.statusImportError+'：'+e.message)}
}
filePicker.addEventListener('change',async()=>{await importFile(filePicker.files?.[0]);filePicker.value=''});
const importAction=()=>filePicker.click();
function exportData(){if(!db)return;const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=C.backupName+'_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function render(){
 document.title=C.appTitle;
 root.replaceChildren();
 const mast=el('header','mast'),mi=el('div','mastInner');add(mi,el('div','eyebrow',C.eyebrow),el('h1','',C.appTitle),el('p','',C.subtitle));
 const actions=el('div','actions');
 add(actions,btn(C.importAgain,importAction),btn(C.export,exportData),btn(C.add,()=>edit(null),'primary'),btn(C.labelsManage,manageLabels));
 if(!db)actions.classList.add('hidden');add(mi,actions);add(mast,mi);root.append(mast);
 const shell=el('main','shell');root.append(shell);
 if(!db){const onboard=el('section','onboard');add(onboard,el('h2','',C.firstTitle),el('p','',C.firstDescription),btn(C.importFirst,importAction,'primary'),el('p','muted',C.privacy));shell.append(onboard);return}
 const intro=el('section','topCard');add(intro,el('h2','',C.description),el('p','',C.intro));shell.append(intro);
 const layout=el('div','layout'),side=el('aside','side');add(side,el('h3','',C.filtersTitle),el('p','',C.filterHint),el('p','',C.privacy),btn(C.export,exportData));
 const content=el('section','content');const state=el('div','statebar');state.id='state';add(state,el('span','',saved?C.statusReady:C.statusError),el('span','',C.statusLocal));if(!saved)state.classList.add('error');content.append(state);
 const quick=el('div','quick');for(const [name,arr] of [[C.presetContract,C.presetContractLabels],[C.presetTodo,C.presetTodoLabels],[C.presetAll,[]]])add(quick,btn(name,()=>{chosen=new Set(arr.map(t=>db.labels.find(x=>x.name===t)?.id).filter(Boolean));search='';render()}));content.append(quick);
 const panel=el('section','panel'),head=el('div','panelHead');add(head,el('h3','',C.filtersTitle),btn(C.clear,()=>{chosen.clear();search='';render()}));add(panel,head,el('p','hint',C.filterHint));
 for(const g of C.groups){const arr=db.labels.filter(x=>x.group===g);if(!arr.length)continue;const row=el('div','filterRow'),chips=el('div','chips');row.append(el('strong','',g));for(const x of arr){const b=btn(x.name,()=>{chosen.has(x.id)?chosen.delete(x.id):chosen.add(x.id);render()});b.className='chip '+(C.groupColor[g]||'')+(chosen.has(x.id)?' active':'');b.setAttribute('aria-pressed',String(chosen.has(x.id)));chips.append(b)}add(row,chips);panel.append(row)}content.append(panel);
 const input=el('input','search');input.type='search';input.placeholder=C.searchPlaceholder;input.value=search;input.setAttribute('aria-label',C.searchPlaceholder);content.append(input);
 const count=el('p','count'),cards=el('div','cards');content.append(count,cards);
 const paint=()=>{search=input.value.trim().toLocaleLowerCase();cards.replaceChildren();const items=db.items.filter(x=>[...chosen].every(id=>x.labels.includes(id))&&(!search||[x.title,x.detail,x.memo,...(x.related||[]),...x.labels.map(id=>label(id)?.name||'')].join(' ').toLocaleLowerCase().includes(search)));count.textContent=items.length+' '+C.results;
 for(const item of items){const card=el('article','card'),top=el('div','cardTop'),body=el('div'),buttons=el('div','cardButtons');body.append(el('h3','',item.title));if(item.detail)body.append(el('p','',item.detail));
 add(buttons,btn(C.status,()=>cycleStatus(item.id)),btn(C.edit,()=>edit(item.id)));add(top,body,buttons);card.append(top);
 if(item.memo)card.append(el('p','',C.memo+'：'+item.memo));if(item.related?.length)card.append(el('p','muted',C.related+'：'+item.related.join(' / ')));
 const tags=el('div','tags');for(const l of item.labels.map(label).filter(Boolean))tags.append(el('span','tag',l.name));card.append(tags);cards.append(card)}
 if(!items.length)cards.append(el('div','empty',db.items.length?C.empty:C.noItems))};
 input.addEventListener('input',paint);paint();add(layout,side,content);shell.append(layout)
}
function cycleStatus(id){const item=db.items.find(x=>x.id===id);if(!item)return;const all=db.labels.filter(x=>x.group===C.groupStatus);if(!all.length)return;const current=labels(item,C.groupStatus)[0];const next=all[(all.findIndex(x=>x.id===current?.id)+1)%all.length];change(()=>{item.labels=item.labels.filter(x=>group(x)!==C.groupStatus);item.labels.push(next.id)})}
function modal(title){const d=el('dialog','dialog'),head=el('div','dialogHead'),body=el('div','dialogBody'),foot=el('div','dialogFoot');add(head,el('h2','',title),btn(C.close,()=>d.close()));add(d,head,body,foot);document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();return{d,body,foot}}
function inputField(parent,name,value,multi=false){parent.append(el('label','fieldLabel',name));const n=el(multi?'textarea':'input','fieldInput'+(multi?' area':''));n.value=value||'';n.setAttribute('aria-label',name);if(!multi)n.type='text';parent.append(n);return n}
function edit(id){if(!db)return;const item=db.items.find(x=>x.id===id),m=modal(item?C.editItem:C.newItem);const title=inputField(m.body,C.title,item?.title),detail=inputField(m.body,C.detail,item?.detail,true),memo=inputField(m.body,C.memo,item?.memo,true),related=inputField(m.body,C.related,item?.related?.join(' / '));const checked=new Set(item?.labels||[]);
 for(const g of C.groups){const options=db.labels.filter(x=>x.group===g);if(!options.length)continue;const section=el('div','editGroup'),chips=el('div','chips');section.append(el('strong','',g));for(const l of options){const b=btn(l.name,()=>{if(checked.has(l.id))checked.delete(l.id);else{if(C.singleGroups.includes(g))for(const x of options)checked.delete(x.id);checked.add(l.id)}for(const x of chips.children)x.classList.toggle('active',checked.has(x.dataset.id))});b.dataset.id=l.id;b.className='chip'+(checked.has(l.id)?' active':'');chips.append(b)}section.append(chips);m.body.append(section)}
 if(item)m.foot.append(btn(C.delete,()=>{if(confirm(C.confirmDelete))change(()=>db.items=db.items.filter(x=>x.id!==id))&&m.d.close()},'danger'));
 add(m.foot,btn(C.cancel,()=>m.d.close()),btn(C.save,()=>{const t=title.value.trim();if(!t){alert(C.required);title.focus();return}if(change(()=>{const data={title:t,detail:detail.value.trim(),memo:memo.value.trim(),related:related.value.split(/[、,，/\n]/).map(x=>x.trim()).filter(Boolean),labels:[...checked]};if(item)Object.assign(item,data);else db.items.push({id:crypto.randomUUID(),order:db.items.length,...data})}))m.d.close()},'primary'));title.focus()}
function manageLabels(){if(!db)return;const m=modal(C.labelsManage),list=el('div');m.body.append(list);
 const redraw=()=>{list.replaceChildren();for(const l of db.labels){const row=el('div','labelRow'),name=el('input','fieldInput');name.value=l.name;name.setAttribute('aria-label',C.labelName+' '+l.name);name.addEventListener('change',()=>{const val=name.value.trim();if(!val||db.labels.some(x=>x!==l&&x.group===l.group&&x.name===val)){alert(C.duplicateLabel);name.value=l.name;return}change(()=>{const old=l.name;l.name=val;if(l.group===C.groupField)for(const i of db.items)i.related=(i.related||[]).map(x=>x===old?val:x)});redraw()});add(row,el('small','',l.group),name,el('small','',db.items.filter(i=>i.labels.includes(l.id)).length+' '+C.labelCount),btn(C.delete,()=>{if(C.singleGroups.includes(l.group)&&db.labels.filter(x=>x.group===l.group).length<2){alert(C.confirmLastLabel);return}if(confirm(C.confirmDeleteLabel)){change(()=>{db.labels=db.labels.filter(x=>x!==l);for(const i of db.items)i.labels=i.labels.filter(x=>x!==l.id);chosen.delete(l.id)});redraw()}},'danger'));list.append(row)}};
 redraw();const row=el('div','addLabelRow'),sel=el('select','fieldInput');sel.setAttribute('aria-label',C.labelGroup);for(const g of C.groups){const o=el('option','',g);o.value=g;sel.append(o)}const name=el('input','fieldInput');name.placeholder=C.labelName;name.setAttribute('aria-label',C.labelName);add(row,sel,name,btn(C.addLabel,()=>{const v=name.value.trim();if(!v)return;if(db.labels.some(x=>x.group===sel.value&&x.name===v)){alert(C.duplicateLabel);return}if(change(()=>db.labels.push({id:crypto.randomUUID(),group:sel.value,name:v}))){name.value='';redraw()}}));m.body.append(row);m.foot.append(btn(C.close,()=>m.d.close()))}
async function start(){try{const res=await fetch('./config.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!res.ok)throw Error();C=await res.json();if(!C||!Array.isArray(C.groups)||!C.appTitle)throw Error();try{const savedData=localStorage.getItem(key);if(savedData){const parsed=JSON.parse(savedData);if(!verify(parsed))throw Error();db=parsed}}catch(e){saved=false;db=null}render()}catch(e){root.replaceChildren()}}
start();
})();