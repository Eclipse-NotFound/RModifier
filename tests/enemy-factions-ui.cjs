'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve('build/out/enemy-factions-ui-'+Date.now());fs.mkdirSync(root,{recursive:true});

(async()=>{
 const packaged=process.env.RMODIFIER_EXE;
 const application=await electron.launch({executablePath:path.resolve(packaged||'node_modules/electron/dist/electron.exe'),args:packaged?[]:[path.resolve('.')],env:{...process.env,RMODIFIER_SHOW_TEST_WINDOW:'1',RMODIFIER_TEST_ROOT:root,RMODIFIER_GAME_ROOT:path.resolve('../..')},timeout:30000});
 const shell=await application.firstWindow(),errors=[],checks=[];let failure=null;
 shell.on('pageerror',e=>errors.push(String(e)));shell.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await shell.locator('#loot-frame').waitFor();let page=shell.frame({url:/loot\.html$/});
 const capture=async name=>{
   const png=await application.evaluate(async({BaseWindow})=>(await BaseWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));
   fs.writeFileSync(path.join(root,name),Buffer.from(png,'base64'));
 };
 try{
  await page.getByRole('heading',{name:'弹药盒',exact:true}).waitFor();
  await page.locator('[data-tab="enemy"]').click();
  assert.equal(await page.locator('.source-row').count(),47);
  assert.equal(await page.locator('[data-source="enemy:table:raider"]').count(),1);
  await page.locator('#scopeFilter').selectOption('model');
  assert.equal(await page.locator('.source-row').count(),85);
  assert.equal(await page.locator('.source-group').count(),10);
  assert.equal((new Set(await page.locator('.source-row').evaluateAll(rows=>rows.map(r=>r.dataset.source)))).size,85);
  assert.equal(await page.getByRole('combobox',{name:'筛选阵营'}).count(),1);
  checks.push('85 models in 10 groups; 47 unique shared tables; labelled faction control');
  await capture('01-all-factions.png');

  await page.locator('#sourceSearch').fill('铁骑卫');
  assert.equal(await page.locator('.source-row').count(),3);
  assert.match(await page.locator('#sourceList').innerText(),/骑士/);
  await page.locator('#sourceSearch').fill('英克雷 军犬');
  assert.equal(await page.locator('.source-row').count(),1);
  assert.equal(await page.locator('.source-row').getAttribute('data-source'),'enemy:model:hellhound1');
  await page.locator('#sourceSearch').fill('SLAVER6');
  assert.match(await page.locator('#sourceList').innerText(),/头领/);
  await page.locator('#sourceSearch').fill('查不到的敌人');await page.locator('#clearSourceFilter').click();
  assert.equal(await page.locator('.source-row').count(),85);
  checks.push('faction, combined Chinese and case-insensitive ID search; recover from empty result');

  await page.locator('#factionFilter').selectOption('slaver');assert.equal(await page.locator('.source-row').count(),6);
  await page.locator('[data-source="enemy:model:slaver6"]').click();
  assert.equal(await page.locator('.source-row.active').getAttribute('aria-current'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-source')),'enemy:model:slaver6');
  await page.getByRole('button',{name:'复制并编辑',exact:true}).click();
  await page.locator('[data-command="add-reward"]').click();
  await page.locator('[data-field="chance"]').fill('73');await page.locator('[data-field="chance"]').press('Tab');
  await page.locator('#factionFilter').selectOption('ranger');
  assert.equal(await page.locator('[data-field="chance"]').inputValue(),'73');
  assert.equal(await page.locator('#editor h1').innerText(),'头领');
  assert.equal(await page.locator('#dirtyLabel').innerText(),'未保存');
  await page.locator('#sourceSearch').fill('奴隶贩子');
  assert.equal(await page.locator('.source-row').count(),0);
  await page.locator('#clearSourceFilter').click();await page.locator('#factionFilter').selectOption('slaver');
  assert.equal(await page.locator('[data-source="enemy:model:slaver6"] .dot').count(),1);
  assert.equal(await page.locator('[data-field="chance"]').inputValue(),'73');
  checks.push('filtering preserves the selected model, unsaved changes, custom marker and keyboard focus');
  await capture('02-slaver-draft.png');

  await page.locator('#scopeFilter').selectOption('table');
  assert.equal(await page.locator('.source-row').count(),1);
  assert.match(await page.locator('.source-group-title').innerText(),/跨阵营共用/);
  assert.match(await page.locator('#editor h1').innerText(),/共用奖励/);
  for(const faction of ['掠夺者','奴隶贩子','鹰爪雇佣兵','斑马军团'])assert.match(await page.locator('.scope-note').innerText(),new RegExp(faction));
  assert.match(await page.locator('.scope-note').innerText(),/26 个型号/);
  assert.equal(await page.evaluate(()=>window.scrollY),0);
  checks.push('a faction filter does not hide the four-faction impact of the shared table');
  await capture('03-shared-table.png');

  await page.locator('[data-tab="container"]').click();assert.equal(await page.locator('#factionFilter').isVisible(),false);
  assert.equal(await page.locator('.source-group').count(),0);assert.equal(await page.locator('.source-row').count(),29);
  await page.locator('[data-tab="enemy"]').click();
  assert.equal(await page.locator('.source-row.active').getAttribute('data-source'),'enemy:table:raider');
  await page.locator('#scopeFilter').selectOption('model');
  await page.locator('[data-source="enemy:model:slaver6"]').click();
  assert.equal(await page.locator('[data-field="chance"]').inputValue(),'73');
  await page.locator('#save').click();await page.locator('#dirtyLabel').filter({hasText:'已保存'}).waitFor();
  await shell.reload();page=shell.frame({url:/loot\.html$/});await page.getByRole('heading',{name:'头领',exact:true}).waitFor();
  assert.equal(await page.locator('#factionFilter').inputValue(),'slaver');
  assert.equal(await page.locator('[data-field="chance"]').inputValue(),'73');
  const bootstrap=await page.evaluate(()=>window.loot.bootstrap());
  assert.equal(bootstrap.catalog.items.length,692);assert.equal(bootstrap.profiles[0].profile.rules[0].target,'enemy:model:slaver6');
  assert.equal(bootstrap.profiles[0].profile.enemyFaction,undefined);
  checks.push('container list unaffected; reopening retains faction, source and saved reward using the original target key');

  for(const [width,height,zoom] of [[1440,950,1],[900,800,1],[1440,1100,2]]){
   await application.evaluate(({BaseWindow},{width,height,zoom})=>{const w=BaseWindow.getAllWindows()[0];w.setSize(width,height);w.webContents.setZoomFactor(zoom);},{width,height,zoom});
   await page.waitForTimeout(150);
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,sidebar:document.querySelector('#sources').getBoundingClientRect().toJSON(),rows:[...document.querySelectorAll('.source-row')].map(r=>({client:r.clientWidth,scroll:r.scrollWidth}))}));
   assert.ok(metrics.scroll<=metrics.width+2,JSON.stringify(metrics));assert.ok(metrics.rows.every(r=>r.scroll<=r.client+2),JSON.stringify(metrics));
   await capture(`layout-${width}-${zoom}.png`);
  }
  checks.push('normal, narrow and 200 percent UI has no page or row overflow');
  if(packaged){
   await page.locator('[data-native-field="chance"]').first().fill('32');
   await page.locator('[data-native-field="chance"]').first().press('Tab');
   await page.locator('#apply').click();
   await page.locator('#notice').filter({hasText:'方案已应用'}).waitFor();
   const current=await page.evaluate(()=>window.loot.status());
   assert.equal(current.installation.bridgeUpdate,true,'packaged integration fixture must still use the installed v1 bridge');
   assert.match(await page.locator('#notice').innerText(),/请先更新游戏连接/);
   assert.match(await page.locator('#gameStatus').innerText(),/请先更新游戏连接/);
   checks.push('new native-entry profile explicitly requests a connection upgrade on the installed older game bridge');
  }
  assert.deepEqual(errors,[]);checks.push('no renderer errors');
 }catch(e){failure=String(e.stack||e);await capture('failure.png').catch(()=>{});throw e;}
 finally{
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({passed:!failure,packaged:!!packaged,checks,errors,failure},null,2));
  console.log(JSON.stringify({root,packaged:!!packaged,checks,errors,failure},null,2));
  await shell.evaluate(()=>workshop.close()).catch(()=>{});await application.close().catch(()=>{});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
