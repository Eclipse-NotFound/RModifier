const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Map=require('./document.js');
const {NativeSession,hash}=require('./native-session.cjs');
const inside=(root,file)=>{const rel=path.relative(path.resolve(root),path.resolve(file));return rel===''||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
const same=(a,b)=>path.relative(path.resolve(a),path.resolve(b))==='';
function physical(file){let cursor=path.resolve(file),tail=[];while(!fs.existsSync(cursor)){const parent=path.dirname(cursor);if(parent===cursor)break;tail.unshift(path.basename(cursor));cursor=parent;}return path.join(fs.realpathSync(cursor),...tail);}
function read(file,max=8000000){if(fs.statSync(file).size>max)throw Error('地图文件超过大小限制');return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(fs.readFileSync(file));}
function atomic(file,raw){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp-'+crypto.randomUUID();try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,raw,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(read(temp,16000000)!==raw)throw Error('地图写入核对失败');fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
class MapWorkspace {
  constructor({gameRoot,dataRoot,componentRoot,sessionRoot,dialog,getWindow,testRoot}){
    this.gameRoot=path.resolve(gameRoot);this.dataRoot=path.resolve(dataRoot);this.componentRoot=path.resolve(componentRoot);
    this.sessionRoot=path.resolve(sessionRoot||path.join(dataRoot,'build/out/map-sessions'));this.dialog=dialog;this.getWindow=getWindow;this.testRoot=testRoot?path.resolve(testRoot):null;
    this.handles=new globalThis.Map();this.recoveryFile=path.join(this.dataRoot,'config/maps/recovery.json');this.recentFile=path.join(this.dataRoot,'config/maps/recent.json');
    if(this.testRoot){this.checkWrite(this.dataRoot);this.checkWrite(this.sessionRoot);}
  }
  owner(){return this.getWindow?.();}
  checkWrite(file){if(this.testRoot&&(!inside(this.testRoot,file)||!inside(physical(this.testRoot),physical(file))))throw Error('地图测试禁止写出隔离目录');}
  value(raw,file,extra={}){
    Map.parse(raw);const id=crypto.randomUUID();this.activeId=id;
    this.handles.set(id,{file,diskHash:file&&fs.existsSync(file)?hash(fs.readFileSync(file)):null,currentHash:hash(raw),recoveredRevision:-1,newFile:!file});
    return {id,raw,filename:file?path.basename(file):'新地图.xml',dirty:!file,...extra};
  }
  get(id){const entry=this.handles.get(id);if(!entry)throw Error('地图句柄已失效，请重新打开');return entry;}
  archiveRecovery(){if(fs.existsSync(this.recoveryFile)){const target=path.join(this.dataRoot,'config/maps/recovery-history',Date.now()+'-'+crypto.randomUUID()+'.json');this.checkWrite(target);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(this.recoveryFile,target,fs.constants.COPYFILE_EXCL);}}
  async mapBoot(){
    if(fs.existsSync(this.recoveryFile)){
      const cached=JSON.parse(read(this.recoveryFile,12000000));Map.parse(cached.raw);
      const v=this.value(cached.raw,cached.sourceFile||null,{dirty:!!cached.dirty,recovered:true,roomIndex:cached.roomIndex||0});
      // A source changed while the app was closed must still be detected on Save.
      if(cached.sourceFile)this.get(v.id).diskHash=cached.diskHash;return v;
    }
    let file;try{file=JSON.parse(read(this.recentFile)).file;}catch{}
    if(!file||!fs.existsSync(file))file=path.join(this.gameRoot,'Rooms/rooms_plant.xml');
    return this.value(read(file),file);
  }
  async mapOpen(){
    const d=await this.dialog.showOpenDialog(this.owner(),{title:'打开完整地图 XML',properties:['openFile'],filters:[{name:'地图 XML',extensions:['xml']}]});
    if(d.canceled)return null;const raw=read(d.filePaths[0]);Map.parse(raw);this.archiveRecovery();return this.value(raw,path.resolve(d.filePaths[0]));
  }
  async mapNew(options={}){this.archiveRecovery();return this.value(Map.create(!!options.fixed),null);}
  async mapRecover({id,raw,revision=0,dirty=false,roomIndex=0}){
    const h=this.get(id);Map.parse(raw);if(id!==this.activeId||revision<h.recoveredRevision)return false;
    if(!Number.isSafeInteger(revision)||revision<0||!Number.isInteger(roomIndex)||roomIndex<0)throw Error('地图修订号或房间编号无效');
    h.recoveredRevision=revision;h.currentHash=hash(raw);this.checkWrite(this.recoveryFile);
    atomic(this.recoveryFile,JSON.stringify({format:'rmodifier-map-recovery',version:1,raw,revision,dirty:!!dirty,roomIndex,sourceFile:h.file,diskHash:h.diskHash,savedAt:Date.now()}));return true;
  }
  async mapSave({id,raw,revision=0,as=false}){
    const h=this.get(id);Map.parse(raw);let file=h.file;
    const formal=file&&(inside(path.join(this.gameRoot,'Rooms'),file)||same(path.dirname(file),this.gameRoot));
    if(as||!file||formal){const d=await this.dialog.showSaveDialog(this.owner(),{title:'保存地图工作副本',defaultPath:path.join(this.dataRoot,'projects/maps',file?path.basename(file):'新地图.xml'),filters:[{name:'地图 XML',extensions:['xml']}]});if(d.canceled)return null;file=path.resolve(d.filePath);}
    this.checkWrite(file);
    if(path.extname(file).toLowerCase()!=='.xml')throw Error('地图需要保存为 .xml 文件');
    const actual=physical(file);
    if(inside(physical(path.join(this.gameRoot,'Rooms')),actual)||same(path.dirname(actual),physical(this.gameRoot))||inside(physical(this.componentRoot),actual))throw Error('请选择工作目录。保存地图不直接覆盖正式地图或程序组件。');
    if(h.file&&same(h.file,file)&&h.diskHash&&(!fs.existsSync(file)||hash(fs.readFileSync(file))!==h.diskHash))throw Error('地图已被其他程序修改或移走，请另存一份后核对。');
    if(fs.existsSync(file)){const backup=path.join(this.dataRoot,'backups/maps',Date.now()+'-'+crypto.randomUUID()+'.xml');this.checkWrite(backup);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);}
    atomic(file,raw);h.file=file;h.diskHash=hash(raw);h.currentHash=h.diskHash;h.newFile=false;
    this.checkWrite(this.recentFile);atomic(this.recentFile,JSON.stringify({file}));return {id,filename:path.basename(file),revision,sha256:h.diskHash};
  }
  renderer(){if(!this.native)this.native=new NativeSession({gameRoot:this.gameRoot,componentRoot:this.componentRoot,sessionRoot:this.sessionRoot});return this.native;}
  async rendererReady(){try{return await this.renderer().start();}catch(e){await this.native?.dispose();this.native=null;throw e;}}
  async mapPreview({id,raw,index=0,revision=0,options={}}){
    const h=this.get(id),model=Map.parse(raw);if(!Number.isInteger(index)||!model.rooms[index])throw Error('房间编号无效');
    if(id!==this.activeId)throw Error('已切换地图，请重新生成预览');
    const settings={region:typeof options.region==='string'?options.region.slice(0,100):'',mirror:!!options.mirror,objects:options.objects!==false,entities:options.entities!==false,examples:options.examples!==false,difficulty:Number.isInteger(options.difficulty)?options.difficulty:-1};
    if(settings.difficulty<-1||settings.difficulty>1000)throw Error('预览强度应为自动或 0～1000');
    h.currentHash=hash(raw);await this.rendererReady();
    try{const result=await this.native.render({xml:raw,roomIndex:index,documentRevision:revision,filename:h.file||'',options:settings});
      if(this.activeId!==id||h.currentHash!==result.inputHash)throw Error('地图已变化，预览结果已过期');
    this.preview={id,revision,requestId:result.requestId,inputHash:result.inputHash};return {...result,revision};
    }catch(e){if(/超时|退出|取消/.test(e.message)){await this.native?.dispose();this.native=null;}throw e;}
  }
  async mapPNG(requestId){
    const p=this.preview,h=p&&this.get(p.id),latest=this.native?.latest;
    if(!p||p.id!==this.activeId||requestId!==p.requestId||latest?.requestId!==requestId||h.currentHash!==p.inputHash)throw Error('请先生成当前地图的最新预览');
    const d=await this.dialog.showSaveDialog(this.owner(),{title:'导出房间预览 PNG',defaultPath:path.join(this.dataRoot,'exports','房间预览.png'),filters:[{name:'PNG 图像',extensions:['png']}]});
    if(d.canceled)return null;this.checkWrite(d.filePath);if(path.extname(d.filePath).toLowerCase()!=='.png')throw Error('预览需要保存为 .png 文件');
    if(this.preview!==p||p.id!==this.activeId||h.currentHash!==p.inputHash)throw Error('地图已变化，请重新生成预览后导出');
    fs.mkdirSync(path.dirname(d.filePath),{recursive:true});const tmp=d.filePath+'.tmp-'+crypto.randomUUID();try{fs.writeFileSync(tmp,latest.bytes,{flag:'wx'});if(hash(fs.readFileSync(tmp))!==hash(latest.bytes))throw Error('PNG 写入核对失败');fs.renameSync(tmp,d.filePath);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}return d.filePath;
  }
  async dispose(){await this.native?.dispose();this.native=null;}
}
module.exports={MapWorkspace};
