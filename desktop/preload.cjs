const {contextBridge,ipcRenderer}=require('electron');
const api={};for(const name of ['bootstrap','save','apply','status','dirty','pickGame','import','export','openFolder','confirm','install','restoreGame','view','previous'])api[name]=(...args)=>ipcRenderer.invoke('loot:'+name,...args);
contextBridge.exposeInMainWorld('loot',Object.freeze(api));
