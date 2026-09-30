import {ruleFor} from '../core.mjs';
import {filterSources,groupEnemySources,sourceDisplayName} from '../source-groups.mjs';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(value:any)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function visibleSources(catalog:any,kind:string,faction:string){
  return filterSources(catalog,{kind,scope:$<HTMLSelectElement>('scopeFilter').value,
    query:$<HTMLInputElement>('sourceSearch').value,faction});
}

export function drawSourcePicker(catalog:any,kind:string,source:any,profile:any,faction:string,resetScroll=false){
  const isEnemy=kind==='enemy';
  $('sources').classList.toggle('enemy-sources',isEnemy);
  $('sourceTitle').textContent=isEnemy?'选择敌人':'选择容器';
  $<HTMLInputElement>('sourceSearch').placeholder=isEnemy?'搜索敌人或阵营':'搜索名称';
  const select=$<HTMLSelectElement>('factionFilter');select.hidden=!isEnemy;
  if(isEnemy){
    select.innerHTML='<option value="all">全部阵营</option>'+catalog.enemyFactions.map((f:any)=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
    select.value=faction;
  }
  const list=visibleSources(catalog,kind,faction),listElement=$('sourceList');
  const scrollTop=resetScroll?0:listElement.scrollTop;
  $('sourceCount').textContent=`${list.length} 类`;
  const row=(s:any)=>`<button class="source-row ${source?.key===s.key?'active':''}" data-source="${esc(s.key)}" aria-current="${source?.key===s.key?'true':'false'}"><span class="glyph" aria-hidden="true">${isEnemy?'♟':'▣'}</span><span class="source-name">${esc(sourceDisplayName(s))}</span>${ruleFor(profile,s)?'<span class="dot" title="有自定义奖励" aria-label="有自定义奖励">●</span>':''}</button>`;
  listElement.innerHTML=!list.length?'<div class="empty">没有匹配对象<button id="clearSourceFilter">清除筛选</button></div>':isEnemy
    ?groupEnemySources(catalog,list).map((group:any)=>`<section class="source-group" aria-labelledby="faction-${esc(group.id)}"><h2 class="source-group-title" id="faction-${esc(group.id)}"><span>${esc(group.name)}</span><span>${group.sources.length}</span></h2>${group.sources.map(row).join('')}</section>`).join('')
    :list.map(row).join('');
  listElement.scrollTop=scrollTop;
}
