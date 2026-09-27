const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');

function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function atomicJSON(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const raw=JSON.stringify(value,null,2)+'\n';const temporary=file+'.tmp-'+crypto.randomUUID();
  try{const fd=fs.openSync(temporary,'wx');try{fs.writeFileSync(fd,raw,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    if(JSON.stringify(readJSON(temporary))!==JSON.stringify(value))throw new Error('保存校验失败');
    fs.renameSync(temporary,file);
  }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  return raw;
}
function safeId(id){if(typeof id!=='string'||!/^[-\w]{1,80}$/.test(id))throw new Error('方案标识无效');return id;}
class Store{
  constructor(root){this.root=path.resolve(root);this.profiles=path.join(this.root,'profiles');}
  list(){fs.mkdirSync(this.profiles,{recursive:true});return fs.readdirSync(this.profiles).filter(n=>n.endsWith('.json')&&!n.endsWith('.previous.json')).map(n=>{try{return {profile:readJSON(path.join(this.profiles,n))};}catch(e){return {broken:n,error:'文件无法读取，原文件已保留'};}});}
  save(p){const file=path.join(this.profiles,safeId(p.id)+'.json');if(fs.existsSync(file))atomicJSON(file.replace(/\.json$/,'.previous.json'),readJSON(file));atomicJSON(file,p);return p;}
  apply(p){this.save(p);const file=path.join(this.root,'config','active.json');if(fs.existsSync(file)){
    try{atomicJSON(path.join(this.root,'config','active.previous.json'),readJSON(file));}catch(e){fs.copyFileSync(file,file+'.invalid-'+Date.now());}
    }
    const raw=atomicJSON(file,p);atomicJSON(path.join(this.root,'config','application-state.json'),{appliedAt:Date.now(),profileId:p.id,sha256:crypto.createHash('sha256').update(raw).digest('hex')});return raw;
  }
}
module.exports={Store,readJSON,atomicJSON,safeId};
