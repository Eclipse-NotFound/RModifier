import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),installer=require('../desktop/install.cjs'),{migrate,rollback}=require('../desktop/migrate.cjs');
function fixture(){
 const root=fs.mkdtempSync(path.resolve('build/out/migration-test-')),payload=path.join(root,'payload');
 for(const dir of ['mods/ModLoader/release','mods/TDFC/release','payload'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 fs.copyFileSync('../../mods/ModLoader/RemainsModScanner.exe',path.join(root,'mods/ModLoader/RemainsModScanner.exe'));
 for(const file of ['pfe.swf','mods/ModLoader/release/ModLoaderMod.swf','mods/TDFC/release/TDFCMod.swf','payload/pfe-loot-safe.swf','payload/LootEditorMod.swf'])fs.writeFileSync(path.join(root,file),'FWS'+file);
 fs.writeFileSync(path.join(root,'application.xml'),'<application><content>pfe.swf</content></application>');
 const manifest='ModLoader|ModLoaderMod|1|0|0\nTDFC|TDFCMod|1|0|0\n';
 fs.writeFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'),'# original comment\n'+manifest);fs.writeFileSync(path.join(root,'mods/loader-manifest.txt'),manifest);
 const meta={version:'0.1.0',sourceHash:installer.hash(path.join(root,'pfe.swf')),bridgeHash:installer.hash(path.join(payload,'pfe-loot-safe.swf')),runtimeHash:installer.hash(path.join(payload,'LootEditorMod.swf'))};
 fs.writeFileSync(path.join(payload,'manifest.json'),JSON.stringify(meta));installer.install(root,payload);
 const source=path.join(root,'mods/RModifier'),old=path.join(root,'mods/LootEditor');fs.renameSync(source,old);
 const recordFile=path.join(old,'config/installation.json'),record=JSON.parse(fs.readFileSync(recordFile));record.backupDir=path.join(old,path.relative(source,record.backupDir));fs.writeFileSync(recordFile,JSON.stringify(record));
 for(const file of ['mods/ModLoader/supported-mods.txt','mods/loader-manifest.txt'])fs.writeFileSync(path.join(root,file),fs.readFileSync(path.join(root,file),'utf8').replaceAll('RModifier|','LootEditor|'));
 fs.mkdirSync(path.join(old,'profiles'),{recursive:true});fs.writeFileSync(path.join(old,'profiles/mine.json'),'用户方案\r\n');fs.writeFileSync(path.join(old,'config/active.json'),'我的配置');
 fs.writeFileSync(path.join(payload,'LootEditorMod.swf'),'FWSnew runtime');meta.version='0.2.0';meta.runtimeHash=installer.hash(path.join(payload,'LootEditorMod.swf'));fs.writeFileSync(path.join(payload,'manifest.json'),JSON.stringify(meta));
 return {root,payload,meta,old};
}
test('迁移使用真实扫描器，保持资料与桥接主文件，撤回保持后续用户编辑',()=>{
 const {root,payload,old,meta}=fixture(),before=installer.hash(path.join(root,'pfe.swf'));
 const result=migrate(root,payload);assert.equal(fs.existsSync(old),false);assert.equal(result.filesPreserved,2);
 assert.equal(installer.hash(path.join(root,'pfe.swf')),before);assert.equal(installer.inspect(root,payload).connected,true);assert.equal(installer.inspect(root,payload).canRestore,true);
 assert.equal(fs.readFileSync(path.join(result.root,'profiles/mine.json'),'utf8'),'用户方案\r\n');assert.equal(installer.hash(path.join(result.root,'release/LootEditorMod.swf')),meta.runtimeHash);
 assert.match(fs.readFileSync(path.join(root,'mods/loader-manifest.txt'),'utf8'),/^RModifier\|LootEditorMod\|1\|0\|0$/m);
 fs.appendFileSync(path.join(result.root,'profiles/mine.json'),'迁移后修改');rollback(result.journal);
 assert.equal(fs.readFileSync(path.join(old,'profiles/mine.json'),'utf8'),'用户方案\r\n迁移后修改');assert.match(fs.readFileSync(path.join(root,'mods/loader-manifest.txt'),'utf8'),/^LootEditor\|/m);assert.equal(installer.hash(path.join(root,'pfe.swf')),before);
});
test('迁移后的安装记录仍可恢复连接前游戏，用户资料保留',()=>{
 const {root,payload,meta}=fixture();const result=migrate(root,payload);installer.restore(root,payload);
 assert.equal(installer.hash(path.join(root,'pfe.swf')),meta.sourceHash);assert.ok(fs.existsSync(path.join(result.root,'profiles/mine.json')));assert.doesNotMatch(fs.readFileSync(path.join(root,'mods/loader-manifest.txt'),'utf8'),/^(RModifier|LootEditor)\|/m);
});
test('新目录碰撞、游戏变化、产物损坏在移动前拒绝',()=>{
 for(const kind of ['collision','game','payload']){const {root,payload,old}=fixture();
  if(kind==='collision')fs.mkdirSync(path.join(root,'mods/RModifier'));
  else fs.appendFileSync(path.join(kind==='game'?root:payload,kind==='game'?'pfe.swf':'LootEditorMod.swf'),'changed');
  const before=fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'));assert.throws(()=>migrate(root,payload));assert.ok(fs.existsSync(old));assert.deepEqual(fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt')),before);
 }
});
test('迁移扫描失败恢复旧目录与原登记，根主文件不变',()=>{
 const {root,payload,old}=fixture(),before=installer.hash(path.join(root,'pfe.swf')),registry=fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt'));
 fs.writeFileSync(path.join(root,'mods/ModLoader/RemainsModScanner.exe'),'broken');assert.throws(()=>migrate(root,payload),/恢复原目录/);
 assert.ok(fs.existsSync(old));assert.equal(fs.existsSync(path.join(root,'mods/RModifier')),false);assert.equal(installer.hash(path.join(root,'pfe.swf')),before);assert.deepEqual(fs.readFileSync(path.join(root,'mods/ModLoader/supported-mods.txt')),registry);
});
test('撤回拒绝覆盖迁移后新的登记，也拒绝损坏备份',()=>{
 const f=fixture(),result=migrate(f.root,f.payload);fs.appendFileSync(path.join(f.root,'mods/ModLoader/supported-mods.txt'),'# newer\n');assert.throws(()=>rollback(result.journal),/登记发生变化/);assert.ok(fs.existsSync(result.root));
 const g=fixture(),m=migrate(g.root,g.payload);fs.appendFileSync(path.join(path.dirname(m.journal),'registry.bak'),'bad');assert.throws(()=>rollback(m.journal),/备份已损坏/);assert.ok(fs.existsSync(m.root));
});
