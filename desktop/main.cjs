const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {Store,readJSON,atomicJSON}=require('./store.cjs');
const {inside}=require('./platform/files.cjs');
const installer=require('./install.cjs');
let window,core,catalog,store,gameRoot,documents,contextId;let allowClose=false;const states=new Map();
const {Documents}=require('./platform/documents.cjs');
const moduleRoot=app.getAppPath();
const componentRoot=app.isPackaged?path.join(process.resourcesPath,'map-component'):path.join(moduleRoot,'map-editor/component');
const uiFile=path.join(__dirname,'ui','index.html');
const testRootValue=process.env.RMODIFIER_TEST_ROOT||process.env.LOOT_EDITOR_TEST_ROOT;
const testRoot=testRootValue?path.resolve(testRootValue):null;
const payload=app.isPackaged?path.join(process.resourcesPath,'install-payload'):path.join(moduleRoot,'build/out/install-payload');
// Test storage is explicit and separated; it never redirects the game patcher.
app.setPath('userData',testRoot?path.join(testRoot,'desktop-user'):path.join(app.getPath('appData'),'RModifier'));
if(!app.requestSingleInstanceLock()){app.quit();}else{
app.on('second-instance',(_e,args)=>{window?.show();window?.focus();window?.webContents.send('rm:navigate',args.includes('--map')?'map':args.includes('--barks')?'barks':'loot');});
function checkGame(root){
  const descriptor=path.join(root,'application.xml');const swf=path.join(root,'pfe.swf');
  if(!fs.existsSync(descriptor)||!fs.existsSync(swf))throw new Error('请选择含有 application.xml 和 pfe.swf 的游戏文件夹');
  const xml=fs.readFileSync(descriptor,'utf8');
  if(!/<content>\s*pfe\.swf\s*<\/content>/.test(xml))throw new Error('当前启动目标不是 1.02 根目录游戏，请先恢复 application.xml 的启动目标');
  return path.resolve(root);
}
function useGame(root){
  const verified=checkGame(root);
  const nextStore=new Store(testRoot?path.join(testRoot,'data'):path.join(verified,'mods','RModifier'));
  const nextDocuments=new Documents({gameRoot:verified,dataRoot:nextStore.root,componentRoot,dialog,getWindow:()=>window,testRoot});
  gameRoot=verified;store=nextStore;documents=nextDocuments;contextId=require('node:crypto').randomUUID();
}
function checkWrite(file){if(testRoot&&!inside(testRoot,file))throw Error('测试操作不能写出隔离目录');return file;}
function status(){
  const f=path.join(store.root,'config','active.json');let activeHash='',state={},receipt=null;
  if(fs.existsSync(f))activeHash=core.fingerprint(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
  try{state=readJSON(path.join(store.root,'config','application-state.json'));}catch{}
  try{receipt=readJSON(testRoot?path.join(testRoot,'receipt.json'):path.join(app.getPath('appData'),'pfe','Local Store','LootEditor.receipt.json'));}catch{}
  const receiptHere=!!receipt?.gameRoot&&path.resolve(receipt.gameRoot).toLowerCase()===gameRoot.toLowerCase();
  let migration=0;try{migration=Number(readJSON(path.join(store.root,'config/migration.json')).at)||0;}catch{}
  const receiptRecent=receiptHere&&receipt.version==='0.2.0'&&receipt.configRoot==='mods/RModifier'&&receipt.readAt>=Math.max(Number(state.appliedAt||0),migration);
  const receiptFresh=receiptRecent&&receipt.profileHash===activeHash&&receipt.status==='ready';
  let manifest='';try{manifest=fs.readFileSync(path.join(gameRoot,'mods','loader-manifest.txt'),'utf8');}catch{}
  const listed=/^RModifier\|LootEditorMod\|1\|/m.test(manifest);
  return {gameRoot,activeHash,appliedAt:state.appliedAt||0,profileId:state.profileId||'',receipt,receiptFresh,receiptRecent,listed,hasPrevious:fs.existsSync(path.join(store.root,'config/active.previous.json')),runtimePresent:fs.existsSync(path.join(gameRoot,'mods','RModifier','release','LootEditorMod.swf')),installation:installer.inspect(gameRoot,payload),test:!!testRoot};
}
function ensureSender(event){if(!window||event.sender!==window.webContents||event.senderFrame?.url!==pathToFileURL(uiFile).href)throw new Error('不允许的页面请求');}
function handle(name,fn){ipcMain.handle('loot:'+name,async(event,context,...args)=>{ensureSender(event);if(context!==contextId)throw Error('游戏位置已切换，此页面的旧请求已停止');return fn(...args);});}
function readRecovery(){
  const file=path.join(store.root,'config/loot-recovery.json');
  if(!fs.existsSync(file))return {recovery:null};
  try{if(fs.statSync(file).size>2e6)throw Error('文件过大');const value=readJSON(file);valid(value.profile);return {recovery:value};}
  catch(e){const backup=path.join(store.root,'backups/loot-recovery',Date.now()+'-'+require('node:crypto').randomUUID()+'.json');fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);return {recovery:null,recoveryError:'上次恢复草稿无法读取，原件已备份保留：'+backup};}
}
function valid(p){if(JSON.stringify(p)?.length>2e6)throw Error('方案过大');const errors=core.validate(p,catalog);if(errors.length)throw new Error(errors.join('\n'));return p;}
app.whenReady().then(async()=>{
  core=await import(pathToFileURL(path.join(__dirname,'core.mjs')).href);catalog=readJSON(path.join(__dirname,'data','catalog.json'));
  const preferences=path.join(app.getPath('userData'),'settings.json');
  let root=process.env.RMODIFIER_GAME_ROOT;
  if(testRoot&&!root)throw Error('隔离测试必须显式指定 RMODIFIER_GAME_ROOT，不能自动选择正式游戏');
  if(!root&&!testRoot)try{root=readJSON(preferences).gameRoot;}catch{}
  if(!root){for(const start of [process.env.PORTABLE_EXECUTABLE_DIR,path.dirname(process.execPath),moduleRoot]){if(!start)continue;let dir=path.resolve(start);for(let i=0;i<7;i++){try{root=checkGame(dir);break;}catch{}dir=path.dirname(dir);}if(root)break;}}
  try{useGame(root||'');}catch(error){if(testRoot)throw error;const d=await dialog.showOpenDialog({title:'首次使用：选择 Remains 游戏文件夹',properties:['openDirectory']});if(d.canceled){app.quit();return;}useGame(d.filePaths[0]);}
  if(!testRoot)atomicJSON(preferences,{gameRoot});
  handle('bootstrap',()=>{let view={};try{view=readJSON(path.join(store.root,'config/view.json'));}catch{}return {catalog,icons:readJSON(path.join(__dirname,'data/icons.json')),view,...readRecovery(),profiles:store.list().map(entry=>entry.profile&&core.validate(entry.profile,catalog).length?{broken:entry.profile.name||'未知方案',error:'方案格式不兼容，原文件已保留'}:entry),status:status(),version:core.VERSION};});
  handle('view',v=>{atomicJSON(path.join(store.root,'config/view.json'),{profile:String(v.profile||'').slice(0,80),tab:['container','enemy','ammo','profiles'].includes(v.tab)?v.tab:'container',source:String(v.source||'').slice(0,100)});});
  handle('save',p=>{valid(p);store.save(p);return status();});
  handle('apply',p=>{valid(p);checkGame(gameRoot);store.apply(p);return status();});
  handle('status',()=>status());
  handle('previous',()=>{const p=readJSON(path.join(store.root,'config/active.previous.json'));valid(p);p.id=require('node:crypto').randomUUID();p.name=('上次应用 · '+p.name).slice(0,60);store.save(p);return p;});
  handle('install',async()=>{
    if(testRoot)throw new Error('界面自动测试禁止安装到真实游戏');
    const s=installer.inspect(gameRoot,payload);
    if(s.connected)return status();
    const answer=await dialog.showMessageBox(window,{type:'question',buttons:['暂不连接','备份并连接'],defaultId:0,cancelId:0,message:'将掉落工坊连接到这份游戏？',detail:'请先保存并退出游戏。将备份并更新根目录 pfe.swf，安装掉落模块，通过现有 ModLoader 扫描器登记为仅 1.02 启用。其他模组和存档保留。以后应用方案只更新配置。\n\n游戏位置：'+gameRoot});
    if(answer.response!==1)return null;installer.install(gameRoot,payload);return status();
  });
  handle('restoreGame',async()=>{
    if(testRoot)throw new Error('界面自动测试禁止恢复真实游戏');
    const answer=await dialog.showMessageBox(window,{type:'question',buttons:['取消','恢复连接前的游戏'],defaultId:0,cancelId:0,message:'移除掉落工坊的游戏连接？',detail:'请先保存并退出游戏。会恢复安装前的游戏文件并移除本模块登记，保留你的方案与存档。如果游戏文件后来被其他工具修改，自动恢复会停止。'});
    if(answer.response!==1)return null;installer.restore(gameRoot,payload);return status();
  });
  handle('dirty',value=>{states.set('loot',{dirty:!!value});});

  handle('import',async()=>{const d=await dialog.showOpenDialog(window,{title:'导入掉落方案',properties:['openFile'],filters:[{name:'掉落方案',extensions:['json']}]});if(d.canceled)return null;const f=d.filePaths[0];if(fs.statSync(f).size>2000000)throw new Error('方案文件过大');const p=readJSON(f);valid(p);p.id=require('node:crypto').randomUUID();store.save(p);return p;});
  handle('export',async p=>{valid(p);const d=await dialog.showSaveDialog(window,{title:'导出掉落方案',defaultPath:p.name.replace(/[<>:"/\\|?*]/g,'_')+'.json',filters:[{name:'掉落方案',extensions:['json']}]});if(d.canceled)return false;atomicJSON(checkWrite(d.filePath),p);return true;});
  handle('openFolder',()=>shell.openPath(store.profiles));
  handle('confirm',async({message,detail})=>{const r=await dialog.showMessageBox(window,{type:'question',buttons:['继续编辑','确定'],defaultId:0,cancelId:0,message:String(message).slice(0,200),detail:String(detail||'').slice(0,2000)});return r.response===1;});
  window=new BrowserWindow({width:1440,height:950,minWidth:840,minHeight:650,show:!testRoot,title:'RModifier · Remains 编辑工坊',backgroundColor:'#f3f4ef',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:!!testRoot}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(url!==pathToFileURL(uiFile).href)event.preventDefault();});
  ipcMain.handle('rm:context',event=>{ensureSender(event);return contextId;});
  const rm=(name,fn)=>ipcMain.handle('rm:'+name,async(event,context,...args)=>{ensureSender(event);if(context!==contextId)throw Error('游戏位置已切换，此页面的旧请求已停止');return fn(...args);});
  rm('state',(id,state)=>{if(!['loot','barks','map'].includes(id))throw Error('未知页面');states.set(id,{dirty:!!state.dirty,revision:Number(state.revision)||0,documentId:String(state.documentId||'')});});
  rm('info',()=>({gameRoot,dataRoot:store.root,workspace:process.argv.includes('--map')?'map':process.argv.includes('--barks')?'barks':'loot'}));
  rm('closeChoice',async(prefix,names)=>{const r=await dialog.showMessageBox(window,{type:'question',buttons:['继续编辑','逐项保存','保留恢复草稿'],defaultId:0,cancelId:0,message:String(prefix)+'，这些内容尚未保存',detail:names.join('、')+'。保留恢复草稿会在下次打开时恢复，不会应用到游戏。'});return ['continue','save','recover'][r.response];});
  rm('close',async()=>{await documents.dispose();allowClose=true;window.close();});
  rm('pickGame',async()=>{const d=await dialog.showOpenDialog(window,{title:'选择 Remains 游戏文件夹',properties:['openDirectory']});if(d.canceled)return false;checkGame(d.filePaths[0]);await documents.dispose();useGame(d.filePaths[0]);states.clear();atomicJSON(preferences,{gameRoot});return true;});
  rm('lootRecover',p=>{if(JSON.stringify(p).length>2e6)throw Error('方案过大');valid(p.profile);atomicJSON(path.join(store.root,'config/loot-recovery.json'),p);return true;});
  for(const name of ['barksBoot','barksOpen','barksRecover','barksSave','barksExport','barksRestore','mapBoot','mapOpen','mapNew','mapRecover','mapSave','rendererReady','mapPreview','mapPNG'])rm(name,(...args)=>documents[name](...args));
  window.on('close',event=>{if(!allowClose){event.preventDefault();window.webContents.send('rm:close-request');}});
  await window.loadFile(uiFile);
}).catch(async error=>{console.error(error);await documents?.dispose().catch(()=>{});dialog.showErrorBox('RModifier 启动失败',String(error.message||error));allowClose=true;app.exit(1);});
app.on('window-all-closed',()=>app.quit());

}
