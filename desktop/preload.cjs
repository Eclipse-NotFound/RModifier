const {contextBridge,ipcRenderer}=require('electron');
const context=ipcRenderer.invoke('rm:context');
const invoke=(channel,...args)=>context.then(token=>ipcRenderer.invoke(channel,token,...args));
const api={};for(const name of ['bootstrap','save','apply','status','dirty','import','export','openFolder','confirm','install','restoreGame','view','previous'])api[name]=(...args)=>invoke('loot:'+name,...args);
contextBridge.exposeInMainWorld('loot',Object.freeze(api));

const workshop={};for(const name of ['state','info','closeChoice','close','pickGame','lootRecover','barksBoot','barksOpen','barksRecover','barksSave','barksExport','barksRestore','mapBoot','mapOpen','mapNew','mapRecover','mapSave','rendererReady','mapPreview','mapPNG'])workshop[name]=(...args)=>invoke('rm:'+name,...args);workshop.onClose=fn=>ipcRenderer.on('rm:close-request',()=>fn());workshop.onNavigate=fn=>ipcRenderer.on('rm:navigate',(_event,id)=>fn(id));contextBridge.exposeInMainWorld('workshop',Object.freeze(workshop));
