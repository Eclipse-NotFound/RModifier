(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.MapLabels=api;})(globalThis,function(){
  'use strict';
  function layout(items,measure,width=1920,height=1000,fontHeight=22){
    const placed=[],hidden=[],boxes=[];
    const ordered=[...items].sort((a,b)=>a.priority-b.priority||a.y-b.y||a.x-b.x||a.index-b.index);
    for(const item of ordered){
      const w=Math.ceil(measure(item.label))+10,h=fontHeight+8;let best;
      // Bounded local repulsion: an overfull cluster is represented by the object list,
      // rather than attaching labels to unrelated objects on the far side of the room.
      for(let radius=0;radius<=280&&!best;radius+=16){
        const candidates=radius===0?[[item.x+8,item.y+8]]:Array.from({length:24},(_,i)=>[item.x+Math.cos(i*Math.PI/12)*radius,item.y+Math.sin(i*Math.PI/12)*radius]);
        for(const [cx,cy] of candidates){
          const x=Math.round(Math.max(2,Math.min(width-w-2,cx))),y=Math.round(Math.max(2,Math.min(height-h-2,cy)));
          if(w>width-4||boxes.some(b=>x<b.x+b.w+3&&x+w+3>b.x&&y<b.y+b.h+3&&y+h+3>b.y))continue;
          best={x,y,w,h};break;
        }
      }
      if(best){boxes.push(best);placed.push({...item,box:best});}else hidden.push(item);
    }
    return {placed,hidden};
  }
  function colors(samples){let total=0;for(const rgb of samples)total+=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return total/Math.max(1,samples.length)>140?{text:'#13221a',outline:'#ffffffd9'}:{text:'#f6f8ef',outline:'#111b17e6'};}
  return {layout,colors};
});
