import {clone,newProfile,newReward,validate,ruleFor,Simulator,fingerprint,ammoDrop,seeded,rewardItem,nativeRows} from '../core.mjs';
import {factionNames,filterSources,sourceDisplayName} from '../source-groups.mjs';
import {drawSourcePicker} from './source-picker';
declare global {interface Window {loot:any;RMHost:any;workshop:any}}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let catalog:any,sim:any,profile:any,profiles:any[]=[],status:any,tab='container',source:any;
let enemyFaction='all';
let icons:Record<string,string>={};
let undo:any[]=[],redo:any[]=[],saved=new Map<string,string>(),readOnly=true;
let previewOptions:any={stage:1,difficulty:4,weaponLevel:2,hero:0,bonus:50,broken:false,lootLimit:6,capsMult:1,bitsMult:1,difCapsMult:1,freel:false,barahlo:false,biom:0,randomLand:false,challenge:false,continuous:false};
let selectedWeapon='p10mm';let previewRuns=100;let picker:{reward:number,add:boolean,native?:string}|null=null;
const original:any={...newProfile('原版 · 只读'),id:'vanilla'};
const itemMap=new Map<string,any>();
const glyph=(i:any)=>i?.kind==='weapon'?'⌁':i?.kind==='armor'?'♜':i?.tip==='a'?'▥':i?.tip==='med'||i?.tip==='pot'?'✚':i?.tip==='book'?'▤':i?.tip==='food'?'◒':'◇';
const itemIcon=(i:any)=>{const file=icons[i?.key]||icons[i?.baseKey];return file?`<img class="item-icon" src="icons/${esc(file)}" alt="">`:`<span class="glyph" aria-hidden="true">${glyph(i)}</span>`;};
const category=(i:any)=>i?.kind==='weapon'?'武器':i?.kind==='armor'?'护甲':({a:'弹药',e:'爆炸物',med:'医疗',pot:'药剂',food:'食物',eda:'食物',book:'书籍',him:'药物',scheme:'配方',art:'饰品',impl:'植入物',spec:'特殊物品',instr:'工具',stuff:'杂物'} as any)[i?.tip]||(String(i?.tip).startsWith('comp')?'材料':'物品');
const unit=(i:any)=>i?.kind==='weapon'?'把':i?.kind==='armor'?'件':i?.tip==='a'?'发':'个';
function notice(message:string,success=false){$('notice').textContent=message;$('notice').className=success?'success':'';}
function dirty(){return !readOnly&&saved.get(profile.id)!==JSON.stringify(profile);}
function record(){undo.push(clone(profile));if(undo.length>80)undo.shift();redo=[];}
function change(fn:()=>void){if(readOnly)return;record();fn();render();}
async function beforeLeave(){return !dirty()||await window.loot.confirm({message:'当前方案还没有保存',detail:'切换后将放弃未保存的改动。也可以继续编辑，先点击“保存方案”。'});}
function sourceLabel(s:any){return sourceDisplayName(s);}
let recoveryTimer:any,revision=0,lastContent='';
function recoverLoot(){return parent.workshop.lootRecover({profile:clone(profile),dirty:dirty(),revision,view:{tab,source:source?.key,enemyFaction}});}
async function saveLoot(){if(readOnly)return true;const errors=validate(profile,catalog);if(errors.length)throw Error(errors.join('\n'));const snapshot=clone(profile);status=await window.loot.save(snapshot);saved.set(snapshot.id,JSON.stringify(snapshot));const i=profiles.findIndex(p=>p.id===snapshot.id);if(i<0)profiles.push(snapshot);else profiles[i]=snapshot;drawHeader();await recoverLoot();return !dirty();}
function drawHeader(){
  const list=[original,...profiles];if(!list.some(p=>p.id===profile.id))list.push(profile);
  $('profileSelect').innerHTML=list.map(p=>`<option value="${esc(p.id)}" ${p.id===profile.id?'selected':''}>${esc(p.name)}</option>`).join('');
  $('dirtyLabel').textContent=readOnly?'只读':dirty()?'未保存':'已保存';
  ($('undo') as HTMLButtonElement).disabled=readOnly||!undo.length;($('redo') as HTMLButtonElement).disabled=readOnly||!redo.length;
  ($('save') as HTMLButtonElement).disabled=readOnly;($('apply') as HTMLButtonElement).disabled=readOnly;
  const content=JSON.stringify(profile);if(content!==lastContent){lastContent=content;revision++;}
  parent.RMHost.state('loot',{dirty:dirty(),revision,documentId:profile.id});clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>recoverLoot().catch((e:any)=>notice('自动留存失败：'+e.message)),450);
  const s=status;
  $('gameStatus').className=s.receiptFresh?'status-ready':'';
  $('gameStatus').textContent=s.receiptFresh?`✓ 游戏在最近一次启动中已读取「${s.receipt.profileName}」${s.receipt.enabled?'':'（本次运行已暂停）'}`:s.activeHash?(s.runtimePresent&&s.listed?'方案已应用 · 等待游戏重启读取':'方案已应用 · 游戏读取模块尚未安装'):'尚未应用方案';
  if(s.activeHash&&!s.receiptFresh&&s.installation?.updateAvailable)$('gameStatus').textContent='方案已应用 · 请先更新游戏连接，再重启游戏';
  if(s.test)$('gameStatus').textContent+=' · 隔离测试目录';
  if(s.receiptRecent&&s.receipt?.error)$('gameStatus').textContent=`游戏拒绝了当前连接或配置，保留「${s.receipt.profileName}」。请检查应用方案；错误记录保留在游戏日志中。`;
  $('gameStatus').title=s.gameRoot;
  $('connectGame').textContent=s.installation?.updateAvailable?'更新游戏连接':s.installation?.connected?'连接已安装':'连接游戏';
  ($('connectGame') as HTMLButtonElement).disabled=(!!s.installation?.connected&&!s.installation?.updateAvailable)||!s.installation?.available;
}
function drawSources(resetScroll=false){
  const visible=tab==='container'||tab==='enemy';$('sources').hidden=!visible;$('preview').hidden=tab==='profiles';
  $('workspace').classList.toggle('no-sources',!visible);
  if(!visible)return;
  drawSourcePicker(catalog,tab,source,profile,enemyFaction,resetScroll);
}
function selectionRule(){return source&&ruleFor(profile,source);}
function ensureOwnRule(){let r=profile.rules.find((r:any)=>r.target===source.key);if(!r){r={...clone(selectionRule()||{mode:'append',rewards:[]}),target:source.key};profile.rules.push(r);}for(const reward of r.rewards){if(reward.variant&&reward.pick.every((c:any)=>rewardItem(itemMap,c.key,reward.variant)?.variant===1)){for(const c of reward.pick)c.key=rewardItem(itemMap,c.key,reward.variant)!.key;reward.variant=0;}}return r;}
function nativeEdit(slot:string){const r=ensureOwnRule();r.mode='replace';r.native??={};profile.schemaVersion=2;return r.native[slot]??={};}
function field(label:string,key:string,value:any,min=0,max=9999,extra=''){return `<label class="field">${label}<div class="input-unit"><input type="number" data-field="${esc(key)}" value="${value}" min="${min}" max="${max}" step="1" ${readOnly?'disabled':''}>${extra}</div></label>`;}
function rewardHTML(r:any,n:number){
  const first=rewardItem(itemMap,r.pick[0]?.key,r.variant);const multiple=r.pick.length>1;const equipment=r.pick.some((v:any)=>['weapon','armor'].includes(itemMap.get(v.key)?.kind));
  return `<article class="reward-card" data-reward="${n}"><div class="reward-title">${itemIcon(first)}<strong>${multiple?`从 ${r.pick.length} 种物品中抽 1 种`:esc(first?.name||'选择物品')}</strong><button class="choose" data-action="choose" ${readOnly?'disabled':''}>更换物品</button><button data-action="remove" aria-label="删除奖励 ${n+1}" ${readOnly?'disabled':''}>✕</button></div><div class="fields">${field('出现机会','chance',r.chance,0,100,'%')}${field('最少数量','min',r.min,1,9999,unit(first))}${field('最多数量','max',r.max,1,9999,unit(first))}</div>
  <details><summary>更多设置</summary><div class="fields">${field('独立抽取次数','repeat',r.repeat,1,20)}<label class="field">敌人类型<select data-field="elite" ${readOnly?'disabled':''}><option value="any" ${r.elite==='any'?'selected':''}>普通和精英</option><option value="normal" ${r.elite==='normal'?'selected':''}>仅普通</option><option value="elite" ${r.elite==='elite'?'selected':''}>仅精英</option></select></label>${field('最早游戏阶段','minStage',r.minStage,0,99)}${field('最晚游戏阶段','maxStage',r.maxStage,0,99)}${equipment?`${field('最低耐久','durabilityMin',r.durabilityMin,1,100,'%')}${field('最高耐久','durabilityMax',r.durabilityMax,1,100,'%')}`:''}</div>
  <div class="pool-heading"><span>候选物品</span><span>偏好倍数</span></div>${r.pick.map((c:any,j:number)=>`<div class="pool-choice"><span>${esc(rewardItem(itemMap,c.key,r.variant)?.name)} <small>约 ${Math.round(c.weight/r.pick.reduce((a:number,b:any)=>a+b.weight,0)*100)}%</small></span><input type="number" min="1" max="1000" data-weight="${j}" value="${c.weight}" aria-label="${esc(rewardItem(itemMap,c.key,r.variant)?.name)}的偏好倍数"><button data-choice-remove="${j}" ${r.pick.length===1?'disabled':''} aria-label="移除此候选">✕</button></div>`).join('')}<button data-action="add-choice" class="quiet">＋ 加入候选物品</button></details></article>`;
}
function nativeHTML(row:any){
  const edit=selectionRule()?.native?.[row.slot]||{},choices=edit.pick,first=itemMap.get(choices?.[0]?.key||row.key),equipment=choices?choices.some((c:any)=>['weapon','armor'].includes(itemMap.get(c.key)?.kind)):row.equipment;
  const title=choices?(choices.length>1?`从 ${choices.length} 种物品中抽 1 种`:first?.name):row.name;
  const input=(label:string,key:string,value:any,placeholder:string,max=9999)=>`<label class="field">${label}<input type="number" data-native-field="${key}" value="${value??''}" placeholder="${esc(placeholder)}" min="${key==='chance'?0:1}" max="${max}" step="${key==='chance'?'any':1}" ${readOnly?'disabled':''}></label>`;
  const candidates=choices|| (row.key?[{key:row.key,weight:1}]:row.pool==='gems'?[1,2,3].map(n=>({key:'item:gem'+n,weight:1})):row.pool==='unowned'?['lsword','antidrak','quick','mlau'].map(id=>({key:'weapon:'+id+'^1',weight:1})):(sim.pools[row.pool]||[]).filter((v:any)=>v.weight>0&&(!row.worth||v.worth===row.worth)).map((v:any)=>({key:v.item.key+(v.variant?'^1':''),weight:v.weight})));
  return `<article class="reward-card native-reward" data-native="${esc(row.slot)}"><div class="reward-title">${itemIcon(first)}<strong>${esc(title)}</strong><button data-action="choose" ${readOnly?'disabled':''}>更换物品</button>${Object.keys(edit).length?`<button data-action="restore-native" ${readOnly?'disabled':''}>还原词条</button>`:''}<button data-action="remove-native" aria-label="删除${esc(title)}" ${readOnly?'disabled':''}>✕</button></div>
  ${row.conditions.length?`<div class="reward-conditions">${row.conditions.map((s:string)=>`<span>${esc(s)}</span>`).join('')}</div>`:''}
  <div class="fields">${input('出现机会（%）','chance',edit.chance??row.chance,row.chanceText,100)}${input('最少数量','min',edit.min??(choices?null:row.quantity),choices?'按所选物品份量':row.quantityText)}${input('最多数量','max',edit.max??(choices?null:row.quantity),choices?'按所选物品份量':row.quantityText)}</div>
  <details><summary>候选物品与更多设置</summary>${!choices?'<p class="muted">保留原版筛选与份量；留空的数值随原版变化。</p>':''}${equipment?`<div class="fields">${input('最低耐久（%）','durabilityMin',edit.durabilityMin,'原版耐久',100)}${input('最高耐久（%）','durabilityMax',edit.durabilityMax,'原版耐久',100)}</div>`:''}
  <div class="native-candidates">${candidates.map((c:any,j:number)=>`<div class="pool-choice"><span>${esc(itemMap.get(c.key)?.name||c.key)}</span>${choices?`<input type="number" data-native-weight="${j}" value="${c.weight}" min="1" max="1000" aria-label="${esc(itemMap.get(c.key)?.name)}的偏好倍数" ${readOnly?'disabled':''}><button data-native-remove="${j}" ${readOnly||choices.length===1?'disabled':''}>✕</button>`:`<small>权重 ${c.weight}</small>`}</div>`).join('')}</div>${choices?`<button data-action="add-choice" ${readOnly?'disabled':''}>＋ 加入候选物品</button>`:''}</details></article>`;
}
function drawEditor(){
  if(tab==='ammo'){drawAmmo();return;}if(tab==='profiles'){drawProfiles();return;}
  if(!source){$('editor').innerHTML='<p class="empty">未选择对象</p>';return;}
  const r=selectionRule();const own=profile.rules.find((v:any)=>v.target===source.key);const affected=catalog.sources.filter((s:any)=>s.kind===source.kind&&s.table===source.table&&s.scope==='model');
  $('editor').innerHTML=`<div class="object-head"><span class="glyph">${tab==='container'?'▣':'♟'}</span><div><h1>${esc(sourceLabel(source))}</h1></div></div>
  ${readOnly?'<div class="read-only"><button class="primary" data-command="copy">复制并编辑</button></div>':''}
  <div class="scope-note"><strong>影响范围</strong>　${source.scope==='model'?esc(sourceLabel(source)):source.kind==='enemy'&&source.factionIds.length>1?esc(factionNames(catalog,source).join('、'))+` · ${affected.length} 个型号（共用）`:(affected.length?affected.slice(0,8).map((s:any)=>esc(sourceLabel(s))).join('、')+(affected.length>8?` 等 ${affected.length} 个型号`:''):'所有采用这类内容的容器或掉落入口')}${r&&!own?' · 继承共享设置':''}</div>
  <div class="section-head"><h2>奖励词条</h2><button data-command="reset-source" ${readOnly||!own?'disabled':''}>恢复本项</button></div>
  ${nativeRows(catalog,profile,source).map(nativeHTML).join('')}${(r?.rewards||[]).map(rewardHTML).join('')}
  ${!nativeRows(catalog,profile,source).length&&!r?.rewards.length?'<p class="empty">没有物品奖励</p>':''}
  <button class="add-reward" data-command="add-reward" ${readOnly?'disabled':''}>＋ 添加一条奖励</button>
  ${Object.values(r?.native||{}).some((p:any)=>p.disabled)?`<button data-command="restore-deleted" ${readOnly?'disabled':''}>恢复已删除的原版奖励</button>`:''}
`;
}
function drawAmmo(){
  const a=profile.ammo;
  $('editor').innerHTML=`<h1>对应弹药</h1>${readOnly?'<div class="read-only"><button class="primary" data-command="copy">复制并编辑</button></div>':''}
  <label class="toggle-row"><div><strong>额外掉落对应弹药</strong></div><input type="checkbox" data-ammo="enabled" ${a.enabled?'checked':''} ${readOnly?'disabled':''}></label>
  <div class="panel"><h2>普通弹药</h2><div class="fields"><label class="field">出现机会（%）<input type="number" data-ammo="chance" min="0" max="100" value="${a.chance}" ${readOnly?'disabled':''}></label><label class="field">数量方式<select data-ammo="mode" ${readOnly?'disabled':''}><option value="pack" ${a.mode==='pack'?'selected':''}>按弹种常规份量</option><option value="fixed" ${a.mode==='fixed'?'selected':''}>固定数量</option><option value="range" ${a.mode==='range'?'selected':''}>随机范围</option></select></label>${a.mode==='pack'?`<label class="field">常规一份的百分比（%）<input type="number" data-ammo="packPercent" min="1" max="500" value="${a.packPercent}" ${readOnly?'disabled':''}></label>`:`<label class="field">${a.mode==='fixed'?'固定发数':'最少发数'}<input type="number" data-ammo="min" min="1" max="9999" value="${a.min}" ${readOnly?'disabled':''}></label>${a.mode==='range'?`<label class="field">最多发数<input type="number" data-ammo="max" min="1" max="9999" value="${a.max}" ${readOnly?'disabled':''}></label>`:''}`}</div><label class="inline-check"><input type="checkbox" data-ammo="useBase" ${a.useBase?'checked':''} ${readOnly?'disabled':''}> 将特殊弹种换成对应的基础弹种</label></div>
  <div class="panel"><label class="inline-check"><input type="checkbox" data-ammo="includeExplosive" ${a.includeExplosive?'checked':''} ${readOnly?'disabled':''}><strong>同时增加火箭等稀有爆炸弹药</strong></label><div class="fields"><label class="field">爆炸弹药出现机会（%）<input type="number" data-ammo="explosiveChance" min="0" max="100" value="${a.explosiveChance}" ${readOnly?'disabled':''}></label><label class="field">最少发数<input type="number" data-ammo="explosiveMin" min="1" max="9999" value="${a.explosiveMin}" ${readOnly?'disabled':''}></label><label class="field">最多发数<input type="number" data-ammo="explosiveMax" min="1" max="9999" value="${a.explosiveMax}" ${readOnly?'disabled':''}></label></div></div>
  <details class="panel"><summary>适用范围</summary><label class="inline-check"><input type="checkbox" id="allEnemies" ${!a.models.length?'checked':''} ${readOnly?'disabled':''}>全部敌对持枪单位</label><div class="model-checks">${catalog.sources.filter((s:any)=>s.kind==='enemy'&&s.scope==='model').map((s:any)=>`<label class="inline-check"><input type="checkbox" data-model="${esc(s.id)}" ${a.models.includes(s.id)?'checked':''} ${readOnly?'disabled':''}>${esc(sourceLabel(s))}</label>`).join('')}</div></details>
  `;
}
function drawProfiles(){
  $('editor').innerHTML=`<h1>我的方案</h1><div class="panel"><label class="field">当前方案名称<input id="profileName" type="text" maxlength="60" value="${esc(profile.name)}" ${readOnly?'disabled':''}></label><div class="profile-actions"><button class="primary" data-command="copy">复制当前方案</button><button data-command="import">导入方案</button><button data-command="export">导出当前方案</button><button data-command="reset-all" ${readOnly?'disabled':''}>恢复全部原版</button><button data-command="folder">打开方案文件夹</button></div></div><div class="panel">${[original,...profiles].map(p=>`<div class="profile-card"><span class="glyph">▤</span><div><strong>${esc(p.name)}</strong><p>${p.id==='vanilla'?'只读':`${p.rules.length} 个自定义对象 · 对应弹药${p.ammo.enabled?'已开启':'未开启'}`}</p></div><button data-load="${esc(p.id)}">${p.id===profile.id?'当前方案':'打开'}</button></div>`).join('')}</div>`;
  $('editor').insertAdjacentHTML('beforeend',`<div class="panel"><h2>方案回退</h2><button data-command="previous" ${!status.hasPrevious?'disabled':''}>打开上次应用方案</button></div><div class="panel"><h2>游戏连接</h2><p class="muted">${status.installation?.updateAvailable?'游戏连接可更新':status.installation?.connected?'连接已安装':status.installation?.compatible?'可以连接':'游戏版本不兼容'}</p><div class="profile-actions"><button data-command="connect" ${!status.installation?.available||(status.installation?.connected&&!status.installation?.updateAvailable)?'disabled':''}>${status.installation?.updateAvailable?'更新游戏连接':'备份并连接游戏'}</button><button data-command="restore-game" ${!status.installation?.canRestore?'disabled':''}>恢复连接前的游戏</button></div></div>`);
}
function weaponSelect(){return `<label class="field">模拟敌人的主武器<select id="previewWeapon"><option value="">无可识别枪械</option>${catalog.items.filter((i:any)=>i.kind==='weapon'&&!i.variant&&i.ammo).map((i:any)=>`<option value="${esc(i.id)}" ${i.id===selectedWeapon?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label>`;}
function drawPreview(){
  if(tab==='profiles')return;
  const ctx=previewOptions;
  $('preview').innerHTML=`<div class="section-head"><h2>掉落预览</h2><span class="tag">虚拟试抽</span></div>${tab==='ammo'?weaponSelect():`<div class="fields"><label class="field">游戏阶段<input type="number" data-preview="stage" min="0" max="10" value="${ctx.stage}"></label><label class="field">地区难度<input type="number" data-preview="difficulty" min="1" max="50" value="${ctx.difficulty}"></label><label class="field">武器等级<input type="number" data-preview="weaponLevel" min="1" max="30" value="${ctx.weaponLevel}"></label><label class="field">可获得额度<input type="number" data-preview="lootLimit" min="0" max="100" value="${ctx.lootLimit}"></label></div>${tab==='enemy'?`<label class="inline-check"><input type="checkbox" data-preview="hero" ${ctx.hero?'checked':''}>精英敌人</label>${weaponSelect()}`:`<label class="inline-check"><input type="checkbox" data-preview="broken" ${ctx.broken?'checked':''}>容器已损坏</label>`}<details><summary>更多模拟条件</summary><div class="fields"><label class="field">保险箱奖励参数<input type="number" data-preview="bonus" min="0" max="500" value="${ctx.bonus}"></label><label class="field">瓶盖收益倍数<input type="number" data-preview="capsMult" min="0" max="10" step="0.1" value="${ctx.capsMult}"></label><label class="field">马蹄币收益倍数<input type="number" data-preview="bitsMult" min="0" max="10" step="0.1" value="${ctx.bitsMult}"></label></div>${[['randomLand','随机地区'],['challenge','挑战房间'],['freel','额外弹药能力'],['barahlo','额外材料能力'],['continuous','连续搜刮，额度累积消耗']].map(([key,label])=>`<label class="inline-check"><input type="checkbox" data-preview="${key}" ${ctx[key]?'checked':''}>${label}</label>`).join('')}</details>`}<div class="preview-actions"><button data-sample="1">试 1 次</button><button data-sample="100">试 100 次</button><button data-sample="1000">试 1000 次</button></div><div id="results"></div>`;
  updatePreview();
}
function weaponSnapshot(){const i=catalog.items.find((i:any)=>i.kind==='weapon'&&i.id===selectedWeapon);return i?{id:i.id,ammo:i.ammo,ammoBase:i.ammo,tip:Number(i.weaponTip??2),recharg:i.recharg===true}:null;}
function updatePreview(){
  const errors=validate(profile,catalog);if(errors.length){$('results').innerHTML=`<p class="error-list">请先修正设置：<br>${errors.map(esc).join('<br>')}</p>`;return;}
  try{
    const ctx={...previewOptions,weapon:weaponSnapshot()};
    if(tab==='ammo'){
      const random=seeded(90814),totals:any={};let empty=0;
      for(let n=0;n<previewRuns;n++){const d=ammoDrop(profile.ammo,ctx.weapon,profile.ammo.models[0]||'',itemMap,random);if(!d)empty++;else totals[d.key]=(totals[d.key]||0)+d.count;}
      $('results').innerHTML=`<div class="stat-grid"><div class="stat"><b>${previewRuns}</b>模拟击败次数</div><div class="stat"><b>${Math.round((previewRuns-empty)/previewRuns*100)}%</b>出现额外弹药</div></div>${Object.entries(totals).map(([key,n]:any)=>`<div class="result-row"><span>${esc(itemMap.get(key)?.name)}</span><b>平均 ${(n/previewRuns).toFixed(2)} 发</b></div>`).join('')||'<p class="empty">未生成额外弹药</p>'}`;return;
    }
    if(!source)return;
    const current=sim.sample(profile,source,ctx,previewRuns,48131),base=sim.sample(original,source,ctx,previewRuns,48131);
    const sum=(r:any)=>r.items.reduce((s:number,x:any)=>s+x.count,0)/r.runs;
    $('results').innerHTML=`<div class="stat-grid"><div class="stat"><b>${Math.round(current.empty/current.runs*100)}%</b>未生成物品</div><div class="stat"><b>${sum(current).toFixed(1)}</b>平均物品总数</div></div><p class="explain">原版：空奖励 ${Math.round(base.empty/base.runs*100)}%，平均 ${sum(base).toFixed(1)} 个。已试抽 ${current.runs} 次。${current.encounters?`其中 ${current.encounters} 次生成敌人。`:''}</p>${current.items.slice(0,30).map((t:any)=>`<div class="result-row"><span>${esc(rewardItem(itemMap,t.key,t.variant)?.name)}</span><b>${previewRuns===1?t.count+' '+unit(itemMap.get(t.key)):'平均 '+(t.count/current.runs).toFixed(2)}</b></div>`).join('')||'<p class="empty">未生成普通物品</p>'}${current.items.length>30?`<p class="explain">共 ${current.items.length} 种，显示数量最多的 30 种。</p>`:''}`;
  }catch(e){$('results').textContent='此场景暂时无法预览：'+e;}
}
function persistView(){void window.loot.view({profile:profile.id,tab,source:source?.key,enemyFaction}).catch((e:any)=>notice('无法记住编辑位置：'+e.message));}
function render(){drawHeader();drawSources();drawEditor();drawPreview();persistView();}
function pickItems(reward:number,add=false,native?:string){picker={reward,add,native};($('itemSearch') as HTMLInputElement).value='';($('itemCategory') as HTMLSelectElement).value='all';drawItems();($('itemDialog') as HTMLDialogElement).showModal();($('itemSearch') as HTMLInputElement).focus();}
function drawItems(){const query=($('itemSearch') as HTMLInputElement).value.trim().toLowerCase(),cat=($('itemCategory') as HTMLSelectElement).value;const list=catalog.items.filter((i:any)=>(!query||(i.name+' '+(i.baseName||'')+' '+i.id).toLowerCase().includes(query))&&(cat==='all'||(cat==='advanced'&&i.variant===1)||i.kind===cat||i.tip===cat||(cat==='materials'&&i.tip.startsWith('comp'))));
  $('itemList').innerHTML=list.slice(0,160).map((i:any)=>`<button class="item-option" data-item="${esc(i.key)}">${itemIcon(i)}<div><strong>${esc(i.name)}</strong><small>${i.variant?`进阶武器 · ${esc(i.baseName)}`:`${category(i)} · ${i.kind==='weapon'||i.kind==='armor'?'逐件掉落':`常规一份 ${i.count} ${unit(i)}`}`}</small></div></button>`).join('')+(list.length>160?'<p class="empty">仅显示前 160 项</p>':'');
}
async function load(id:string){if(id===profile.id)return;if(!await beforeLeave())return;const p=id==='vanilla'?original:profiles.find(p=>p.id===id);if(!p)return;profile=clone(p);readOnly=id==='vanilla';undo=[];redo=[];notice('');render();}
async function command(c:string){
  if(c==='copy'){const next=clone(profile);next.id=crypto.randomUUID();next.name=readOnly?'我的掉落方案':profile.name+' · 副本';profile=next;readOnly=false;undo=[];redo=[];profiles.push(clone(next));notice('已创建副本',true);render();}
  if(c==='restore-deleted')change(()=>{const r=ensureOwnRule();for(const patch of Object.values(r.native||{}) as any[])delete patch.disabled;});
  if(c==='add-reward')change(()=>ensureOwnRule().rewards.push(newReward()));
  if(c==='reset-source'){if(await window.loot.confirm({message:'恢复此对象的原有奖励？',detail:'删除这一对象的自定义设置；如果整类奖励已被修改，这一型号会重新继承整类设置。'}))change(()=>profile.rules=profile.rules.filter((r:any)=>r.target!==source.key));}
  if(c==='reset-all'){if(await window.loot.confirm({message:'恢复当前方案的全部原版设置？',detail:`将移除 ${profile.rules.length} 个自定义对象并关闭对应弹药。应用前不会影响游戏，编辑后可以撤销。`}))change(()=>{profile.rules=[];profile.ammo=clone(original.ammo);});}
  if(c==='import'){if(!await beforeLeave())return;const p=await window.loot.import();if(p){profiles.push(p);saved.set(p.id,JSON.stringify(p));profile=clone(p);readOnly=false;undo=[];redo=[];render();notice('方案已导入',true);}}
  if(c==='export'){if(await window.loot.export(profile))notice('方案已导出',true);}
  if(c==='folder')await window.loot.openFolder();
  if(c==='previous'){if(!await beforeLeave())return;const p=await window.loot.previous();profiles.push(p);saved.set(p.id,JSON.stringify(p));profile=clone(p);readOnly=false;undo=[];redo=[];render();notice('已打开上次应用的方案副本',true);}
  if(c==='connect'||c==='restore-game'){const result=await window.loot[c==='connect'?'install':'restoreGame']();if(result){status=result;render();notice(c==='connect'?'连接已安装':'游戏连接已恢复',true);}}
}
document.addEventListener('click',event=>{void (async()=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('button');if(!target||target.hasAttribute('disabled'))return;
  if(target.dataset.tab){tab=target.dataset.tab;$('sourceSearch').querySelector('input');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab===tab));if(source?.kind!==tab&&['container','enemy'].includes(tab)){source=filterSources(catalog,{kind:tab,scope:($('scopeFilter') as HTMLSelectElement).value,faction:enemyFaction})[0];}render();}
  if(target.dataset.source){source=catalog.sources.find((s:any)=>s.key===target.dataset.source);render();window.scrollTo(0,0);$('sourceList').querySelector<HTMLButtonElement>('.source-row.active')?.focus({preventScroll:true});}
  if(target.id==='clearSourceFilter'){($('sourceSearch') as HTMLInputElement).value='';if(tab==='enemy')enemyFaction='all';drawSources(true);persistView();$('sourceSearch').focus();}
  if(target.dataset.command)await command(target.dataset.command);
  if(target.dataset.load)await load(target.dataset.load);
  if(target.dataset.sample){previewRuns=Number(target.dataset.sample);updatePreview();}
  const n=Number(target.closest('[data-reward]')?.getAttribute('data-reward'));
  const native=target.closest('[data-native]')?.getAttribute('data-native')||undefined;
  if(target.dataset.action==='choose')pickItems(n,false,native);
  if(target.dataset.action==='remove-native'&&native)change(()=>nativeEdit(native).disabled=true);
  if(target.dataset.action==='restore-native'&&native)change(()=>{delete ensureOwnRule().native[native];});
  if(target.dataset.nativeRemove!==undefined&&native)change(()=>nativeEdit(native).pick.splice(Number(target.dataset.nativeRemove),1));
  if(target.dataset.action==='add-choice')pickItems(n,true,native);
  if(target.dataset.action==='remove')change(()=>ensureOwnRule().rewards.splice(n,1));
  if(target.dataset.choiceRemove!==undefined)change(()=>ensureOwnRule().rewards[n].pick.splice(Number(target.dataset.choiceRemove),1));
  if(target.dataset.item&&picker){const {reward,add,native}=picker;const key=target.dataset.item;change(()=>{const r=native?nativeEdit(native):ensureOwnRule().rewards[reward];if(add){if(!r.pick.some((c:any)=>c.key===key))r.pick.push({key,weight:1});}else{r.pick=[{key,weight:1}];if(!native){r.variant=0;r.min=r.max=itemMap.get(key).kind==='item'?itemMap.get(key).count:1;}}});($('itemDialog') as HTMLDialogElement).close();}
  if(target.id==='closeItems')($('itemDialog') as HTMLDialogElement).close();
  if(target.id==='undo'&&undo.length){redo.push(clone(profile));profile=undo.pop();render();}
  if(target.id==='redo'&&redo.length){undo.push(clone(profile));profile=redo.pop();render();}
  if(target.id==='save'||target.id==='apply'){
    const errors=validate(profile,catalog);if(errors.length){notice(errors.join('\n'));return;}
    const snapshot=clone(profile);status=await window.loot[target.id](snapshot);saved.set(snapshot.id,JSON.stringify(snapshot));const i=profiles.findIndex(p=>p.id===snapshot.id);if(i<0)profiles.push(snapshot);else profiles[i]=snapshot;render();await recoverLoot();notice(target.id==='save'?'方案已保存':'方案已应用 · '+(snapshot.schemaVersion===2&&(status.installation?.updateAvailable||status.installation?.bridgeUpdate)?'请先更新游戏连接，再重启游戏':status.runtimePresent&&status.listed?'重启游戏生效':'请先连接游戏'),true);
  }
  if(target.id==='chooseGame')await parent.RMHost.chooseGame();
  if(target.id==='refreshStatus'){status=await window.loot.status();drawHeader();}
  if(target.id==='connectGame')await command('connect');
})().catch(e=>notice(String(e.message||e)));});
document.addEventListener('change',event=>{
  const t=event.target as HTMLInputElement;
  if(t.id==='profileSelect'){void load(t.value).catch(e=>notice(String(e)));return;}
  if(t.id==='factionFilter'){enemyFaction=t.value;drawSources(true);persistView();return;}
  if(t.id==='scopeFilter'){const list=filterSources(catalog,{kind:tab,scope:t.value,faction:enemyFaction});source=list.find((s:any)=>s.table===source?.table)||list[0];render();$('sourceList').scrollTop=0;window.scrollTo(0,0);return;}
  if(t.id==='itemCategory'){drawItems();return;}
  if(t.id==='profileName'){change(()=>profile.name=t.value);return;}
  if(t.id==='previewWeapon'){selectedWeapon=t.value;updatePreview();return;}
  if(t.dataset.preview){previewOptions[t.dataset.preview]=t.type==='checkbox'?t.checked:Number(t.value);updatePreview();return;}
  if(t.dataset.ammo){change(()=>{profile.ammo[t.dataset.ammo!]=t.type==='checkbox'?t.checked:t.type==='number'?Number(t.value):t.value;if(profile.ammo.mode==='fixed')profile.ammo.max=profile.ammo.min;});return;}
  if(t.dataset.model){change(()=>{profile.ammo.models=t.checked?[...new Set([...profile.ammo.models,t.dataset.model])]:profile.ammo.models.filter((id:string)=>id!==t.dataset.model);});return;}
  if(t.id==='allEnemies'){change(()=>{profile.ammo.models=t.checked?[]:[catalog.sources.find((s:any)=>s.kind==='enemy'&&s.scope==='model').id];});return;}
  if(t.dataset.nativeField||t.dataset.nativeWeight!==undefined){const slot=t.closest('[data-native]')!.getAttribute('data-native')!;change(()=>{const p=nativeEdit(slot);if(t.dataset.nativeWeight!==undefined){p.pick[Number(t.dataset.nativeWeight)].weight=Number(t.value);return;}const key=t.dataset.nativeField!,row=catalog.nativeTables[source.kind+':'+source.table].find((r:any)=>r.slot===slot);if(key==='chance'){if(t.value==='')delete p.chance;else p.chance=Number(t.value);}else{const [lo,hi]=key.startsWith('durability')?['durabilityMin','durabilityMax']:['min','max'];if(t.value===''){delete p[lo];delete p[hi];}else{const base=lo==='min'?(row.quantity||1):60;p[lo]??=base;p[hi]??=lo==='min'?base:85;p[key]=Number(t.value);}}});return;}
  if(t.dataset.field||t.dataset.weight!==undefined){const n=Number(t.closest('[data-reward]')!.getAttribute('data-reward'));change(()=>{const r=ensureOwnRule().rewards[n];if(t.dataset.weight!==undefined)r.pick[Number(t.dataset.weight)].weight=Number(t.value);else r[t.dataset.field!]=t.type==='number'||t.dataset.field==='variant'?Number(t.value):t.value;});}
});
$('sourceSearch').addEventListener('input',()=>drawSources(true));$('itemSearch').addEventListener('input',drawItems);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&($('itemDialog') as HTMLDialogElement).open){event.preventDefault();($('itemDialog') as HTMLDialogElement).close();}},true);
document.addEventListener('keydown',event=>{if(event.isComposing)return;if(event.ctrlKey&&event.key.toLowerCase()==='s'){event.preventDefault();$('save').click();return;}if(event.ctrlKey&&!['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement).tagName)){
  if(event.key.toLowerCase()==='z'){event.preventDefault();$('undo').click();}if(event.key.toLowerCase()==='y'){event.preventDefault();$('redo').click();}
  if(event.key.toLowerCase()==='s'){event.preventDefault();$('save').click();}
}});
async function init(){const data=await window.loot.bootstrap();catalog=data.catalog;icons=data.icons||{};status=data.status;sim=new Simulator(catalog);for(const i of catalog.items)itemMap.set(i.key,i);profiles=data.profiles.filter((r:any)=>r.profile).map((r:any)=>r.profile);for(const p of profiles)saved.set(p.id,JSON.stringify(p));if(!profiles.length){const example:any=newProfile('示例 · 敌人额外弹药');example.ammo.enabled=true;profiles.push(example);}profile=clone(profiles.find(p=>p.id===data.view?.profile)||original);readOnly=profile.id==='vanilla';tab=['container','enemy','ammo','profiles'].includes(data.view?.tab)?data.view.tab:'container';source=catalog.sources.find((s:any)=>s.key===data.view?.source)||catalog.sources.find((s:any)=>s.kind===(tab==='enemy'?'enemy':'container')&&s.scope==='table');($('scopeFilter') as HTMLSelectElement).value=source.scope;enemyFaction=catalog.enemyFactions.some((f:any)=>f.id===data.view?.enemyFaction)?data.view.enemyFaction:'all';document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab===tab));if(data.recovery?.dirty&&data.recovery?.profile){profile=data.recovery.profile;readOnly=false;}parent.RMHost.register('loot',{saveDraft:saveLoot,recover:recoverLoot});render();if(data.recoveryError)notice(data.recoveryError);if(data.profiles.some((p:any)=>p.broken))notice('部分方案文件无法读取，原文件已保留。可在“我的方案”中打开文件夹检查。');}
void init().catch(e=>notice('编辑器启动失败：'+e));
