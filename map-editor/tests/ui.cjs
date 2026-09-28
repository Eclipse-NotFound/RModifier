// Real Electron host, with native file pickers directed to an isolated test directory.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtimeRequire=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const {_electron}=runtimeRequire('playwright');
const M=require('../../desktop/map/document.js'),{hash}=require('../../desktop/map/native-session.cjs');
const project=path.resolve(__dirname,'../..'),gameRoot=path.resolve(project,'../..'),root=path.join(project,'build/out/map-ui',crypto.randomUUID());fs.mkdirSync(root,{recursive:true});
let app,page,frame;const checks=[],errors=[];const ok=name=>{checks.push(name);console.log('PASS '+name);};
const until=async fn=>{const end=Date.now()+90000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,80));}throw Error('UI state timeout');};
async function capture(name){const b=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(root,name),Buffer.from(b,'base64'));}
async function boot(){
 app=await _electron.launch({executablePath:path.join(project,'node_modules/electron/dist/electron.exe'),args:[project,'--map'],env:{...process.env,RMODIFIER_TEST_ROOT:root,RMODIFIER_GAME_ROOT:gameRoot},timeout:60000});
 page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await until(()=>{frame=page.frames().find(f=>f.url().endsWith('/map/index.html'));return frame;});
 await frame.waitForFunction(()=>typeof doc!=='undefined'&&doc?.rooms?.length>0,{timeout:30000});
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});dialog.showSaveDialog=async()=>({canceled:true});});
}
(async()=>{
 await boot();assert.equal(await frame.locator('#roomList button').count(),55);ok('map iframe opens in shared host with 55 rooms and Chinese palette');
 const stock=fs.readFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'),'utf8');
 const fixture='\uFEFF'+stock.replace('<all>','<all custom="keep"><extra><![CDATA[unknown <data> & unchanged]]></extra><!--测试注释-->');const input=path.join(root,'原图副本.xml');fs.writeFileSync(input,fixture);
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},input);
 await frame.locator('#open').click();await until(()=>frame.evaluate(()=>filename==='原图副本.xml'));assert.equal(await frame.evaluate(()=>raw),fixture);ok('open preserves full XML, BOM, comments and unknown node');
 const before=await frame.evaluate(()=>raw);await frame.locator('#layer').selectOption('obj');await frame.locator('#palette').selectOption('safe');await frame.locator('#tool').selectOption('place');await frame.locator('#canvas').click({position:{x:250,y:110}});
 await until(()=>frame.evaluate(()=>dirty()));const placed=await frame.evaluate(()=>raw);assert.notEqual(placed,before);assert.ok(placed.includes('<extra><![CDATA[unknown <data> & unchanged]]></extra>'));ok('object placement keeps unrecognized data');
 await frame.locator('#undo').click();assert.equal(await frame.evaluate(()=>raw),before);await frame.locator('#redo').click();assert.equal(await frame.evaluate(()=>raw),placed);ok('undo and redo restore exact XML');
 const nameInput=frame.locator('[data-target="room"][data-property="name"]');await nameInput.fill('整合验证房间');await nameInput.press('Tab');await until(()=>frame.evaluate(()=>room().attrs.name==='整合验证房间'));
 const others=await frame.evaluate(()=>doc.rooms.slice(1).map(r=>M.nodeXML(doc,r)));assert.deepEqual(others,M.parse(fixture).rooms.slice(1).map(r=>M.nodeXML(M.parse(fixture),r)));ok('room rename changes only its own attribute');
 await frame.locator('#tool').selectOption('paint');await frame.locator('#layer').selectOption('1');await frame.locator('#palette').selectOption('A');await frame.locator('#shape').selectOption('2');await frame.locator('#canvas').click({position:{x:250,y:110}});
 const cell=await frame.evaluate(()=>M.cells(room())[5][12]);assert.ok(cell.startsWith('A;'));ok('terrain paint and half-height encode correctly');
 await frame.locator('#copyRoom').click();await frame.locator('#dialogValue').fill('复制验证房间');await frame.locator('#dialogOK').click();await until(()=>frame.evaluate(()=>doc.rooms.length===56));assert.equal(await frame.evaluate(()=>room().attrs.name),'复制验证房间');
 await frame.locator('#removeRoom').click();await until(()=>frame.evaluate(()=>doc.rooms.length===55));ok('room copy and delete preserve multi-room collection');
 await frame.locator('#saveAs').click();await new Promise(r=>setTimeout(r,150));assert.equal(await frame.evaluate(()=>dirty()),true);ok('cancelled save keeps dirty state');
 const target=path.join(root,'saved/完整地图.xml');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},target);
 await frame.locator('#saveAs').click();await until(()=>frame.evaluate(()=>!dirty()));assert.equal(fs.readFileSync(target,'utf8'),await frame.evaluate(()=>raw));assert.equal(fs.readFileSync(input,'utf8'),fixture);ok('save-as writes and verifies full map, original untouched');
 await frame.locator('[data-room="0"]').click();await frame.locator('#preview').click();await until(()=>frame.evaluate(()=>showNative));assert.equal(await frame.locator('#png').isEnabled(),true);assert.equal(await frame.evaluate(()=>previewImage.naturalWidth),1920);ok('real native preview appears inside the map page');
 await capture('native-preview.png');
 const png=path.join(root,'export/room.png');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},png);await frame.locator('#png').click();await until(()=>fs.existsSync(png));assert.equal(fs.readFileSync(png).subarray(0,8).toString('hex'),'89504e470d0a1a0a');ok('PNG export opens save flow and creates a valid image');
 await frame.locator('[data-room="1"]').click();assert.equal(await frame.locator('#png').isDisabled(),true);ok('switching room invalidates previous PNG');
 await frame.locator('#preview').click();await until(()=>frame.evaluate(()=>showNative));await frame.locator('#mirror').check();assert.equal(await frame.locator('#png').isDisabled(),true);ok('changing preview options invalidates previous PNG');
 await frame.locator('#editView').click();const text=frame.locator('[data-target="room"][data-property="name"]');await text.fill('重启恢复验证');await text.press('Tab');await until(()=>frame.evaluate(()=>dirty()));
 const dirtyRaw=await frame.evaluate(()=>raw),history=await frame.evaluate(()=>undo.length);await page.locator('[data-workspace="loot"]').click();await page.locator('[data-workspace="barks"]').click();await page.locator('[data-workspace="map"]').click();assert.equal(await frame.evaluate(()=>raw),dirtyRaw);assert.equal(await frame.evaluate(()=>undo.length),history);ok('switching among three pages keeps map changes and undo history');
 await frame.evaluate(()=>recover());const recovery=JSON.parse(fs.readFileSync(path.join(root,'data/config/maps/recovery.json'),'utf8'));assert.equal(recovery.raw,dirtyRaw);assert.equal(recovery.roomIndex,1);ok('recovery awaits persisted current room and complete map');
 await capture('editor.png');
 await page.evaluate(()=>workshop.close()).catch(()=>{});await app.close().catch(()=>{});app=null;
 await boot();assert.equal(await frame.evaluate(()=>raw),dirtyRaw);assert.equal(await frame.evaluate(()=>index),1);assert.equal(await frame.evaluate(()=>dirty()),true);ok('restart restores dirty document and selected room');
 const revision=await frame.evaluate(()=>revision);const original=await frame.evaluate(()=>raw);await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>{await new Promise(r=>setTimeout(r,350));return {canceled:false,filePath:process.env.RMODIFIER_TEST_ROOT+'/saved/pending.xml'};};});
 const saving=frame.evaluate(()=>save(true));await new Promise(r=>setTimeout(r,100));await frame.evaluate(()=>changed(M.attribute(raw,room(),'name','保存期间的新改动')));await saving;assert.equal(await frame.evaluate(()=>dirty()),true);assert.ok(await frame.evaluate(()=>revision)>revision);assert.equal(fs.readFileSync(path.join(root,'saved/pending.xml'),'utf8'),original);ok('late save response cannot clear newer changes');
 assert.deepEqual(errors,[]);ok('no JavaScript or CSP errors');
 fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({passed:true,checks,errors,root,fixtureHash:hash(fixture)},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,root}));
})().catch(e=>{fs.writeFileSync(path.join(root,'failure.json'),JSON.stringify({error:e.stack,checks,errors},null,2));console.error(e);process.exitCode=1;}).finally(async()=>{if(app){try{await page.evaluate(()=>workshop.close());}catch{}await app.close();}});
