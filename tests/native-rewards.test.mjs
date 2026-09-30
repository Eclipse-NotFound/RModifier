import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {newProfile,newReward,nativeRows,Simulator,validate,clone,seeded,nativeParams} from '../desktop/core.mjs';
import {vanillaTable} from '../desktop/data/vanilla.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../desktop/data/catalog.json',import.meta.url)));
const sim=new Simulator(catalog),map=new Map(catalog.items.map(i=>[i.key,i]));
const src=(kind,table)=>catalog.sources.find(s=>s.key===`${kind}:table:${table}`);
const edited=(kind,table,native)=>({...newProfile(),schemaVersion:2,rules:[{target:`${kind}:table:${table}`,mode:'replace',native,rewards:[]}]});
test('all 76 tables expose their actual call sites, with no sampled or flattened defaults',()=>{
  assert.equal(Object.keys(catalog.nativeTables).length,76);
  assert.equal(nativeRows(catalog,newProfile(),src('enemy','raider')).length,3);
  assert.deepEqual(catalog.nativeTables['enemy:raider'].map(r=>[r.name,r.chance,r.quantity]),[['随机食物',25,null],['随机弹药',25,null],['随机爆炸物',12,null]]);
  assert.ok(catalog.nativeTables['container:safe'].some(r=>r.chance===null));
  assert.ok(catalog.nativeTables['container:metal'][1].conditions[0].includes('未获得'));
  assert.ok(catalog.nativeTables['enemy:hellhound1'][0].conditions.includes('仅精英敌人'));
});
test('adding call-site IDs preserves original branching, emitted arguments and RNG sequence for every table',async()=>{
  const original=execFileSync('git',['show','6567ebe:desktop/data/vanilla.mjs'],{encoding:'utf8'});
  const old=(await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'))).vanillaTable;
  for(const s of catalog.sources.filter(s=>s.scope==='table'))for(const seed of [1,217,974,19932])for(const hero of [0,2]){
    const run=fn=>{const random=seeded(seed),calls=[];const loc={locDifLevel:20,weaponLevel:7,itemsTip:'bibl',land:{rnd:true,act:{biom:0,id:'minst'}},prob:null,createUnit:id=>calls.push(['spawn',id])};const env={loc,broken:false,hero,bonus:73,world:{land:loc.land,pers:{freel:true,barahlo:true},invent:{weapons:{}}}};fn(s.kind,s.table,env,(chance,type,id=null,count=-1)=>{calls.push([chance,type,id,count]);return random()<chance;},random);return [calls,random()];};
    assert.deepEqual(run(vanillaTable),run(old),s.key+' seed='+seed);
  }
});
test('old append, replace and inherited profiles display their effective lists without mutation',()=>{
  const p=newProfile();p.rules=[{target:'enemy:table:raider',mode:'append',rewards:[newReward()]}];const before=JSON.stringify(p);
  assert.equal(nativeRows(catalog,p,src('enemy','raider')).length,3);assert.equal(JSON.stringify(p),before);
  const model=catalog.sources.find(s=>s.key==='enemy:model:raider1');assert.equal(nativeRows(catalog,p,model).length,3);
  p.rules[0].mode='replace';assert.equal(nativeRows(catalog,p,model).length,0);
});
test('editing one original reward preserves others, deletion drives fallback and reset restores vanilla',()=>{
  const p=edited('container','metal',{'container:metal:1':{chance:0},'container:metal:2':{chance:100,pick:[{key:'item:p9',weight:1}],min:7,max:7}});
  assert.deepEqual(validate(p,catalog),[]);assert.deepEqual(sim.once(p,src('container','metal')).drops.map(d=>[d.key,d.count]),[['item:p9',7]]);
  p.rules[0].native['container:metal:1']={chance:100,pick:[{key:'item:p10',weight:1}],min:3,max:3};assert.deepEqual(sim.once(p,src('container','metal')).drops.map(d=>[d.key,d.count]),[['item:p10',3]]);
  p.rules[0].native['container:metal:1']={disabled:true};assert.equal(nativeRows(catalog,p,src('container','metal')).length,1);assert.equal(sim.once(p,src('container','metal')).drops[0].key,'item:p9');
  p.rules[0].native={};assert.deepEqual(sim.sample(p,src('container','metal'),{},200),sim.sample(newProfile(),src('container','metal'),{},200));
});
test('conditional and hazard branches keep their original meaning after edits',()=>{
  const p=edited('enemy','hellhound1',{'enemy:hellhound1:1':{chance:100,pick:[{key:'weapon:rail^1',weight:1}],min:2,max:2}});
  assert.equal(sim.once(p,src('enemy','hellhound1'),{hero:0}).drops.length,0);
  assert.deepEqual(sim.once(p,src('enemy','hellhound1'),{hero:1}).drops.map(d=>[d.key,d.variant]),[['weapon:rail',1],['weapon:rail',1]]);
  for(const table of ['safe','trash','fridge','food']){
    const base=newProfile(),empty=edited('container',table,{});assert.deepEqual(sim.sample(base,src('container',table),{randomLand:true,barahlo:true},400),sim.sample(empty,src('container',table),{randomLand:true,barahlo:true},400));
  }
});
test('malformed patches cannot affect another table or overflow equipment generation',()=>{
  const p=edited('enemy','raider',{'enemy:raider:1':{chance:25}});assert.deepEqual(validate(p,catalog),[]);
  for(const mutate of [p=>p.schemaVersion=1,p=>p.rules[0].native={'enemy:rat:1':{}},p=>p.rules[0].native=[],p=>p.rules[0].native['enemy:raider:1']={chance:101},p=>p.rules[0].native['enemy:raider:1']={min:3},p=>p.rules[0].native['enemy:raider:1']={code:'alert(1)'},p=>p.rules[0].native['enemy:raider:1']={pick:[{key:'weapon:rail^1',weight:1}],min:1,max:100}]){const copy=clone(p);mutate(copy);assert.ok(validate(copy,catalog).length);}
  assert.deepEqual(nativeParams({pick:[{key:'weapon:rail^1',weight:1}],min:2,max:2},'a',null,-1,seeded(),map),{type:'weapon',id:'rail^1',count:1,copies:2});
});
