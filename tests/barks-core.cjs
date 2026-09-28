'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const C = require('../desktop/barks/core.js');
const root = path.resolve(__dirname, '..'), game = path.resolve(root, '..', '..');
const checks = [];
function test(name, run) { run(); checks.push(name); }
function row(text, more) { return Object.assign({ uid: 'new-test', origin: null, text, marked: false, enabled: true, note: '' }, more); }
async function main() {
  const bytes = fs.readFileSync(path.join(game, 'text_zh.xml')), raw = bytes.toString('utf8'), source = C.parseSource(raw, 'text_zh.xml');
  const baseline = C.initialEntries(source);
  test('Actual Chinese corpus: 17 speakers, 102 pools, 976 lines', () => {
    assert.equal(new Set(source.groups.map(g => g.id)).size, 17); assert.equal(source.groups.length, 102);
    assert.equal(Object.values(baseline).flat().length, 976);
  });
  test('Unedited XML is byte-identical, including BOM and newline style', () => assert.ok(Buffer.from(C.exportXml(source, baseline)).equals(bytes)));
  const edited = C.clone(baseline);
  edited['pip/hack'][0].text = '新句：A&B <测试> "123" 😀\n下一行'; edited['pip/hack'][3].marked = false;
  edited['pip/hack'].push(row('追加的台词'));
  const exported = C.exportXml(source, edited), reparsed = C.parseSource(exported, source.filename);
  test('Changed text, Unicode, XML escaping and line breaks survive reopening', () => assert.equal(reparsed.groups.find(g => g.key === 'pip/hack').rows[0].text, edited['pip/hack'][0].text));
  test('Literal CR normalizes but a referenced CR survives XML decoding', () => {
    const s=C.parseSource('<all><replic><rep id="p" act="a"><r>A\rB&#13;C</r></rep></replic></all>');
    assert.equal(s.groups[0].rows[0].text,'A\nB\rC');
    const e=C.initialEntries(s);e['p/a'][0].text='X\rY';
    assert.equal(C.parseSource(C.exportXml(s,e)).groups[0].rows[0].text,'X\rY');
  });
  test('Adding one line gives 977; marker removal retains other rows', () => {
    assert.equal(reparsed.groups.reduce((n,g) => n + g.rows.length, 0), 977); assert.equal(reparsed.groups.find(g=>g.key==='pip/hack').rows[3].marked, false);
  });
  const g = source.groups.find(g => g.key === 'pip/hack'), newG = reparsed.groups.find(g => g.key === 'pip/hack');
  test('Everything outside edited group is byte-identical', () => {
    assert.equal(exported.slice(0, newG.node.start), raw.slice(0, g.node.start));
    assert.equal(exported.slice(newG.node.end), raw.slice(g.node.end));
  });
  test('Export does not mutate source or editable state', () => { assert.equal(source.raw, raw); assert.equal(edited['pip/hack'][0].text, '新句：A&B <测试> "123" 😀\n下一行'); });
  const parked = C.clone(baseline); parked['pip/hack'][0].enabled = false;
  test('Disabled line is omitted from XML but retained in draft', () => {
    assert.equal(C.parseSource(C.exportXml(source, parked)).groups.find(g=>g.key==='pip/hack').rows.length,3);
    assert.equal(parked['pip/hack'].length,4);
  });
  const deleted = C.clone(baseline); deleted['pip/hack'].splice(1,1);
  test('Deleted line is absent, other pools unchanged', () => assert.equal(C.parseSource(C.exportXml(source,deleted)).groups.find(g=>g.key==='pip/hack').rows.length,3));
  const marked = C.clone(baseline); marked['pip/hack'][0].marked=true;
  test('Adding m marker is understood after reopening',()=>assert.ok(C.parseSource(C.exportXml(source,marked)).groups.find(g=>g.key==='pip/hack').rows[0].marked));
  const fixture = '<all><lang>测试</lang><replic><!--outside--><rep act="hack" id="pip" v="test">\n<!--keep--><r x="未知" m="0"><![CDATA[A & <B>]]></r><r>第二句</r><extra keep="yes"/></rep><rep id="vendor" act="neutral"/></replic><other k="x">无关内容</other></all>';
  const f = C.parseSource(fixture), fe = C.initialEntries(f);
  test('CDATA, m=0 and quoted attributes parse correctly',()=>{assert.equal(fe['pip/hack'][0].text,'A & <B>');assert.equal(fe['pip/hack'][0].marked,true);});
  fe['pip/hack'][0].text='改变';fe['pip/hack'][0].marked=false;
  test('Unknown attributes, comments and sibling elements survive modification',()=>{
    const out=C.exportXml(f,fe);assert.ok(out.includes('x="未知"'));assert.ok(out.includes('<!--keep-->'));assert.ok(out.includes('<extra keep="yes"/>'));assert.ok(out.includes('<other k="x">无关内容</other>'));assert.ok(!out.includes('m="0"'));
  });
  fe['vendor/neutral'].push(row('新商人台词',{uid:'other'}));
  test('Empty self-closing pool accepts a new line',()=>assert.equal(C.parseSource(C.exportXml(f,fe)).groups[1].rows[0].text,'新商人台词'));
  const blank = C.clone(baseline);blank['pip/hack'].push(row(''));
  test('Unfinished active line blocks export with a Chinese message',()=>assert.throws(()=>C.exportXml(source,blank),/还没写内容/));
  blank['pip/hack'].at(-1).enabled=false;
  test('Unfinished disabled draft does not block export',()=>assert.equal(C.exportXml(source,blank),raw));
  test('Duplicate pool keys are rejected rather than silently overwritten',()=>assert.throws(()=>C.parseSource('<all><replic><rep id="p" act="a"/><rep id="p" act="a"/></replic></all>'),/出现了两次/));
  test('Broken XML nesting rejected',()=>assert.throws(()=>C.parseSource('<all><replic></all>'),/不配对/));
  test('Duplicate attributes rejected',()=>assert.throws(()=>C.parseSource('<all x="a" x="b"/>'),/两次/));
  test('Raw ampersand rejected instead of repaired',()=>assert.throws(()=>C.parseSource('<all>H&H<replic><rep id="p" act="a"/></replic></all>'),/第 1 行/));
  test('DTD and external entities rejected',()=>assert.throws(()=>C.parseSource('<!DOCTYPE all SYSTEM "file:///x"><all/>'),/外部定义/));
  test('Nested content inside a sentence is rejected without data loss',()=>assert.throws(()=>C.parseSource('<all><replic><rep id="p" act="a"><r><b>word</b></r></rep></replic></all>'),/嵌套格式/));
  test('Multiple hashes and illegal characters stop unsafe export',()=>{
    assert.ok(C.lineIssues('#a|b# #c|d#').some(x=>x.level==='error'));assert.ok(C.lineIssues('a\u0001b').some(x=>x.level==='error'));
  });
  test('Friendly name and gender controls round-trip',()=>assert.equal(C.fromFriendly(C.toFriendly('@lp，我#来过|来过了#。')),'@lp，我#来过|来过了#。'));
  test('Literal player names cannot trigger replacement-string syntax',()=>assert.equal(C.displayText('你好@lp', '$&角色',false),'你好$&角色'));
  test('Only the first player-name token is replaced',()=>assert.equal(C.displayText('@lp @lp','测试',true),'测试 @lp'));
  test('Male and female forms match the game rule',()=>{assert.equal(C.displayText('我#|未能#完成任务','',true),'我完成任务');assert.equal(C.displayText('我#|未能#完成任务','',false),'我未能完成任务');});
  test('Filtered draw is silence, not pre-filtered resampling',()=>{const s=C.sample([row('隐藏',{marked:true}),row('普通',{uid:'two'})],{filter:true,random:()=>0});assert.equal(s.text,'');assert.match(s.reason,/粗口/);});
  test('Player retries repeated result once then goes silent',()=>{let calls=0;const s=C.sample([row('只有一句')],{player:true,previous:'只有一句',random:()=>{calls++;return 0;}});assert.equal(s.text,'');assert.equal(calls,2);assert.match(s.reason,/连续/);});
  test('NPC can repeat a sentence',()=>assert.equal(C.sample([row('句子')],{player:false,previous:'句子',random:()=>0}).text,'句子'));
  test('A single player line and all-marked pool produce warnings',()=>{const e=C.clone(baseline);e['pip/hack']=[e['pip/hack'][3]];assert.equal(C.validate(source,e).filter(x=>x.key==='pip/hack').filter(x=>x.level==='warning').length,2);});
  test('History combines a text session and restores deletions',()=>{
    const h=new C.History(C.clone(baseline)), orig=C.clone(h.entries['pip/hack']), a=C.clone(orig);a[0].text='一';h.replace('pip/hack',a,'typing');a[0].text='一二';h.replace('pip/hack',a,'typing');
    assert.equal(h.undoStack.length,1);h.undo();assert.deepEqual(h.entries['pip/hack'],orig);h.redo();assert.equal(h.entries['pip/hack'][0].text,'一二');h.replace('pip/hack',[]);h.undo();assert.equal(h.entries['pip/hack'].length,4);
  });
  const hash=await C.digest(raw);test('Browser-compatible SHA-256 matches original file bytes',()=>assert.equal(hash,crypto.createHash('sha256').update(bytes).digest('hex')));
  const draft=C.makeProject(source,parked,hash,'pip/hack','测试草稿');draft.entries['pip/hack'][0].note='待修改';
  const restored=await C.readProject(JSON.parse(JSON.stringify(draft)));
  test('Saved project restores source, disabled rows, notes and selected scene',()=>{assert.equal(restored.source.raw,raw);assert.equal(restored.entries['pip/hack'][0].enabled,false);assert.equal(restored.entries['pip/hack'][0].note,'待修改');assert.equal(restored.selected,'pip/hack');});
  const tampered=C.clone(draft);tampered.source.raw+=' ';
  await assert.rejects(C.readProject(tampered),/校验不一致/);checks.push('Tampered baseline in saved project rejected');
  const duplicate=C.clone(draft);duplicate.entries['pip/hack'][1].uid=duplicate.entries['pip/hack'][0].uid;
  await assert.rejects(C.readProject(duplicate),/重复/);checks.push('Corrupt draft with duplicate line identity rejected');
  const stats=[];
  for(const lang of ['de','en','es','jp','pl','ru','tw','ua','zh']){
    const name='text_'+lang+'.xml', b=fs.readFileSync(path.join(game,name));
    if(lang==='pl'){test('Existing Polish XML problem surfaced without repair',()=>assert.throws(()=>C.parseSource(b.toString('utf8'),name),/第 1800 行/));continue;}
    const s=C.parseSource(b.toString('utf8'),name),e=C.initialEntries(s);
    test('Byte-identical no-op export for '+name,()=>assert.ok(Buffer.from(C.exportXml(s,e)).equals(b)));
    stats.push({file:name,groups:s.groups.length,lines:s.groups.reduce((n,g)=>n+g.rows.length,0)});
  }
  fs.mkdirSync(path.join(root,'build/out/barks-core'),{recursive:true});
  fs.writeFileSync(path.join(root,'build/out/barks-core','core-results.json'),JSON.stringify({at:new Date().toISOString(),checksPassed:checks.length,checks,languages:stats,sourceSha256:hash},null,2));
  fs.mkdirSync(path.join(root,'build/out/barks-core','fixtures'),{recursive:true});
  fs.writeFileSync(path.join(root,'build/out/barks-core','fixtures','saved-draft.barks.json'),JSON.stringify(draft));
  fs.writeFileSync(path.join(root,'build/out/barks-core','fixtures','edited.xml'),exported);
  fs.writeFileSync(path.join(root,'build/out/barks-core','fixtures','broken.xml'),'<all><replic>坏文件</all>');
  console.log(JSON.stringify({passed:checks.length,languages:stats},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
