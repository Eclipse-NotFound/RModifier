const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {Store,readJSON,atomicJSON}=require('./store.cjs');
const installer=require('./install.cjs');
let window,core,catalog,store,gameRoot;let dirty=false;
const moduleRoot=app.isPackaged?path.resolve(app.getAppPath(),'../../../..'):app.getAppPath();
const uiFile=path.join(__dirname,'ui','index.html');
const testRoot=process.env.LOOT_EDITOR_TEST_ROOT;
const payload=app.isPackaged?path.join(__dirname,'payload'):path.join(moduleRoot,'build/out/install-payload');
// Test storage is explicit and separated; it never redirects the game patcher.
app.setPath('userData',path.join(testRoot||moduleRoot,'build','out','desktop-user'));
function checkGame(root){
  const descriptor=path.join(root,'application.xml');const swf=path.join(root,'pfe.swf');
  if(!fs.existsSync(descriptor)||!fs.existsSync(swf))throw new Error('请选择含有 application.xml 和 pfe.swf 的游戏文件夹');
  const xml=fs.readFileSync(descriptor,'utf8');
  if(!/<content>\s*pfe\.swf\s*<\/content>/.test(xml))throw new Error('当前启动目标不是 1.02 根目录游戏，请先恢复 application.xml 的启动目标');
  return path.resolve(root);
}
function useGame(root){gameRoot=checkGame(root);store=new Store(testRoot||path.join(gameRoot,'mods','LootEditor'));}
function status(){
  const f=path.join(store.root,'config','active.json');let activeHash='',state={},receipt=null;
  if(fs.existsSync(f))activeHash=core.fingerprint(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
  try{state=readJSON(path.join(store.root,'config','application-state.json'));}catch{}
  try{receipt=readJSON(path.join(process.env.APPDATA,'pfe','Local Store','LootEditor.receipt.json'));}catch{}
  const receiptHere=!!receipt?.gameRoot&&path.resolve(receipt.gameRoot).toLowerCase()===gameRoot.toLowerCase();
  const receiptRecent=receiptHere&&receipt.readAt>=Number(state.appliedAt||0);
  const receiptFresh=receiptRecent&&receipt.profileHash===activeHash&&receipt.status==='ready';
  let manifest='';try{manifest=fs.readFileSync(path.join(gameRoot,'mods','loader-manifest.txt'),'utf8');}catch{}
  const listed=/^LootEditor\|LootEditorMod\|1\|/m.test(manifest);
  return {gameRoot,activeHash,appliedAt:state.appliedAt||0,profileId:state.profileId||'',receipt,receiptFresh,receiptRecent,listed,hasPrevious:fs.existsSync(path.join(store.root,'config/active.previous.json')),runtimePresent:fs.existsSync(path.join(gameRoot,'mods','LootEditor','release','LootEditorMod.swf')),installation:installer.inspect(gameRoot,payload),test:!!testRoot};
}
function ensureSender(event){if(event.sender!==window.webContents||event.senderFrame.url!==pathToFileURL(uiFile).href)throw new Error('不允许的页面请求');}
function handle(name,fn){ipcMain.handle('loot:'+name,async(event,...args)=>{ensureSender(event);return fn(...args);});}
function valid(p){const errors=core.validate(p,catalog);if(errors.length)throw new Error(errors.join('\n'));return p;}
app.whenReady().then(async()=>{
  core=await import(pathToFileURL(path.join(__dirname,'core.mjs')).href);catalog=readJSON(path.join(__dirname,'data','catalog.json'));
  const preferences=path.join(testRoot||moduleRoot,'config','editor.json');let root=path.resolve(moduleRoot,'../..');
  try{root=readJSON(preferences).gameRoot;}catch{}
  try{useGame(root);}catch{gameRoot=root;store=new Store(testRoot||moduleRoot);}
  handle('bootstrap',()=>{let view={};try{view=readJSON(path.join(store.root,'config/view.json'));}catch{}return {catalog,icons:readJSON(path.join(__dirname,'data/icons.json')),view,profiles:store.list().map(entry=>entry.profile&&core.validate(entry.profile,catalog).length?{broken:entry.profile.name||'未知方案',error:'方案格式不兼容，原文件已保留'}:entry),status:status(),version:core.VERSION};});
  handle('view',v=>{atomicJSON(path.join(store.root,'config/view.json'),{profile:String(v.profile||'').slice(0,80),tab:['container','enemy','ammo','profiles'].includes(v.tab)?v.tab:'container',source:String(v.source||'').slice(0,100)});});
  handle('save',p=>{valid(p);store.save(p);dirty=false;return status();});
  handle('apply',p=>{valid(p);checkGame(gameRoot);store.apply(p);dirty=false;return status();});
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
  handle('dirty',value=>{dirty=!!value;});
  handle('pickGame',async()=>{const d=await dialog.showOpenDialog(window,{title:'选择 Remains 游戏文件夹',properties:['openDirectory']});if(d.canceled)return null;useGame(d.filePaths[0]);atomicJSON(preferences,{gameRoot});return {profiles:store.list(),status:status()};});
  handle('import',async()=>{const d=await dialog.showOpenDialog(window,{title:'导入掉落方案',properties:['openFile'],filters:[{name:'掉落方案',extensions:['json']}]});if(d.canceled)return null;const f=d.filePaths[0];if(fs.statSync(f).size>2000000)throw new Error('方案文件过大');const p=readJSON(f);valid(p);p.id=require('node:crypto').randomUUID();store.save(p);return p;});
  handle('export',async p=>{valid(p);const d=await dialog.showSaveDialog(window,{title:'导出掉落方案',defaultPath:p.name.replace(/[<>:"/\\|?*]/g,'_')+'.json',filters:[{name:'掉落方案',extensions:['json']}]});if(d.canceled)return false;atomicJSON(d.filePath,p);return true;});
  handle('openFolder',()=>shell.openPath(store.profiles));
  handle('confirm',async({message,detail})=>{const r=await dialog.showMessageBox(window,{type:'question',buttons:['继续编辑','确定'],defaultId:0,cancelId:0,message:String(message).slice(0,200),detail:String(detail||'').slice(0,2000)});return r.response===1;});
  window=new BrowserWindow({width:1440,height:950,minWidth:840,minHeight:650,show:!testRoot,title:'掉落工坊 · Remains',backgroundColor:'#f3f4ef',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:!!testRoot}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(url!==pathToFileURL(uiFile).href)event.preventDefault();});
  window.on('close',event=>{if(dirty){const r=dialog.showMessageBoxSync(window,{type:'question',buttons:['继续编辑','放弃未保存改动'],defaultId:0,cancelId:0,message:'当前方案还有未保存的修改'});if(r===0)event.preventDefault();}});
  await window.loadFile(uiFile);
});
app.on('window-all-closed',()=>app.quit());
