'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),asar=require('@electron/asar');
const project=path.resolve(__dirname,'..'),output=path.resolve(process.argv[2]||path.join(project,'dist'));
const report=JSON.parse(fs.readFileSync(path.join(output,'package-report.json'),'utf8'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const excluded=new Set(['desktop/ui/shell.html','desktop/ui/loot-host.js','desktop/map/document.mjs','desktop/map/renderer.cjs']);
let checked=0;const archive=path.join(output,'win-unpacked/resources/app.asar');
for(const [file,expected]of Object.entries(report.inputs)){
 const normalized=file.replaceAll('\\','/');let bytes;
 if(normalized==='package.json'){const actual=JSON.parse(asar.extractFile(archive,'package.json').toString()),source=JSON.parse(fs.readFileSync(path.join(project,file),'utf8'));for(const key of ['name','version','main','description'])if(actual[key]!==source[key])throw Error('Packaged application metadata differs: '+key);continue;}
 if(normalized.startsWith('desktop/')&&!excluded.has(normalized))bytes=asar.extractFile(archive,normalized.split('/').join(path.sep));
 else continue;
 if(digest(bytes)!==expected)throw Error('Actual application archive differs: '+file);checked++;
}
for(const [file,expected]of Object.entries(report.nativeMap))if(digest(fs.readFileSync(path.join(output,'win-unpacked/resources/native-map-component',file)))!==expected)throw Error('Native component differs: '+file);
if(digest(fs.readFileSync(path.join(output,'win-unpacked/resources/native-surface/NativeSurface.exe')))!==report.nativeSurface)throw Error('Native surface differs');
if(digest(fs.readFileSync(path.join(output,'RModifier.exe')))!==report.exeHash)throw Error('Single executable differs');
const result={success:true,archiveFiles:checked,nativeComponents:Object.keys(report.nativeMap).length,exeHash:report.exeHash,checkedAt:new Date().toISOString()};
fs.writeFileSync(path.join(output,'actual-package-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
