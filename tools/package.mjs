import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'electron-builder';
const project=path.resolve(import.meta.dirname,'..');process.chdir(project);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pkg=JSON.parse(fs.readFileSync('package.json'));
const baseline='b78244657ed407d03808c90e97325509db35f802122835f58933fff8003305ac';
const bridgeHash='c631cbf3511b6ee303f533d08d51511fe0eb702f43e5db17f5241d8576c64867';
// Packaging consumes the verified bridge; it never requires changing the installed game.
const bridge='build/out/pfe-loot-safe.swf',runtime='build/out/LootEditorMod.swf';
if(hash(bridge)!==bridgeHash)throw Error('Verified bridge fingerprint mismatch; do not rebuild from an already patched game');
if(!/PRESERVED 4602 unrelated/.test(fs.readFileSync('build/out/method-patch.log','utf8')))throw Error('Missing bridge preservation evidence');
for(const file of [runtime,'desktop/ui/app.js','desktop/data/icons.json','map-editor/component/SceneHost.swf','map-editor/component/NativeScene.swf'])if(!fs.existsSync(file))throw Error('Missing '+file);
const payload='build/out/install-payload';fs.mkdirSync(payload,{recursive:true});
fs.copyFileSync(bridge,payload+'/pfe-loot-safe.swf');fs.copyFileSync(runtime,payload+'/LootEditorMod.swf');
const manifest={version:pkg.version,gameVersion:'1.02',sourceHash:baseline,bridgeHash,runtimeHash:hash(runtime),builtAt:new Date().toISOString()};
fs.writeFileSync(payload+'/manifest.json',JSON.stringify(manifest,null,2));
const inputs={};
function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())collect(file);else if(!file.endsWith('.ts'))inputs[file]=hash(file);}}
collect('desktop');collect('map-editor/component');collect(payload);
process.env.CSC_IDENTITY_AUTO_DISCOVERY='false';
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL??='5';
// Optional local tool cache, prepared with the upstream pinned checksums.
for(const [key,file] of Object.entries({ELECTRON_BUILDER_NSIS_DIR:'build/cache/nsis',ELECTRON_BUILDER_NSIS_RESOURCES_DIR:'build/cache/nsis-resources',ELECTRON_BUILDER_7ZIP_PATH:'node_modules/electron-winstaller/vendor/7z-x64.exe'}))if(!process.env[key]&&fs.existsSync(file))process.env[key]=path.resolve(file);
const artifacts=await build({projectDir:project,config:{
 appId:'org.remains.rmodifier',productName:'RModifier',asar:true,compression:'maximum',
 electronDist:path.join(project,'node_modules/electron/dist'),electronVersion:pkg.devDependencies.electron,
 directories:{output:'dist'},
 files:['package.json',{from:'desktop',to:'desktop',filter:['**/*','!**/*.ts','!ui/shell.html','!ui/loot-host.js','!map/document.mjs','!map/renderer.cjs']}],
 extraResources:[{from:payload,to:'install-payload'},{from:'map-editor/component',to:'map-component',filter:['SceneHost.swf','NativeScene.swf']}],
 win:{target:[{target:'portable',arch:['x64']}],signAndEditExecutable:false},
 portable:{artifactName:'RModifier.exe',requestExecutionLevel:'user'}
}});
const exe='dist/RModifier.exe';
for(const [file,expected] of Object.entries(inputs))if(!fs.existsSync(file)||hash(file)!==expected)throw Error('Build input changed while packaging: '+file+'; freeze changes and rebuild');
const resources='dist/win-unpacked/resources';
const map={SceneHost:hash(resources+'/map-component/SceneHost.swf'),NativeScene:hash(resources+'/map-component/NativeScene.swf')};
if(map.SceneHost!==hash('map-editor/component/SceneHost.swf')||map.NativeScene!==hash('map-editor/component/NativeScene.swf')||hash(resources+'/install-payload/LootEditorMod.swf')!==manifest.runtimeHash)throw Error('Packaged components differ from verified inputs');
fs.writeFileSync('build/out/package-report.json',JSON.stringify({version:pkg.version,artifacts,exe:path.resolve(exe),exeHash:hash(exe),bytes:fs.statSync(exe).size,payload:manifest,map,inputs},null,2));
console.log('Packaged '+path.resolve(exe));
