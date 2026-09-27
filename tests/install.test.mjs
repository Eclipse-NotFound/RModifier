import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const installer=require('../desktop/install.cjs');
function fixture(){
 const root=fs.mkdtempSync(path.resolve('build/out/install-test-')),payload=path.join(root,'payload');
 for(const p of ['mods/ModLoader/release','mods/TDFC/release','payload'])fs.mkdirSync(path.join(root,p),{recursive:true});
 fs.copyFileSync('../../mods/ModLoader/RemainsModScanner.exe',path.join(root,'mods/ModLoader/RemainsModScanner.exe'));
 for(const p of ['pfe.swf','mods/ModLoader/release/ModLoaderMod.swf','mods/TDFC/release/TDFCMod.swf','payload/pfe-loot-safe.swf','payload/LootEditorMod.swf'])fs.writeFileSync(path.join(root,p),'FWS'+p);
 fs.writeFileSync(path.join(root,'application.xml'),'<application><content>pfe.swf</content></application>');
 fs.writeFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'# keep this comment\nModLoader|ModLoaderMod|1|0|0\nTDFC|TDFCMod|1|0|0\n');
 fs.writeFileSync(path.join(root,'mods/loader-manifest.txt'),'ModLoader|ModLoaderMod|1|0|0\nTDFC|TDFCMod|1|0|0\n');
 const metadata={version:'test',sourceHash:installer.hash(path.join(root,'pfe.swf')),bridgeHash:installer.hash(path.join(payload,'pfe-loot-safe.swf')),runtimeHash:installer.hash(path.join(payload,'LootEditorMod.swf'))};
 fs.writeFileSync(path.join(payload,'manifest.json'),JSON.stringify(metadata));return {root,payload,metadata};
}
test('installation uses real ModLoader scanner, backs up exact game, is idempotent, and restores without deleting profiles',()=>{
 const {root,payload,metadata}=fixture();const other=installer.hash(path.join(root,'mods/TDFC/release/TDFCMod.swf'));
 assert.equal(installer.inspect(root,payload).compatible,true);const installed=installer.install(root,payload);assert.equal(installed.connected,true);assert.equal(installer.hash(installed.backup),metadata.sourceHash);
 assert.match(fs.readFileSync(path.join(root,'mods/loader-manifest.txt'),'utf8'),/^LootEditor\|LootEditorMod\|1\|0\|0$/m);
 assert.equal(installer.install(root,payload).backup,installed.backup);
 fs.mkdirSync(path.join(root,'mods/LootEditor/profiles'),{recursive:true});fs.writeFileSync(path.join(root,'mods/LootEditor/profiles/mine.json'),'keep');
 fs.appendFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'# added after installation\n');
 assert.equal(installer.restore(root,payload).connected,false);assert.equal(installer.hash(path.join(root,'pfe.swf')),metadata.sourceHash);
 assert.equal(installer.hash(path.join(root,'mods/TDFC/release/TDFCMod.swf')),other);assert.equal(fs.readFileSync(path.join(root,'mods/LootEditor/profiles/mine.json'),'utf8'),'keep');
 assert.match(fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'utf8'),/# added after installation/);assert.doesNotMatch(fs.readFileSync(path.join(root,'mods/loader-manifest.txt'),'utf8'),/^LootEditor\|/m);
});
test('unknown game/payload fingerprints are refused before mutation; later game patches prevent automatic rollback',()=>{
 const {root,payload,metadata}=fixture();fs.appendFileSync(path.join(root,'pfe.swf'),'other mod');const other=installer.hash(path.join(root,'pfe.swf'));assert.throws(()=>installer.install(root,payload),/版本不同/);assert.equal(installer.hash(path.join(root,'pfe.swf')),other);
 fs.writeFileSync(path.join(root,'pfe.swf'),'FWSpfe.swf');fs.appendFileSync(path.join(payload,'LootEditorMod.swf'),'corrupt');assert.throws(()=>installer.install(root,payload),/校验失败/);assert.equal(installer.hash(path.join(root,'pfe.swf')),metadata.sourceHash);
 fs.writeFileSync(path.join(payload,'LootEditorMod.swf'),'FWSpayload/LootEditorMod.swf');installer.install(root,payload);fs.appendFileSync(path.join(root,'pfe.swf'),'new patch');assert.throws(()=>installer.restore(root,payload),/游戏文件已变化/);
});
test('scanner failure rolls registry/runtime back and retains the original game',()=>{
 const {root,payload,metadata}=fixture();const registry=fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'utf8');fs.writeFileSync(path.join(root,'mods/ModLoader/RemainsModScanner.exe'),'invalid exe');
 assert.throws(()=>installer.install(root,payload),/已回退/);assert.equal(installer.hash(path.join(root,'pfe.swf')),metadata.sourceHash);assert.equal(fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'utf8'),registry);assert.equal(fs.existsSync(path.join(root,'mods/LootEditor/release/LootEditorMod.swf')),false);
});
