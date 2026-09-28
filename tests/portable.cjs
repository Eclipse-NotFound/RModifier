'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const project=path.resolve(__dirname,'..'),root=path.join(project,'build/out/portable-'+Date.now()),game=path.resolve(project,'../..');
const entry=path.join(root,'单文件 空格目录/RModifier.exe'),checks=[],errors=[];
fs.mkdirSync(path.dirname(entry),{recursive:true});fs.copyFileSync(path.join(project,'dist/RModifier.exe'),entry);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function main(){
 const debugPort=await port(),env={...process.env,RMODIFIER_TEST_ROOT:path.join(root,'session'),RMODIFIER_GAME_ROOT:game};delete env.ELECTRON_RUN_AS_NODE;
 const children=[];let browser,page;
 const start=args=>{const child=spawn(entry,args,{env,cwd:path.dirname(entry),windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);for(const stream of [child.stdout,child.stderr])stream.on('data',b=>fs.appendFileSync(path.join(root,'launcher.log'),b));return child;};
 const first=start(['--remote-debugging-port='+debugPort,'--map']);
 try{
  assert.deepEqual(fs.readdirSync(path.dirname(entry)),['RModifier.exe']);console.log('Launched standalone portable file');
  const endpoint='http://127.0.0.1:'+debugPort;let info;
  for(let n=0;n<180;n++){if(first.exitCode!==null)throw Error('Portable launcher exited early: '+first.exitCode);try{info=await (await fetch(endpoint+'/json/version')).json();if(info.webSocketDebuggerUrl)break;}catch{}await delay(500);}
  if(!info?.webSocketDebuggerUrl)throw Error('Portable did not expose a ready UI');
  browser=await chromium.connectOverCDP(endpoint);page=browser.contexts()[0].pages().find(p=>p.url().endsWith('index.html'))||browser.contexts()[0].pages()[0];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const ui=id=>page.frameLocator('#'+id+'-frame');
  await page.locator('[data-workspace="map"][aria-selected="true"]').waitFor();await ui('map').locator('[data-property="name"]').waitFor();checks.push('Single EXE starts from a Chinese/space path without adjacent resources');
  await ui('map').locator('#preview').click();await ui('map').locator('#png:not([disabled])').waitFor({timeout:90000});checks.push('Packaged hidden AIR components render a full native map preview');
  await page.screenshot({path:path.join(root,'native-map.png')});
  start(['--barks']);await page.locator('[data-workspace="barks"][aria-selected="true"]').waitFor({timeout:90000});assert.equal(browser.contexts()[0].pages().length,1);checks.push('A second launch activates the existing window and requested editor');
  await ui('barks').locator('[data-edit]').first().fill('单文件程序的持久恢复测试');await page.waitForTimeout(700);
  assert.ok(fs.existsSync(path.join(root,'session/data/config/barks/recovery.json')));checks.push('Portable writes recovery outside its temporary extraction directory');
  await page.locator('[data-workspace="loot"]').click();await ui('loot').getByRole('heading',{name:'弹药盒',exact:true}).waitFor();await ui('loot').getByRole('button',{name:'复制原版，开始编辑'}).click();await ui('loot').locator('#save').click();await ui('loot').locator('#dirtyLabel').filter({hasText:'已保存'}).waitFor();checks.push('Bundled loot editor saves a real profile');
  assert.deepEqual(errors,[]);checks.push('Portable renderer has no JavaScript/CSP errors');
 }finally{
  fs.writeFileSync(path.join(root,'results.json'),JSON.stringify({passed:checks.length,checks,errors,entry,root},null,2));
  if(page)await page.evaluate(()=>workshop.close()).catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await delay(1500);for(const child of children)if(child.exitCode===null)try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'pipe'});}catch{}
 }
 console.log(JSON.stringify({passed:checks.length,checks,errors,root},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
