'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),game=path.resolve(project,'../..');
const root=path.join(project,'build/out/host-ui-'+Date.now()),checks=[],errors=[];
fs.mkdirSync(root,{recursive:true});
const executable=path.resolve(process.env.RMODIFIER_EXE||path.join(project,'node_modules/electron/dist/electron.exe'));
async function launch(){return electron.launch({executablePath:executable,args:process.env.RMODIFIER_EXE?[]:[project],env:{...process.env,RMODIFIER_TEST_ROOT:root,RMODIFIER_GAME_ROOT:game},timeout:60000});}
async function main(){let app=await launch(),page=await app.firstWindow();
 const watch=p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Electron Security Warning'))errors.push(m.text());});};watch(page);
 const ui=id=>page.frameLocator('#'+id+'-frame');
 const tab=id=>page.locator('[data-workspace="'+id+'"]').click();
 const mark=async(id,dirty)=>{await page.waitForFunction(({id,dirty})=>!!document.querySelector('[data-workspace="'+id+'"] .mark').textContent===dirty,{id,dirty});};
 const capture=async name=>{const b=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(root,name),Buffer.from(b,'base64'));};
 try{
  await ui('loot').getByRole('heading',{name:'弹药盒',exact:true}).waitFor();checks.push('Three-page host starts on loot page');
  await ui('loot').getByRole('button',{name:'复制并编辑'}).click();await mark('loot',true);
  await ui('loot').getByRole('button',{name:'＋ 添加一条奖励',exact:true}).click();
  await capture('01-loot.png');
  await tab('barks');await ui('barks').locator('[data-edit]').first().fill('宿主整合：三页保持各自草稿');await mark('barks',true);await capture('02-barks.png');
  await tab('map');await ui('map').locator('[data-property="name"]').fill('宿主整合房间');await ui('map').locator('[data-property="name"]').blur();await mark('map',true);await capture('03-map.png');
  await tab('loot');assert.equal(await ui('loot').locator('.reward-card').count(),1);await mark('loot',true);
  await tab('barks');assert.equal(await ui('barks').locator('[data-edit]').first().inputValue(),'宿主整合：三页保持各自草稿');checks.push('Switching keeps edits, per-page dirty markers and mounted pages');
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});await page.waitForTimeout(200);assert.equal(page.isClosed(),false);await mark('map',true);checks.push('Continue editing cancels native window close');
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});dialog.showSaveDialog=async()=>({canceled:true});});await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});
  await page.locator('#shell-status').filter({hasText:/未完成保存/}).waitFor();assert.equal(page.isClosed(),false);await mark('loot',false);await mark('barks',true);await mark('map',true);checks.push('Canceling second page save leaves window and remaining drafts intact');
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:2});});const closed=page.waitForEvent('close');await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});await closed;await app.close().catch(()=>{});
  for(const file of ['config/loot-recovery.json','config/barks/recovery.json','config/maps/recovery.json'])assert.ok(fs.existsSync(path.join(root,'data',file)),file);
  checks.push('Keep recovery drafts durably writes both dirty pages before close');
  app=await launch();page=await app.firstWindow();watch(page);await ui('loot').getByRole('heading',{name:'弹药盒',exact:true}).waitFor();await tab('barks');assert.equal(await ui('barks').locator('[data-edit]').first().inputValue(),'宿主整合：三页保持各自草稿');await mark('barks',true);await tab('map');assert.equal(await ui('map').locator('[data-property="name"]').inputValue(),'宿主整合房间');await mark('map',true);checks.push('Restart restores unsaved barks and whole-map drafts');
  await tab('loot');assert.equal(await ui('loot').locator('.reward-card').count(),1);checks.push('Saved loot profile survives alongside other recovered documents');
  assert.deepEqual(errors,[]);checks.push('No renderer JavaScript or CSP errors');
 }catch(e){await capture('failure.png').catch(()=>{});console.error('Renderer errors:',errors);console.error(await page.locator('#shell-status').innerText().catch(()=>''));throw e;}
 finally{fs.writeFileSync(path.join(root,'results.json'),JSON.stringify({passed:checks.length,checks,errors,root,executable},null,2));await page.evaluate(()=>workshop.close()).catch(()=>{});await app.close().catch(()=>{});}
 console.log(JSON.stringify({passed:checks.length,checks,errors,root},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
