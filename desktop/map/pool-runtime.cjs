'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {atomic}=require('./scene-library.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inside=(root,file)=>{const r=path.relative(path.resolve(root),path.resolve(file));return r===''||!r.startsWith('..')&&!path.isAbsolute(r);};
async function ensureMapPoolRuntime({gameRoot,dataRoot,componentRoot,testRoot}){
 const source=path.join(componentRoot,'MapPoolMod.swf'),manifest=JSON.parse(fs.readFileSync(path.join(componentRoot,'manifest.json'),'utf8'));
 const bytes=fs.readFileSync(source);if(!manifest.outputs['MapPoolMod.swf']||sha(bytes)!==manifest.outputs['MapPoolMod.swf'])throw Error('地图游戏组件核对失败，请重新安装编辑器');
 const root=path.join(gameRoot,'mods/RModifier'),target=path.join(root,'release/MapPoolMod.swf'),list=path.join(gameRoot,'mods/loader-manifest.txt'),supported=path.join(gameRoot,'mods/ModLoader/supported-mods.txt');
 for(const file of [root,list,supported])if(testRoot&&!inside(testRoot,file))throw Error('地图测试禁止改动正式游戏');
 if(path.resolve(dataRoot).toLowerCase()!==path.resolve(root).toLowerCase())throw Error('当前是隔离编辑目录，不能把测试房间池发布到正式游戏');
 if(!fs.existsSync(list)||!fs.existsSync(supported)||!fs.existsSync(path.join(gameRoot,'mods/ModLoader/release/ModLoaderMod.swf')))throw Error('请先在掉落页完成游戏连接，再加入自建房间');
 const entry='RModifier|MapPoolMod|1|0|0',update=raw=>{const nl=raw.includes('\r\n')?'\r\n':'\n';return raw.split(/\r?\n/).filter(l=>!/^RModifier\|MapPoolMod\|/i.test(l)).join(nl).replace(/\s*$/,'')+nl+entry+nl;};
 const changes=[{file:target,name:'MapPoolMod.swf',old:fs.existsSync(target)?fs.readFileSync(target):null,next:bytes},...[supported,list].map(file=>{const old=fs.readFileSync(file);return {file,name:path.basename(file),old,next:Buffer.from(update(old.toString('utf8')))};})];
 if(changes.every(c=>c.old&&c.old.equals(c.next)))return {installed:false};
 const backup=path.join(root,'backups/map-runtime',Date.now()+'-'+crypto.randomUUID());fs.mkdirSync(backup,{recursive:true});for(const c of changes)if(c.old)fs.writeFileSync(path.join(backup,c.name),c.old,{flag:'wx'});
 const written=[];
 try{for(const c of changes){if(c.old?!fs.existsSync(c.file)||!fs.readFileSync(c.file).equals(c.old):fs.existsSync(c.file))throw Error('模组文件刚被其他程序修改，请重试');atomic(c.file,c.next);written.push(c);if(!fs.readFileSync(c.file).equals(c.next))throw Error('地图模块或登记写入核对失败');}
  atomic(path.join(backup,'receipt.json'),JSON.stringify({version:'0.1.0',runtimeHash:sha(bytes),installedAt:new Date().toISOString(),source,target,list,supported,previous:changes.map(c=>({file:c.file,existed:!!c.old}))},null,2));
 }catch(e){for(const c of written.reverse()){if(fs.existsSync(c.file)&&fs.readFileSync(c.file).equals(c.next)){if(c.old)atomic(c.file,c.old);else fs.unlinkSync(c.file);}}throw e;}
 return {installed:true,backup};
}
module.exports={ensureMapPoolRuntime};
