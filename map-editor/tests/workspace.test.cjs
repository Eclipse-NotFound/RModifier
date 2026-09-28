const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {MapWorkspace}=require('../../desktop/map/workspace.cjs'),M=require('../../desktop/map/document.js');
const project=path.resolve(__dirname,'../..'),run=path.join(project,'build/out/map-tests',crypto.randomUUID());
fs.mkdirSync(run,{recursive:true});
function fixture(){const root=path.join(run,crypto.randomUUID()),dataRoot=path.join(root,'data'),gameRoot=path.join(root,'game'),componentRoot=path.join(root,'component');fs.mkdirSync(path.join(gameRoot,'Rooms'),{recursive:true});fs.writeFileSync(path.join(gameRoot,'Rooms/rooms_plant.xml'),M.create());let save=null,open=null;const dialog={showSaveDialog:async()=>save?{filePath:save,canceled:false}:{canceled:true},showOpenDialog:async()=>open?{filePaths:[open],canceled:false}:{canceled:true}};return {root,dataRoot,gameRoot,dialog,componentRoot,setSave:v=>save=v,setOpen:v=>open=v,newService:()=>new MapWorkspace({gameRoot,dataRoot,componentRoot,dialog,getWindow:()=>null,testRoot:root})};}
test('save, cancel, backup, recovery and dirty revision contract write only isolated files',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapBoot(),stock=path.join(f.gameRoot,'Rooms/rooms_plant.xml');
  assert.equal(await s.mapSave({...v,revision:1}),null);assert.equal(fs.readFileSync(stock,'utf8'),v.raw);
  const target=path.join(f.root,'我的工作/地图.xml');f.setSave(target);const first=await s.mapSave({...v,revision:1});assert.equal(first.revision,1);assert.equal(fs.readFileSync(target,'utf8'),v.raw);
  const raw=M.attribute(v.raw,M.parse(v.raw).rooms[0],'name','修改过的房间');await s.mapSave({id:v.id,raw,revision:2});
  const backups=fs.readdirSync(path.join(f.dataRoot,'backups/maps'));assert.equal(backups.length,1);assert.equal(fs.readFileSync(path.join(f.dataRoot,'backups/maps',backups[0]),'utf8'),v.raw);
  assert.equal(await s.mapRecover({id:v.id,raw,revision:2,dirty:true,roomIndex:0}),true);
  assert.equal(await s.mapRecover({id:v.id,raw:v.raw,revision:1}),false);
  const restored=await f.newService().mapBoot();assert.equal(restored.raw,raw);assert.equal(restored.dirty,true);assert.equal(restored.recovered,true);
  assert.equal(await s.mapOpen(),null);
});
test('external modification and deletion prevent overwriting the last known source',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapNew();const target=path.join(f.root,'external.xml');f.setSave(target);await s.mapSave({...v,revision:1});
  fs.writeFileSync(target,M.create(true));await assert.rejects(s.mapSave({...v,revision:2}),/其他程序/);assert.equal(fs.readFileSync(target,'utf8'),M.create(true));
  fs.unlinkSync(target);await assert.rejects(s.mapSave({...v,revision:2}),/其他程序/);
});
test('formal game maps and writes outside the test root are rejected',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapNew();f.setSave(path.join(f.gameRoot,'Rooms/rooms_plant.xml'));await assert.rejects(s.mapSave({...v,revision:1}),/正式地图/);
  f.setSave(path.join(run,'outside.xml'));await assert.rejects(s.mapSave({...v,revision:1}),/隔离目录/);assert.ok(!fs.existsSync(path.join(run,'outside.xml')));
});
test('recovery tracks external changes across restart; old document cannot overwrite new recovery',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapNew(),target=path.join(f.root,'source.xml');f.setSave(target);await s.mapSave({...v,revision:1});await s.mapRecover({...v,revision:1});
  fs.writeFileSync(target,M.create(true));const s2=f.newService(),restored=await s2.mapBoot();await assert.rejects(s2.mapSave({...restored,revision:2}),/其他程序/);
  const next=await s.mapNew({fixed:true});assert.equal(M.parse(next.raw).random,false);await s.mapRecover({...next,revision:3,dirty:true});assert.equal(await s.mapRecover({...v,revision:4}),false);
  assert.ok(fs.readdirSync(path.join(f.dataRoot,'config/maps/recovery-history')).length>0);
});
test('malformed and invalid UTF-8 maps do not replace active document or recovery',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapNew(),bad=path.join(f.root,'bad.xml');await s.mapRecover({...v,revision:1});
  fs.writeFileSync(bad,Buffer.from([0xff,0xfe,0xab]));f.setOpen(bad);await assert.rejects(s.mapOpen());assert.equal(s.activeId,v.id);
  await assert.rejects(s.mapRecover({id:v.id,raw:'<all>',revision:2}));assert.equal((await f.newService().mapBoot()).raw,v.raw);
});
test('Windows case variants cannot bypass source conflicts or game-root guard',async()=>{
  if(process.platform!=='win32')return;
  const f=fixture(),s=f.newService(),v=await s.mapNew(),target=path.join(f.root,'Case.xml');f.setSave(target);await s.mapSave({...v,revision:1});
  fs.writeFileSync(target,M.create(true));f.setSave(target.toUpperCase());await assert.rejects(s.mapSave({...v,as:true,revision:2}),/其他程序/);
  f.setSave(path.join(f.gameRoot,'application.xml').toUpperCase());await assert.rejects(s.mapSave({...v,as:true,revision:2}),/正式地图/);
});
test('directory junction cannot direct test output outside its declared root',async()=>{
  const f=fixture(),s=f.newService(),v=await s.mapNew(),external=path.join(run,'junction-target-'+crypto.randomUUID()),link=path.join(f.root,'linked');fs.mkdirSync(external);
  fs.symlinkSync(external,link,process.platform==='win32'?'junction':'dir');f.setSave(path.join(link,'escape.xml'));await assert.rejects(s.mapSave({...v,revision:1}),/隔离目录/);assert.equal(fs.readdirSync(external).length,0);
});
