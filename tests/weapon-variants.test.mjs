import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newProfile,newReward,validate,evaluateRewards,seeded,Simulator,rewardItem} from '../desktop/core.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../desktop/data/catalog.json',import.meta.url)));
const items=new Map(catalog.items.map(i=>[i.key,i]));
const ctx={stage:1,hero:0};
const profile=rewards=>({...newProfile(),rules:[{target:'container:table:ammo',mode:'replace',rewards}]});

test('named and zero-weight upgrades are distinct selectable items; absent upgrades stay absent',()=>{
  assert.equal(items.get('weapon:rail^1').name,'“圣骑士”');
  assert.equal(items.get('weapon:rail^1').baseName,'磁轨枪');
  assert.equal(items.get('weapon:rail^1').baseKey,'weapon:rail');
  assert.equal(items.get('weapon:rail^1').pool,undefined);
  assert.equal(Number(items.get('weapon:mont').pool.uniq),0);
  assert.equal(items.get('weapon:mont^1').name,'“掠夺者之友”');
  assert.equal(items.get('weapon:arson^1').name,items.get('weapon:arson').name+' - II');
  assert.equal(items.has('weapon:bat^1'),false);
});

test('every offered upgrade validates and resolves to its real base weapon and variant',()=>{
  for(const item of catalog.items.filter(i=>i.variant===1)){
    const r=newReward(item.key);
    assert.deepEqual(validate(profile([r]),catalog),[],item.key);
    const [d]=evaluateRewards([r],ctx,seeded(51),items);
    assert.equal(d.key,item.baseKey);assert.equal(d.variant,1);
    assert.equal(rewardItem(items,d.key,d.variant).key,item.key);
  }
});

test('ordinary and advanced versions use independent zero and hundred percent chances',()=>{
  const base=newReward('weapon:rail'),advanced=newReward('weapon:rail^1');
  for(const [baseChance,advancedChance,wanted] of [[100,0,[0]],[0,100,[1]],[100,100,[0,1]],[0,0,[]]]){
    const r=[{...base,chance:baseChance},{...advanced,chance:advancedChance}];
    assert.deepEqual(evaluateRewards(r,ctx,seeded(55),items).map(d=>d.variant),wanted);
  }
});

test('a three-to-one pool can choose between two versions of the same weapon',()=>{
  const r={...newReward(),pick:[{key:'weapon:rail',weight:3},{key:'weapon:rail^1',weight:1}]};
  assert.deepEqual(validate(profile([r]),catalog),[]);
  const rng=seeded(291);let advanced=0;
  for(let n=0;n<20000;n++)advanced+=evaluateRewards([r],ctx,rng,items)[0].variant;
  assert.ok(advanced>4700&&advanced<5300,String(advanced));
});

test('upgrade chance combines with pool weights and respects stage and elite conditions',()=>{
  const r={...newReward(),chance:40,pick:[{key:'weapon:rail',weight:1},{key:'weapon:rail^1',weight:1}],minStage:2,elite:'elite'};
  assert.deepEqual(evaluateRewards([r],ctx,seeded(),items),[]);
  assert.deepEqual(evaluateRewards([r],{stage:2,hero:0},seeded(),items),[]);
  const rng=seeded(401);let advanced=0;
  for(let n=0;n<20000;n++)advanced+=evaluateRewards([r],{stage:2,hero:1},rng,items)[0]?.variant||0;
  assert.ok(advanced>3700&&advanced<4300,String(advanced));
});

test('old reward-wide variant profiles remain valid, including defined zero-weight upgrades',()=>{
  for(const key of ['weapon:rail','weapon:mont']){
    const legacy={...newReward(key),variant:1};
    assert.deepEqual(validate(profile([legacy]),catalog),[]);
    assert.deepEqual(evaluateRewards([legacy],ctx,seeded(44),items),evaluateRewards([newReward(key+'^1')],ctx,seeded(44),items));
  }
});

test('missing upgrades and duplicate effective variants cannot be applied',()=>{
  for(const r of [newReward('weapon:bat^1'),{...newReward('weapon:bat'),variant:1},
    {...newReward(),variant:1,pick:[{key:'weapon:rail',weight:1},{key:'weapon:rail^1',weight:1}]}]){
    assert.ok(validate(profile([r]),catalog).length);
  }
});

test('simulator combines legacy and explicit upgrade quantities under one named result',()=>{
  const sim=new Simulator(catalog),source=catalog.sources.find(s=>s.key==='container:table:ammo');
  const p=profile([newReward('weapon:rail'),newReward('weapon:rail^1'),{...newReward('weapon:rail'),variant:1}]);
  const result=sim.sample(p,source,{},100,9);
  assert.equal(result.items.length,2);
  assert.equal(result.items.find(i=>i.variant===0).count,100);
  assert.equal(result.items.find(i=>i.variant===1).count,200);
});

test('adding selectable upgrades does not change any original random table',()=>{
  const before=new Simulator({...catalog,items:catalog.items.filter(i=>!i.variant)}),after=new Simulator(catalog),p=newProfile();
  for(const s of catalog.sources.filter(s=>s.scope==='table')){
    for(const stage of [0,1,7])assert.deepEqual(after.sample(p,s,{stage,weaponLevel:9},50,827),before.sample(p,s,{stage,weaponLevel:9},50,827),s.key);
  }
});
