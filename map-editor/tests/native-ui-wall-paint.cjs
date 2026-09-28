// Isolated real AIR regression for the dark background wall reported by the user.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {NativeMapModule}=require('../../desktop/map/native-ui-module.cjs');
const M=require('../../desktop/map/document.js');
const catalog=require('../../desktop/map/catalog.json');
const project=path.resolve(__dirname,'../..'),installed=path.resolve(project,'../..');
const root=path.join(project,'build/out/map-native-wall-paint',crypto.randomUUID());
const gameRoot=path.join(root,'fake-game'),dataRoot=path.join(gameRoot,'mods/RModifier');
let mod,failure,savedPath=path.join(root,'wall.xml');const checks=[],errors=[],observations=[];
const ok=name=>{checks.push(name);console.log('PASS '+name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const native=action=>mod.session.request('test',{action});
const cell=(x,y)=>M.cells(M.parse(mod.doc.raw).rooms[0])[y][x];
async function expectTile(x,y,encoded,layer){assert.equal(cell(x,y),encoded);await native({kind:'assertTile',x,y,encoded,layer});}
(async()=>{
 fs.mkdirSync(path.join(gameRoot,'Rooms'),{recursive:true});fs.mkdirSync(dataRoot,{recursive:true});fs.mkdirSync(path.join(gameRoot,'runtimes/air'),{recursive:true});
 for(const file of ['adl64.exe','texture.swf','texture1.swf','sprite.swf','sprite1.swf','text_zh.xml'])fs.linkSync(path.join(installed,file),path.join(gameRoot,file));
 fs.symlinkSync(path.join(installed,'runtimes/air/win64'),path.join(gameRoot,'runtimes/air/win64'),'junction');
 const raw='<all>'+M.blankRoom('墙体绘制回归')+'</all>';
 fs.writeFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'),raw);
 mod=new NativeMapModule({dialog:{showSaveDialog:async()=>({canceled:false,filePath:savedPath}),showOpenDialog:async()=>({canceled:true})},getWindow:()=>null,onError:e=>errors.push(String(e))});
 await mod.mount({gameRoot,dataRoot,componentRoot:process.env.RMODIFIER_WALL_COMPONENT||path.join(project,'map-editor/native-ui/component'),sessionRoot:path.join(root,'sessions'),testRoot:root,epoch:crypto.randomUUID()});
 await mod.session.request('test',{action:{kind:'palettePaint',layer:2,id:'P',x:10,y:10}});
 const receipt=await mod.flush('wall-regression');
 observations.push({receipt,cell:M.cells(M.parse(mod.doc.raw).rooms[0])[10][10],inspect:await mod.session.request('inspect')});
 assert.equal(receipt.status,'ready');
 assert.equal(M.cells(M.parse(mod.doc.raw).rooms[0])[10][10],'_P','Dark wall should survive the original drawing and host synchronization');
 await expectTile(10,10,'_P',2);
 ok('Dark wall P is retained by the real AIR drawing pipeline');
 await mod.action('undo');await expectTile(10,10,'_');assert.equal(mod.doc.raw,raw);
 await mod.action('redo');await expectTile(10,10,'_P',2);
 ok('One undo removes the wall and redo restores its visible native tile');
 await native({kind:'palettePaint',layer:1,id:'C',x:10,y:10});await expectTile(10,10,'CP',1);
 await native({kind:'button',control:'butBackErase'});await native({kind:'stroke',x:10,y:10});await expectTile(10,10,'C',1);
 await mod.action('undo');await expectTile(10,10,'CP',2);
 await native({kind:'button',control:'butFrontErase'});await native({kind:'stroke',x:10,y:10});await expectTile(10,10,'_P',2);
 ok('Foreground and background paint/erase preserve the other layer and remain undoable');
 for(let i=0;i<catalog.materials.length;i++){
  const material=catalog.materials[i],x=2+i%30,y=2+Math.floor(i/30),encoded=(material.layer===1?'':'_')+material.id;
  await native({kind:'palettePaint',layer:material.layer,id:material.id,x,y});
  await expectTile(x,y,encoded,material.layer);
 }
 ok('All 67 original palette materials paint, synchronize and display on their correct layers');
 const beforeRectangle=mod.doc.raw;
 await native({kind:'palettePaint',layer:2,id:'P',x:12,y:10,x2:18,y2:15});
 for(let y=10;y<=15;y++)for(let x=12;x<=18;x++)assert.equal(cell(x,y),'_P');
 await mod.action('undo');assert.equal(mod.doc.raw,beforeRectangle);await mod.action('redo');
 await expectTile(15,12,'_P',2);
 ok('A rectangle of dark wall tiles is one undoable drawing operation');
 assert.equal((await mod.saveDraft({as:true})).status,'saved');
 assert.equal(M.cells(M.parse(fs.readFileSync(path.join(root,'wall.xml'),'utf8')).rooms[0])[10][10],'_P');
 ok('Dark wall is present in the saved working copy');
 const savedRaw=fs.readFileSync(savedPath,'utf8');
 await mod.replaceValue(mod.workspace.value(savedRaw,savedPath));await expectTile(15,12,'_P',2);
 ok('Reopening the saved map restores the wall in the original editor');
 await mod.setViewport({fit:true});
 const editorCapture=await mod.session.request('capture');fs.copyFileSync(path.join(mod.session.root,editorCapture.png),path.join(root,'editor.png'));
 await native({kind:'preview'});
 let preview;const until=Date.now()+45000;
 do{await delay(100);preview=(await mod.session.request('inspect')).input.view.preview;}while((!preview?.ready||preview.busy)&&Date.now()<until);
 assert.equal(preview?.open,true);assert.equal(preview?.ready,true);assert.equal(preview?.busy,false);
 savedPath=path.join(root,'wall-preview.png');await native({kind:'exportPreview'});
 const exportUntil=Date.now()+10000;while(!fs.existsSync(savedPath)&&Date.now()<exportUntil)await delay(50);
 const png=fs.readFileSync(savedPath);assert.equal(png.readUInt32BE(16),1920);assert.equal(png.readUInt32BE(20),1000);
 ok('Original native preview renders and exports the painted room');
 const events=fs.readdirSync(path.join(mod.session.root,'events')).map(f=>JSON.parse(fs.readFileSync(path.join(mod.session.root,'events',f),'utf8')));
 for(const event of events.filter(e=>e.kind==='commit'))for(const operation of event.payload.operations.filter(o=>o.kind==='paint'))for(const c of operation.cells)for(const id of Object.values(c.layers)){assert.equal(typeof id,'string');assert.notEqual(id,'XMLList');}
 const acknowledgements=fs.readdirSync(path.join(mod.session.root,'acks')).map(f=>JSON.parse(fs.readFileSync(path.join(mod.session.root,'acks',f),'utf8')));
 assert.deepEqual(acknowledgements.filter(a=>a.error).map(a=>a.error),[]);assert.equal(fs.existsSync(path.join(mod.session.root,'fatal.json')),false);
 assert.equal(fs.readFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'),'utf8'),raw);
 ok('Every real palette edit sends a string ID; no rejected commits, fatal errors or source-map changes');
 await mod.dispose();
})().catch(e=>{failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
 if(mod?.session?.exited===undefined)await mod.session.stop();
 fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({passed:!failure,checks,errors,observations,failure,session:mod?.session?.root,root},null,2));
 console.log(JSON.stringify({passed:!failure,checks:checks.length,root}));
});
