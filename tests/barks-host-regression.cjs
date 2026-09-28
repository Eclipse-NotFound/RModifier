'use strict';
// Real-shell regression for barks while the original map UI is mounted.
// Native map pixels, window ownership and IME composition have separate map tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {_electron:electron}=require('C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),game=path.resolve(process.env.RMODIFIER_GAME_ROOT||path.join(project,'../..'));
const root=path.join(game,'mods/RModifier/build/out/barks-host-'+Date.now()+'-'+crypto.randomUUID().slice(0,8));
const executable=path.resolve(process.env.RMODIFIER_EXE||path.join(project,'node_modules/electron/dist/electron.exe'));
const checks=[],errors=[],digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const languageFile=path.join(game,'text_zh.xml'),languageBefore=digest(languageFile);
fs.mkdirSync(root,{recursive:true});
let application,page,failure=null;
const mark=async dirty=>page.waitForFunction(d=>!!document.querySelector('[data-workspace="barks"] .mark').textContent===d,dirty);
const barks=()=>page.frameLocator('#barks-frame');
const area=()=>barks().locator('[data-edit]').first();
async function launch(){
 const env={...process.env,RMODIFIER_SHOW_TEST_WINDOW:'1',RMODIFIER_TEST_ROOT:root,RMODIFIER_GAME_ROOT:game};delete env.ELECTRON_RUN_AS_NODE;
 if(process.env.RMODIFIER_EXE)delete env.RMODIFIER_NATIVE_MAP;else env.RMODIFIER_NATIVE_MAP='1';
 application=await electron.launch({executablePath:executable,args:process.env.RMODIFIER_EXE?['--barks']:[project,'--barks'],env,timeout:60000});
 page=await application.firstWindow({timeout:60000});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Electron Security Warning'))errors.push(m.text());});
 await area().waitFor();await page.locator('[data-workspace="barks"][aria-selected="true"]').waitFor();
 assert.equal((await page.evaluate(()=>workshop.info())).nativeMap,true,'The delivered app must enable its original map UI by default');
}
async function choose(id){await page.locator('[data-workspace="'+id+'"]').click();await page.locator('[data-workspace="'+id+'"][aria-selected="true"]').waitFor();}
async function nativeMapReady(){
 const until=Date.now()+60000;let value;
 do{
  value=await page.evaluate(()=>workshop.nativeMapInspect());
  if(value.state.loaded&&value.surface?.visible)return value;
  await new Promise(resolve=>setTimeout(resolve,100));
 }while(Date.now()<until);
 throw Error('Original map did not become visible: '+JSON.stringify(value));
}
async function closeWindow(){await application.evaluate(({BaseWindow,BrowserWindow})=>{const windows=BaseWindow?.getAllWindows?.()||BrowserWindow.getAllWindows();windows[0].close();});}
async function dialogChoice(response){await application.evaluate(({dialog},n)=>{globalThis.barksCloseQuestions=0;dialog.showMessageBox=async()=>{globalThis.barksCloseQuestions++;return {response:n};};},response);}
async function waitCloseQuestion(){
 for(let n=0;n<200;n++){
  if(await application.evaluate(()=>globalThis.barksCloseQuestions))return;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw Error('Closing the dirty bark page never reached its save/recovery question');
}
async function capture(name){
 if(!page||page.isClosed())return;
 const bytes=await page.screenshot();fs.writeFileSync(path.join(root,name),bytes);
}
async function cleanup(){
 if(!application)return;
 const proc=application.process();
 if(page&&!page.isClosed()){
  await dialogChoice(2).catch(()=>{});
  const closed=page.waitForEvent('close',{timeout:15000}).catch(()=>{});
  await closeWindow().catch(()=>{});
  await closed;
 }
 if(proc&&proc.exitCode===null){
  // Only the process tree launched by this test; never enumerate or kill by name.
  try{execFileSync('taskkill',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,stdio:'pipe'});}catch{}
 }
 await application.close().catch(()=>{});application=null;
}
async function main(){
 const text='原地图界面切换测试：密码还是 123！';
 const draft=path.join(root,'中文 台词工作副本.barks.json');
 try{
  await launch();assert.equal(await page.locator('[data-workspace]').count(),3);
  await area().fill(text);await mark(true);checks.push('Chinese bark edit is dirty in the real three-page host');
  const originalMark=await barks().locator('[data-mark]').first().isChecked();
  await barks().locator('[data-mark]').first().setChecked(!originalMark);
  await choose('map');
  const mapIdentity=await nativeMapReady();
  fs.writeFileSync(path.join(root,'native-map-visible.json'),JSON.stringify(mapIdentity,null,2));
  assert.ok(mapIdentity.surface.ownerMatches&&mapIdentity.surface.isPopup&&!mapIdentity.surface.isTopmost);
  await choose('barks');assert.equal((await page.evaluate(()=>workshop.nativeMapInspect())).surface.visible,false);
  assert.equal(await area().inputValue(),text);await mark(true);
  await barks().locator('#undo').click();assert.equal(await barks().locator('[data-mark]').first().isChecked(),originalMark);
  await barks().locator('#redo').click();assert.equal(await barks().locator('[data-mark]').first().isChecked(),!originalMark);
  assert.equal(await area().inputValue(),text);checks.push('Navigation to the visible original AIR map preserves bark text and its undo/redo history');
  // A slow native activation must not later override the newer page selection.
  await page.evaluate(async()=>{for(let n=0;n<5;n++){const pending=window.RMHost.activate('map');await window.RMHost.activate('barks');await Promise.allSettled([pending]);}});
  await page.locator('[data-workspace="barks"][aria-selected="true"]').waitFor();
  const mapAfterSwitch=await page.evaluate(()=>workshop.nativeMapInspect());
  assert.equal(mapAfterSwitch.surface.pid,mapIdentity.surface.pid);assert.equal(mapAfterSwitch.surface.visible,false);
  const afterSwitch=text+' 切回来继续写。';await area().fill(afterSwitch);await mark(true);
  assert.equal(await area().inputValue(),afterSwitch);checks.push('Rapid page changes keep the last requested bark page editable');
  await application.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});
  await barks().locator('#save-project').evaluate(button=>button.onclick());await mark(true);
  assert.equal(fs.existsSync(draft),false);checks.push('Canceling a native save leaves bark edits unsaved and intact');
  await application.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},draft);
  await area().press('Control+s');await mark(false);
  assert.equal(JSON.parse(fs.readFileSync(draft,'utf8')).entries['pip/hack'][0].text,afterSwitch);
  checks.push('Ctrl+S after native-map navigation saves a valid bark draft');
  const recoveredText=afterSwitch+' 下次继续。';await area().fill(recoveredText);await mark(true);
  await dialogChoice(0);await closeWindow();await waitCloseQuestion();
  assert.equal(page.isClosed(),false);assert.equal(await area().inputValue(),recoveredText);
  checks.push('Continue editing cancels the real host close with a dirty bark');
  await capture('barks-after-map.png');
  await dialogChoice(2);const closed=page.waitForEvent('close',{timeout:60000});await closeWindow();await closed;
  await application.close().catch(()=>{});application=null;
  await launch();assert.equal(await area().inputValue(),recoveredText);await mark(true);
  checks.push('Closing with a recovery draft and restarting restores the bark text');
  assert.deepEqual(errors,[]);assert.equal(digest(languageFile),languageBefore);
  checks.push('No renderer errors and the actual game language file is unchanged');
 }catch(e){failure=String(e.stack||e);await capture('failure.png').catch(()=>{});throw e;}
 finally{
  await cleanup();fs.writeFileSync(path.join(root,'results.json'),JSON.stringify({success:!failure&&checks.length===8,checks,passed:checks.length,failure,errors,root,executable,game,languageBefore,languageAfter:digest(languageFile),nativeInputScope:'Programmatic web input only; native map pixels and real IME are verified separately'},null,2));
 }
 console.log(JSON.stringify({passed:checks.length,errors,root},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
