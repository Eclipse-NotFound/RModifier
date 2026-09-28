'use strict';
window.installNativeMapHost=()=>{
  const status=document.getElementById('native-map-status');
  let latest={dirty:false,loaded:false};
  const message=text=>{status.textContent=text;status.title=text;};
  const update=value=>{latest=value||latest;RMHost.state('map',{dirty:!!latest.dirty,revision:latest.revision||0,documentId:latest.documentId||'',contentHash:latest.contentHash||'',pendingInputHash:latest.pendingInputHash||'',composing:!!latest.composing});message(latest.loaded?(latest.dirty?'原 Flash 编辑器 · 有未保存修改':'原 Flash 编辑器 · 已就绪'):'正在加载原 Flash 编辑器…');};
  const flush=async reason=>{const result=await workshop.nativeMapFlush(reason);update(result.state);if(['offline','composing'].includes(result.status)){message(result.message||(result.status==='composing'?'请先完成地图中的中文输入':'原界面暂未响应，内容仍保留'));return false;}return true;};
  workshop.onNativeMapState(update);workshop.onNativeMapError(message);
  const save=async options=>{const result=await workshop.nativeMapSave(options);update(result.state);if(result.status!=='saved'){message(result.message||(result.status==='cancelled'?'已取消保存':'请先完成当前地图输入'));return false;}return !latest.dirty;};
  RMHost.register('map',{
    async activate(){message('正在打开原 Flash 编辑器…');update(await workshop.nativeMapActivate(true));},
    async beforeLeave(){return flush('hide');},
    async deactivate(){await workshop.nativeMapActivate(false);},
    async flush(){return flush('inspect');},
    saveDraft:()=>save(),
    async recover(){const result=await workshop.nativeMapRecover();update(result.state);if(result.status!=='recovered'){message(result.message||'未能保留当前草稿');return false;}return true;}
  });
  for(const button of document.querySelectorAll('[data-native-action]'))button.addEventListener('click',async()=>{button.disabled=true;try{const name=button.dataset.nativeAction;if(name==='save')await save();else if(name==='saveAs')await save({as:true});else update(await workshop.nativeMapAction(name));}catch(error){message(error.message);}finally{button.disabled=false;}});
};
