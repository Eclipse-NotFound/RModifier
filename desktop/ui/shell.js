'use strict';
(() => {
  const labels={loot:'掉落编辑',barks:'角色台词',map:'地图编辑'};
  const pages=new Map(),states=new Map();
  let active='loot',busy=false,ready=false,nativeMap=false,navigation=0;
  const status=message=>{const el=document.getElementById('shell-status');if(el)el.textContent=message;if(nativeMap&&active==='map')workshop.nativeMapNotice(message).catch(console.error);};
  function state(id,value){
    if(!labels[id])throw Error('未知编辑页');
    states.set(id,{...states.get(id),...value});
    const mark=document.querySelector('[data-workspace="'+id+'"] .mark');
    if(mark){mark.textContent=states.get(id).dirty?'●':'';mark.title=states.get(id).dirty?'尚未保存':'';}
    workshop.state(id,states.get(id)).catch(e=>status(e.message));
  }
  async function activate(id){
    if(!labels[id]||!ready)return;
    const sequence=++navigation;
    try{
    if(id!==active){if(await pages.get(active)?.beforeLeave?.()===false)return false;if(sequence!==navigation)return false;await pages.get(active)?.deactivate?.();if(sequence!==navigation)return false;}
    active=id;
    document.querySelectorAll('[data-workspace]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.workspace===id)));
    for(const name of Object.keys(labels))document.getElementById(name+'-frame').hidden=name!==id;
    document.title='RModifier · '+labels[id];
    document.body.classList.toggle('native-map-active',nativeMap&&id==='map');
    const top=document.querySelector('header').getBoundingClientRect().bottom;
    await workshop.workspace(id,sequence,top);
    if(sequence!==navigation)return false;
    await pages.get(id)?.activate?.();return sequence===navigation;
    }catch(error){status('切换未完成：'+error.message);return false;}
  }
  async function flushInputs(){
    for(const id of pages.keys()){
      const frame=document.getElementById(id+'-frame');
      frame?.contentDocument?.activeElement?.blur();
      if(await pages.get(id)?.flush?.()===false)return false;
    }
    return true;
  }
  const version=id=>JSON.stringify(states.get(id)||{});
  async function prepare(reason){
    if(!await flushInputs())return false;
    const dirty=Object.keys(labels).filter(id=>states.get(id)?.dirty);
    if(!dirty.length)return true;
    const choice=await workshop.closeChoice(reason,dirty.map(id=>labels[id]));
    if(choice==='continue')return false;
    const confirmed=new Map();
    for(const id of dirty){
      const handler=pages.get(id);
      if(!handler)throw Error(labels[id]+'尚未就绪，请等加载完成');
      const before=version(id);
      const ok=await handler[choice==='save'?'saveDraft':'recover']();
      if(!ok){await activate(id);status(labels[id]+'未完成保存，内容仍保留在窗口中');return false;}
      if((choice==='save'&&states.get(id)?.dirty)||(choice==='recover'&&version(id)!==before)){
        await activate(id);status(labels[id]+'又有新的改动，请先处理后再继续');return false;
      }
      confirmed.set(id,version(id));
    }
    // Changes in a different editor during a pending dialog must also keep it open.
    for(const [id,s] of states)if(s.dirty&&(choice==='save'||confirmed.get(id)!==version(id)))return false;
    return true;
  }
  async function action(fn){
    if(busy)return false;
    busy=true;
    try{return await fn();}catch(e){status('操作未完成：'+e.message);return false;}finally{busy=false;}
  }
  async function chooseGame(){return action(async()=>{
    if(!await prepare('更换游戏位置前'))return false;
    if(!await workshop.pickGame())return false;
    location.reload();return true;
  });}
  window.RMHost=Object.freeze({
    register(id,handler){if(!labels[id]||typeof handler.saveDraft!=='function'||typeof handler.recover!=='function')throw Error('编辑页接口不完整');pages.set(id,handler);},
    state,chooseGame,activate,
  });
  workshop.onClose(()=>action(async()=>{if(await prepare('退出前'))await workshop.close();}));
  workshop.onNavigate(activate);
  document.addEventListener('DOMContentLoaded',async()=>{
    for(const button of document.querySelectorAll('[data-workspace]'))button.addEventListener('click',()=>activate(button.dataset.workspace));
    document.getElementById('game-location').addEventListener('click',chooseGame);
    try{const info=await workshop.info();nativeMap=!!info.nativeMap;if(nativeMap)window.installNativeMapHost();else document.getElementById('map-frame').src='map/index.html';document.getElementById('game-location').title=info.gameRoot;status('游戏位置：'+info.gameRoot);ready=true;await activate(info.workspace||active);}catch(e){status(e.message);}
  });
})();
