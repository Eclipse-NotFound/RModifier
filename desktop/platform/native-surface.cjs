'use strict';
const path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline');
// Owns only the window adapter. The map module is the sole owner of its AIR process.
class NativeSurfacePort {
  constructor({getWindow,getBounds,executable,gameRoot,canDisplay=()=>true,onError=()=>{}}){Object.assign(this,{getWindow,getBounds,executable,gameRoot,canDisplay,onError});this.serial=0;this.pending=new Map();this.visibility=0;this.attaching=null;}
  check(identity){if(!this.identity||identity.sessionId!==this.identity.sessionId||identity.epoch!==this.identity.epoch)throw Error('原生窗口会话已经切换');}
  request(op,data={}){if(!this.bridge||this.bridge.exitCode!==null)return Promise.reject(Error('原生窗口适配器未运行'));return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('原生窗口操作超时：'+op));},5000);this.pending.set(id,{resolve,reject,timer});this.bridge.stdin.write(JSON.stringify({id,op,...data})+'\n');});}
  async attach(identity){if(this.identity)throw Error('已有原生地图窗口，不能重复挂接');this.identity={...identity};const window=this.getWindow();const hwnd=window.getNativeWindowHandle().readBigUInt64LE().toString();this.bridge=spawn(this.executable,[hwnd,String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.bridge.on('error',e=>this.fail(e));this.bridge.on('exit',()=>this.fail(Error('原生窗口适配器已退出')));readline.createInterface({input:this.bridge.stdout}).on('line',line=>{try{const r=JSON.parse(line);if(r.eventName){this.onError(Error(r.message));return;}const p=this.pending.get(r.id);if(p){clearTimeout(p.timer);this.pending.delete(r.id);r.ok?p.resolve(r.result):p.reject(Error(r.error));}}catch(e){this.onError(e);}});this.bridge.stderr.on('data',b=>this.onError(Error(String(b))));this.attaching=this.request('attach',{...identity,executable:path.join(this.gameRoot,'adl64.exe')});try{const result=await this.attaching;this.attaching=null;return await this.layout()||result;}catch(error){await this.detach(identity).catch(()=>{});throw error;}finally{this.attaching=null;}}
  fail(error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
  async layout(){if(!this.identity||this.attaching)return;const bounds=this.getBounds();return this.request('layout',{top:Math.max(0,Math.round(bounds.top)),bottom:Math.max(0,Math.round(bounds.bottom||0))});}
  async setVisible(identity){this.check(identity);const ticket=++this.visibility;await this.attaching;if(ticket!==this.visibility)return;await this.layout();return this.request('visible',{visible:!!identity.visible&&this.canDisplay()});}
  async focus(identity){this.check(identity);if(!this.canDisplay())return;await this.attaching;return this.request('focus');}
  async inspect(){await this.attaching;return this.request('inspect');}
  async detach(identity){if(!this.identity)return;this.check(identity);++this.visibility;const bridge=this.bridge;try{if(bridge&&bridge.exitCode===null)await this.request('detach');}finally{this.identity=null;this.bridge=null;bridge?.stdin.end();this.fail(Error('原生窗口适配器已释放'));}}
}
module.exports={NativeSurfacePort};
