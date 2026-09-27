import {clone,newProfile,newReward,validate,ruleFor,Simulator,fingerprint,ammoDrop,seeded} from '../core.mjs';
declare global {interface Window {loot:any}}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let catalog:any,sim:any,profile:any,profiles:any[]=[],status:any,tab='container',source:any;
let icons:Record<string,string>={};
let undo:any[]=[],redo:any[]=[],saved=new Map<string,string>(),readOnly=true;
let previewOptions:any={stage:1,difficulty:4,weaponLevel:2,hero:0,bonus:50,broken:false,lootLimit:6,capsMult:1,bitsMult:1,difCapsMult:1,freel:false,barahlo:false,biom:0,randomLand:false,challenge:false,continuous:false};
let selectedWeapon='p10mm';let previewRuns=100;let picker:{reward:number,add:boolean}|null=null;
const original:any={...newProfile('原版 · 只读'),id:'vanilla'};
const itemMap=new Map<string,any>();
const glyph=(i:any)=>i?.kind==='weapon'?'⌁':i?.kind==='armor'?'♜':i?.tip==='a'?'▥':i?.tip==='med'||i?.tip==='pot'?'✚':i?.tip==='book'?'▤':i?.tip==='food'?'◒':'◇';
const itemIcon=(i:any)=>icons[i?.key]?`<img class="item-icon" src="icons/${esc(icons[i.key])}" alt="">`:`<span class="glyph" aria-hidden="true">${glyph(i)}</span>`;
const category=(i:any)=>i?.kind==='weapon'?'武器':i?.kind==='armor'?'护甲':({a:'弹药',e:'爆炸物',med:'医疗',pot:'药剂',food:'食物',eda:'食物',book:'书籍',him:'药物',scheme:'配方',art:'饰品',impl:'植入物',spec:'特殊物品',instr:'工具',stuff:'杂物'} as any)[i?.tip]||(String(i?.tip).startsWith('comp')?'材料':'物品');
const unit=(i:any)=>i?.kind==='weapon'?'把':i?.kind==='armor'?'件':i?.tip==='a'?'发':'个';
function notice(message:string,success=false){$('notice').textContent=message;$('notice').className=success?'success':'';}
function dirty(){return !readOnly&&saved.get(profile.id)!==JSON.stringify(profile);}
function record(){undo.push(clone(profile));if(undo.length>80)undo.shift();redo=[];}
function change(fn:()=>void){if(readOnly)return;record();fn();render();}
async function beforeLeave(){return !dirty()||await window.loot.confirm({message:'当前方案还没有保存',detail:'切换后将放弃未保存的改动。也可以继续编辑，先点击“保存方案”。'});}
function sourceLabel(s:any){return s.name===s.id?(s.kind==='enemy'?'敌人奖励':'容器奖励')+' · '+s.id:s.name;}
function drawHeader(){
  const list=[original,...profiles];if(!list.some(p=>p.id===profile.id))list.push(profile);
  $('profileSelect').innerHTML=list.map(p=>`<option value="${esc(p.id)}" ${p.id===profile.id?'selected':''}>${esc(p.name)}</option>`).join('');
  $('dirtyLabel').textContent=readOnly?'只读':dirty()?'未保存':'已保存';
  ($('undo') as HTMLButtonElement).disabled=readOnly||!undo.length;($('redo') as HTMLButtonElement).disabled=readOnly||!redo.length;
  ($('save') as HTMLButtonElement).disabled=readOnly;($('apply') as HTMLButtonElement).disabled=readOnly;
  window.loot.dirty(dirty());
  const s=status;
  $('gameStatus').className=s.receiptFresh?'status-ready':'';
  $('gameStatus').textContent=s.receiptFresh?`✓ 游戏在最近一次启动中已读取「${s.receipt.profileName}」${s.receipt.enabled?'':'（本次运行已暂停）'}`:s.activeHash?(s.runtimePresent&&s.listed?'方案已应用 · 等待游戏重启读取':'方案已应用 · 游戏读取模块尚未安装'):'尚未应用方案 · 保存只保留草稿';
  if(s.test)$('gameStatus').textContent+=' · 隔离测试目录';
  if(s.receiptRecent&&s.receipt?.error)$('gameStatus').textContent=`游戏拒绝了当前连接或配置，保留「${s.receipt.profileName}」。请检查应用方案；错误记录保留在游戏日志中。`;
  $('gameStatus').title=s.gameRoot;
  $('connectGame').textContent=s.installation?.connected?'连接已安装':'连接游戏';
  ($('connectGame') as HTMLButtonElement).disabled=!!s.installation?.connected||!s.installation?.available;
}
function drawSources(){
  const visible=tab==='container'||tab==='enemy';$('sources').hidden=!visible;$('preview').hidden=tab==='profiles';
  $('workspace').classList.toggle('no-sources',!visible);
  if(!visible)return;
  $('sourceTitle').textContent=tab==='container'?'选择容器':'选择敌人';
  const query=($('sourceSearch') as HTMLInputElement).value.trim().toLowerCase();const scope=($('scopeFilter') as HTMLSelectElement).value;
  const list=catalog.sources.filter((s:any)=>s.kind===tab&&s.scope===scope&&(!query||(s.name+' '+s.id).toLowerCase().includes(query)));
  $('sourceCount').textContent=`${list.length} 类`;
  $('sourceList').innerHTML=list.length?list.map((s:any)=>`<button class="source-row ${source?.key===s.key?'active':''}" data-source="${esc(s.key)}"><span class="glyph">${tab==='container'?'▣':'♟'}</span><span>${esc(sourceLabel(s))}<small class="sub">${s.scope==='table'?'共享奖励':'单独型号'}</small></span>${ruleFor(profile,s)?'<span class="dot" title="有自定义奖励">●</span>':''}</button>`).join(''):'<p class="empty">没有找到匹配对象。<br>试试更短的名称。</p>';
}
function selectionRule(){return source&&ruleFor(profile,source);}
function ensureOwnRule(){let r=profile.rules.find((r:any)=>r.target===source.key);if(!r){r={target:source.key,mode:selectionRule()?.mode||'append',rewards:clone(selectionRule()?.rewards||[])};profile.rules.push(r);}return r;}
function field(label:string,key:string,value:any,min=0,max=9999,extra=''){return `<label class="field">${label}<div class="input-unit"><input type="number" data-field="${esc(key)}" value="${value}" min="${min}" max="${max}" step="1" ${readOnly?'disabled':''}>${extra}</div></label>`;}
function rewardHTML(r:any,n:number){
  const first=itemMap.get(r.pick[0]?.key);const multiple=r.pick.length>1;const equipment=r.pick.some((v:any)=>['weapon','armor'].includes(itemMap.get(v.key)?.kind));
  return `<article class="reward-card" data-reward="${n}"><div class="reward-title">${itemIcon(first)}<strong>${multiple?`从 ${r.pick.length} 种物品中抽 1 种`:esc(first?.name||'选择物品')}</strong><button class="choose" data-action="choose" ${readOnly?'disabled':''}>更换物品</button><button data-action="remove" aria-label="删除奖励 ${n+1}" ${readOnly?'disabled':''}>✕</button></div><div class="fields">${field('出现机会','chance',r.chance,0,100,'%')}${field('最少数量','min',r.min,1,9999,unit(first))}${field('最多数量','max',r.max,1,9999,unit(first))}</div><p class="explain">${r.chance===100?'每次都会尝试发放':r.chance===0?'这一条已关闭':`每次有 ${r.chance}% 的机会`}，${r.min===r.max?`得到 ${r.min} ${unit(first)}`:`数量在 ${r.min}～${r.max} ${unit(first)}之间随机`}。${r.repeat>1?`独立抽取 ${r.repeat} 次。`:''}可与其他奖励同时出现，沿用原版配额和损坏损失。</p>
  <details><summary>详细设置 · 抽取次数、候选物品${equipment?'、武器耐久':''}与条件</summary><div class="fields">${field('独立抽取次数','repeat',r.repeat,1,20)}<label class="field">敌人类型<select data-field="elite" ${readOnly?'disabled':''}><option value="any" ${r.elite==='any'?'selected':''}>普通和精英</option><option value="normal" ${r.elite==='normal'?'selected':''}>仅普通</option><option value="elite" ${r.elite==='elite'?'selected':''}>仅精英</option></select></label>${field('最早游戏阶段','minStage',r.minStage,0,99)}${field('最晚游戏阶段','maxStage',r.maxStage,0,99)}${equipment?`${field('最低耐久','durabilityMin',r.durabilityMin,1,100,'%')}${field('最高耐久','durabilityMax',r.durabilityMax,1,100,'%')}<label class="field">武器版本<select data-field="variant"><option value="0" ${r.variant===0?'selected':''}>普通版本</option><option value="1" ${r.variant===1?'selected':''}>特殊版本（如有）</option></select></label>`:''}</div>
  <p class="explain">加入候选后，每次只从下面选 1 种。偏好倍数越大，越容易抽到。</p>${r.pick.map((c:any,j:number)=>`<div class="pool-choice"><span>${esc(itemMap.get(c.key)?.name)} <small>约 ${Math.round(c.weight/r.pick.reduce((a:number,b:any)=>a+b.weight,0)*100)}%</small></span><input type="number" min="1" max="1000" data-weight="${j}" value="${c.weight}" aria-label="${esc(itemMap.get(c.key)?.name)}的偏好倍数"><button data-choice-remove="${j}" ${r.pick.length===1?'disabled':''} aria-label="移除此候选">✕</button></div>`).join('')}<button data-action="add-choice" class="quiet">＋ 加入候选物品</button></details></article>`;
}
function drawEditor(){
  if(tab==='ammo'){drawAmmo();return;}if(tab==='profiles'){drawProfiles();return;}
  if(!source){$('editor').innerHTML='<p class="empty">从左侧选择要修改的对象。</p>';return;}
  const r=selectionRule();const own=profile.rules.find((v:any)=>v.target===source.key);const affected=catalog.sources.filter((s:any)=>s.kind===source.kind&&s.table===source.table&&s.scope==='model');
  $('editor').innerHTML=`<div class="eyebrow">${tab==='container'?'探索奖励 / 容器':'战斗奖励 / 敌人'}</div><div class="object-head"><span class="glyph">${tab==='container'?'▣':'♟'}</span><div><h1>${esc(sourceLabel(source))}</h1><p class="muted">${source.scope==='table'?'编辑共享普通奖励。使用这张表的对象都会受到影响。':'只影响这一型号；其他型号继续使用各自的规则。'}</p></div></div>
  ${readOnly?'<div class="read-only"><h2>从原版开始，做一份自己的方案</h2><p class="muted">复制后就能调整物品、数量与出现机会。原版始终保留，可随时恢复。</p><button class="primary" data-command="copy">复制原版，开始编辑</button></div>':''}
  <div class="scope-note"><strong>影响范围</strong>　${source.scope==='model'?esc(sourceLabel(source)):(affected.length?affected.slice(0,8).map((s:any)=>esc(sourceLabel(s))).join('、')+(affected.length>8?` 等 ${affected.length} 个型号`:''):'所有采用这类内容的容器或掉落入口')}。${r&&!own?' 当前继承共享奖励设置。':''}<br>任务指定道具、死亡脚本和原有掉枪继续由游戏处理。</div>
  <div class="mode-row"><button data-mode="vanilla" class="${!own?'active':''}" ${readOnly?'disabled':''}>${source.scope==='model'?'继承整类设置':'使用原版'}</button><button data-mode="append" class="${own?.mode==='append'?'active':''}" ${readOnly?'disabled':''}>原版之外再增加</button><button data-mode="replace" class="${own?.mode==='replace'?'active':''}" ${readOnly?'disabled':''}>自定普通奖励</button></div>
  ${r?`<div class="section-head"><h2>${r.mode==='append'?'额外奖励':'自定义普通奖励'}</h2><button data-command="reset-source">恢复本项</button></div>${r.rewards.map(rewardHTML).join('')}${!r.rewards.length?'<p class="empty">目前没有奖励。选择“自定普通奖励”时，<br>空列表表示不发放普通物品。</p>':''}<button class="add-reward" data-command="add-reward">＋ 添加一条奖励</button>`:'<div class="panel"><h2>原版规则已保留</h2><p class="muted">游戏会依照原有顺序判断概率、地区进度与可获得额度；部分奖励只在上一项没有出现时继续尝试。</p><p class="muted">右侧可以试抽原版结果。选择“再增加”保留这些规则，选择“自定”更换普通物品奖励。</p></div>'}
  ${['safe','trash','fridge','food','bloat'].includes(source.table)?'<div class="tip">这个容器可能生成敌人，原有行为继续保留。保险箱生成敌人的那一次不会发放自定义普通奖励。</div>':''}`;
}
function drawAmmo(){
  const a=profile.ammo;
  $('editor').innerHTML=`<div class="eyebrow">额外补给 / 对应主武器</div><h1>敌人用什么，就掉什么弹药</h1><p class="muted">敌人真正被击败后，按它死亡前使用的主武器识别弹种。</p>${readOnly?'<div class="read-only"><p>原版未启用此功能。复制方案即可打开。</p><button class="primary" data-command="copy">复制原版，开始编辑</button></div>':''}
  <label class="toggle-row"><div><strong>额外掉落对应弹药</strong><p>保留原随机弹药和拾枪附赠弹药，增加一份额外补给。</p></div><input type="checkbox" data-ammo="enabled" ${a.enabled?'checked':''} ${readOnly?'disabled':''}></label>
  <div class="panel"><h2>普通弹药</h2><div class="fields"><label class="field">出现机会（%）<input type="number" data-ammo="chance" min="0" max="100" value="${a.chance}" ${readOnly?'disabled':''}></label><label class="field">数量方式<select data-ammo="mode" ${readOnly?'disabled':''}><option value="pack" ${a.mode==='pack'?'selected':''}>按弹种常规份量</option><option value="fixed" ${a.mode==='fixed'?'selected':''}>固定数量</option><option value="range" ${a.mode==='range'?'selected':''}>随机范围</option></select></label>${a.mode==='pack'?`<label class="field">常规一份的百分比（%）<input type="number" data-ammo="packPercent" min="1" max="500" value="${a.packPercent}" ${readOnly?'disabled':''}></label>`:`<label class="field">${a.mode==='fixed'?'固定发数':'最少发数'}<input type="number" data-ammo="min" min="1" max="9999" value="${a.min}" ${readOnly?'disabled':''}></label>${a.mode==='range'?`<label class="field">最多发数<input type="number" data-ammo="max" min="1" max="9999" value="${a.max}" ${readOnly?'disabled':''}></label>`:''}`}</div><p class="explain">按常规份量的 50%：10mm 通常 6 发，普通电池 10 发，火花电池 25 发。数量向下取整，至少 1 发。</p><label class="inline-check"><input type="checkbox" data-ammo="useBase" ${a.useBase?'checked':''} ${readOnly?'disabled':''}> 将特殊弹种换成对应的基础弹种</label></div>
  <div class="panel"><label class="inline-check"><input type="checkbox" data-ammo="includeExplosive" ${a.includeExplosive?'checked':''} ${readOnly?'disabled':''}><strong>同时增加火箭等稀有爆炸弹药</strong></label><p class="muted">单独控制它们的机会与数量，避免普通弹药调整产生过多重型弹药。</p><div class="fields"><label class="field">爆炸弹药出现机会（%）<input type="number" data-ammo="explosiveChance" min="0" max="100" value="${a.explosiveChance}" ${readOnly?'disabled':''}></label><label class="field">最少发数<input type="number" data-ammo="explosiveMin" min="1" max="9999" value="${a.explosiveMin}" ${readOnly?'disabled':''}></label><label class="field">最多发数<input type="number" data-ammo="explosiveMax" min="1" max="9999" value="${a.explosiveMax}" ${readOnly?'disabled':''}></label></div></div>
  <details class="panel"><summary>适用范围</summary><p class="muted">默认适用于所有敌对持枪单位。只勾选特定型号时，其他敌人不发放额外弹药。</p><label class="inline-check"><input type="checkbox" id="allEnemies" ${!a.models.length?'checked':''} ${readOnly?'disabled':''}>全部敌对持枪单位</label><div class="model-checks">${catalog.sources.filter((s:any)=>s.kind==='enemy'&&s.scope==='model').map((s:any)=>`<label class="inline-check"><input type="checkbox" data-model="${esc(s.id)}" ${a.models.includes(s.id)?'checked':''} ${readOnly?'disabled':''}>${esc(sourceLabel(s))}</label>`).join('')}</div></details>
  <div class="tip">徒手、近战、投掷手雷、自动充能以及没有可识别弹药的机器人专用武器会跳过。可复活敌人普通倒地不发放；最终结算只发一次。敌人是否掉枪不影响对应子弹。</div>`;
}
function drawProfiles(){
  $('editor').innerHTML=`<div class="eyebrow">保存与切换 / 我的方案</div><h1>把喜欢的掉落方式留下来</h1><p class="muted">保存用于继续编辑；应用后，下次启动游戏读取这份方案。</p><div class="panel"><label class="field">当前方案名称<input id="profileName" type="text" maxlength="60" value="${esc(profile.name)}" ${readOnly?'disabled':''}></label><div class="steps"><span>① 编辑与预览</span><span>② 保存方案</span><span>③ 应用并重启游戏</span></div><div class="profile-actions"><button class="primary" data-command="copy">复制当前方案</button><button data-command="import">导入方案</button><button data-command="export">导出当前方案</button><button data-command="reset-all" ${readOnly?'disabled':''}>恢复全部原版</button><button data-command="folder">打开方案文件夹</button></div></div><div class="panel">${[original,...profiles].map(p=>`<div class="profile-card"><span class="glyph">▤</span><div><strong>${esc(p.name)}</strong><p>${p.id==='vanilla'?'原版奖励永久保留':`${p.rules.length} 个自定义对象 · 对应弹药${p.ammo.enabled?'已开启':'未开启'}`}</p></div><button data-load="${esc(p.id)}">${p.id===profile.id?'当前方案':'打开'}</button></div>`).join('')}</div><div class="tip">读取模块通过已有 ModLoader 加载。初次连接需要安装经过验证的掉落接口；之后修改方案只更新配置。底部状态以游戏实际读取回执为准。</div>`;
  $('editor').insertAdjacentHTML('beforeend',`<div class="panel"><h2>方案回退</h2><p class="muted">每次应用都会保留上一份配置。打开后可以先查看，再决定是否重新应用。</p><button data-command="previous" ${!status.hasPrevious?'disabled':''}>打开上次应用方案</button></div><div class="panel"><h2>游戏连接</h2><p class="muted">${status.installation?.connected?'连接已安装，日常调整只需应用方案并重启游戏。':status.installation?.compatible?'这份游戏与已验证版本一致，可以通过已有 ModLoader 连接。':'游戏文件需要与安装包的已验证版本一致；版本变化时会停止安装。'}</p><div class="profile-actions"><button data-command="connect" ${!status.installation?.available||status.installation?.connected?'disabled':''}>备份并连接游戏</button><button data-command="restore-game" ${!status.installation?.canRestore?'disabled':''}>恢复连接前的游戏</button></div></div>`);
}
function weaponSelect(){return `<label class="field">模拟敌人的主武器<select id="previewWeapon"><option value="">无可识别枪械</option>${catalog.items.filter((i:any)=>i.kind==='weapon'&&i.ammo).map((i:any)=>`<option value="${esc(i.id)}" ${i.id===selectedWeapon?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label>`;}
function drawPreview(){
  if(tab==='profiles')return;
  const ctx=previewOptions;
  $('preview').innerHTML=`<div class="section-head"><h2>掉落预览</h2><span class="tag">虚拟试抽</span></div><p class="muted">使用下面的示例条件，不读取真实人物或存档。</p>${tab==='ammo'?weaponSelect():`<div class="fields"><label class="field">游戏阶段<input type="number" data-preview="stage" min="0" max="10" value="${ctx.stage}"></label><label class="field">地区难度<input type="number" data-preview="difficulty" min="1" max="50" value="${ctx.difficulty}"></label><label class="field">武器等级<input type="number" data-preview="weaponLevel" min="1" max="30" value="${ctx.weaponLevel}"></label><label class="field">可获得额度<input type="number" data-preview="lootLimit" min="0" max="100" value="${ctx.lootLimit}"></label></div>${tab==='enemy'?`<label class="inline-check"><input type="checkbox" data-preview="hero" ${ctx.hero?'checked':''}>精英敌人</label>${weaponSelect()}`:`<label class="inline-check"><input type="checkbox" data-preview="broken" ${ctx.broken?'checked':''}>容器已损坏</label>`}<details><summary>更多模拟条件</summary><div class="fields"><label class="field">保险箱奖励参数<input type="number" data-preview="bonus" min="0" max="500" value="${ctx.bonus}"></label><label class="field">瓶盖收益倍数<input type="number" data-preview="capsMult" min="0" max="10" step="0.1" value="${ctx.capsMult}"></label><label class="field">马蹄币收益倍数<input type="number" data-preview="bitsMult" min="0" max="10" step="0.1" value="${ctx.bitsMult}"></label></div>${[['randomLand','随机地区'],['challenge','挑战房间'],['freel','额外弹药能力'],['barahlo','额外材料能力'],['continuous','连续搜刮，额度累积消耗']].map(([key,label])=>`<label class="inline-check"><input type="checkbox" data-preview="${key}" ${ctx[key]?'checked':''}>${label}</label>`).join('')}</details>`}<div class="preview-actions"><button data-sample="1">试 1 次</button><button data-sample="100">试 100 次</button><button data-sample="1000">试 1000 次</button></div><div id="results"></div><p class="muted">显示地面物品。拾枪附赠弹药、重复武器修理和地图指定奖励未计入；实际随机结果会波动。</p>`;
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
      $('results').innerHTML=`<div class="stat-grid"><div class="stat"><b>${previewRuns}</b>模拟击败次数</div><div class="stat"><b>${Math.round((previewRuns-empty)/previewRuns*100)}%</b>出现额外弹药</div></div>${Object.entries(totals).map(([key,n]:any)=>`<div class="result-row"><span>${esc(itemMap.get(key)?.name)}</span><b>平均 ${(n/previewRuns).toFixed(2)} 发</b></div>`).join('')||'<p class="empty">此设置下没有额外弹药。<br>检查功能开关、武器和爆炸弹药选项。</p>'}<p class="explain">这里只统计额外弹药贡献。使用所选武器和适用型号示例；实际敌人按死亡前的武器判断。</p>`;return;
    }
    if(!source)return;
    const current=sim.sample(profile,source,ctx,previewRuns,48131),base=sim.sample(original,source,ctx,previewRuns,48131);
    const sum=(r:any)=>r.items.reduce((s:number,x:any)=>s+x.count,0)/r.runs;
    $('results').innerHTML=`<div class="stat-grid"><div class="stat"><b>${Math.round(current.empty/current.runs*100)}%</b>未生成物品</div><div class="stat"><b>${sum(current).toFixed(1)}</b>平均物品总数</div></div><p class="explain">原版：空奖励 ${Math.round(base.empty/base.runs*100)}%，平均 ${sum(base).toFixed(1)} 个。已试抽 ${current.runs} 次。${current.encounters?`其中 ${current.encounters} 次生成敌人。`:''}</p>${current.items.slice(0,30).map((t:any)=>`<div class="result-row"><span>${esc(itemMap.get(t.key)?.name)}${t.variant?' · 特殊版':''}</span><b>${previewRuns===1?t.count+' '+unit(itemMap.get(t.key)):'平均 '+(t.count/current.runs).toFixed(2)}</b></div>`).join('')||'<p class="empty">这次没有生成普通物品。</p>'}${current.items.length>30?`<p class="explain">共 ${current.items.length} 种，显示数量最多的 30 种。</p>`:''}`;
  }catch(e){$('results').textContent='此场景暂时无法预览：'+e;}
}
function render(){drawHeader();drawSources();drawEditor();drawPreview();void window.loot.view({profile:profile.id,tab,source:source?.key}).catch((e:any)=>notice('无法记住编辑位置：'+e.message));}
function pickItems(reward:number,add=false){picker={reward,add};($('itemSearch') as HTMLInputElement).value='';($('itemCategory') as HTMLSelectElement).value='all';drawItems();($('itemDialog') as HTMLDialogElement).showModal();($('itemSearch') as HTMLInputElement).focus();}
function drawItems(){const query=($('itemSearch') as HTMLInputElement).value.trim().toLowerCase(),cat=($('itemCategory') as HTMLSelectElement).value;const list=catalog.items.filter((i:any)=>(!query||(i.name+' '+i.id).toLowerCase().includes(query))&&(cat==='all'||i.kind===cat||i.tip===cat||(cat==='materials'&&i.tip.startsWith('comp'))));
  $('itemList').innerHTML=list.slice(0,160).map((i:any)=>`<button class="item-option" data-item="${esc(i.key)}">${itemIcon(i)}<div><strong>${esc(i.name)}</strong><small>${category(i)} · ${i.kind==='weapon'||i.kind==='armor'?'逐件掉落':`常规一份 ${i.count} ${unit(i)}`}</small></div></button>`).join('')+(list.length>160?'<p class="empty">继续输入名称可以缩小结果。</p>':'');
}
async function load(id:string){if(id===profile.id)return;if(!await beforeLeave())return;const p=id==='vanilla'?original:profiles.find(p=>p.id===id);if(!p)return;profile=clone(p);readOnly=id==='vanilla';undo=[];redo=[];notice('');render();}
async function command(c:string){
  if(c==='copy'){const next=clone(profile);next.id=crypto.randomUUID();next.name=readOnly?'我的掉落方案':profile.name+' · 副本';profile=next;readOnly=false;undo=[];redo=[];profiles.push(clone(next));notice('已创建独立副本，可以开始编辑。',true);render();}
  if(c==='add-reward')change(()=>ensureOwnRule().rewards.push(newReward()));
  if(c==='reset-source'){if(await window.loot.confirm({message:'恢复此对象的原有奖励？',detail:'删除这一对象的自定义设置；如果整类奖励已被修改，这一型号会重新继承整类设置。'}))change(()=>profile.rules=profile.rules.filter((r:any)=>r.target!==source.key));}
  if(c==='reset-all'){if(await window.loot.confirm({message:'恢复当前方案的全部原版设置？',detail:`将移除 ${profile.rules.length} 个自定义对象并关闭对应弹药。应用前不会影响游戏，编辑后可以撤销。`}))change(()=>{profile.rules=[];profile.ammo=clone(original.ammo);});}
  if(c==='import'){if(!await beforeLeave())return;const p=await window.loot.import();if(p){profiles.push(p);saved.set(p.id,JSON.stringify(p));profile=clone(p);readOnly=false;undo=[];redo=[];render();notice('方案已导入。应用后下次启动游戏生效。',true);}}
  if(c==='export'){if(await window.loot.export(profile))notice('方案已导出。',true);}
  if(c==='folder')await window.loot.openFolder();
  if(c==='previous'){if(!await beforeLeave())return;const p=await window.loot.previous();profiles.push(p);saved.set(p.id,JSON.stringify(p));profile=clone(p);readOnly=false;undo=[];redo=[];render();notice('已打开上次应用的方案副本。检查后点击“应用方案”才会替换当前配置。',true);}
  if(c==='connect'||c==='restore-game'){const result=await window.loot[c==='connect'?'install':'restoreGame']();if(result){status=result;render();notice(c==='connect'?'连接已安装。应用所选方案，再重新启动游戏。':'已恢复连接前的游戏；方案仍然保留。',true);}}
}
document.addEventListener('click',event=>{void (async()=>{
  const target=(event.target as HTMLElement).closest<HTMLElement>('button');if(!target||target.hasAttribute('disabled'))return;
  if(target.dataset.tab){tab=target.dataset.tab;$('sourceSearch').querySelector('input');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab===tab));if(source?.kind!==tab&&['container','enemy'].includes(tab)){source=catalog.sources.find((s:any)=>s.kind===tab&&s.scope===($('scopeFilter') as HTMLSelectElement).value);}render();}
  if(target.dataset.source){source=catalog.sources.find((s:any)=>s.key===target.dataset.source);render();}
  if(target.dataset.command)await command(target.dataset.command);
  if(target.dataset.load)await load(target.dataset.load);
  if(target.dataset.mode){const mode=target.dataset.mode;change(()=>{if(mode==='vanilla')profile.rules=profile.rules.filter((r:any)=>r.target!==source.key);else ensureOwnRule().mode=mode;});}
  if(target.dataset.sample){previewRuns=Number(target.dataset.sample);updatePreview();}
  const n=Number(target.closest('[data-reward]')?.getAttribute('data-reward'));
  if(target.dataset.action==='choose')pickItems(n);
  if(target.dataset.action==='add-choice')pickItems(n,true);
  if(target.dataset.action==='remove')change(()=>ensureOwnRule().rewards.splice(n,1));
  if(target.dataset.choiceRemove!==undefined)change(()=>ensureOwnRule().rewards[n].pick.splice(Number(target.dataset.choiceRemove),1));
  if(target.dataset.item&&picker){const {reward,add}=picker;const key=target.dataset.item;change(()=>{const r=ensureOwnRule().rewards[reward];if(add){if(!r.pick.some((c:any)=>c.key===key))r.pick.push({key,weight:1});}else{r.pick=[{key,weight:1}];r.variant=0;r.min=r.max=itemMap.get(key).kind==='item'?itemMap.get(key).count:1;}});($('itemDialog') as HTMLDialogElement).close();}
  if(target.id==='closeItems')($('itemDialog') as HTMLDialogElement).close();
  if(target.id==='undo'&&undo.length){redo.push(clone(profile));profile=undo.pop();render();}
  if(target.id==='redo'&&redo.length){undo.push(clone(profile));profile=redo.pop();render();}
  if(target.id==='save'||target.id==='apply'){
    const errors=validate(profile,catalog);if(errors.length){notice(errors.join('\n'));return;}
    status=await window.loot[target.id](profile);saved.set(profile.id,JSON.stringify(profile));const i=profiles.findIndex(p=>p.id===profile.id);if(i<0)profiles.push(clone(profile));else profiles[i]=clone(profile);render();notice(target.id==='save'?'方案已保存。点击“应用方案”后，游戏下次启动读取。':'方案已应用。'+(status.runtimePresent&&status.listed?'请保存退出游戏并重新启动。':'还需安装游戏读取模块，当前游戏尚未改变掉落。'),true);
  }
  if(target.id==='chooseGame'){if(!await beforeLeave())return;const result=await window.loot.pickGame();if(result){status=result.status;profiles=result.profiles.filter((p:any)=>p.profile).map((p:any)=>p.profile);for(const p of profiles)saved.set(p.id,JSON.stringify(p));profile=clone(original);readOnly=true;render();notice('已选择游戏位置。',true);}}
  if(target.id==='refreshStatus'){status=await window.loot.status();drawHeader();}
  if(target.id==='connectGame')await command('connect');
})().catch(e=>notice(String(e.message||e)));});
document.addEventListener('change',event=>{
  const t=event.target as HTMLInputElement;
  if(t.id==='profileSelect'){void load(t.value).catch(e=>notice(String(e)));return;}
  if(t.id==='scopeFilter'){source=catalog.sources.find((s:any)=>s.kind===tab&&s.scope===t.value);render();return;}
  if(t.id==='itemCategory'){drawItems();return;}
  if(t.id==='profileName'){change(()=>profile.name=t.value);return;}
  if(t.id==='previewWeapon'){selectedWeapon=t.value;updatePreview();return;}
  if(t.dataset.preview){previewOptions[t.dataset.preview]=t.type==='checkbox'?t.checked:Number(t.value);updatePreview();return;}
  if(t.dataset.ammo){change(()=>{profile.ammo[t.dataset.ammo!]=t.type==='checkbox'?t.checked:t.type==='number'?Number(t.value):t.value;if(profile.ammo.mode==='fixed')profile.ammo.max=profile.ammo.min;});return;}
  if(t.dataset.model){change(()=>{profile.ammo.models=t.checked?[...new Set([...profile.ammo.models,t.dataset.model])]:profile.ammo.models.filter((id:string)=>id!==t.dataset.model);});return;}
  if(t.id==='allEnemies'){change(()=>{profile.ammo.models=t.checked?[]:[catalog.sources.find((s:any)=>s.kind==='enemy'&&s.scope==='model').id];});return;}
  if(t.dataset.field||t.dataset.weight!==undefined){const n=Number(t.closest('[data-reward]')!.getAttribute('data-reward'));change(()=>{const r=ensureOwnRule().rewards[n];if(t.dataset.weight!==undefined)r.pick[Number(t.dataset.weight)].weight=Number(t.value);else r[t.dataset.field!]=t.type==='number'||t.dataset.field==='variant'?Number(t.value):t.value;});}
});
$('sourceSearch').addEventListener('input',drawSources);$('itemSearch').addEventListener('input',drawItems);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&($('itemDialog') as HTMLDialogElement).open){event.preventDefault();($('itemDialog') as HTMLDialogElement).close();}},true);
document.addEventListener('keydown',event=>{if(event.ctrlKey&&!['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement).tagName)){
  if(event.key.toLowerCase()==='z'){event.preventDefault();$('undo').click();}if(event.key.toLowerCase()==='y'){event.preventDefault();$('redo').click();}
  if(event.key.toLowerCase()==='s'){event.preventDefault();$('save').click();}
}});
async function init(){const data=await window.loot.bootstrap();catalog=data.catalog;icons=data.icons||{};status=data.status;sim=new Simulator(catalog);for(const i of catalog.items)itemMap.set(i.key,i);profiles=data.profiles.filter((r:any)=>r.profile).map((r:any)=>r.profile);for(const p of profiles)saved.set(p.id,JSON.stringify(p));if(!profiles.length){const example:any=newProfile('示例 · 敌人额外弹药');example.ammo.enabled=true;profiles.push(example);}profile=clone(profiles.find(p=>p.id===data.view?.profile)||original);readOnly=profile.id==='vanilla';tab=['container','enemy','ammo','profiles'].includes(data.view?.tab)?data.view.tab:'container';source=catalog.sources.find((s:any)=>s.key===data.view?.source)||catalog.sources.find((s:any)=>s.kind===(tab==='enemy'?'enemy':'container')&&s.scope==='table');($('scopeFilter') as HTMLSelectElement).value=source.scope;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab===tab));render();if(data.profiles.some((p:any)=>p.broken))notice('部分方案文件无法读取，原文件已保留。可在“我的方案”中打开文件夹检查。');}
void init().catch(e=>notice('编辑器启动失败：'+e));
