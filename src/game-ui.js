// Full-screen HUD and non-scroll page navigation. The underlying life engine is unchanged.
const content=document.getElementById('content-panel');
const nav=document.getElementById('nav');
const pager=document.getElementById('stage-pager');
const prev=document.getElementById('page-prev');
const next=document.getElementById('page-next');
const label=document.getElementById('page-label');
const tabs=new Set(['life','actions','people','career','finance','systems']);
let page=0;
let pages=[];
let pendingUpdate=false;
let tab='life';
let swiped=null;

function currentTab(){return nav?.querySelector('.nav-item.active')?.dataset.tab||'life';}
function visibleCount(){const w=window.innerWidth,h=window.innerHeight;return w<851?(h<680?(currentTab()==='life'?1:2):h<850?3:4):h<700?4:6;}
function markOff(node,off){if(node)node.classList.toggle('ui-offpage',!!off);}
function clearOff(){content.querySelectorAll('.ui-offpage').forEach(n=>n.classList.remove('ui-offpage'));}
function updatePager(){
  pager.hidden=pages.length<=1;
  if(!pages.length)page=0;
  page=Math.min(Math.max(0,page),Math.max(0,pages.length-1));
  label.textContent=`${page+1} / ${Math.max(1,pages.length)}`;
  prev.disabled=page<=0;
  next.disabled=page>=pages.length-1;
  clearOff();
  pages[page]?.(true);
}
function paginateRows(nodes,perPage,visibility){
  if(!nodes.length){pages.push(on=>visibility?.(on));return;}
  for(let i=0;i<nodes.length;i+=perPage){const selected=nodes.slice(i,i+perPage);pages.push(on=>{
    visibility?.(on);
    nodes.forEach(el=>markOff(el,!on||!selected.includes(el)));
  });}
}
function groupPager(nodes){return [...nodes].filter(n=>!n.hidden);}
function hideSiblingsExcept(selector,selected){content.querySelectorAll(selector).forEach(el=>markOff(el,!selected.includes(el)));}
function enhanceSystems(){
  const controls=content.querySelector('.sim-controls');
  if(!controls)return;
  if(!controls.querySelector('.game-group-selector')){
    const chips=[...controls.querySelectorAll('[data-system-group]')];
    const select=document.createElement('select');
    select.className='game-group-selector';
    select.setAttribute('aria-label','Categoria dos sistemas');
    chips.forEach(chip=>{const o=document.createElement('option');o.value=chip.dataset.systemGroup;o.textContent=chip.textContent.trim();o.selected=chip.classList.contains('selected');select.append(o);});
    select.addEventListener('change',()=>{
      page=0;
      const chosen=controls.querySelector(`[data-system-group="${CSS.escape(select.value)}"]`);
      chosen?.click();
    });
    controls.append(select);
  }
}
function composePages(){
  clearOff();
  pages=[];
  const limit=visibleCount();
  content.dataset.gameTab=tab=currentTab();
  if(!tabs.has(tab)){pager.hidden=true;return;}

  if(tab==='life'){
    const hasDecision=!!content.querySelector('.decision-card');
    content.classList.toggle('with-decision',hasDecision);
    if(hasDecision){pages.push(()=>{});content.querySelectorAll('.mini-promo,.timeline,.section-head').forEach(n=>markOff(n,true));}
    else{
      const rows=[...content.querySelectorAll('.timeline .moment-card')];
      paginateRows(rows,limit);
    }
  } else if(tab==='actions'){
    const rows=groupPager(content.querySelectorAll('.action-list .action-card'));
    paginateRows(rows,limit);
  } else if(tab==='systems'){
    enhanceSystems();
    const rows=groupPager(content.querySelectorAll('.sim-actions .sim-action'));
    paginateRows(rows,limit);
  } else if(tab==='people'){
    const people=content.querySelector('.people-grid');
    const social=content.querySelector('.action-list');
    const heads=[...content.querySelectorAll('.section-head')];
    pages.push(on=>{markOff(people,!on);markOff(heads[0],!on);markOff(social,true);markOff(heads[1],true);});
    if(social){const rows=groupPager(social.querySelectorAll('.action-card'));
      for(let i=0;i<rows.length;i+=limit){const selected=rows.slice(i,i+limit);pages.push(on=>{
        markOff(people,true);markOff(heads[0],true);markOff(social,!on);markOff(heads[1],!on);
        rows.forEach(el=>markOff(el,!on||!selected.includes(el)));
      });}
    }
  } else if(tab==='career'){
    const promo=content.querySelector('.mini-promo');
    const heads=[...content.querySelectorAll('.section-head')];
    const actions=content.querySelector('.action-list');
    const jobs=content.querySelector('.job-list');
    const activityRows=groupPager(actions?.querySelectorAll('.action-card')||[]);
    const jobRows=groupPager(jobs?.querySelectorAll('.job-card')||[]);
    const slots=Math.max(1,limit-1);
    if(!activityRows.length){pages.push(on=>{markOff(promo,!on);markOff(heads[0],!on);markOff(actions,!on);markOff(heads[1],true);markOff(jobs,true);});}
    for(let i=0;i<activityRows.length;i+=slots){const selected=activityRows.slice(i,i+slots);pages.push(on=>{
      markOff(promo,!on);markOff(heads[0],!on);markOff(actions,!on);markOff(heads[1],true);markOff(jobs,true);
      activityRows.forEach(el=>markOff(el,!on||!selected.includes(el)));
    });}
    for(let i=0;i<jobRows.length;i+=limit){const selected=jobRows.slice(i,i+limit);pages.push(on=>{
      markOff(promo,true);markOff(heads[0],true);markOff(actions,true);markOff(heads[1],!on);markOff(jobs,!on);
      jobRows.forEach(el=>markOff(el,!on||!selected.includes(el)));
    });}
  } else if(tab==='finance'){
    const heads=[...content.querySelectorAll('.section-head')];
    const grids=[...content.querySelectorAll('.finance-grid')];
    const assets=content.querySelector('.progress-pills');
    const activities=content.querySelector('.action-list');
    const actionRows=groupPager(activities?.querySelectorAll('.action-card')||[]);
    const showOnly=kind=>{
      heads.forEach((el,i)=>markOff(el,(kind==='summary'?i!==0:kind==='accounts'?i!==1:kind==='assets'?i!==2:i!==3)));
      grids.forEach((el,i)=>markOff(el,(kind==='summary'?i!==0:i!==1)));
      markOff(assets,kind!=='assets');markOff(activities,kind!=='actions');
    };
    pages.push(on=>{if(on)showOnly('summary');});
    pages.push(on=>{if(on)showOnly('accounts');});
    pages.push(on=>{if(on)showOnly('assets');});
    for(let i=0;i<actionRows.length;i+=limit){const selected=actionRows.slice(i,i+limit);pages.push(on=>{
      if(on)showOnly('actions');
      actionRows.forEach(el=>markOff(el,!on||!selected.includes(el)));
    });}
  }
  updatePager();
}
function refresh(reset=false){
  if(reset)page=0;
  if(pendingUpdate)return;
  pendingUpdate=true;
  requestAnimationFrame(()=>{pendingUpdate=false;composePages();});
}
function turnPage(d){
  if(!pages.length)return;
  const target=Math.max(0,Math.min(pages.length-1,page+d));
  if(target===page)return;
  page=target;
  updatePager();
}
prev.addEventListener('click',()=>turnPage(-1));
next.addEventListener('click',()=>turnPage(1));
nav.addEventListener('click',e=>{if(e.target.closest('[data-tab]'))refresh(true);});
content.addEventListener('click',e=>{
  if(e.target.closest('[data-filter],[data-system-group]')){page=0;refresh();}
});
content.addEventListener('input',e=>{if(e.target.id==='sim-search'){page=0;refresh();}});
const observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'))refresh();
});
observer.observe(content,{childList:true});
window.addEventListener('resize',()=>refresh());

content.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,input,select,textarea,label'))return;
  swiped={x:e.clientX,y:e.clientY,id:e.pointerId};
},{passive:true});
content.addEventListener('pointerup',e=>{
  if(!swiped||e.pointerId!==swiped.id)return;
  const dx=e.clientX-swiped.x,dy=e.clientY-swiped.y;
  swiped=null;
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6)turnPage(dx<0?1:-1);
},{passive:true});
content.addEventListener('pointercancel',()=>{swiped=null;});
window.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
window.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key)){e.preventDefault();return;}
  if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;
  if(e.key==='ArrowLeft')turnPage(-1);
  if(e.key==='ArrowRight')turnPage(1);
  if(['PageUp','PageDown','Home','End',' '].includes(e.key)&&e.target===document.body)e.preventDefault();
});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
refresh();
