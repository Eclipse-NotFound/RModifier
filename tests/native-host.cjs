'use strict';
// Real host + actual AIR controls. Writes remain beneath this run's private root.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {_electron:electron}=require('C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),game=path.resolve(project,'../..');
const root=path.join(project,'build/out/native-host',Date.now()+'-'+crypto.randomUUID().slice(0,8));
const executable=path.resolve(process.env.RMODIFIER_EXE||path.join(project,'node_modules/electron/dist/electron.exe'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const protectedFiles=['pfe.swf','text_zh.xml','Editor.swf','Editor/Enhancements/EditorTools.swf','Rooms/rooms_plant.xml'];
const before=Object.fromEntries(protectedFiles.map(f=>[f,hash(path.join(game,f))]));
const checks=[],errors=[];let application,page,failure=null,airPid;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const ok=name=>{checks.push(name);console.log('PASS '+name);};
fs.mkdirSync(root,{recursive:true});
async function start(){
 const env={...process.env,RMODIFIER_NATIVE_MAP:'1',RMODIFIER_SHOW_TEST_WINDOW:'1',RMODIFIER_GAME_ROOT:game,RMODIFIER_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE;if(process.env.RMODIFIER_EXE)delete env.RMODIFIER_NATIVE_MAP;
 application=await electron.launch({executablePath:executable,args:process.env.RMODIFIER_EXE?[]:[project],env,timeout:60000});
 page=await application.firstWindow();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Electron Security Warning'))errors.push(m.text());});
 await page.frameLocator('#loot-frame').getByRole('heading',{name:'弹药盒',exact:true}).waitFor();assert.equal((await page.evaluate(()=>workshop.info())).nativeMap,true);
 await application.evaluate(({},file)=>{const {NativeMapModule}=process.mainModule.require(file);const mount=NativeMapModule.prototype.mount;NativeMapModule.prototype.mount=function(...args){globalThis.nativeHostTestMap=this;return mount.apply(this,args);};},process.env.RMODIFIER_EXE?path.join(await application.evaluate(({app})=>app.getAppPath()),'desktop/map/native-ui-module.cjs'):path.join(project,'desktop/map/native-ui-module.cjs'));
}
const inspect=()=>page.evaluate(()=>workshop.nativeMapInspect());
const tab=id=>page.evaluate(id=>RMHost.activate(id),id);
async function nativeTest(action){return application.evaluate(async({},action)=>globalThis.nativeHostTestMap.session.request('test',{action}),action);}
async function mapReady(){
 const until=Date.now()+60000;let value;
 do{value=await inspect();if(value.state.loaded&&value.surface?.visible)return value;await delay(100);}while(Date.now()<until);
 throw Error('Native map not visible: '+JSON.stringify(value)+' '+await page.locator('#native-map-status').innerText());
}
async function close(choice=2){await application.evaluate(({dialog},choice)=>{dialog.showMessageBox=async()=>({response:choice});},choice);await application.evaluate(({BaseWindow})=>BaseWindow.getAllWindows()[0].close());}
async function cleanup(){
 if(!application)return;const proc=application.process();
 if(page&&!page.isClosed()){const done=page.waitForEvent('close',{timeout:12000}).catch(()=>{});await close().catch(()=>{});await done;}
 if(proc?.exitCode===null){try{execFileSync('taskkill',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,stdio:'pipe'});}catch{}}
 await application.close().catch(()=>{});application=null;
}
(async()=>{
 try{
  await start();assert.equal(await tab('map'),true);const initial=await mapReady();airPid=initial.surface.pid;
  assert.ok(initial.surface.ownerMatches&&initial.surface.isPopup&&!initial.surface.isChild&&!initial.surface.isTopmost);
  assert.equal(initial.state.dirty,false);assert.ok(initial.surface.bounds.y>150);assert.ok(initial.surface.bounds.height>300);
  fs.writeFileSync(path.join(root,'initial.json'),JSON.stringify(initial,null,2));ok('Original AIR surface is visible below the host tabs, with owned-popup identity');
  await tab('barks');let value=await inspect();assert.equal(value.surface.visible,false);
  await page.frameLocator('#barks-frame').locator('[data-edit]').first().fill('地图宿主验证：中文台词');
  await tab('map');value=await mapReady();assert.equal(value.surface.hwnd,initial.surface.hwnd);
  for(let n=0;n<8;n++){const pending=tab('map');await tab(n%2?'loot':'barks');await pending;}
  await tab('barks');assert.equal((await inspect()).surface.visible,false);assert.equal(await page.frameLocator('#barks-frame').locator('[data-edit]').first().inputValue(),'地图宿主验证：中文台词');
  await tab('map');await mapReady();ok('Rapid three-page switches preserve the same AIR window and web editor state');
  await application.evaluate(({BaseWindow})=>{BaseWindow.getAllWindows()[0].setContentSize(840,610);});await delay(350);
  value=await inspect();assert.equal(value.surface.bounds.width,value.surface.client.width);assert.ok(Math.abs(value.surface.bounds.height+value.surface.bounds.y-value.surface.client.height)<5);
  await application.evaluate(({BaseWindow})=>BaseWindow.getAllWindows()[0].minimize());await delay(250);assert.equal((await inspect()).surface.visible,false);
  await application.evaluate(({BaseWindow})=>{const w=BaseWindow.getAllWindows()[0];w.restore();w.setSize(1280,750);w.focus();});await mapReady();ok('Native surface follows resize, hides on minimize and restores without losing its session');
  const room=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.projection().rooms.find(r=>r.nodes.some(n=>n.kind==='obj')));
  const obj=room.nodes.find(n=>n.kind==='obj');await nativeTest({kind:'select',room:room.name,key:obj.key});await nativeTest({kind:'input',raw:'<obj host-test="'});
  let flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');assert.equal(flushed.state.dirty,true);
  await tab('loot');assert.equal((await inspect()).surface.visible,false);await tab('map');await mapReady();flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');ok('Unfinished native property input remains dirty across page switches');
  await application.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});await close(0);await delay(350);assert.equal(page.isClosed(),false);await mapReady();
  const locks=await application.evaluate(()=>globalThis.nativeHostTestMap.suspensions);assert.equal(locks,0);ok('Canceling unified close resumes the native surface and releases its dialog lock');
  await nativeTest({kind:'input',raw:obj.raw});await page.evaluate(()=>workshop.nativeMapFlush('inspect'));
  await nativeTest({kind:'paint',layer:1,id:'A',x:10,y:10,x2:11,y2:11});await page.evaluate(()=>workshop.nativeMapFlush('inspect'));
  const output=path.join(root,'地图工作副本.xml');await application.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},output);
  const saved=await page.evaluate(()=>workshop.nativeMapSave({as:true}));assert.equal(saved.status,'saved',JSON.stringify(saved));assert.equal(saved.state.dirty,false);assert.ok(fs.existsSync(output));ok('Native edits save a verified whole-map work copy through the host');
  await nativeTest({kind:'preview'});const until=Date.now()+45000;let preview;
  do{await delay(200);preview=await application.evaluate(async()=>((await globalThis.nativeHostTestMap.session.request('inspect')).input.view.preview));}while((!preview?.ready||preview.busy)&&Date.now()<until);assert.equal(preview?.ready,true);
  await tab('loot');await tab('map');await mapReady();assert.equal((await application.evaluate(async()=>((await globalThis.nativeHostTestMap.session.request('inspect')).input.view.preview))).ready,true);ok('Actual original PreviewPanel renders and persists across host page switches');
  if(process.argv.includes('--hold')){fs.writeFileSync(path.join(root,'ready.json'),JSON.stringify({root,pid:application.process().pid,airPid,surface:await inspect()},null,2));console.log('READY '+root);while(!fs.existsSync(path.join(root,'continue.json')))await delay(250);}
  await nativeTest({kind:'input',raw:'<obj 留存="'});await page.evaluate(()=>workshop.nativeMapFlush('inspect'));
  const closed=page.waitForEvent('close',{timeout:60000});await close(2);await closed;await application.close().catch(()=>{});application=null;
  assert.ok(fs.existsSync(path.join(root,'data/config/native-maps/recovery.json')));ok('Matching recovery receipt allows host close with pending native input');
  await start();await tab('map');await mapReady();flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');assert.equal(flushed.state.dirty,true);
  const pending=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.inputs);assert.ok(pending.some(i=>i.raw==='<obj 留存="'));ok('Restart restores pending original-UI input and full map draft');
  assert.deepEqual(errors,[]);for(const f of protectedFiles)assert.equal(hash(path.join(game,f)),before[f]);ok('No renderer errors and all formal game/editor files remain unchanged');
 }catch(e){failure=e.stack;console.error(e);if(page&&!page.isClosed()){console.error('STATUS',await page.locator('#shell-status').innerText().catch(()=>''),await page.locator('#native-map-status').innerText().catch(()=>''));fs.writeFileSync(path.join(root,'failure-state.json'),JSON.stringify(await inspect().catch(e=>({error:String(e)})),null,2));}}
 finally{await cleanup();fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({success:!failure,checks,errors,failure,root,executable,airPid,protectedBefore:before,protectedAfter:Object.fromEntries(protectedFiles.map(f=>[f,hash(path.join(game,f))]))},null,2));console.log(JSON.stringify({root,passed:checks.length,success:!failure}));if(failure)process.exitCode=1;}
})();
