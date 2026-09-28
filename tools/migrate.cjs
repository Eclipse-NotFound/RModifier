const path=require('node:path');
const {migrate,rollback}=require('../desktop/migrate.cjs');
if(process.argv[2]==='--rollback')console.log(rollback(process.argv[3]));
else {
  if(process.argv[2]!=='--apply')throw Error('显式迁移：node tools/migrate.cjs --apply；撤回：--rollback <migration.json>');
  const project=path.resolve(__dirname,'..');
  console.log(JSON.stringify(migrate(path.resolve(project,'../..'),path.join(project,'build/out/install-payload')),null,2));
}
