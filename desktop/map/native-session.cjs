const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {atomicJSON}=require('../store.cjs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
class NativeSession {
  constructor({gameRoot,componentRoot,sessionRoot}){
    this.gameRoot=path.resolve(gameRoot);this.componentRoot=path.resolve(componentRoot);
    this.sessionId=crypto.randomUUID();this.root=path.join(path.resolve(sessionRoot),this.sessionId);this.generation=0;
  }
  async wait(file,timeout=45000){
    const end=Date.now()+timeout;
    while(Date.now()<end){
      const fatal=path.join(this.root,'fatal.json');if(fs.existsSync(fatal))throw Error(JSON.parse(fs.readFileSync(fatal,'utf8')).error);
      if(fs.existsSync(file)){const value=JSON.parse(fs.readFileSync(file,'utf8'));if(value.sessionId!==this.sessionId)throw Error('绘图会话不匹配');return value;}
      if(this.exit!==undefined)throw Error('绘图进程意外退出：'+this.exit+' '+(this.output||'').slice(-700));
      await delay(60);
    }
    throw Error('绘图等待超时，请重试。');
  }
  async start(){
    if(this.exit!==undefined)throw Error('绘图进程已经退出，请重试。');
    if(this.ready)return this.ready;
    if(this.starting)return this.starting;
    this.starting=(async()=>{
      for(const f of ['adl64.exe','texture.swf','texture1.swf','sprite.swf','sprite1.swf','text_zh.xml'])if(!fs.existsSync(path.join(this.gameRoot,f)))throw Error('缺少游戏素材：'+f);
      for(const f of ['SceneHost.swf','NativeScene.swf'])if(!fs.existsSync(path.join(this.componentRoot,f)))throw Error('缺少绘图组件：'+f);
      fs.mkdirSync(this.root,{recursive:true});
      const config={gameRoot:this.gameRoot,componentRoot:this.componentRoot,sessionRoot:this.root,sessionId:this.sessionId};
      atomicJSON(path.join(this.root,'config.json'),config);
      const appId='remains.rmodifier.renderer.s'+this.sessionId.replace(/-/g,'');
      fs.writeFileSync(path.join(this.root,'application.xml'),`<application xmlns="http://ns.adobe.com/air/application/30.0"><id>${appId}</id><versionNumber>1.0.0</versionNumber><filename>RModifierScene</filename><initialWindow><content>SceneHost.swf</content><visible>false</visible><width>48</width><height>25</height><renderMode>cpu</renderMode></initialWindow><supportedProfiles>desktop extendedDesktop</supportedProfiles></application>`);
      this.process=spawn(path.join(this.gameRoot,'adl64.exe'),['-runtime',path.join(this.gameRoot,'runtimes/air/win64'),'-nodebug',path.join(this.root,'application.xml'),this.componentRoot,'--',path.join(this.root,'config.json')],{cwd:this.gameRoot,windowsHide:true,stdio:['ignore','pipe','pipe']});
      this.output='';for(const stream of [this.process.stdout,this.process.stderr])stream.on('data',b=>{this.output=(this.output+b.toString()).slice(-8000);});
      this.process.once('exit',code=>{this.exit=code;});this.process.once('error',err=>{this.exit=err.message;});
      this.ready=await this.wait(path.join(this.root,'ready.json'));
      if(this.ready.protocol!==1||!this.ready.capabilities?.includes('entities'))throw Error('绘图组件版本不兼容');
      return this.ready;
    })();
    return this.starting;
  }
  async render({xml,roomIndex=0,documentRevision=0,filename='',options={}}){
    if(this.busy)throw Error('上一张预览正在生成，请等待或取消。');
    this.busy=true;const generation=this.generation;
    try{
      await this.start();if(generation!==this.generation)throw Error('预览已取消');
      if(typeof xml!=='string'||Buffer.byteLength(xml)>8000000)throw Error('地图文件过大');
      const requestId=crypto.randomUUID(),inputHash=hash(xml);
      fs.writeFileSync(path.join(this.root,requestId+'.xml'),xml,'utf8');
      atomicJSON(path.join(this.root,'request.json'),{protocol:1,operation:'render',sessionId:this.sessionId,requestId,inputHash,documentRevision,roomIndex,filename,options});
      const result=await this.wait(path.join(this.root,requestId+'.json'),60000);
      if(generation!==this.generation)throw Error('预览已取消');
      if(result.requestId!==requestId||result.inputHash!==inputHash||result.documentRevision!==documentRevision)throw Error('收到过期绘图结果');
      if(!result.ok)throw Error(result.error);
      if(result.png!==requestId+'.png')throw Error('绘图输出路径无效');
      const bytes=fs.readFileSync(path.join(this.root,result.png));
      if(bytes.length<24||bytes.length>15000000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==1920||bytes.readUInt32BE(20)!==1000)throw Error('预览图像无效');
      this.latest={bytes,requestId,documentRevision,inputHash};
      return {...result,pngHash:hash(bytes),image:'data:image/png;base64,'+bytes.toString('base64')};
    }finally{this.busy=false;}
  }
  cancel(){this.generation++;}
  async dispose(){
    this.cancel();if(!this.process||this.exit!==undefined)return;
    atomicJSON(path.join(this.root,'request.json'),{protocol:1,operation:'dispose',sessionId:this.sessionId,requestId:crypto.randomUUID()});
    const end=Date.now()+3000;while(this.exit===undefined&&Date.now()<end)await delay(50);
    if(this.exit===undefined){this.process.kill();const until=Date.now()+3000;while(this.exit===undefined&&Date.now()<until)await delay(50);if(this.exit===undefined)throw Error('绘图进程未能退出：'+this.process.pid);}
  }
}
module.exports={NativeSession,hash};
