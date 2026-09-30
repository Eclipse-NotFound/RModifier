package {
 import flash.display.*;
 import flash.events.*;
 import flash.text.*;

 /** Scene and room navigation stays inside the original Flash editor. */
 public class NativeSceneLibrary extends Sprite {
  private var host:Object,model:Object,detail:Object;
  private var body:Sprite=new Sprite(),scenes:Sprite=new Sprite(),rooms:Sprite=new Sprite(),mini:Sprite=new Sprite();
  private var search:TextField,roomSearch:TextField,editName:TextField,roomName:TextField,heading:TextField,info:TextField,poolInfo:TextField,roomInfo:TextField;
  private var page:int=0,roomPage:int=0,filter:int=0,selected:String="",selectedRoom:String="";
  private var rows:Array=[],roomRows:Array=[],buttons:Object={},working:Boolean=false;
  public function NativeSceneLibrary(editor:Object){
   host=editor;name="RModifier_SceneLibrary";visible=false;
   graphics.beginFill(0x173040,0.30);graphics.drawRect(0,0,1800,950);graphics.endFill();
   body.x=185;body.y=65;body.graphics.lineStyle(1,0x718C9A);body.graphics.beginFill(0xF7FAFC);body.graphics.drawRoundRect(0,0,1430,810,12);body.graphics.endFill();addChild(body);
   text("场景与房间",26,18,640,36,25,true);button("close","返回画布",1278,20,125,function():void{visible=false;});
   text("场景",26,70,350,28,18,true);text("房间",490,70,540,28,18,true);
   button("all","全部场景",26,106,130,function():void{filter=0;page=0;drawScenes();});button("mine","我的房间池",166,106,150,function():void{filter=1;page=0;drawScenes();});
   search=input("sceneSearch",26,149,410,"",function():void{page=0;drawScenes();});search.addEventListener(FocusEvent.FOCUS_IN,function(e:FocusEvent):void{e.stopPropagation();});
   text("搜索场景名或文件名",28,181,400,23,12);
   roomSearch=input("roomSearch",490,106,515,"",function():void{roomPage=0;drawRooms();});
   text("搜索房间名称",1040,110,355,25,14);
   heading=text("",490,148,880,32,16,true);
   scenes.x=26;scenes.y=210;body.addChild(scenes);rooms.x=490;rooms.y=192;body.addChild(rooms);
   button("prevScene","上一页",26,619,100,function():void{page=Math.max(0,page-1);drawScenes();});button("nextScene","下一页",336,619,100,function():void{page++;drawScenes();});
   info=text("",133,623,195,25,14);
   button("prevRoom","上一页",490,530,100,function():void{roomPage=Math.max(0,roomPage-1);drawRooms();});button("nextRoom","下一页",905,530,100,function():void{roomPage++;drawRooms();});
   roomInfo=text("",600,535,300,25,14);
   mini.x=1040;mini.y=210;body.addChild(mini);poolInfo=text("",1040,380,355,115,14);
   text("房间名称",490,581,160,24,14);roomName=input("roomName",490,610,515,"");
   button("open","编辑所选房间",1040,530,355,function():void{send("open",{room:selectedRoom});});
   button("newRoom","新建房间",490,654,160,function():void{send("newRoom",{room:selectedRoom,name:roomName.text});});
   button("copyRoom","复制房间",668,654,160,function():void{send("copyRoom",{room:selectedRoom,name:roomName.text});});
   button("renameRoom","房间改名",846,654,160,function():void{send("renameRoom",{room:selectedRoom,name:roomName.text});});
   text("副本名称",26,670,400,24,14);editName=input("poolName",26,698,410,"");
   button("createPool","创建房间池副本",26,746,240,function():void{send("createPool",{name:editName.text});});
   button("renamePool","副本改名",282,746,154,function():void{send("renamePool",{name:editName.text});});
   button("publish","保存并加入游戏混抽",1040,610,355,function():void{send("publish");});
   text("改过或新建的普通房间会与原版混抽。\n切换场景时自动保留未保存草稿。",490,713,880,61,16);
   host.ToolsContext().view.addChild(this);
   addEventListener(MouseEvent.MOUSE_DOWN,function(e:MouseEvent):void{e.stopPropagation();});addEventListener(MouseEvent.MOUSE_UP,function(e:MouseEvent):void{e.stopPropagation();});addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void{e.stopPropagation();});
  }
  private function text(value:String,x:Number,y:Number,w:Number,h:Number,size:int=14,bold:Boolean=false):TextField{var t:TextField=new TextField();t.defaultTextFormat=new TextFormat("Microsoft YaHei UI",size,0x263F50,bold);t.x=x;t.y=y;t.width=w;t.height=h;t.multiline=true;t.wordWrap=true;t.selectable=false;t.text=value;body.addChild(t);return t;}
  private function input(id:String,x:Number,y:Number,w:Number,value:String,change:Function=null):TextField{var t:TextField=text(value,x,y,w,32,16);t.name=id;t.type=TextFieldType.INPUT;t.border=true;t.borderColor=0x8A9DAB;t.background=true;t.backgroundColor=0xFFFFFF;t.multiline=false;t.wordWrap=false;t.selectable=true;if(change!=null)t.addEventListener(Event.CHANGE,function(e:Event):void{change();});return t;}
  private function button(id:String,label:String,x:Number,y:Number,w:Number,fn:Function):ToolButton{var b:ToolButton=new ToolButton(label,w,32);b.name=id;b.x=x;b.y=y;body.addChild(b);buttons[id]=b;b.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void{e.stopImmediatePropagation();if(!working||id=="close")fn();});return b;}
  private function row(parent:Sprite,label:String,index:int,w:Number,chosen:Boolean,fn:Function):ToolButton{var b:ToolButton=new ToolButton(label,w,27);b.y=index*31;if(chosen){b.graphics.clear();b.graphics.lineStyle(2,0x39816B);b.graphics.beginFill(0xD8EEE4);b.graphics.drawRoundRect(0,0,w,27,4);b.graphics.endFill();}parent.addChild(b);b.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void{e.stopImmediatePropagation();if(!working)fn();});return b;}
  private function send(action:String,extra:Object=null):void{working=true;var p:Object={action:action,id:selected};if(extra)for(var k:String in extra)p[k]=extra[k];host.RMLibrary(p);}
  public function update(value:Object):void{if(value.closed){visible=false;working=false;return;}var before:String=selected;var changedRoom:Boolean=model&&model.currentRoom!=value.currentRoom;model=value;detail=value.detail;selected=value.selected;working=false;visible=true;parent.setChildIndex(this,parent.numChildren-1);if(before!=selected){selectedRoom="";roomPage=0;roomSearch.text="";editName.text=detail.original?detail.name+" - 我的房间池":detail.name;}if(changedRoom&&value.current===selected&&findRoom(value.currentRoom)){selectedRoom=value.currentRoom;roomSearch.text="";for(var ri:int=0;ri<detail.rooms.length;ri++)if(detail.rooms[ri].name==selectedRoom)roomPage=int(ri/10);}
   if(!selectedRoom||!findRoom(selectedRoom))selectedRoom=value.current===selected&&findRoom(value.currentRoom)?value.currentRoom:detail.rooms.length?detail.rooms[0].name:"";
   heading.text=detail.name+" · "+detail.rooms.length+" 间 · "+(detail.fixed?"固定布局":"随机房间池");drawScenes();if(before!=selected){for(var si:int=0;si<rows.length;si++)if(rows[si].id==selected)page=int(si/13);drawScenes();}drawRooms();
   var current:Boolean=value.current===selected;buttons.newRoom.enabled=buttons.copyRoom.enabled=buttons.renameRoom.enabled=current;buttons.renamePool.enabled=!detail.original;
   var entry:Object;for each(var e:Object in model.entries)if(e.id==selected)entry=e;
   buttons.publish.label=detail.original?"停止本地区的自建房间混抽":"保存并加入游戏混抽";buttons.publish.enabled=entry&&entry.random;
  }
  public function unlock():void{working=false;}
  private function findRoom(name:String):Object{if(detail)for each(var r:Object in detail.rooms)if(r.name==name)return r;return null;}
  private function drawScenes():void{while(scenes.numChildren)scenes.removeChildAt(0);rows=[];var q:String=search.text.toLowerCase();for each(var e:Object in model.entries)if((!filter||!e.original)&&String(e.name+e.sourceFile).toLowerCase().indexOf(q)>=0)rows.push(e);var max:int=Math.max(0,Math.ceil(rows.length/13)-1);page=Math.min(page,max);info.text=(page+1)+" / "+(max+1)+" · "+rows.length+" 个场景";for(var i:int=0;i<13&&page*13+i<rows.length;i++)sceneRow(rows[page*13+i],i);}
  private function sceneRow(e:Object,i:int):void{row(scenes,(e.draft?"● ":"")+(e.original?"原图 · ":"我的 · ")+e.name+"  ("+e.count+")"+(e.active&&!e.original?" ✓":""),i,410,e.id==selected,function():void{send("detail",{id:e.id});});}
  private function drawRooms():void{while(rooms.numChildren)rooms.removeChildAt(0);roomRows=[];var q:String=roomSearch.text.toLowerCase();for each(var r:Object in detail.rooms)if(String(r.name).toLowerCase().indexOf(q)>=0)roomRows.push(r);var max:int=Math.max(0,Math.ceil(roomRows.length/10)-1);roomPage=Math.min(roomPage,max);roomInfo.text=(roomPage+1)+" / "+(max+1)+" · "+roomRows.length+" 间";for(var i:int=0;i<10&&roomPage*10+i<roomRows.length;i++)roomRow(roomRows[roomPage*10+i],i);drawMini();}
  private function roomRow(r:Object,i:int):void{var kind:String=detail.fixed?"位置 "+r.x+","+r.y+","+r.z:r.mixable?(r.type?"分区房间":"普通房间"):"特殊房间";row(rooms,r.name+"  ·  "+kind,i,515,r.name==selectedRoom,function():void{selectedRoom=r.name;drawRooms();});}
  private function drawMini():void{mini.graphics.clear();var r:Object=findRoom(selectedRoom);if(!r)return;roomName.text=r.name;mini.graphics.beginFill(0xFFFFFF);mini.graphics.drawRect(0,0,336,175);mini.graphics.endFill();for(var y:int=0;y<25;y++)for(var x:int=0;x<48;x++){var c:String=r.terrain[y][x];if(c!="_"){mini.graphics.beginFill(c.charAt(0)!="_"?0x4B655E:0xB2C5BE);mini.graphics.drawRect(x*7,y*7,7,7);mini.graphics.endFill();}}
   poolInfo.text=r.name+"\n"+(detail.fixed?"固定场景：保存为独立副本":r.mixable?"可加入原版混合抽取":"入口、背景或特殊用途房间")+"\n"+(model.current===selected?"修改名称后可新建、复制或改名":"先点“编辑所选房间”再管理房间");}
  public function get state():Object{return {open:visible,selected:selected,room:selectedRoom,sceneCount:model?model.entries.length:0,roomCount:detail?detail.rooms.length:0,working:working,scenes:rows.map(function(e:Object,...rest):String{return e.id;}),rooms:roomRows.map(function(r:Object,...rest):String{return r.name;})};}
  public function test(action:Object):void{if(action.field){var t:TextField=body.getChildByName(String(action.field)) as TextField;if(!t)throw new Error("场景输入不存在");t.text=action.value;t.dispatchEvent(new Event(Event.CHANGE));}if(action.scene){for each(var e:Object in model.entries)if(e.id==action.scene){send("detail",{id:e.id});return;}throw new Error("测试场景不存在");}if(action.room){if(!findRoom(action.room))throw new Error("测试房间不存在");selectedRoom=action.room;drawRooms();}if(action.button){var b:ToolButton=buttons[action.button];if(!b||!b.mouseEnabled)throw new Error("场景按钮不可用："+action.button);b.dispatchEvent(new MouseEvent(MouseEvent.CLICK,true));}}
 }
}
