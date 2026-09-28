'use strict';
// Explicit migration command. Startup and ordinary saves never rename an installation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {readJSON,atomicJSON}=require('./store.cjs');
const {atomicText,hash,inside}=require('./platform/files.cjs');
const digest=file=>hash(fs.readFileSync(file));
const own=/^(?:LootEditor|RModifier)\|/i;
const registration='RModifier|LootEditorMod|1|0|0';
function inventory(root){
  const files={};
  function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('用户资料包含链接，请先处理后再迁移');
    if(entry.isDirectory())walk(file);else{const rel=path.relative(root,file).replaceAll('\\','/');if(!['config/installation.json','config/migration.json'].includes(rel))files[rel]=digest(file);}
  }}
  walk(path.join(root,'config'));walk(path.join(root,'profiles'));return files;
}
function assertInside(root,file){if(!inside(root,file))throw Error('迁移路径超出游戏目录：'+file);}
function migrate(gameRoot,payload){
  const root=fs.realpathSync(path.resolve(gameRoot)),oldRoot=path.join(root,'mods/LootEditor'),newRoot=path.join(root,'mods/RModifier');
  for(const file of [oldRoot,newRoot])assertInside(root,file);
  if(fs.existsSync(newRoot))throw Error('RModifier 目录已经存在，拒绝合并或覆盖');
  if(!fs.existsSync(oldRoot)||fs.lstatSync(oldRoot).isSymbolicLink())throw Error('没有可迁移的普通 LootEditor 目录');
  const game=path.join(root,'pfe.swf'),registry=path.join(root,'mods/ModLoader/supported-mods.txt'),manifest=path.join(root,'mods/loader-manifest.txt');
  const recordFile=path.join(oldRoot,'config/installation.json'),runtimeFile=path.join(oldRoot,'release/LootEditorMod.swf');
  const record=readJSON(recordFile),metadata=readJSON(path.join(payload,'manifest.json'));
  const nextRuntime=fs.readFileSync(path.join(payload,'LootEditorMod.swf'));
  if(digest(game)!==record.installedHash||record.installedHash!==metadata.bridgeHash)throw Error('游戏主文件指纹变化，迁移已停止');
  if(digest(runtimeFile)!==record.runtimeHash||hash(nextRuntime)!==metadata.runtimeHash)throw Error('模块或迁移产物指纹不匹配');
  if(!inside(path.join(oldRoot,'backups'),record.backupDir))throw Error('原安装备份目录无效');
  if(path.dirname(path.resolve(record.backup))!==root||digest(record.backup)!==record.sourceHash)throw Error('原游戏备份校验失败');
  const originals={registry:fs.readFileSync(registry),manifest:fs.readFileSync(manifest),record:fs.readFileSync(recordFile),runtime:fs.readFileSync(runtimeFile)};
  const expectedOthers=originals.manifest.toString('utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&!own.test(l)).sort();
  const before=inventory(oldRoot),at=Date.now();
  const journalRoot=path.join(root,'mods/.rmodifier-migration',at+'-'+crypto.randomUUID());assertInside(root,journalRoot);
  fs.mkdirSync(journalRoot,{recursive:true});
  for(const [key,bytes] of Object.entries(originals))fs.writeFileSync(path.join(journalRoot,key+'.bak'),bytes,{flag:'wx'});
  const journal={format:'rmodifier-migration',version:1,status:'prepared',at,gameRoot:root,oldRoot,newRoot,gameHash:record.installedHash,oldRuntimeHash:record.runtimeHash,newRuntimeHash:metadata.runtimeHash,before,backupHashes:Object.fromEntries(Object.entries(originals).map(([k,v])=>[k,hash(v)]))};
  const journalFile=path.join(journalRoot,'migration.json');atomicJSON(journalFile,journal);
  let moved=false,writtenRegistry=null,writtenManifest=null;
  try{
    if(digest(game)!==journal.gameHash||digest(registry)!==hash(originals.registry)||digest(manifest)!==hash(originals.manifest)||JSON.stringify(inventory(oldRoot))!==JSON.stringify(before))throw Error('准备期间文件发生变化，未移动目录');
    // Both absolute endpoints were checked before this single same-volume rename.
    fs.renameSync(oldRoot,newRoot);moved=true;
    atomicText(path.join(newRoot,'release/LootEditorMod.swf'),nextRuntime);
    const nextRecord={...record,version:metadata.version,runtimeHash:metadata.runtimeHash,backupDir:path.join(newRoot,path.relative(oldRoot,record.backupDir)),migratedAt:at};
    atomicJSON(path.join(newRoot,'config/installation.json'),nextRecord);
    const lines=originals.registry.toString('utf8').split(/\r?\n/).filter(l=>!own.test(l));
    atomicText(registry,lines.join('\n').trimEnd()+'\n'+registration+'\n');
    writtenRegistry=digest(registry);
    execFileSync(path.join(root,'mods/ModLoader/RemainsModScanner.exe'),['--root',root,'--no-ui'],{windowsHide:true,timeout:30000,stdio:'pipe'});
    writtenManifest=digest(manifest);
    const afterManifest=fs.readFileSync(manifest,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));
    if(afterManifest.filter(l=>own.test(l)).join('\n')!==registration)throw Error('扫描后模块登记重复或缺失');
    if(JSON.stringify(afterManifest.filter(l=>!own.test(l)).sort())!==JSON.stringify(expectedOthers))throw Error('扫描后其他模块登记发生变化');
    if(digest(game)!==journal.gameHash||JSON.stringify(inventory(newRoot))!==JSON.stringify(before))throw Error('迁移前后资料或游戏主文件核对失败');
    atomicJSON(path.join(newRoot,'config/migration.json'),{at,from:'LootEditor',to:'RModifier',journal:journalFile});
    journal.status='complete';journal.registryHash=digest(registry);journal.manifestHash=digest(manifest);atomicJSON(journalFile,journal);
    return {root:newRoot,journal:journalFile,runtimeHash:metadata.runtimeHash,gameHash:journal.gameHash,filesPreserved:Object.keys(before).length};
  }catch(error){
    if(moved){
      atomicText(path.join(newRoot,'release/LootEditorMod.swf'),originals.runtime);
      atomicText(path.join(newRoot,'config/installation.json'),originals.record);
      fs.renameSync(newRoot,oldRoot);
    }
    if(writtenRegistry&&digest(registry)===writtenRegistry)atomicText(registry,originals.registry);
    if(writtenManifest&&digest(manifest)===writtenManifest)atomicText(manifest,originals.manifest);
    journal.status='rolled-back';journal.error=error.message;atomicJSON(journalFile,journal);
    throw Error('迁移未完成，已保留或恢复原目录：'+error.message);
  }
}
function rollback(journalFile){
  const j=readJSON(journalFile),root=fs.realpathSync(j.gameRoot),dir=path.dirname(path.resolve(journalFile));
  if(j.format!=='rmodifier-migration'||j.status!=='complete'||!inside(path.join(root,'mods/.rmodifier-migration'),dir))throw Error('无效迁移记录');
  if(j.oldRoot!==path.join(root,'mods/LootEditor')||j.newRoot!==path.join(root,'mods/RModifier'))throw Error('迁移记录路径无效');
  if(fs.existsSync(j.oldRoot)||!fs.existsSync(j.newRoot))throw Error('目录状态变化，无法自动撤回');
  const registry=path.join(root,'mods/ModLoader/supported-mods.txt'),manifest=path.join(root,'mods/loader-manifest.txt');
  if(digest(path.join(root,'pfe.swf'))!==j.gameHash||digest(registry)!==j.registryHash||digest(manifest)!==j.manifestHash||digest(path.join(j.newRoot,'release/LootEditorMod.swf'))!==j.newRuntimeHash)throw Error('迁移后游戏或登记发生变化，停止自动撤回');
  const backups={};for(const key of ['runtime','record','registry','manifest']){backups[key]=fs.readFileSync(path.join(dir,key+'.bak'));if(hash(backups[key])!==j.backupHashes?.[key])throw Error('迁移备份已损坏：'+key);}
  const {runtime,record}=backups;
  if(hash(runtime)!==j.oldRuntimeHash)throw Error('旧模块备份已损坏');
  const oldRecord=JSON.parse(record.toString('utf8'));if(oldRecord.runtimeHash!==j.oldRuntimeHash)throw Error('旧安装记录损坏');
  // Preserve all user data edited since migration; only installation metadata is reverted.
  assertInside(root,j.newRoot);assertInside(root,j.oldRoot);
  const files={runtime:path.join(j.newRoot,'release/LootEditorMod.swf'),record:path.join(j.newRoot,'config/installation.json'),registry,manifest};
  const current=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,fs.readFileSync(f)]));
  try{for(const [key,file] of Object.entries(files))atomicText(file,backups[key]);fs.renameSync(j.newRoot,j.oldRoot);}
  catch(error){for(const [key,file] of Object.entries(files))atomicText(file,current[key]);throw Error('撤回未完成，保留 RModifier：'+error.message);}
  atomicJSON(path.join(j.oldRoot,'config/migration.json'),{at:Date.now(),status:'reverted',journal:journalFile});
  j.status='reverted';atomicJSON(journalFile,j);return j.oldRoot;
}
module.exports={migrate,rollback,inventory};
