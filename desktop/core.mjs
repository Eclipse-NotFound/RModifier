import {vanillaTable} from './data/vanilla.mjs';

export const VERSION = '0.2.0';
export const clone = x => JSON.parse(JSON.stringify(x));
export function fingerprint(text) {
  let h=2166136261;
  for(const b of new TextEncoder().encode(text)) {h^=b;h=(h+(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24))>>>0;}
  return 'fnv1a-'+h.toString(16).padStart(8,'0');
}
export function seeded(seed=47271) {let x=seed>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
export function newProfile(name='我的掉落方案') {
  return {schemaVersion:1,gameVersion:'1.02',id:crypto.randomUUID(),name,rules:[],ammo:{enabled:false,chance:100,mode:'pack',packPercent:50,min:6,max:12,useBase:false,includeExplosive:false,explosiveChance:25,explosiveMin:1,explosiveMax:1,models:[],weaponOverrides:[]}};
}
export function newReward(key='item:p10') {return {chance:100,min:1,max:1,repeat:1,pick:[{key,weight:1}],durabilityMin:60,durabilityMax:85,variant:0,elite:'any',minStage:0,maxStage:99};}
const allowed=(v,values,path,errors)=>{if(!values.includes(v))errors.push(path+'：不支持的选项');};
const numeric=(v,min,max,path,errors,integer=true)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))errors.push(`${path}：请输入 ${min}～${max} ${integer?'之间的整数':'之间的数字'}`);};
export function validate(p, catalog) {
  const errors=[]; const index=new Map(catalog.items.map(i=>[i.key,i]));
  if(!p||typeof p!=='object'||Array.isArray(p))return ['方案内容不是有效对象'];
  if(p.schemaVersion!==1)return ['此方案格式暂不支持，请保留原文件'];
  if(p.gameVersion!=='1.02')errors.push('此版本只支持 Remains 1.02');
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>60)errors.push('方案名需要 1～60 个字符');
  if(typeof p.id!=='string'||!/^[-\w]{1,80}$/.test(p.id))errors.push('方案标识无效');
  if(!Array.isArray(p.rules)||p.rules.length>300)return [...errors,'奖励规则最多 300 项'];
  const targets=new Set(); const validTargets=new Set(catalog.sources.map(s=>s.key));
  for(const [n,r] of p.rules.entries()) {
    const path=`第 ${n+1} 个对象`;
    if(!r||!validTargets.has(r.target)||targets.has(r.target)) {errors.push(path+'：对象不存在或重复');continue;}
    targets.add(r.target); allowed(r.mode,['append','replace'],path,errors);
    if(!Array.isArray(r.rewards)||r.rewards.length>40){errors.push(path+'：最多添加 40 条奖励');continue;}
    let stackBudget=0;
    for(const [j,v] of r.rewards.entries()) {
      const q=`${path}，奖励 ${j+1}`;
      if(!v||typeof v!=='object'){errors.push(q+'无效');continue;}
      numeric(v.chance,0,100,q+'的出现机会',errors,false);
      numeric(v.min,1,9999,q+'的最少数量',errors);numeric(v.max,1,9999,q+'的最多数量',errors);
      if(v.min>v.max)errors.push(q+'：最少数量不能大于最多数量');
      numeric(v.repeat,1,20,q+'的抽取次数',errors);
      numeric(v.durabilityMin,1,100,q+'的最低耐久',errors);numeric(v.durabilityMax,1,100,q+'的最高耐久',errors);
      if(v.durabilityMin>v.durabilityMax)errors.push(q+'：最低耐久不能大于最高耐久');
      numeric(v.variant,0,1,q+'的武器版本',errors);allowed(v.elite,['any','normal','elite'],q,errors);
      numeric(v.minStage,0,99,q+'的最早阶段',errors);numeric(v.maxStage,0,99,q+'的最晚阶段',errors);
      if(v.minStage>v.maxStage)errors.push(q+'：阶段范围颠倒');
      if(!Array.isArray(v.pick)||!v.pick.length||v.pick.length>60){errors.push(q+'：请选择 1～60 种物品');continue;}
      const seen=new Set();
      for(const c of v.pick){
        if(!c||!index.has(c.key)||seen.has(c.key)){errors.push(q+'：物品不存在或重复');continue;}
        seen.add(c.key);numeric(c.weight,1,1000,q+'的偏好倍数',errors);
        if(v.variant && !(index.get(c.key).kind==='weapon' && Number(index.get(c.key).pool?.uniq)>0))errors.push(q+'：所选物品没有可用的特殊武器版本');
      }
      stackBudget+=v.repeat*(v.pick.some(c=>['weapon','armor'].includes(index.get(c?.key)?.kind))?v.max:1);
    }
    if(stackBudget>200)errors.push(path+'：一次最多生成 200 堆物品，请减少件数或抽取次数');
  }
  const a=p.ammo;
  if(!a||typeof a!=='object')return [...errors,'缺少对应弹药设置'];
  for(const k of ['enabled','useBase','includeExplosive'])if(typeof a[k]!=='boolean')errors.push('弹药开关无效：'+k);
  allowed(a.mode,['pack','fixed','range'],'弹药数量方式',errors);
  for(const k of ['chance','explosiveChance'])numeric(a[k],0,100,'弹药出现机会',errors,false);
  numeric(a.packPercent,1,500,'常规弹药份量比例',errors);
  for(const k of ['min','max','explosiveMin','explosiveMax'])numeric(a[k],1,9999,'弹药数量',errors);
  if(a.min>a.max||a.explosiveMin>a.explosiveMax)errors.push('弹药最少数量不能大于最多数量');
  if(!Array.isArray(a.models)||a.models.length>200||a.models.some(v=>!catalog.sources.some(s=>s.kind==='enemy'&&s.scope==='model'&&s.id===v)))errors.push('适用敌人无效');
  if(!Array.isArray(a.weaponOverrides)||a.weaponOverrides.length>100)errors.push('武器弹种指定列表无效');
  else for(const v of a.weaponOverrides)if(!v||!catalog.items.some(i=>i.kind==='weapon'&&i.id===v.weapon)||index.get(v.key)?.tip!=='a')errors.push('指定的武器或弹药不存在');
  return errors;
}
export const ruleFor=(p,s)=>p.rules.find(r=>r.target===s.key)||p.rules.find(r=>r.target===`${s.kind}:table:${s.table}`);
const qty=(lo,hi,rng)=>lo+Math.floor(rng()*(hi-lo+1));
export function evaluateRewards(rewards, ctx, random, itemIndex) {
  const drops=[];
  for(const r of rewards) {
    if(ctx.stage<r.minStage||ctx.stage>r.maxStage||(r.elite==='elite'&&!ctx.hero)||(r.elite==='normal'&&ctx.hero))continue;
    for(let n=0;n<r.repeat;n++){
      if(r.chance<=0|| (r.chance<100 && random()*100>=r.chance))continue;
      let chosen=r.pick[0];
      if(r.pick.length>1){let v=random()*r.pick.reduce((s,x)=>s+x.weight,0);for(const c of r.pick){v-=c.weight;if(v<0){chosen=c;break;}}}
      const item=itemIndex.get(chosen.key);let count=qty(r.min,r.max,random);
      if(item.kind==='weapon'||item.kind==='armor'){
        for(let i=0;i<count;i++)drops.push({key:chosen.key,count:1,durability:qty(r.durabilityMin,r.durabilityMax,random)/100,variant:r.variant});
      }else drops.push({key:chosen.key,count,variant:0,durability:1});
    }
  }
  return drops;
}
export const explosiveAmmo=i=>['rocket','gren40','egg'].includes(i.base||i.id);
export function ammoDrop(a,weapon,model,itemIndex,random) {
  if(!a.enabled||!weapon||weapon.recharg||weapon.ammo==='not'||weapon.tip===1||weapon.tip===4||weapon.tip===5||(a.models.length&&!a.models.includes(model)))return null;
  const override=a.weaponOverrides.find(v=>v.weapon===weapon.id);
  let key=override?.key||'item:'+(a.useBase?(weapon.ammoBase||weapon.ammo):weapon.ammo);
  let item=itemIndex.get(key);
  if(!item||item.tip!=='a'||['recharg','not'].includes(item.id))return null;
  if(a.useBase&&item.base){key='item:'+item.base;item=itemIndex.get(key);if(!item)return null;}
  const rare=explosiveAmmo(item);
  if(rare&&!a.includeExplosive)return null;
  const chance=rare?a.explosiveChance:a.chance;
  if(chance<=0||(chance<100&&random()*100>=chance))return null;
  const count=rare?qty(a.explosiveMin,a.explosiveMax,random):a.mode==='pack'?Math.max(1,Math.floor(item.count*a.packPercent/100)):a.mode==='fixed'?a.min:qty(a.min,a.max,random);
  return {key,count,durability:1,variant:0,ammoBonus:true};
}

export class Simulator {
  constructor(catalog){this.catalog=catalog;this.items=new Map(catalog.items.map(i=>[i.key,i]));this.pools={};
    for(const i of catalog.items){
      if(i.kind==='weapon'){
        if(i.pool){this.add('weapon',i,Number(i.pool.chance)||0,Number(i.pool.stage)||0,Number(i.pool.worth));if(i.pool.uniq)this.add('uniq',i,Number(i.pool.uniq),Number(i.pool.stage)||0,Number(i.pool.worth),1);}
      }else if(i.kind==='item'){
        this.add(i.tip,i,i.chance===undefined?1:Number(i.chance),i.stage);
        if(i.tip2)this.add(i.tip2,i,Number(i.chance2??i.chance)||0,i.stage);
      }
    }
  }
  add(pool,item,weight,stage,worth,variant=0){(this.pools[pool]??=[]).push({item,weight,stage,worth,variant});}
  draw(pool,level,worth,ctx,random){
    const candidates=(this.pools[pool]||[]).filter(v=>pool==='book'||((ctx.stage<=0||v.stage<=ctx.stage)&&(level===undefined||v.item.level<=level)&&(worth===undefined||v.worth===undefined||v.worth===worth)));
    if(!candidates.length)return null;if(candidates.length===1)return candidates[0];
    let n=random()*candidates.reduce((s,v)=>s+v.weight,0);for(const v of candidates){n-=v.weight;if(n<0)return v;}return null;
  }
  accept(d,ctx,random,limits,output){
    const i=this.items.get(d.key);if(!i)return false;
    if(ctx.broken&&(i.tip==='a'||i.tip==='e')&&random()<0.5)return false;
    if(i.limit){const used=limits[i.limit]||0;const limit=ctx.lootLimit*Number(i.mlim??1);if(used>=limit||(i.maxlim!==undefined&&used>=Number(i.maxlim)))return false;limits[i.limit]=used+1;}
    if(i.id==='money')d.count=Math.trunc(d.count*ctx.capsMult*ctx.difCapsMult);
    if(i.id==='bit')d.count=Math.trunc(d.count*ctx.bitsMult*ctx.difCapsMult);
    if(ctx.broken){if(i.id==='money'||i.id==='bit')d.count=Math.trunc(d.count*0.5);d.durability*=0.4;}
    if(d.count<=0)return false;output.push(d);return true;
  }
  once(profile,source,options={},random=seeded(),limits={}){
    const ctx={stage:1,difficulty:4,weaponLevel:2,hero:0,bonus:50,broken:false,lootLimit:6,capsMult:1,bitsMult:1,difCapsMult:1,freel:false,barahlo:false,biom:0,randomLand:false,challenge:false,ownedWeapons:{},...options};
    if(source.kind==='enemy')ctx.broken=false;
    const drops=[],spawned=[];const rule=ruleFor(profile,source);const suppressed=rule?.mode==='replace';
    const emit=(chance,type,id=null,count=-1)=>{
      if(suppressed)return false;
      if(chance<1&&random()>chance)return false;
      let chosen, mult=1;
      if(type==='weapon'){
        if(Number(id)>0){chosen=this.draw(type,Math.max(1,ctx.weaponLevel+random()*2-1),Number(id),ctx,random);if(!chosen)mult*=0.5;id=chosen?.item.id;}
        if(id==null){chosen=this.draw(type,Math.max(1,ctx.weaponLevel+random()*2-1),undefined,ctx,random);if(!chosen)mult*=0.5;id=chosen?.item.id;}
        if(id==null){chosen=this.draw(type,undefined,undefined,ctx,random);id=chosen?.item.id;}
      }
      if(id==null||id===''){
        chosen=this.draw(type,Math.max(1,(type==='e'||type==='uniq'?ctx.weaponLevel:ctx.difficulty/2)+random()*2-1),undefined,ctx,random)||this.draw(type,undefined,undefined,ctx,random);
        id=chosen?.item.id;
      }
      if(!id)return false;
      const variant=id.endsWith('^1')?1:(chosen?.variant||0);id=id.replace(/\^1$/,'');
      const kind=['weapon','uniq'].includes(type)?'weapon':type==='armor'?'armor':'item';
      const item=this.items.get(kind+':'+id);if(!item)return false;
      let durability=1;count=Math.trunc(count);
      if(kind==='weapon'||kind==='armor'){
        if(type==='uniq'&&count===-1)count=1;
        if(count===0)durability=0.05+random()*0.15;else if(count===1)durability=0.6+random()*0.25;
        count=1;
      }else if(count<0)count=item.count;
      return this.accept({key:item.key,count,durability:durability*mult,variant},ctx,random,limits,drops);
    };
    const land={gameStage:ctx.stage,rnd:ctx.randomLand,act:{biom:ctx.biom},lootLimit:ctx.lootLimit};
    const loc={locDifLevel:ctx.difficulty,weaponLevel:ctx.weaponLevel,land,prob:ctx.challenge?{}:null,createUnit:id=>spawned.push(id)};
    const env={loc,broken:ctx.broken,bonus:ctx.bonus,hero:ctx.hero,world:{land,pers:{freel:ctx.freel,barahlo:ctx.barahlo},invent:{weapons:ctx.ownedWeapons}}};
    vanillaTable(source.kind,source.table,env,emit,random);
    if(rule&&!(source.table==='safe'&&spawned.length))for(const d of evaluateRewards(rule.rewards,ctx,random,this.items))this.accept(d,ctx,random,limits,drops);
    if(source.kind==='enemy'&&ctx.weapon){const extra=ammoDrop(profile.ammo,ctx.weapon,source.id,this.items,random);if(extra)this.accept(extra,{...ctx,broken:false},random,limits,drops);}
    return {drops,spawned};
  }
  sample(profile,source,options={},count=100,seed=7813){
    const random=seeded(seed), totals={},limits={};let empty=0,encounters=0;
    for(let n=0;n<count;n++){
      const r=this.once(profile,source,options,random,options.continuous?limits:{});if(!r.drops.length)empty++;if(r.spawned.length)encounters++;
      for(const d of r.drops){const k=d.key+(d.variant?'^1':'');const t=totals[k]??={key:d.key,variant:d.variant,count:0,stacks:0};t.count+=d.count;t.stacks++;}
    }
    return {runs:count,empty,encounters,items:Object.values(totals).sort((a,b)=>b.count-a.count),limits};
  }
}
