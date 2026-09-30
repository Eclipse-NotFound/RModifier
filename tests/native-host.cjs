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
 const env={...process.env,RMODIFIER_SHOW_TEST_WINDOW:'1',RMODIFIER_GAME_ROOT:game,RMODIFIER_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE;delete env.RMODIFIER_NATIVE_MAP;
 application=await electron.launch({executablePath:executable,args:process.env.RMODIFIER_EXE?[]:[project],env,timeout:60000});
 page=await application.firstWindow();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Electron Security Warning'))errors.push(m.text());});
 await page.frameLocator('#loot-frame').getByRole('heading',{name:'弹药盒',exact:true}).waitFor();assert.equal((await page.evaluate(()=>workshop.info())).nativeMap,true);
 await application.evaluate(({BaseWindow})=>{const w=BaseWindow.getAllWindows()[0];if(w.isMinimized())w.restore();w.showInactive();});
 await application.evaluate(({},file)=>{const {NativeMapModule}=process.mainModule.require(file);const mount=NativeMapModule.prototype.mount;NativeMapModule.prototype.mount=function(...args){globalThis.nativeHostTestMap=this;return mount.apply(this,args);};},process.env.RMODIFIER_EXE?path.join(await application.evaluate(({app})=>app.getAppPath()),'desktop/map/native-ui-module.cjs'):path.join(project,'desktop/map/native-ui-module.cjs'));
}
const inspect=()=>page.evaluate(()=>workshop.nativeMapInspect());
const tab=id=>page.evaluate(id=>RMHost.activate(id),id);
async function nativeTest(action){return application.evaluate(async({},action)=>globalThis.nativeHostTestMap.session.request('test',{action}),action);}
async function originalButton(control){await nativeTest({kind:'button',control});await application.evaluate(async()=>globalThis.nativeHostTestMap.operations);return application.evaluate(async()=>globalThis.nativeHostTestMap.session.request('inspect'));}
async function fitCapture(name){
 const snapshot=await application.evaluate(async()=>{const m=globalThis.nativeHostTestMap;return {inspection:await m.session.request('inspect'),capture:await m.session.request('capture'),root:m.session.root};});
 const v=snapshot.inspection.input.view.viewport;
 assert.equal(v.fit,true);assert.equal(v.panX,0);assert.equal(v.panY,0);
 assert.ok(Math.abs(v.effectiveScale-Math.min(v.width/1800,v.height/950))<0.0001);
 fs.copyFileSync(path.join(snapshot.root,snapshot.capture.png),path.join(root,name+'.png'));
 fs.writeFileSync(path.join(root,name+'.json'),JSON.stringify(snapshot.inspection,null,2));return snapshot.inspection;
}
async function mapReady(){
 const until=Date.now()+60000;let value,restored=false;
 do{value=await inspect();if(value.state.loaded&&value.surface?.visible)return value;
  if(value.surface?.ownerMinimized&&!restored){restored=true;await application.evaluate(({BaseWindow})=>{const w=BaseWindow.getAllWindows()[0];w.restore();w.show();});console.log('Restored this test window after native startup');}
  await delay(100);
 }while(Date.now()<until);
 throw Error('Native map not visible: '+JSON.stringify(value)+' '+await page.locator('#shell-status').innerText());
}
async function close(choice=2){await application.evaluate(({dialog},choice)=>{globalThis.nativeHostTestCloseAnswered=false;dialog.showMessageBox=async()=>{globalThis.nativeHostTestCloseAnswered=true;return {response:choice};};},choice);await application.evaluate(({BaseWindow})=>BaseWindow.getAllWindows()[0].close());}
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
  assert.equal(initial.state.dirty,false);assert.ok(initial.surface.bounds.height>300);
  const header=await page.locator('header').boundingBox();
  assert.equal(await page.locator('#workspace-hint,#native-map-strip,[data-native-action]').count(),0);
  assert.ok(Math.abs(initial.surface.bounds.y-(header.y+header.height)*initial.surface.dpi/96)<3);
  const firstFit=await fitCapture('01-auto-fit');
  for(const b of firstFit.controls.buttons){assert.ok(b.y+b.height<=firstFit.controls.roomName.y,'Flash document buttons must not cover the room name');assert.ok(b.x>=0&&b.x+b.width<=1800);}
  fs.writeFileSync(path.join(root,'initial.json'),JSON.stringify(initial,null,2));ok('Default original Flash UI starts directly below navigation with automatic full-stage fit and no extra bars');
  const libraryView=await originalButton('RModifier_library');
  assert.equal(libraryView.controls.library.open,true);assert.equal(libraryView.controls.library.sceneCount,31);
  assert.equal(libraryView.controls.noticeVisible,false);assert.equal(libraryView.controls.busy,false);
  const originalScenes=await application.evaluate(()=>globalThis.nativeHostTestMap.library.scan().filter(e=>e.original));
  assert.equal(originalScenes.length,31);assert.equal(originalScenes.reduce((sum,e)=>sum+e.count,0),662);assert.ok(originalScenes.every(e=>!e.error));
  await fitCapture('01-scene-library');await nativeTest({kind:'library',button:'close'});ok('Packaged Flash library exposes all 31 original scenes and 662 rooms');
  await tab('barks');let value=await inspect();assert.equal(value.surface.visible,false);
  await page.frameLocator('#barks-frame').locator('[data-edit]').first().fill('地图宿主验证：中文台词');
  await tab('map');value=await mapReady();assert.equal(value.surface.hwnd,initial.surface.hwnd);
  for(let n=0;n<8;n++){const pending=tab('map');await tab(n%2?'loot':'barks');await pending;}
  await tab('barks');assert.equal((await inspect()).surface.visible,false);assert.equal(await page.frameLocator('#barks-frame').locator('[data-edit]').first().inputValue(),'地图宿主验证：中文台词');
  await tab('map');await mapReady();ok('Rapid three-page switches preserve the same AIR window and web editor state');
  await application.evaluate(({BaseWindow})=>{BaseWindow.getAllWindows()[0].setContentSize(840,610);});await delay(350);
  value=await inspect();assert.equal(value.surface.bounds.width,value.surface.client.width);assert.ok(Math.abs(value.surface.bounds.height+value.surface.bounds.y-value.surface.client.height)<5);
  await fitCapture('02-small-window');
  await application.evaluate(({BaseWindow})=>BaseWindow.getAllWindows()[0].minimize());await delay(250);assert.equal((await inspect()).surface.visible,false);
  await application.evaluate(({BaseWindow})=>{const w=BaseWindow.getAllWindows()[0];w.restore();w.setSize(1280,750);w.focus();});await mapReady();await delay(350);await fitCapture('03-restored-window');ok('Native surface refits on small-window resize and restore, without manual zoom or pan');
  const room=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.projection().rooms.find(r=>r.nodes.some(n=>n.kind==='obj')));
  const obj=room.nodes.find(n=>n.kind==='obj');await nativeTest({kind:'select',room:room.name,key:obj.key});await nativeTest({kind:'input',raw:'<obj host-test="'});
  let flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');assert.equal(flushed.state.dirty,true);
  const invalidSave=await originalButton('butSave');assert.match(invalidSave.controls.message,/请完成当前属性输入/);assert.equal(invalidSave.controls.noticeVisible,true);assert.equal(invalidSave.controls.busy,false);assert.equal((await inspect()).state.dirty,true);
  await tab('loot');assert.equal((await inspect()).surface.visible,false);await tab('map');await mapReady();flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');ok('Unfinished native property input remains dirty across page switches');
  await close(0);const cancelUntil=Date.now()+10000;let cancelState;
  do{cancelState=await application.evaluate(()=>({answered:globalThis.nativeHostTestCloseAnswered,locks:globalThis.nativeHostTestMap.suspensions}));if(cancelState.answered&&cancelState.locks===0)break;await delay(80);}while(Date.now()<cancelUntil);
  assert.equal(cancelState.answered,true);assert.equal(cancelState.locks,0);assert.equal(page.isClosed(),false);await mapReady();ok('Canceling unified close resumes the native surface and releases its dialog lock');
  await nativeTest({kind:'input',raw:obj.raw});await page.evaluate(()=>workshop.nativeMapFlush('inspect'));
  const rawBeforePaint=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.raw);
  await nativeTest({kind:'paint',layer:1,id:'A',x:10,y:10,x2:11,y2:11});await page.evaluate(()=>workshop.nativeMapFlush('inspect'));
  const painted=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.raw);assert.notEqual(painted,rawBeforePaint);
  let feedback=await originalButton('RModifier_undo');assert.equal(await application.evaluate(()=>globalThis.nativeHostTestMap.doc.raw),rawBeforePaint);assert.equal(feedback.controls.message,'已撤销');
  feedback=await originalButton('RModifier_redo');assert.equal(await application.evaluate(()=>globalThis.nativeHostTestMap.doc.raw),painted);assert.equal(feedback.controls.message,'已重做');ok('Visible Flash undo and redo buttons restore the complete paint transaction');
  await application.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>{throw Error('Saving an original must create a managed copy without a file dialog');};});
  feedback=await originalButton('butSave');assert.equal((await inspect()).state.dirty,false);assert.match(feedback.controls.message,/^已保存/);
  const savedPool=await application.evaluate(()=>{const m=globalThis.nativeHostTestMap;return {id:m.libraryId,file:m.workspace.get(m.handle).file,pools:m.library.index().pools};});
  assert.ok(!savedPool.id.startsWith('original:'));assert.equal(savedPool.pools.length,1);assert.equal(savedPool.pools[0].id,savedPool.id);
  assert.equal(path.dirname(savedPool.file),path.join(root,'data/projects/maps/library'));assert.equal(fs.readFileSync(savedPool.file,'utf8'),painted);
  assert.equal(hash(path.join(game,'Rooms/rooms_plant.xml')),before['Rooms/rooms_plant.xml']);
  ok('Flash Save creates a managed pool copy with the full edited XML and preserves the original');
  await application.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});feedback=await originalButton('RModifier_saveAs');assert.equal(feedback.controls.message,'已取消');assert.equal(feedback.controls.busy,false);
  const secondOutput=path.join(root,'另存地图.xml');await application.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},secondOutput);
  feedback=await originalButton('RModifier_saveAs');assert.equal(fs.readFileSync(secondOutput,'utf8'),painted);assert.match(feedback.controls.message,/^已保存/);
  await application.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},secondOutput);
  feedback=await originalButton('butLoad');assert.equal(await application.evaluate(()=>globalThis.nativeHostTestMap.doc.raw),painted);assert.match(feedback.controls.message,/^已打开/);ok('Flash Save, Save As, cancel and Load controls preserve full XML and show their results inside Flash');
  await nativeTest({kind:'preview'});const until=Date.now()+45000;let preview;
  do{await delay(200);preview=await application.evaluate(async()=>((await globalThis.nativeHostTestMap.session.request('inspect')).input.view.preview));}while((!preview?.ready||preview.busy)&&Date.now()<until);assert.equal(preview?.ready,true);
  await tab('loot');await tab('map');await mapReady();assert.equal((await application.evaluate(async()=>((await globalThis.nativeHostTestMap.session.request('inspect')).input.view.preview))).ready,true);
  await fitCapture('04-original-preview');await application.evaluate(({BaseWindow})=>{BaseWindow.getAllWindows()[0].setContentSize(1000,720);});await delay(400);await fitCapture('05-preview-resized');ok('Original PreviewPanel remains complete and refits on resize and page switching');
  if(process.argv.includes('--hold')){fs.writeFileSync(path.join(root,'ready.json'),JSON.stringify({root,pid:application.process().pid,airPid,surface:await inspect()},null,2));console.log('READY '+root);while(!fs.existsSync(path.join(root,'continue.json')))await delay(250);}
  const restoredRoom=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.projection().rooms.find(r=>r.nodes.some(n=>n.kind==='obj')));
  await nativeTest({kind:'select',room:restoredRoom.name,key:restoredRoom.nodes.find(n=>n.kind==='obj').key});
  await nativeTest({kind:'input',raw:'<obj 留存="'});assert.equal((await page.evaluate(()=>workshop.nativeMapFlush('inspect'))).status,'invalid');
  const closed=page.waitForEvent('close',{timeout:60000});await close(2);await closed;await application.close().catch(()=>{});application=null;
  assert.ok(fs.existsSync(path.join(root,'data/config/native-maps/recovery.json')));ok('Matching recovery receipt allows host close with pending native input');
  await start();await tab('map');await mapReady();flushed=await page.evaluate(()=>workshop.nativeMapFlush('inspect'));assert.equal(flushed.status,'invalid');assert.equal(flushed.state.dirty,true);
  const pending=await application.evaluate(()=>globalThis.nativeHostTestMap.doc.inputs);assert.ok(pending.some(i=>i.raw==='<obj 留存="'));ok('Restart restores pending original-UI input and full map draft');
  assert.deepEqual(errors,[]);for(const f of protectedFiles)assert.equal(hash(path.join(game,f)),before[f]);ok('No renderer errors and all formal game/editor files remain unchanged');
 }catch(e){failure=e.stack;console.error(e);if(page&&!page.isClosed()){console.error('STATUS',await page.locator('#shell-status').innerText().catch(()=>''));fs.writeFileSync(path.join(root,'failure-state.json'),JSON.stringify(await inspect().catch(e=>({error:String(e)})),null,2));}}
 finally{await cleanup();fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({success:!failure,checks,errors,failure,root,executable,airPid,protectedBefore:before,protectedAfter:Object.fromEntries(protectedFiles.map(f=>[f,hash(path.join(game,f))]))},null,2));console.log(JSON.stringify({root,passed:checks.length,success:!failure}));if(failure)process.exitCode=1;}
})();
