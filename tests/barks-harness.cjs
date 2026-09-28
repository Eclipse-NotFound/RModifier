// Isolated Electron host for the bark workspace. Never launches the game or touches its documents.
const {app,BrowserWindow,ipcMain,dialog}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {BarksService}=require('../desktop/barks/service.cjs');
const root=process.env.BARKS_TEST_ROOT;if(!root)throw Error('BARKS_TEST_ROOT is required');app.setPath('userData',path.join(root,'electron-user'));
let win;globalThis.barksTest={root};
app.whenReady().then(async()=>{
 const page=path.join(__dirname,'barks-harness.html');const service=new BarksService({gameRoot:path.join(root,'game'),dataRoot:path.join(root,'game/mods/RModifier'),testRoot:root,dialog,getWindow:()=>win});
 globalThis.barksTest.service=service;
 win=new BrowserWindow({show:false,width:1440,height:1020,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'barks-preload.cjs'),backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_event,_level,message)=>fs.appendFileSync(path.join(root,'console.log'),message+'\n'));
 win.webContents.on('render-process-gone',(_event,details)=>fs.writeFileSync(path.join(root,'crash.json'),JSON.stringify(details)));
 for(const [name,method] of Object.entries({barksBoot:'boot',barksOpen:'open',barksRecover:'recover',barksSave:'save',barksExport:'export',barksRestore:'restore'}))ipcMain.handle(name,async(event,...args)=>{if(event.sender!==win.webContents||event.senderFrame.url!==pathToFileURL(page).href)throw Error('Wrong sender');return service[method](...args);});
 await win.loadFile(page);
});
app.on('window-all-closed',()=>app.quit());
