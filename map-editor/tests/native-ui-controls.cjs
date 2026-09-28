// Exercise the original Flash button listeners, including the no-selection state.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {NativeMapModule}=require('../../desktop/map/native-ui-module.cjs');
const M=require('../../desktop/map/document.js');
const project=path.resolve(__dirname,'../..'),installed=path.resolve(project,'../..');
const root=path.join(project,'build/out/map-native-ui-controls',crypto.randomUUID()),gameRoot=path.join(root,'fake-game'),dataRoot=path.join(gameRoot,'mods/RModifier');
let mod,failure;const checks=[],ok=name=>{checks.push(name);console.log('PASS '+name);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 fs.mkdirSync(path.join(gameRoot,'Rooms'),{recursive:true});fs.mkdirSync(dataRoot,{recursive:true});fs.mkdirSync(path.join(gameRoot,'runtimes/air'),{recursive:true});
 for(const file of ['adl64.exe','texture.swf','texture1.swf','sprite.swf','sprite1.swf','text_zh.xml'])fs.linkSync(path.join(installed,file),path.join(gameRoot,file));
 fs.symlinkSync(path.join(installed,'runtimes/air/win64'),path.join(gameRoot,'runtimes/air/win64'),'junction');
 fs.copyFileSync(path.join(installed,'Rooms/rooms_plant.xml'),path.join(gameRoot,'Rooms/rooms_plant.xml'));
 let savedPath=path.join(root,'work-copy.xml'),cancelled=false,dialogs=0;
 mod=new NativeMapModule({dialog:{showSaveDialog:async()=>{dialogs++;return cancelled?{canceled:true}:{canceled:false,filePath:savedPath};},showOpenDialog:async()=>({canceled:true})},getWindow:()=>null});
 await mod.mount({gameRoot,dataRoot,componentRoot:path.join(project,'map-editor/native-ui/component'),sessionRoot:path.join(root,'sessions'),testRoot:root,epoch:crypto.randomUUID()});
 const initial=(await mod.session.request('inspect')).input,raw=mod.doc.raw;
 assert.equal(initial.view.selectedKey,null);assert.equal(mod.state.dirty,false);
 await mod.session.request('test',{action:{kind:'button',control:'butZLay'}});
 assert.equal((await mod.flush('save')).status,'ready');assert.equal(mod.doc.raw,raw);assert.equal(mod.state.dirty,false);
 ok('Original switch-layer button with no selected object keeps random-room data clean and the session usable');
 const saved=await mod.saveDraft({as:true});assert.equal(saved.status,'saved',JSON.stringify(saved));assert.equal(dialogs,1);assert.equal(fs.readFileSync(savedPath,'utf8'),raw);
 ok('Host save still opens a dialog and writes the full byte-identical document after the button click');
 // A previously initialized fixed map must not leak its floor grid into a
 // later random collection. Both floor buttons use the original listeners.
 const fixed='<all><land serial="1"/>'+M.blankRoom('下层',{x:0,y:0,z:0})+M.blankRoom('上层',{x:0,y:0,z:1})+'</all>';
 const fixedPath=path.join(root,'fixed.xml');fs.writeFileSync(fixedPath,fixed);await mod.replaceValue(mod.workspace.value(fixed,fixedPath));
 await mod.session.request('test',{action:{kind:'select',room:'下层',key:null}});
 await mod.session.request('test',{action:{kind:'button',control:'butZLay'}});assert.equal((await mod.session.request('inspect')).input.view.roomName,'上层');
 await mod.session.request('test',{action:{kind:'button',control:'butZLay'}});assert.equal((await mod.session.request('inspect')).input.view.roomName,'下层');
 assert.equal((await mod.flush('inspect')).state.dirty,false);assert.equal(mod.doc.raw,fixed);
 ok('Original fixed-map floor button still switches both directions without changing any XML');
 await mod.replaceValue(mod.workspace.value(raw,path.join(gameRoot,'Rooms/rooms_plant.xml')));
 await mod.session.request('test',{action:{kind:'button',control:'butZLay'}});
 await mod.session.request('test',{action:{kind:'button',control:'map'}});
 assert.equal((await mod.flush('inspect')).status,'ready');assert.equal(mod.doc.raw,raw);assert.equal(mod.state.dirty,false);
 ok('Random collections ignore stale fixed-map floor controls and minimap presses after a document switch');
 await mod.session.request('test',{action:{kind:'button',control:'RModifier_PreviewEntry'}});
 let preview;const until=Date.now()+45000;do{await delay(100);preview=(await mod.session.request('inspect')).input.view.preview;}while((!preview?.ready||preview.busy)&&Date.now()<until);
 assert.equal(preview?.open,true);assert.equal(preview?.ready,true);assert.equal(preview?.busy,false);assert.equal((await mod.session.request('inspect')).input.view.selectedKey,null);
 cancelled=true;assert.equal((await mod.saveDraft({as:true})).status,'cancelled');assert.equal(dialogs,2);assert.deepEqual((await mod.session.request('inspect')).input.view.preview,preview);
 cancelled=false;savedPath=path.join(root,'preview-work-copy.xml');assert.equal((await mod.saveDraft({as:true})).status,'saved');assert.equal(dialogs,3);assert.equal(fs.readFileSync(savedPath,'utf8'),raw);assert.equal((await mod.session.request('inspect')).input.view.preview.open,true);
 ok('Original preview button with no selected object supports host Save As cancellation and success while staying open');
 assert.equal(fs.existsSync(path.join(mod.session.root,'fatal.json')),false);assert.equal(fs.readFileSync(path.join(installed,'Rooms/rooms_plant.xml'),'utf8'),raw);
 await mod.dispose();
})().catch(e=>{failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
 if(mod?.session?.exited===undefined)await mod.session.stop();
 fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({passed:!failure,checks,failure,session:mod?.session?.root,root},null,2));console.log(JSON.stringify({passed:!failure,checks:checks.length,root}));
});
