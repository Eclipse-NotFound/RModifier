const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../../desktop/map/document.js'),X=require('../../desktop/map/xml.js'),K=require('../../desktop/map/catalog.json'),L=require('../../desktop/map/labels.js');
const game=path.resolve(__dirname,'../../../..');
test('all 31 stock maps, 662 rooms: opening and unchanged attributes retain exact bytes',()=>{
  let files=0,rooms=0;for(const file of fs.readdirSync(path.join(game,'Rooms')).filter(f=>f.endsWith('.xml'))){const raw=fs.readFileSync(path.join(game,'Rooms',file),'utf8'),d=M.parse(raw);assert.equal(d.raw,raw);for(const r of d.rooms)assert.equal(M.attribute(raw,r,'name',r.attrs.name),raw);files++;rooms+=d.rooms.length;}
  assert.equal(files,31);assert.equal(rooms,662);
});
const special='\uFEFF<?xml version="1.0"?>\r\n<!-- 保留注释 -->\r\n<all strange="yes"><land serial="1"><options xx="&amp;"/></land>\r\n<room name="甲 &amp; 乙" custom="42"><a><![CDATA[_._]]></a><!--房间注释--><obj id="safe" x="2" y="3" code="story-id"><scr><![CDATA[a < b && c]]></scr><unknown>原文 &amp; &#20320;</unknown></obj><obj id="safe" x="2" y="3" code="same-id"/><extension keep="1"/></room>\r\n<room name="原样保留" odd="yes"><a>_</a><custom><![CDATA[hello <world>]]></custom></room>\r\n</all>\r\n';
test('editing one duplicate object preserves scripts, unknown nodes, other rooms, BOM and CRLF',()=>{
  const d=M.parse(special),n=d.rooms[0].children.find(n=>n.name==='obj'),next=M.attribute(special,n,'x',9);
  assert.equal(next,special.replace(' x="2"',' x="9"'));
  assert.equal(M.nodeXML(M.parse(next),M.parse(next).rooms[1]),M.nodeXML(d,d.rooms[1]));
  assert.equal(M.cells(d.rooms[0])[0][0],'_');
  assert.equal(M.attribute(special,d.rooms[0],'name','甲 & 乙'),special);
});
test('XML fragments escape and reject malformed or external definitions',()=>{
  const raw=M.create(),d=M.parse(raw),changed=M.attribute(raw,d.rooms[0],'custom','<&"\n');assert.equal(M.parse(changed).rooms[0].attrs.custom,'<&"\n');
  for(const xml of ['<!DOCTYPE all><all/>','<all><room name="x" name="x"/></all>','<all><room></all>'])assert.throws(()=>M.parse(xml));
  assert.throws(()=>M.patch(raw,[{start:-1,end:0,value:''}]));
  assert.throws(()=>M.patch(raw,[{start:0,end:10,value:''},{start:8,end:11,value:''}]));
});
test('terrain painting preserves other layers and updates the original 22 entrance slots',()=>{
  let raw=M.create();let grid=M.cells(M.parse(raw).rooms[0]);assert.deepEqual(M.doorValues(grid),[3,3,3,3,3,3,4,4,4,4,4,3,3,3,3,3,3,4,4,4,4,4]);
  const bg=K.materials.find(m=>m.layer===2).id;
  raw=M.paint(raw,0,[[46,3]],bg,2,K.materials);
  raw=M.paint(raw,0,[[46,3]],'A',1,K.materials,2);
  const d=M.parse(raw);grid=M.cells(d.rooms[0]);assert.equal(grid[3][46],'A;'+bg);
  assert.equal(M.text(d.rooms[0].children.find(n=>n.name==='doors')).split('.')[0],'0');
  assert.equal(M.paint(raw,0,[[46,3]],'A',1,K.materials,2),raw);
  raw=M.paint(raw,0,[[46,3]],'',1,K.materials,0);assert.equal(M.cells(M.parse(raw).rooms[0])[3][46],'_'+bg);
  raw=M.paint(raw,0,[[5,1]],'*',5,K.materials);assert.equal(M.cells(M.parse(raw).rooms[0])[1][5],'_*');
});
test('door aperture widths match two-cell and wider openings on all four borders',()=>{
  const grid=Array.from({length:25},()=>Array(48).fill('A'));
  for(const x of [46,47])for(const y of [2,3])grid[y][x]='_';
  for(const x of [0,1])for(const y of [2,3])grid[y][x]='_';
  for(const y of [0,1,23,24])for(const x of [5,6])grid[y][x]='_';
  const v=M.doorValues(grid);assert.equal(v[0],2);assert.equal(v[11],2);assert.equal(v[6],2);assert.equal(v[17],2);
});
test('short/self-closing rooms are filled only when painted; fixed entrances remain untouched',()=>{
  for(const raw of ['<all><room name="x"/></all>','<all><room name="x"><a/></room></all>']){assert.equal(M.parse(raw).raw,raw);const next=M.paint(raw,0,[[3,4]],'A',1,K.materials,0),d=M.parse(next);assert.equal(d.rooms[0].children.filter(n=>n.name==='a').length,25);assert.equal(M.cells(d.rooms[0])[4][3],'A');}
  const raw=special,next=M.paint(raw,0,[[0,0]],'A',1,K.materials,0);assert.ok(!next.includes('<doors>'));assert.ok(next.includes('<extension keep="1"/>'));assert.ok(next.includes('<![CDATA[a < b && c]]>'));
});
test('new fixed and random map, room copy, room insertion and XML text entities',()=>{
  const fixed=M.parse(M.create(true));assert.equal(fixed.random,false);assert.equal(fixed.rooms[0].attrs.x,'0');
  const raw=M.create(),next=M.insert(raw,M.parse(raw).root,M.blankRoom('新 & 房间'));assert.equal(M.parse(next).rooms.length,2);
  assert.equal(M.parse(next).rooms[1].attrs.name,'新 & 房间');
  assert.equal(M.cells(M.parse('<all><room><a>&#95;._</a></room></all>').rooms[0])[0][0],'_');
});
test('Chinese palette is complete, water exists, only supported single-character terrain IDs',()=>{
  assert.equal(K.materials.length,67);assert.equal(K.objects.length,376);
  for(const e of [...K.materials,...K.objects])assert.match(e.label,/[\u4e00-\u9fff]/);
  for(const e of K.materials){assert.equal(e.id.length,1);assert.ok(e.layer>=1&&e.layer<=5);}
  assert.ok(K.materials.some(m=>m.id==='*'&&m.layer===5));
  const gameText=X.scanXml(fs.readFileSync(path.join(game,'text_zh.xml'),'utf8'));
  for(const o of K.objects){const n=gameText.children.find(n=>n.name===o.kind&&n.attrs.id===o.id)?.children.find(n=>n.name==='n');if(n)assert.equal(o.label,X.plainText(n));}
});
test('transparent label placement is deterministic, contained, collision-free and bounded',()=>{
  const items=Array.from({length:250},(_,index)=>({index,priority:index===0?0:1,x:40,y:40,label:'随机普通敌人 '+index}));
  const result=L.layout(items,t=>t.length*22);assert.deepEqual(result,L.layout(items,t=>t.length*22));assert.ok(result.hidden.length>0);assert.equal(result.placed[0].index,0);
  for(const [i,a] of result.placed.entries()){const b=a.box;assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1920&&b.y+b.h<=1000);for(const c of result.placed.slice(i+1).map(x=>x.box))assert.ok(!(b.x<c.x+c.w&&b.x+b.w>c.x&&b.y<c.y+c.h&&b.y+b.h>c.y));}
  assert.notEqual(L.colors([[0,0,0]]).text,L.colors([[255,255,255]]).text);
});
