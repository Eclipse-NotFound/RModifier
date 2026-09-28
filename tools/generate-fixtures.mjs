import fs from 'node:fs';import {newProfile,newReward,evaluateRewards,ammoDrop,seeded,validate,fingerprint,clone} from '../desktop/core.mjs';
const c=JSON.parse(fs.readFileSync('desktop/data/catalog.json')),map=new Map(c.items.map(i=>[i.key,i]));
const p=newProfile('隔离验证');p.id='test-profile';p.ammo.enabled=true;
p.rules=[{target:'container:table:ammo',mode:'replace',rewards:[{...newReward(),min:13,max:13}]},{target:'container:model:ammobox',mode:'replace',rewards:[{...newReward(),min:17,max:17}]},{target:'enemy:table:raider',mode:'replace',rewards:[]},{target:'enemy:table:ranger1',mode:'replace',rewards:[]}];
const cases=[];
for(let n=0;n<40;n++){const r={...newReward(),chance:n%4===0?0:n%4===1?100:35,min:1,max:7,repeat:4,pick:[{key:'item:p10',weight:1},{key:'item:p9',weight:3}],elite:n%3===0?'elite':'any',minStage:n%5};const ctx={stage:3,hero:n%2};cases.push({kind:'rewards',rewards:[r],ctx,seed:478+n,expected:evaluateRewards([r],ctx,seeded(478+n),map)});}
const wr={...newReward('weapon:p10mm'),min:2,max:2,durabilityMin:37,durabilityMax:82};cases.push({kind:'rewards',rewards:[wr],ctx:{stage:1,hero:0},seed:719,expected:evaluateRewards([wr],{stage:1,hero:0},seeded(719),map)});
for(const ammo of ['p10','p10_1','batt','energ','p5','rocket','gren40','gren40_8','gren40_9','egg','recharg','not','undefined'])for(const base of [false,true])for(const rare of [false,true]){const a={...p.ammo,useBase:base,includeExplosive:rare,explosiveChance:100};const w={id:'example',tip:2,ammo,ammoBase:ammo.split('_')[0]};cases.push({kind:'ammo',a,weapon:w,seed:431,expected:ammoDrop(a,w,'',map,seeded(431))});}
const validation=[{profile:p,valid:true}];for(const mutate of [p=>p.schemaVersion=7,p=>p.ammo.min=-1,p=>p.rules[0].rewards[0].pick[0].key='item:missing',p=>p.rules[0].rewards[0].chance=101,p=>p.rules[0].target='container:table:missing',p=>p.ammo.models=['missing']]){const v=clone(p);mutate(v);validation.push({profile:v,valid:validate(v,c).length===0});}
const upgrades=[newReward('weapon:rail^1'),newReward('weapon:mont^1'),{...newReward('weapon:rail'),variant:1},
  {...newReward(),pick:[{key:'weapon:rail',weight:3},{key:'weapon:rail^1',weight:1}],repeat:20},
  {...newReward('weapon:rail^1'),chance:0},{...newReward('weapon:rail^1'),chance:37,repeat:20}];
for(const r of upgrades){
  const ctx={stage:1,hero:0};cases.push({kind:'rewards',rewards:[r],ctx,seed:719,expected:evaluateRewards([r],ctx,seeded(719),map)});
  const v=clone(p);v.rules[0].rewards=[r];validation.push({profile:v,valid:true});
}
for(const r of [newReward('weapon:bat^1'),{...newReward('weapon:bat'),variant:1},{...newReward('weapon:rail'),variant:1,pick:[{key:'weapon:rail',weight:1},{key:'weapon:rail^1',weight:1}]}]){
  const v=clone(p);v.rules[0].rewards=[r];validation.push({profile:v,valid:false});
}
p.rules.push({target:'container:table:wbig',mode:'replace',rewards:[newReward('weapon:rail'),newReward('weapon:rail^1'),{...newReward('weapon:mont^1'),chance:0}]});
p.rules.push({target:'enemy:model:ranger1',mode:'replace',rewards:[newReward('weapon:rail^1')]});
fs.mkdirSync('build/out/fixtures',{recursive:true});fs.writeFileSync('build/out/fixtures/profile.json',JSON.stringify(p,null,2)+'\n');fs.writeFileSync('build/out/fixtures/golden.json',JSON.stringify({cases,validation,hashInput:'中文路径😀\nRemains',hashExpected:fingerprint('中文路径😀\nRemains')}));
console.log(`${cases.length} cross-runtime cases + ${validation.length} validation cases`);
