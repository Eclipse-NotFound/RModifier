import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterSources,groupEnemySources,factionNames} from '../desktop/source-groups.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../desktop/data/catalog.json',import.meta.url)));
const get=id=>catalog.sources.find(s=>s.key==='enemy:model:'+id);
const select=(options={})=>filterSources(catalog,{kind:'enemy',scope:'model',...options});

test('all 85 enemy models and 47 loot tables remain reachable exactly once',()=>{
  assert.equal(catalog.enemyFactions.length,10);
  for(const [scope,count] of [['model',85],['table',47]]){
    const sources=select({scope}),groups=groupEnemySources(catalog,sources);
    assert.equal(sources.length,count);
    assert.deepEqual(groups.flatMap(g=>g.sources.map(s=>s.key)).sort(),sources.map(s=>s.key).sort());
    assert.equal(new Set(groups.flatMap(g=>g.sources.map(s=>s.key))).size,count);
    for(const s of sources)for(const id of s.factionIds)assert.ok(catalog.enemyFactions.some(f=>f.id===id));
  }
  assert.deepEqual(groupEnemySources(catalog,select()).map(g=>[g.id,g.sources.length]),[
    ['raider',10],['slaver',6],['merc',5],['zebra',5],['ranger',3],['encl',4],
    ['alicorn',3],['zombie',11],['monster',21],['robot',17]
  ]);
});

test('affiliations follow unit families, with the Enclave hound and mechanical scout resolved from the bestiary',()=>{
  for(const [id,faction] of [['slaver6','slaver'],['merc5','merc'],['zebra5','zebra'],['ranger1','ranger'],['hellhound1','encl'],['vortex','robot'],['scorp3','monster']]){
    assert.deepEqual(get(id).factionIds,[faction],id);
  }
  assert.equal(get('slaver6').table,'raider');
  assert.equal(get('merc5').table,'raider');
});

test('the four-faction shared table appears once and remains discoverable from every member faction',()=>{
  const table=catalog.sources.find(s=>s.key==='enemy:table:raider');
  assert.deepEqual(table.factionIds,['raider','slaver','merc','zebra']);
  assert.equal(factionNames(catalog,table).length,4);
  assert.equal(select({scope:'table'}).filter(s=>s.key===table.key).length,1);
  for(const faction of table.factionIds){
    assert.deepEqual(select({scope:'table',faction}).map(s=>s.key),[table.key]);
    assert.equal(groupEnemySources(catalog,select({scope:'table',faction}))[0].id,'shared');
  }
});

test('search finds faction members with unrelated names, supports combined terms and leaves container filtering independent',()=>{
  assert.deepEqual(select({query:'铁骑卫'}).map(s=>s.id),['ranger1','ranger2','ranger3']);
  assert.ok(select({query:'奴隶贩子'}).some(s=>s.name==='头领'));
  assert.deepEqual(select({query:'英克雷 军犬'}).map(s=>s.id),['hellhound1']);
  assert.deepEqual(select({query:'RANGER1'}).map(s=>s.id),['ranger1']);
  assert.equal(select({query:'铁骑卫',faction:'slaver'}).length,0);
  assert.equal(select({query:'没有这个敌人'}).length,0);
  assert.deepEqual(filterSources(catalog,{kind:'container',scope:'table',faction:'slaver'}),catalog.sources.filter(s=>s.kind==='container'&&s.scope==='table'));
});
