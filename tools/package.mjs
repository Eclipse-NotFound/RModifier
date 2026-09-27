import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const project=path.resolve(import.meta.dirname,'..');process.chdir(project);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const version=JSON.parse(fs.readFileSync('package.json')).version;
const baseline='b78244657ed407d03808c90e97325509db35f802122835f58933fff8003305ac';
if(hash('../../pfe.swf')!==baseline)throw new Error('Live game changed; rebuild and verify the bridge before packaging');
const verification=fs.readFileSync('build/out/method-patch.log','utf8');if(!/PRESERVED 4602 unrelated/.test(verification))throw new Error('Missing full bytecode preservation verification');
const sourceRoot='node_modules/electron/dist',destination='dist/LootWorkshop',payload='build/out/install-payload';
for(const file of ['build/out/pfe-loot-safe.swf','build/out/LootEditorMod.swf','desktop/ui/app.js','desktop/data/icons.json'])if(!fs.existsSync(file))throw new Error('Missing '+file);
fs.mkdirSync(payload,{recursive:true});
fs.copyFileSync('build/out/pfe-loot-safe.swf',payload+'/pfe-loot-safe.swf');fs.copyFileSync('build/out/LootEditorMod.swf',payload+'/LootEditorMod.swf');
fs.writeFileSync(payload+'/manifest.json',JSON.stringify({version,gameVersion:'1.02',sourceHash:baseline,bridgeHash:hash(payload+'/pfe-loot-safe.swf'),runtimeHash:hash(payload+'/LootEditorMod.swf'),builtAt:new Date().toISOString()},null,2));
fs.mkdirSync(destination,{recursive:true});
for(const name of fs.readdirSync(sourceRoot)){
 if(name==='resources')continue;
 fs.cpSync(path.join(sourceRoot,name),path.join(destination,name==='electron.exe'?'掉落工坊.exe':name),{recursive:true});
}
const appDir=path.join(destination,'resources/app');fs.mkdirSync(appDir,{recursive:true});
fs.cpSync('desktop',path.join(appDir,'desktop'),{recursive:true,filter:p=>!p.endsWith('.ts')});
fs.cpSync(payload,path.join(appDir,'desktop/payload'),{recursive:true});
fs.writeFileSync(path.join(appDir,'package.json'),JSON.stringify({name:'remains-loot-workshop',version,main:'desktop/main.cjs',description:'掉落工坊 · Remains'}));
for(const name of ['README.md','CHANGELOG.md'])if(fs.existsSync(name))fs.copyFileSync(name,path.join(destination,name));
fs.writeFileSync('build/out/package-report.json',JSON.stringify({version,destination:path.resolve(destination),exeHash:hash(path.join(destination,'掉落工坊.exe')),payload:JSON.parse(fs.readFileSync(payload+'/manifest.json'))},null,2));
console.log('Packaged '+path.resolve(destination,'掉落工坊.exe'));
