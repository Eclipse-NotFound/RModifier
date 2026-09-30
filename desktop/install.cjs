// Installation is an explicit user action. Never called by startup or Apply profile.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {readJSON,atomicJSON}=require('./store.cjs');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const registration='RModifier|LootEditorMod|1|0|0';
function replace(file,bytes){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temporary=file+'.loot-'+crypto.randomUUID();
  try{fs.writeFileSync(temporary,bytes,{flag:'wx'});const fd=fs.openSync(temporary,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temporary,file);}
  finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function paths(root){return {game:path.join(root,'pfe.swf'),runtime:path.join(root,'mods/RModifier/release/LootEditorMod.swf'),registry:path.join(root,'mods/ModLoader/supported-mods.txt'),manifest:path.join(root,'mods/loader-manifest.txt'),scanner:path.join(root,'mods/ModLoader/RemainsModScanner.exe'),record:path.join(root,'mods/RModifier/config/installation.json')};}
function inspect(root,payload){
  const p=paths(root);let metadata=null,record=null;try{metadata=readJSON(path.join(payload,'manifest.json'));}catch{}
  try{record=readJSON(p.record);}catch{}
  const current=fs.existsSync(p.game)?hash(p.game):'';
  const loader=fs.existsSync(p.scanner)&&fs.existsSync(p.registry)&&fs.existsSync(path.join(root,'mods/ModLoader/release/ModLoaderMod.swf'));
  const connected=!!record&&record.installedHash===current&&fs.existsSync(p.runtime)&&hash(p.runtime)===record.runtimeHash;
  const knownBridge=!!metadata&&(current===metadata.bridgeHash||(metadata.upgradeFrom||[]).includes(current));
  const updateAvailable=connected&&knownBridge&&(current!==metadata.bridgeHash||record.runtimeHash!==metadata.runtimeHash);
  return {available:!!metadata,compatible:!!metadata&&metadata.sourceHash===current,connected,updateAvailable,bridgeUpdate:!!updateAvailable&&current!==metadata.bridgeHash,loader,canRestore:!!record&&record.installedHash===current&&fs.existsSync(record.backup),backup:record?.backup||'',version:metadata?.version||''};
}
function scan(root,p){
  execFileSync(p.scanner,['--root',root,'--no-ui'],{windowsHide:true,timeout:30000,stdio:'pipe'});
  return fs.readFileSync(p.manifest,'utf8');
}
function install(root,payload){
  root=path.resolve(root);const p=paths(root),state=inspect(root,payload);
  if(state.connected){
    if(!state.updateAvailable)return state;
    const metadata=readJSON(path.join(payload,'manifest.json')),runtime=path.join(payload,'LootEditorMod.swf'),bridge=path.join(payload,'pfe-loot-safe.swf');
    if(hash(runtime)!==metadata.runtimeHash||(state.bridgeUpdate&&hash(bridge)!==metadata.bridgeHash))throw new Error('安装包校验失败，请重新构建或取回完整安装包');
    const recordBytes=fs.readFileSync(p.record),record=readJSON(p.record),previous=fs.readFileSync(p.runtime),previousGame=fs.readFileSync(p.game);
    const backup=path.join(root,'mods/RModifier/backups','runtime-'+Date.now()+'-'+crypto.randomUUID().slice(0,8));
    fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(path.join(backup,'LootEditorMod.swf'),previous,{flag:'wx'});fs.writeFileSync(path.join(backup,'installation.json'),recordBytes,{flag:'wx'});
    if(state.bridgeUpdate)fs.writeFileSync(path.join(backup,'pfe.swf'),previousGame,{flag:'wx'});
    if(hash(p.game)!==record.installedHash||hash(p.runtime)!==record.runtimeHash)throw new Error('游戏模块刚被其他程序修改，更新已中止');
    try{
      replace(p.runtime,fs.readFileSync(runtime));
      if(state.bridgeUpdate)replace(p.game,fs.readFileSync(bridge));
      atomicJSON(p.record,{...record,version:metadata.version,installedHash:metadata.bridgeHash,runtimeHash:metadata.runtimeHash,runtimeUpdatedAt:Date.now(),runtimeBackup:backup});
    }catch(error){
      if(state.bridgeUpdate&&fs.existsSync(p.game)&&hash(p.game)===metadata.bridgeHash)replace(p.game,previousGame);
      if(fs.existsSync(p.runtime)&&hash(p.runtime)===metadata.runtimeHash)replace(p.runtime,previous);
      replace(p.record,recordBytes);throw new Error('模块更新失败，已回退本次更新：'+error.message);
    }
    return inspect(root,payload);
  }
  if(!state.available)throw new Error('安装文件尚未准备好，请使用完整的掉落工坊安装包');
  if(!state.loader)throw new Error('没有找到现有 ModLoader 及其扫描器，请先恢复原有模组加载器');
  if(!state.compatible)throw new Error('游戏文件与本次验证的版本不同。已停止安装，避免覆盖其他模组或游戏更新');
  const xml=fs.readFileSync(path.join(root,'application.xml'),'utf8');
  if(!/<content>\s*pfe\.swf\s*<\/content>/.test(xml))throw new Error('当前启动目标不是已验证的根目录 1.02 游戏');
  const m=readJSON(path.join(payload,'manifest.json'));
  const bridge=path.join(payload,'pfe-loot-safe.swf'),runtime=path.join(payload,'LootEditorMod.swf');
  if(hash(bridge)!==m.bridgeHash||hash(runtime)!==m.runtimeHash)throw new Error('安装包校验失败，请重新构建或取回完整安装包');
  // Keep exact originals, including a pre-existing runtime and scanner manifest.
  const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);
  const backup=path.join(root,'pfe_before_LootEditor_'+stamp+'.swf');
  const backupDir=path.join(root,'mods/RModifier/backups',stamp);fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(p.game,backup,fs.constants.COPYFILE_EXCL);
  if(hash(backup)!==m.sourceHash)throw new Error('备份校验不一致，安装已中止');
  const originals={};for(const name of ['registry','manifest','runtime','record']){originals[name]=fs.existsSync(p[name])?fs.readFileSync(p[name]):null;if(originals[name])fs.writeFileSync(path.join(backupDir,name+'.bak'),originals[name],{flag:'wx'});}
  try{
    // Recheck immediately before changing the game; never use a stale prepared patch.
    if(hash(p.game)!==m.sourceHash)throw new Error('游戏文件刚被其他程序修改，安装已中止');
    replace(p.runtime,fs.readFileSync(runtime));
    const lines=originals.registry.toString('utf8').split(/\r?\n/).filter(line=>!/^RModifier\|LootEditorMod\|/i.test(line));
    replace(p.registry,Buffer.from(lines.join('\n').trimEnd()+'\n'+registration+'\n'));
    const manifest=scan(root,p);if(!/^RModifier\|LootEditorMod\|1\|0\|0\s*$/m.test(manifest))throw new Error('ModLoader 没有正确登记掉落工坊');
    replace(p.game,fs.readFileSync(bridge));
    atomicJSON(p.record,{version:m.version,installedAt:Date.now(),sourceHash:m.sourceHash,installedHash:m.bridgeHash,runtimeHash:m.runtimeHash,backup,backupDir,previousRuntime:originals.runtime!==null,previousRegistry:originals.registry.toString('utf8').split(/\r?\n/).filter(l=>/^RModifier\|LootEditorMod\|/i.test(l))});
  }catch(error){
    // Only restore our own replacement; leave a concurrent external game change intact.
    if(fs.existsSync(p.game)&&hash(p.game)===m.bridgeHash)replace(p.game,fs.readFileSync(backup));
    for(const name of ['registry','manifest','runtime','record']){if(originals[name]!==null)replace(p[name],originals[name]);else if(fs.existsSync(p[name]))fs.unlinkSync(p[name]);}
    throw new Error('连接失败，已回退本次安装：'+error.message);
  }
  return inspect(root,payload);
}
function restore(root,payload){
  root=path.resolve(root);const p=paths(root),s=inspect(root,payload);
  if(!s.canRestore)throw new Error('游戏文件已变化或没有本次备份，无法自动恢复；已保留现状');
  const record=readJSON(p.record);
  // A locally altered record must never cause writes outside this game installation.
  if(path.dirname(path.resolve(record.backup))!==root||!path.basename(record.backup).startsWith('pfe_before_LootEditor_'))throw new Error('备份位置无效');
  const ownBackups=path.join(root,'mods/RModifier/backups')+path.sep;
  if(!path.resolve(record.backupDir).startsWith(ownBackups))throw new Error('备份目录无效');
  if(hash(record.backup)!==record.sourceHash)throw new Error('备份已变化，无法自动恢复');
  if(!fs.existsSync(p.runtime)||hash(p.runtime)!==record.runtimeHash)throw new Error('模块文件已变化，无法自动恢复');
  const current={};for(const name of ['game','registry','manifest','runtime','record'])current[name]=fs.readFileSync(p[name]);
  try{
    if(record.previousRuntime)replace(p.runtime,fs.readFileSync(path.join(record.backupDir,'runtime.bak')));else fs.unlinkSync(p.runtime);
    const lines=current.registry.toString('utf8').split(/\r?\n/).filter(l=>!/^RModifier\|LootEditorMod\|/i.test(l));
    replace(p.registry,Buffer.from([...lines,...record.previousRegistry.filter(l=>/^RModifier\|LootEditorMod\|/i.test(l))].join('\n').trimEnd()+'\n'));
    scan(root,p);replace(p.game,fs.readFileSync(record.backup));
    atomicJSON(path.join(record.backupDir,'restored.json'),{restoredAt:Date.now(),sourceHash:record.sourceHash});
    fs.unlinkSync(p.record);
  }catch(error){for(const name of Object.keys(current))replace(p[name],current[name]);throw new Error('恢复未完成，已退回恢复前状态：'+error.message);}
  return inspect(root,payload);
}
module.exports={inspect,install,restore,hash,registration};
