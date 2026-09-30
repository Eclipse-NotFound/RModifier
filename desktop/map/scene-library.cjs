'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./document.js'),X=require('./xml.js'),{hash,validate}=require('./native-document.cjs');
const catalog=require('./scenes.json');
const id=()=>crypto.randomUUID();
const inside=(root,file)=>{const r=path.relative(path.resolve(root),path.resolve(file));return r===''||!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);};
function read(file){const bytes=fs.readFileSync(file);if(bytes.length>8000000)throw Error('地图文件太大');return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
function atomic(file,raw){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp-'+id();try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
function label(value){const s=String(value??'').trim();if(!s||s.length>80||/[\x00-\x1f]/.test(s))throw Error('请填写 1～80 字的名称');return s;}
const options=r=>r.children.find(n=>n.name==='options')?.attrs||{};
const mixable=r=>!Object.hasOwn(options(r),'nornd')&&['','uniq','surf','roof','pass','passroof','roofpass','vert'].includes(options(r).tip||'');
function additions(raw,baseline,poolId){
 const d=validate(raw),base=validate(baseline),original=new Map(base.rooms.map(r=>[r.attrs.name,M.nodeXML(base,r)])),byName=new Map(d.rooms.map(r=>[r.attrs.name,r]));
 const changed=d.rooms.filter(r=>M.nodeXML(d,r)!==original.get(r.attrs.name)),primary=changed.filter(mixable),included=new Set(primary);
 function dependency(r,trail=new Set()) {const name=options(r).back;if(!name)return;if(trail.has(name))throw Error('关联的背景房间形成循环：'+name);const next=byName.get(name);if(!next)throw Error('找不到关联的背景房间：'+name);included.add(next);dependency(next,new Set([...trail,name]));}
 primary.forEach(r=>dependency(r));
 const rename=name=>'rm_'+poolId.replace(/-/g,'')+'_'+hash(name).slice(0,16);
 const rooms=[...included].map(r=>{let s=M.attribute(M.nodeXML(d,r),X.scanXml(M.nodeXML(d,r)),'name',rename(r.attrs.name));const o=X.scanXml(s).children.find(n=>n.name==='options');if(o?.attrs.back)s=M.attribute(s,o,'back',rename(o.attrs.back));return s;});
 return {raw:'<all>\n'+rooms.join('\n')+'\n</all>',count:primary.length,dependencies:rooms.length-primary.length,skipped:changed.filter(r=>!included.has(r)).map(r=>r.attrs.name)};
}
class SceneLibrary {
 constructor(workspace){this.workspace=workspace;this.root=path.join(workspace.dataRoot,'projects/maps/library');this.indexFile=path.join(this.root,'index.json');this.activeFile=path.join(workspace.dataRoot,'config/map-pools.json');this.originalRoot=path.join(workspace.gameRoot,'Rooms');this.entries=new Map();this.cache=new Map();}
 index(){if(!fs.existsSync(this.indexFile))return {version:1,pools:[]};const v=JSON.parse(read(this.indexFile));if(v.version!==1||!Array.isArray(v.pools))throw Error('我的地图目录无法读取，已保留原文件');return v;}
 writeIndex(v){this.workspace.checkWrite(this.indexFile);atomic(this.indexFile,JSON.stringify(v,null,2)+'\n');}
 active(){if(!fs.existsSync(this.activeFile))return {version:1,selections:{}};const v=JSON.parse(read(this.activeFile));if(v.version!==1||!v.selections||typeof v.selections!=='object')throw Error('游戏房间池设置无法读取');return v;}
 poolPath(pool){if(!/^[a-f0-9-]{36}$/.test(pool.id))throw Error('房间池编号无效');return path.join(this.root,pool.id+'.xml');}
 scan(){
  const entries=[];this.entries.clear();
  for(const file of fs.readdirSync(this.originalRoot).filter(f=>/\.xml$/i.test(f)).sort()){
   const p=path.join(this.originalRoot,file);if(!fs.statSync(p).isFile())continue;
   entries.push(this.describe({id:'original:'+file,name:catalog[file]?.name||file.replace(/\.xml$/i,''),file:p,sourceFile:file,original:true}));
  }
  for(const pool of this.index().pools)entries.push(this.describe({...pool,file:this.poolPath(pool),original:false}));
  return entries;
 }
 describe(entry){
  let data;try{const stamp=fs.statSync(entry.file),key=entry.file+'|'+stamp.mtimeMs+'|'+stamp.size;data=this.cache.get(key);if(!data){const raw=read(entry.file),doc=validate(raw);data={raw,rooms:doc.rooms.map(r=>({name:r.attrs.name,x:r.attrs.x??'',y:r.attrs.y??'',z:r.attrs.z??'',type:options(r).tip||'',mixable:mixable(r),terrain:M.cells(r)})),fixed:!doc.random};this.cache.set(key,data);}}
  catch(e){entry.error=e.message;data={rooms:[]};}
  this.entries.set(entry.id,{...entry,...data});
  const active=this.active().selections[entry.sourceFile];
  return {id:entry.id,name:entry.name,sourceFile:entry.sourceFile,original:!!entry.original,fixed:data.fixed,count:data.rooms.length,error:entry.error,lands:catalog[entry.sourceFile]?.lands||[],random:!!catalog[entry.sourceFile]?.random,active:entry.original?!active:active?.poolId===entry.id,publishedCount:active?.poolId===entry.id?active.count:0};
 }
 get(key){if(!this.entries.has(key))this.scan();const e=this.entries.get(key);if(!e)throw Error('这个场景已不存在，请刷新列表');if(e.error)throw Error(e.error);return e;}
 detail(key){const e=this.get(key);return {id:e.id,name:e.name,sourceFile:e.sourceFile,original:!!e.original,fixed:e.fixed,rooms:e.rooms};}
 identify(file){if(!file)return null;this.scan();return [...this.entries.values()].find(e=>path.resolve(e.file).toLowerCase()===path.resolve(file).toLowerCase())?.id||null;}
 open(key){const e=this.get(key);return {...this.workspace.value(read(e.file),e.file),filename:e.original?path.basename(e.file):e.name+'.xml',libraryId:key};}
 create({sourceId,name,raw}){
  const source=this.get(sourceId),index=this.index(),pool={id:id(),name:label(name),sourceFile:source.sourceFile,createdAt:new Date().toISOString()};
  if(index.pools.some(p=>p.name===pool.name))throw Error('已有同名房间池，请换一个名称');
  raw=raw??read(source.file);validate(raw);const file=this.poolPath(pool);this.workspace.protectMapWrite(file);atomic(file,raw);
  // Compare against the source at creation, even after a game update.
  const baseline=path.join(this.root,pool.id+'.base.xml');this.workspace.protectMapWrite(baseline);atomic(baseline,source.original?read(source.file):read(path.join(this.root,source.id+'.base.xml')));
  try{index.pools.push(pool);this.writeIndex(index);}catch(e){/* Keep the completed XML recoverable if indexing fails. */throw Error('副本已保存，但目录更新失败：'+e.message);}
  this.scan();return this.open(pool.id);
 }
 rename(key,name){const index=this.index(),p=index.pools.find(p=>p.id===key);if(!p)throw Error('游戏原图不能改名，请先创建副本');p.name=label(name);if(index.pools.some(q=>q.id!==key&&q.name===p.name))throw Error('已有同名房间池');this.writeIndex(index);this.scan();}
 save(handle,raw){const h=this.workspace.get(handle);if(!inside(this.root,h.file||''))throw Error('请先创建房间池副本');this.workspace.protectMapWrite(h.file);validate(raw);if(!fs.existsSync(h.file)||hash(fs.readFileSync(h.file))!==h.diskHash)throw Error('房间池已被其他程序修改，请另存后核对');
  const backup=path.join(this.workspace.dataRoot,'backups/maps',Date.now()+'-'+id()+'.xml');this.workspace.checkWrite(backup);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(h.file,backup,fs.constants.COPYFILE_EXCL);atomic(h.file,raw);h.diskHash=hash(raw);h.currentHash=h.diskHash;
  atomic(this.workspace.recentFile,JSON.stringify({file:h.file}));this.cache.clear();return {filename:path.basename(h.file),sha256:h.diskHash};
 }
 publish(key,{dryRun=false}={}){const e=this.get(key),meta=catalog[e.sourceFile];if(!meta?.random)throw Error('这是固定剧情场景，可以编辑并保存副本。混合抽取请从工厂、下水道等随机地区创建房间池');
  const value=this.active();if(e.original){delete value.selections[e.sourceFile];}else{
   const added=additions(read(e.file),read(path.join(this.root,e.id+'.base.xml')),e.id);if(!added.count)throw Error('还没有改过或新建的可混抽房间，请先编辑一个普通房间');const raw=added.raw;
   const digest=hash(raw),relative='projects/maps/published/'+e.id+'/'+digest+'.xml',target=path.join(this.workspace.dataRoot,relative);this.workspace.protectMapWrite(target);if(!fs.existsSync(target))atomic(target,raw);if(hash(fs.readFileSync(target))!==digest)throw Error('游戏副本核对失败');
   value.selections[e.sourceFile]={poolId:e.id,name:e.name,file:relative,sha256:digest,lands:meta.lands.filter(l=>l.random).map(l=>l.id),mode:'mix',count:added.count,dependencies:added.dependencies,skipped:added.skipped};
  }
  value.updatedAt=new Date().toISOString();if(dryRun)return value;this.workspace.checkWrite(this.activeFile);if(fs.existsSync(this.activeFile)){const backup=this.activeFile+'.'+Date.now()+'.bak';this.workspace.checkWrite(backup);fs.copyFileSync(this.activeFile,backup,fs.constants.COPYFILE_EXCL);}atomic(this.activeFile,JSON.stringify(value,null,2)+'\n');this.scan();return value;
 }
}
module.exports={SceneLibrary,atomic,read,label,additions,mixable};
