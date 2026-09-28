(function(root,factory){const api=factory(typeof module==='object'?require('./xml.js'):root.MapXML);if(typeof module==='object')module.exports=api;else root.MapDocument=api;})(globalThis,function(C){
  'use strict';
  const escape=value=>C.escapeXml(value).replace(/"/g,'&quot;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');
  function parse(raw){
    const root=C.scanXml(raw);if(root.name!=='all')throw Error('请选择完整的地图 XML 文件');
    const rooms=root.children.filter(n=>n.name==='room');if(!rooms.length)throw Error('这份文件没有房间');
    if(rooms.length>3000)throw Error('地图房间数量超过当前编辑器的处理范围');
    for(const room of rooms){const rows=room.children.filter(n=>n.name==='a');if(rows.length>25||rows.some(n=>n.children.length||text(n).trim().split('.').length>48))throw Error('房间地形超过 48 × 25 格，已停止编辑以保护原文件');}
    const land=root.children.find(n=>n.name==='land');return {raw,root,rooms,land,random:land?.attrs.serial!=='1'};
  }
  function text(node){return C.plainText(node);}
  function patch(raw,changes){let end=raw.length;for(const p of [...changes].sort((a,b)=>b.start-a.start||b.end-a.end)){if(!Number.isInteger(p.start)||!Number.isInteger(p.end)||p.start<0||p.end>end||p.start>p.end||typeof p.value!=='string')throw Error('修改区域无效或重叠');raw=raw.slice(0,p.start)+p.value+raw.slice(p.end);end=p.start;}return raw;}
  function attribute(raw,node,key,value){
    if(!/^[A-Za-z_][\w.:-]*$/.test(key))throw Error('属性名称无效');const span=node.attrSpans.find(s=>s.name===key);
    if(value===null)return span?patch(raw,[{...span,value:''}]):raw;
    if(Object.hasOwn(node.attrs,key)&&node.attrs[key]===String(value))return raw;
    const entry=' '+key+'="'+escape(value)+'"';
    return patch(raw,[span?{...span,value:entry}:{start:node.openEnd-(node.selfClosing?2:1),end:node.openEnd-(node.selfClosing?2:1),value:entry}]);
  }
  function nodeXML(doc,node){return doc.raw.slice(node.start,node.end);}
  function insert(raw,parent,xml){C.scanXml(xml);const nl=raw.includes('\r\n')?'\r\n':'\n';if(parent.selfClosing)return patch(raw,[{start:parent.openEnd-2,end:parent.openEnd,value:'>'+nl+'    '+xml+nl+'  </'+parent.name+'>'}]);return patch(raw,[{start:parent.closeStart,end:parent.closeStart,value:'    '+xml+nl+'  '}]);}
  function cells(room){const rows=room.children.filter(n=>n.name==='a').map(n=>text(n).trim().split('.'));return Array.from({length:25},(_,y)=>Array.from({length:48},(_,x)=>rows[y]?.[x]||'_'));}
  // Editor.getDoors order: right 0–5, bottom 6–10, left 11–16, top 17–21.
  function doorValues(grid){const clear=(x,y)=>!grid[y]?.[x]||grid[y][x][0]==='_';return Array.from({length:22},(_,i)=>{
    if(i>=17||i>=6&&i<11){const x=(i>=17?i-17:i-6)*9+4,ys=i>=17?[0,1]:[23,24];if(!ys.every(y=>clear(x+1,y)&&clear(x+2,y)))return 0;return ys.every(y=>clear(x,y)&&clear(x+3,y))?4:2;}
    const y=(i>=11?i-11:i)*4+3,xs=i>=11?[0,1]:[46,47];if(!xs.every(x=>clear(x,y)&&clear(x,y-1)))return 0;return xs.every(x=>clear(x,y-2))?3:2;
  });}
  function content(node,value){return node.selfClosing?{start:node.openEnd-2,end:node.openEnd,value:'>'+value+'</'+node.name+'>'}:{start:node.openEnd,end:node.closeStart,value};}
  function paint(raw,index,points,id,layer,catalog,shape=null){
    if(!Number.isInteger(layer)||layer<1||layer>5||id&&!catalog.some(m=>m.id===id&&Number(m.layer??m.ed)===layer))throw Error('请选择当前图层中的素材');
    if(shape!==null&&(!Number.isInteger(shape)||shape<0||shape>3))throw Error('地形高度无效');
    const doc=parse(raw),room=doc.rooms[index];if(!room)throw Error('房间不存在');const rows=room.children.filter(n=>n.name==='a'),grid=cells(room),dirty=new Set();
    for(const [x,y] of points){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=48||y<0||y>=25)continue;const previous=grid[y][x];let next;
      if(layer===1){const suffix=shape===null?previous.slice(1):(['',',',';',':'][shape]+previous.slice(1).replace(/[,;:]/g,''));next=(id||'_')+suffix;}
      else {const suffix=Array.from(previous.slice(1)).filter(c=>!catalog.some(m=>m.id===c&&Number(m.layer??m.ed)===layer));if(id)suffix.push(id);next=previous[0]+suffix.join('');}
      if(next!==previous){grid[y][x]=next;dirty.add(y);}}
    if(!dirty.size)return raw;
    const nl=raw.includes('\r\n')?'\r\n':'\n',changes=[...dirty].filter(y=>rows[y]).map(y=>content(rows[y],C.escapeXml(grid[y].join('.'))));let addition='';
    if([...dirty].some(y=>!rows[y]))addition+=grid.slice(rows.length).map(r=>'<a>'+C.escapeXml(r.join('.'))+'</a>').join(nl+'    ')+nl;
    if(doc.random&&layer===1){const doors=room.children.find(n=>n.name==='doors'),value=doorValues(grid).join('.');if(doors)changes.push(content(doors,value));else addition+='<doors>'+value+'</doors>'+nl;}
    if(addition){if(room.selfClosing)return patch(raw,[content(room,nl+'    '+addition+'  ')]);const at=rows.length&&room.children.some(n=>n.name==='doors')?rows.at(-1).end:room.closeStart;changes.push({start:at,end:at,value:nl+'    '+addition});}
    return patch(raw,changes);
  }
  function snapshot(raw,index,filename){const doc=parse(raw),room=doc.rooms[index];if(!room)throw Error('房间不存在');return {room:nodeXML(doc,room),land:doc.land?nodeXML(doc,doc.land):null,filename,roomNames:doc.rooms.map(n=>n.attrs.name||'')};}
  function blankRoom(name,attrs={}){const grid=Array.from({length:25},()=>Array(48).fill('_'));return '<room name="'+escape(name)+'"'+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>\n    '+grid.map(r=>'<a>'+r.join('.')+'</a>').join('\n    ')+'\n    <doors>'+doorValues(grid).join('.')+'</doors>\n    <options/>\n  </room>';}
  function create(fixed=false){return '<?xml version="1.0" encoding="UTF-8"?>\n<all>\n  '+(fixed?'<land id="custom" serial="1"><options/></land>':'<land/>')+'\n  '+blankRoom('我的第一个房间',fixed?{x:0,y:0,z:0}:{})+'\n</all>\n';}
  return {parse,text,patch,attribute,nodeXML,insert,cells,paint,snapshot,blankRoom,create,escape,doorValues};
});
