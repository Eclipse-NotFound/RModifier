// Integration check: reads installed game assets; every output belongs to a unique test directory.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {NativeSession,hash}=require('../../desktop/map/native-session.cjs'),{MapWorkspace}=require('../../desktop/map/workspace.cjs'),M=require('../../desktop/map/document.js');
const project=path.resolve(__dirname,'../..'),gameRoot=path.resolve(project,'../..'),root=path.join(project,'build/out/map-native',crypto.randomUUID()),componentRoot=path.join(project,'map-editor/component');
fs.mkdirSync(root,{recursive:true});
const outputs=[],checks=[];let service,second;
const ok=name=>{checks.push(name);console.log('PASS '+name);};
const dialog={showSaveDialog:async()=>({canceled:false,filePath:path.join(root,'export.png')}),showOpenDialog:async()=>({canceled:true})};
(async()=>{
 const stock=fs.readFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'),'utf8'),stockHash=hash(stock),roomCount=M.parse(stock).rooms.length;
 service=new MapWorkspace({gameRoot,componentRoot,dataRoot:path.join(root,'data'),sessionRoot:path.join(root,'sessions'),testRoot:root,dialog,getWindow:()=>null});
 const v=await service.mapBoot(),ready=await service.rendererReady();assert.equal(ready.protocol,1);assert.ok(ready.capabilities.includes('entities'));ok('hidden renderer ready with unique session');
 for(let index=0;index<roomCount;index++){
   const result=await service.mapPreview({id:v.id,raw:stock,index,revision:index,options:{}});assert.equal(result.inputHash,stockHash);assert.equal(result.report.nativeRenderer,true);assert.deepEqual(result.report.renderSize,[1920,1000]);outputs.push({requestId:result.requestId,pngHash:result.pngHash,room:result.report.room,warnings:result.report.warnings});
   if(index===0){await service.mapPNG(result.requestId);assert.equal(hash(fs.readFileSync(path.join(root,'export.png'))),result.pngHash);ok('exported PNG bytes match current request');}
   if((index+1)%10===0)console.log('Rendered factory rooms '+(index+1)+'/'+roomCount);
 }
 ok('all '+roomCount+' factory rooms rendered in one persistent session');
 for(const region of ['random_stable','random_sewer','random_mbase','random_plant','random_mane','random_canter']){
   assert.ok(ready.regions.some(r=>r.id===region),'known region '+region);const r=await service.mapPreview({id:v.id,raw:stock,index:0,revision:100,options:{region,difficulty:50,mirror:true}});assert.equal(r.report.region,region);assert.equal(r.report.mirror,true);assert.equal(r.report.difficulty,50);outputs.push({region,pngHash:r.pngHash,report:r.report});
 }
 ok('six environments, mirror and strength 50');
 const off=await service.mapPreview({id:v.id,raw:stock,index:0,revision:101,options:{objects:false,entities:false,examples:false}});assert.equal(off.report.entities,0);assert.equal(off.report.examples,0);assert.equal(off.report.objects,0);ok('object and entity switches');
 await assert.rejects(service.native.render({xml:'<all>',documentRevision:102}),/./);
 await service.mapPreview({id:v.id,raw:stock,index:0,revision:103});ok('malformed request reports failure and session recovers');
 const pending=service.native.render({xml:stock,documentRevision:104});service.native.cancel();await assert.rejects(pending,/取消/);await service.mapPreview({id:v.id,raw:stock,index:0,revision:105});ok('cancelled request is discarded, next request succeeds');
 const inflight=service.mapPreview({id:v.id,raw:stock,index:0,revision:106});
 const revised=M.attribute(stock,M.parse(stock).rooms[0],'name','new revision');await service.mapRecover({id:v.id,raw:revised,revision:107,dirty:true});await assert.rejects(inflight,/过期/);await assert.rejects(service.mapPNG(service.preview.requestId),/最新预览/);ok('editing during render invalidates result and old PNG');
 second=new NativeSession({gameRoot,componentRoot,sessionRoot:path.join(root,'second')});await second.start();assert.notEqual(second.sessionId,service.native.sessionId);assert.notEqual(second.process.pid,service.native.process.pid);await second.dispose();assert.equal(second.exit,0);ok('two renderer instances are isolated; owned process exits cleanly');
 assert.equal(hash(fs.readFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'))),stockHash);ok('source map unchanged');
 const native=service.native;await service.dispose();assert.equal(native.exit,0);ok('primary renderer exits cleanly');
 await assert.rejects(new NativeSession({gameRoot:path.join(root,'missing'),componentRoot,sessionRoot:path.join(root,'missing-session')}).start(),/缺少游戏素材/);ok('missing assets produce actionable error');
 fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({passed:true,checks,outputs,root,session:native.root,sourceHash:stockHash},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,renders:outputs.length,root}));
})().catch(e=>{fs.writeFileSync(path.join(root,'failure.json'),JSON.stringify({error:e.stack,checks,outputs},null,2));console.error(e);process.exitCode=1;}).finally(async()=>{await second?.dispose();await service?.dispose();});
