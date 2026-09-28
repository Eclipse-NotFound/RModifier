'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Core=require('./core.js');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
// Resolve the nearest existing ancestor, then append the as-yet unwritten suffix.
// lstat keeps a dangling link from being mistaken for an ordinary missing folder.
function realPath(file){
 let current=path.resolve(file);const suffix=[];
 for(;;){
  try{fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(current);if(parent===current)throw error;suffix.unshift(path.basename(current));current=parent;continue;}
  return path.resolve(fs.realpathSync.native(current),...suffix);
 }
}
const comparable=file=>{const resolved=realPath(file);return process.platform==='win32'?resolved.toLowerCase():resolved;};
const within=(root,file)=>{const rel=path.relative(comparable(root),comparable(file));return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
function readText(file,limit=8e6){if(fs.statSync(file).size>limit)throw Error('文件超过允许大小，未读取');try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(fs.readFileSync(file));}catch{throw Error('这份文件不是完整的 UTF-8 文字，请保留原文件并选择游戏语言 XML 或台词草稿');}}
function writeBytes(file,bytes){if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes,'utf8');const temporary=file+'.barks-'+crypto.randomUUID();fs.mkdirSync(path.dirname(file),{recursive:true});try{fs.writeFileSync(temporary,bytes,{flag:'wx'});const fd=fs.openSync(temporary,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(sha(fs.readFileSync(temporary))!==sha(bytes))throw Error('写入校验失败');fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}}
function writeJSON(file,data){writeBytes(file,JSON.stringify(data,null,2)+'\n');}
function currentHash(file){return fs.existsSync(file)?sha(fs.readFileSync(file)):null;}
function checkedReplace(file,raw,expected,backupRoot,check=()=>{}){
 check(file);
 if(currentHash(file)!==expected)throw Error('文件已被其他程序修改，已停止覆盖；当前编辑内容保留。');
 let backup=null;if(expected!==null){backup=path.join(backupRoot,Date.now()+'-'+crypto.randomUUID(),path.basename(file));check(backup);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);if(currentHash(backup)!==expected)throw Error('备份校验不一致，已停止写入');}
 if(currentHash(file)!==expected)throw Error('备份期间文件发生变化，已停止写入');writeBytes(file,raw);return {outputHash:currentHash(file),backup,backupHash:expected};
}
class BarksService {
 constructor({gameRoot,dataRoot,dialog,getWindow,window,testRoot}){Object.assign(this,{gameRoot:path.resolve(gameRoot),dataRoot:path.resolve(dataRoot),dialog,window:getWindow||window,testRoot:testRoot?path.resolve(testRoot):null});this.recoverySequence=0;this.committedSequence=0;this.busy=false;this.saveBaselines=new Map();}
 location(...parts){return path.join(this.dataRoot,...parts);}
 getWindow(){return typeof this.window==='function'?this.window():this.window;}
 pathCheck(file){if(this.testRoot&&!within(this.testRoot,file))throw Error('测试操作不能写出隔离目录');}
 write(file,bytes){this.pathCheck(file);writeBytes(file,bytes);}
 writeJSON(file,value){this.pathCheck(file);writeJSON(file,value);}
 replace(file,raw,expected,backupRoot){return checkedReplace(file,raw,expected,backupRoot,p=>this.pathCheck(p));}
 safeDestination(file){this.pathCheck(file);if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('请另存到普通文件，不能覆盖链接文件');return path.resolve(file);}
 async valid(project){if(!project||JSON.stringify(project).length>8e6)throw Error('草稿过大或不完整');return Core.readProject(project);}
 recoveryFile(){return this.location('config/barks/recovery.json');}
 decodeRecovery(data){return data?.format==='rmodifier-barks-recovery'?data:{format:'rmodifier-barks-recovery',project:data,meta:{dirty:true}};}
 async boot(){
  const source=path.join(this.gameRoot,'text_zh.xml'),raw=readText(source);Core.parseSource(raw,'text_zh.xml');
  let recovery=null,recoveryState=null,previous=null,error='';const file=this.recoveryFile();
  if(fs.existsSync(file))try{const rec=this.decodeRecovery(JSON.parse(readText(file,12e6)));await this.valid(rec.project);recovery=rec.project;recoveryState=rec.meta;}catch(e){error='上次草稿无法恢复，原文件仍在 '+file+'。'+e.message;}
  const previousFile=this.location('config/barks/previous.json');if(fs.existsSync(previousFile))try{const p=this.decodeRecovery(JSON.parse(readText(previousFile,12e6)));await this.valid(p.project);previous=p.project;}catch{}
  return {raw,filename:'text_zh.xml',recovery,recoveryState,previous,error};
 }
 async open(){const result=await this.dialog.showOpenDialog(this.getWindow(),{title:'打开台词草稿或游戏语言文件',defaultPath:this.gameRoot,properties:['openFile'],filters:[{name:'台词草稿 / 游戏语言',extensions:['json','xml']}]});if(result.canceled)return null;const file=result.filePaths[0],raw=readText(file);if(/\.json$/i.test(file))await this.valid(JSON.parse(raw.replace(/^\uFEFF/,'')));else Core.parseSource(raw,path.basename(file));this.saveBaselines.set(comparable(file),sha(Buffer.from(raw)));return {raw,filename:path.basename(file)};}
 async recover(project,meta={}){
  // Sequence is assigned before async validation. A slow old call cannot replace a newer recovery.
  const sequence=++this.recoverySequence;await this.valid(project);if(sequence<this.committedSequence)return false;
  const cleanMeta={documentId:String(meta.documentId||''),revision:Number(meta.revision)||0,savedRevision:Number(meta.savedRevision)||0,dirty:meta.dirty!==false};
  const file=this.recoveryFile();this.pathCheck(file);
  if(fs.existsSync(file)){const bytes=fs.readFileSync(file);let old;try{old=this.decodeRecovery(JSON.parse(bytes.toString('utf8')));}catch{}
   if(!old||old.project?.source?.sha256!==project.source.sha256||old.meta?.documentId!==cleanMeta.documentId){const previous=this.location('config/barks/previous.json');if(old)this.write(previous,bytes);else{const corrupt=this.location('backups/barks','unreadable-recovery-'+Date.now()+'.json');this.write(corrupt,bytes);}}
  }
  this.writeJSON(file,{format:'rmodifier-barks-recovery',version:1,meta:cleanMeta,project});this.committedSequence=sequence;return true;
 }
 async save(project,revision=0){
  await this.valid(project);const name=String(project.title||'我的台词').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,100);
  const result=await this.dialog.showSaveDialog(this.getWindow(),{title:'保存台词草稿（下次接着写）',defaultPath:this.location('profiles/barks',name+'.barks.json'),filters:[{name:'台词草稿',extensions:['barks.json']}]});if(result.canceled)return null;
  const file=this.safeDestination(result.filePath);if(!/\.barks\.json$/i.test(file))throw Error('台词草稿请保存为 .barks.json 文件');
  const identity=comparable(file),expected=this.saveBaselines.has(identity)?this.saveBaselines.get(identity):currentHash(file);
  const saved=this.replace(file,JSON.stringify(project,null,2)+'\n',expected,this.location('backups/barks/drafts'));this.saveBaselines.set(identity,saved.outputHash);return {revision,file};
 }
 languageFilename(source){const named=/^text_([a-z]{2})\.xml$/i.exec(source.filename);const id=({ch:'zh',uk:'ua',ja:'jp'})[source.languageId]||source.languageId;const known=['zh','en','de','es','jp','pl','ru','tw','ua'];const language=named?.[1].toLowerCase()||(known.includes(id)?id:null);if(!language)throw Error('无法判断这份文本的游戏语言，请打开 text_语言.xml 后再试');return 'text_'+language+'.xml';}
 targetRecord(){const file=this.location('config/barks/last-write.json');try{return JSON.parse(readText(file));}catch{return null;}}
 commitLanguage(dest,result,record){try{this.writeJSON(this.location('config/barks/last-write.json'),record);}catch(error){if(currentHash(dest)===result.outputHash&&result.backup&&currentHash(result.backup)===result.backupHash){this.write(dest,fs.readFileSync(result.backup));throw Error('写入记录保存失败，游戏文本已退回写入前；备份仍保留。'+error.message);}throw Error('写入记录失败，文件存在外部变化，未继续覆盖。备份：'+result.backup);}}
 async export(project,apply=false){
  const loaded=await this.valid(project),raw=Core.exportXml(loaded.source,loaded.entries),filename=this.languageFilename(loaded.source);let dest;
  if(apply)dest=path.join(this.gameRoot,filename);else{const result=await this.dialog.showSaveDialog(this.getWindow(),{title:'导出完整游戏语言文件',defaultPath:this.location('exports',filename),filters:[{name:'完整语言 XML',extensions:['xml']}]});if(result.canceled)return null;dest=result.filePath;}
  dest=this.safeDestination(dest);if(!/\.xml$/i.test(dest))throw Error('游戏语言文件请使用 .xml 文件名');
  const formal=comparable(path.dirname(dest))===comparable(this.gameRoot);
  if(within(path.join(this.gameRoot,'DLC'),dest))throw Error('请使用当前游戏根目录的语言文件；不会覆盖 DLC 文本');
  if(!formal){const saved=this.replace(dest,raw,currentHash(dest),this.location('backups/barks/exports'));return {file:dest,applied:false,sha256:saved.outputHash};}
  if(path.basename(dest).toLowerCase()!==filename)throw Error('不能用另一种语言或台词文件覆盖这个游戏文件');
  if(this.busy)throw Error('另一项语言文件操作尚未完成，请稍后再试');this.busy=true;
  try{
   const key=loaded.hash+'|'+filename,old=this.targetRecord();const expected=old?.baselines?.[key]||(old?.key===key?old.outputHash:loaded.hash);
   if(currentHash(dest)!==expected)throw Error('游戏语言文件与这份草稿的来源不同，或已被其他程序修改。请保存草稿，再打开当前游戏文本核对。');
   const answer=await this.dialog.showMessageBox(this.getWindow(),{type:'question',buttons:['返回编辑','备份并写入'],defaultId:0,cancelId:0,message:'把当前台词写入游戏？',detail:'将备份并替换 '+dest+'。游戏下次启动读取，不代表已经触发台词。'});if(answer.response!==1)return null;
   const result=this.replace(dest,raw,expected,this.location('backups/barks/language'));
   this.commitLanguage(dest,result,{key,filename,outputHash:result.outputHash,backup:result.backup,backupHash:result.backupHash,operationId:crypto.randomUUID(),writtenAt:Date.now(),baselines:{...old?.baselines,[key]:result.outputHash}});
   return {file:dest,applied:true,sha256:result.outputHash};
  }finally{this.busy=false;}
 }
 async restore(){
  if(this.busy)throw Error('另一项语言文件操作尚未完成');this.busy=true;
  try{const record=this.targetRecord();if(!record?.backup)throw Error('还没有可恢复的台词写入记录');
   if(!/^text_(zh|en|de|es|jp|pl|ru|tw|ua)\.xml$/.test(record.filename)||!within(this.location('backups/barks/language'),record.backup))throw Error('备份位置无效');
   const dest=this.safeDestination(path.join(this.gameRoot,record.filename));if(currentHash(record.backup)!==record.backupHash)throw Error('备份文件已被修改，已停止恢复');
   if(currentHash(dest)!==record.outputHash)throw Error('游戏语言文件已被其他程序修改，已停止恢复');
   const answer=await this.dialog.showMessageBox(this.getWindow(),{type:'question',buttons:['取消','恢复上次写入前的文本'],defaultId:0,cancelId:0,message:'恢复上一次台词备份？',detail:dest+'。当前草稿、地图和掉落方案保留。'});if(answer.response!==1)return null;
   const result=this.replace(dest,fs.readFileSync(record.backup),record.outputHash,this.location('backups/barks/language'));
   this.commitLanguage(dest,result,{...record,outputHash:result.outputHash,backup:result.backup,backupHash:result.backupHash,operationId:crypto.randomUUID(),writtenAt:Date.now(),restored:true,baselines:{...record.baselines,[record.key]:result.outputHash}});return true;
  }finally{this.busy=false;}
 }
}
module.exports={BarksService,readText,writeBytes,writeJSON,checkedReplace,sha,within,realPath};
