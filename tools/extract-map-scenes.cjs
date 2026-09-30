'use strict';
// Build-time metadata only. The editor discovers the installed XML files at run time.
const fs=require('node:fs'),path=require('node:path'),X=require('../desktop/map/xml.js');
const project=path.resolve(__dirname,'..'),game=path.resolve(project,'../..');
const source=fs.readFileSync(path.join(game,'game-reference/decompiled/1.02/src102/scripts/fe/GameData.as'),'utf8');
const text=X.scanXml(fs.readFileSync(path.join(game,'text_zh.xml'),'utf8'));
const labels={};function walk(n){if(n.name==='map'){const title=n.children.find(c=>c.name==='n');if(title)labels[n.attrs.id]=X.plainText(title);}n.children.forEach(walk);}walk(text);
const scenes={};
for(const match of source.matchAll(/<land\s[^>]*>[\s\S]*?<\/land>/g)){
 const n=X.scanXml(match[0]),a=n.attrs;if(!a.file)continue;
 const file=a.file+'.xml',s=scenes[file]??={file,name:labels[a.id]||a.id,lands:[],random:false};
 s.lands.push({id:a.id,name:labels[a.id]||a.id,random:a.rnd==='1'});s.random||=a.rnd==='1';
}
Object.assign(scenes,{'rooms2.xml':{file:'rooms2.xml',name:'测试房间',lands:[],random:false},'z_shablon.xml':{file:'z_shablon.xml',name:'空白模板',lands:[],random:false}});
fs.writeFileSync(path.join(project,'desktop/map/scenes.json'),JSON.stringify(scenes,null,2)+'\n');
console.log('Extracted '+Object.keys(scenes).length+' scene files');
