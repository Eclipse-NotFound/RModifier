      public var rmConfig:Object;
      public var rmPort:Object;
      private var rmModel:Object;
      private var rmRoom:Object;
      private var rmNextNode:Object;
      private var rmHydrating:Boolean = false;
      private var rmOps:Array = [];
      private var rmBusy:Boolean = false;
      private var rmLocked:Boolean = false;
      private var rmCounter:int = 0;
      private var rmInputError:String = "";

      public function RMReady():Boolean { return this.inited && this.toolsLoader && this.toolsLoader.content; }
      public function RMRoots():Object { return this.rmConfig; }
      private function RMXML(raw:String):XML {if(raw.charCodeAt(0)==65279)raw=raw.substr(1);return new XML(raw);}
      public function RMTools():Object { return this.toolsLoader ? this.toolsLoader.content : null; }
      public function RMError(message:String):void { this.ed.objInfo.text=message; this.ed.objInfo.visible=true; }
      public function RMKey():String { this.rmCounter++; return this.rmConfig.sessionId+"-"+this.rmCounter; }
      private function RMNode(kind:String,index:int):Object {
         if(!this.rmRoom) return null;
         for each(var n:Object in this.rmRoom.nodes) if(n.kind==kind) { if(index--==0) return n; }
         return null;
      }
      private function RMFindRoom(name:String):Object {
         if(this.rmModel) for each(var r:Object in this.rmModel.rooms) if(r.name==name) return r;
         return null;
      }
      private function RMDecodeBegin(s:XML):void {
         this.rmHydrating=true;this.rmRoom=s ? this.RMFindRoom(String(s.@name)) : null;
      }
      private function RMDecodeEnd():void {
         var n:Object=this.RMNode("options",0);
         this.optObj.rmKey=n ? n.key : null;
         this.optObj.rmRaw=n ? n.raw : "<options/>";
         this.rmNextNode=null;this.rmHydrating=false;
         if(this.rmRoom) for each(var c:Object in this.rmRoom.protectedCells) {
            var tile:edTile=this.space[c.x][c.y];
            tile.alpha=0.3;
         }
      }
      public function RMLoad(model:Object):void {
         var oldView:Object=this.RMView();
         this.rmHydrating=true;this.rmModel=model;this.rmOps=[];this.rmBusy=false;
         this.ed.objInfo.visible=false;this.rmInputError="";
         if(model.filename) this.rmConfig.filename=model.filename;
         this.selobj=null;this.ed.SelObj.text="";this.ed.SelObj.visible=false;
         this.allroom=this.RMXML(String(model.raw));this.loaded=true;
         // Unknown tile encodings cannot enter edTile.dec, which assumes every symbol exists.
         for each(var meta:Object in model.rooms) {
            var rr:XML=this.allroom.room.(@name==meta.name)[0];
            for each(var c:Object in meta.protectedCells) {var row:Array=String(rr.a[int(c.y)]).split('.');row[int(c.x)]='_';rr.a[int(c.y)]=<a>{row.join('.')}</a>;}
         }
         this.decodeAll();
         var v:Object=model.view || oldView;
         if(v.viewport) this.rmPort.setViewport({zoom:v.viewport.zoom,panX:v.viewport.panX,panY:v.viewport.panY,fit:v.viewport.fit});
         var target:Object=null;
         for each(meta in model.rooms) if(meta.key==v.roomKey) target=meta;
         if(!target && model.rooms.length) target=model.rooms[0];
         if(target) this.RMSelectRoom(target.name);
         this.ed.FileName.text=String(this.rmConfig.filename || "地图工作副本");
         if(v.selectedKey) this.RMSelect(String(v.selectedKey));
         if(this.toolsLoader && this.toolsLoader.content) this.toolsLoader.content["RMRestoreView"](v.preview);
         for each(var input:Object in model.inputs) {
            if(input.fieldKey=="SelObj") {this.RMSelect(String(input.nodeKey));this.ed.SelObj.text=input.raw;this.rmInputError=input.error || "";}
            else if(input.fieldKey=="RoomName") this.ed.RoomName.text=input.raw;
            else if(input.fieldKey=="FileName") this.ed.FileName.text=input.raw;
         }
         this.rmHydrating=false;this.mActive=false;
      }
      public function RMView():Object {
         return {roomKey:this.rmRoom ? this.rmRoom.key : null,roomName:this.ed.RoomName.text,
            selectedKey:this.selobj ? this.selobj.rmKey : null,viewport:this.rmPort.viewportState,preview:this.toolsLoader && this.toolsLoader.content && "RMView" in this.toolsLoader.content ? this.toolsLoader.content["RMView"]() : null};
      }
      public function RMInspect():Object {
         var inputs:Array=[];
         if(this.selobj && this.ed.SelObj.text!=this.selobj.rmDisplay) {
            var error:String="";
            try {var xml:XML=new XML(this.ed.SelObj.text);if(String(xml.name())!=String(this.selobj.xml.name())) error="不能改变属性节点类型";}
            catch(e:Error) {error="属性 XML 不完整，请检查标记和引号";}
            inputs.push({fieldKey:"SelObj",nodeKey:this.selobj.rmKey,roomKey:this.rmRoom ? this.rmRoom.key : null,raw:this.ed.SelObj.text,error:error});
         }
         if(this.rmRoom && this.ed.RoomName.text!=this.rmRoom.name) inputs.push({fieldKey:"RoomName",raw:this.ed.RoomName.text,error:"点击更新列表以复制到新房间"});
         if(this.ed.FileName.text!=String(this.rmConfig.filename || "地图工作副本")) inputs.push({fieldKey:"FileName",raw:this.ed.FileName.text,error:null});
         return {documentId:this.rmModel ? this.rmModel.documentId : null,revision:this.rmModel ? this.rmModel.revision : 0,inputs:inputs,view:this.RMView(),busy:this.rmBusy,composing:!!this.rmPort.composing};
      }
      public function RMAcceptState(state:Object):void {if(this.rmModel && state && state.documentId==this.rmModel.documentId) this.rmModel.revision=state.revision;}
      public function RMLock(value:Boolean):void {this.rmLocked=value;this.ed.mouseChildren=!value;this.ed.SelObj.type=this.ed.RoomName.type=this.ed.FileName.type=value ? "dynamic" : "input";}
      public function RMSelectRoom(name:String):void {
         var r:Object=this.RMFindRoom(name);if(!r) throw new Error("房间不存在");
         this.selobj=null;this.ed.SelObj.visible=false;this.ed.SelObj.text="";
         this.ed.RoomName.text=name;this.curroom=this.arrroom[name];
         this.cmapX=this.curroom.@x;this.cmapY=this.curroom.@y;this.cmapZ=this.curroom.@z.length() ? this.curroom.@z : 0;
         this.zLay=this.cmapZ;this.decode(this.curroom);this.setListIndex();this.drawMap();
      }
      public function RMSelect(id:String):void {
         if(this.optObj.rmKey==id) this.selobj=this.optObj;
         else {this.selobj=null;for each(var o:Object in this.objs) if(o.rmKey==id) this.selobj=o;}
         this.showSelect();
      }
      public function RMInput(raw:String):void {this.ed.SelObj.text=raw.replace(/\r\n?/g,"\n");this.ed.SelObj.dispatchEvent(new Event(Event.CHANGE));}
      private function RMCheckInput():Boolean {
         if(this.rmHydrating || !this.selobj || this.ed.SelObj.text==this.selobj.rmDisplay) return true;
         if(this.rmBusy || this.rmLocked || this.rmPort.composing) return false;
         try {
            var raw:String=this.ed.SelObj.text;var xml:XML=new XML(raw);
            if(String(xml.name())!=String(this.selobj.xml.name())) throw new Error("不能改变属性节点类型");
            if(!this.selobj.rmKey) {this.selobj.rmKey=this.RMKey();this.rmOps.push({kind:"insertObject",roomKey:this.rmRoom.key,key:this.selobj.rmKey,raw:raw});}
            else this.rmOps.push({kind:"replaceInput",nodeKey:this.selobj.rmKey,displayBase:this.selobj.rmDisplay,raw:raw});
            this.selobj.xml=xml;this.selobj.rmRaw=raw;this.selobj.rmDisplay=raw;this.rmInputError="";
            if(this.selobj!=this.optObj) this.decodeObj(this.selobj);
         } catch(e:Error) {this.rmInputError=e.message;this.RMError("属性未提交："+e.message);return false;}
         return true;
      }
      public function RMGuard():Boolean {
         if(this.rmHydrating) return true;
         if(this.rmBusy || this.rmLocked || this.rmPort.composing) return false;
         if(!this.RMCheckInput()) return false;
         if(this.rmOps.length) {this.RMCommit();return false;}
         return true;
      }
      public function RMFlush():Object {if(!this.rmBusy && !this.rmPort.composing) {this.RMCheckInput();this.RMCommit();}return this.RMInspect();}
      private function RMCommit():void {
         if(this.rmHydrating || this.rmBusy || !this.rmOps.length) return;
         this.rmBusy=true;var ops:Array=this.rmOps;this.rmOps=[];
         var input:Object=this.RMInspect();this.RMLock(true);
         var owner:Editor=this;
         var document:String=this.rmModel.documentId;
         this.rmPort.commit(ops,input,function(result:Object):void {
            if(!owner.rmModel || owner.rmModel.documentId!=document) return;
            owner.rmBusy=false;owner.RMLock(false);
            if(result.model) owner.RMLoad(result.model);
            if(result.error) owner.RMError(result.error);
         });
      }
      public function RMCommitPending():void {this.RMCommit();}
      public function RMPoll():void {if(!this.rmHydrating && !this.rmBusy && this.rmOps.length) this.RMCommit();}
      public function RMAction(name:String):void {this.rmPort.action(name);}
      public function RMBeforeTools(done:Function):void {this.rmPort.beforeTools(done);}
      public function RMExportPNG(bytes:*,filename:String):void {this.rmPort.exportImage(bytes,filename);}
      private function RMEnsureRoom():void {
         if(this.rmRoom) return;
         this.rmRoom={key:this.RMKey(),name:this.ed.RoomName.text,nodes:[],protectedCells:[]};
         this.rmOps.push({kind:"createRoom",key:this.rmRoom.key,name:this.rmRoom.name,coordinates:this.rndMode ? {} : {x:this.cmapX,y:this.cmapY,z:this.cmapZ},optionsRaw:this.optObj.xml.toXMLString()});
      }
      private function RMPaint(tile:edTile,before:Array,shape:int):void {
         if(this.rmHydrating) return;
         var layers:Object={};var changed:Boolean=false;
         for(var i:int=1;i<6;i++) if(before[i]!=tile.ids[i]) {layers[String(i)]=tile.ids[i];changed=true;}
         if(!changed && shape==tile.zForm) return;
         var cell:Object={x:int(tile.x/this.raz),y:int(tile.y/this.raz),layers:layers};
         if(shape!=tile.zForm) cell.shape=tile.zForm;
         this.RMEnsureRoom();
         this.rmOps.push({kind:"paint",roomKey:this.rmRoom.key,cells:[cell]});
      }
      private function RMProtected(tile:edTile):Boolean {
         if(this.rmRoom) for each(var c:Object in this.rmRoom.protectedCells) if(c.x==int(tile.x/this.raz) && c.y==int(tile.y/this.raz)) {this.RMError("未知材质已保留，这个格子不能编辑");return true;}
         return false;
      }
      public function RMTest(action:Object):Object {
         if(!this.rmConfig.testRoot) throw new Error("测试入口未启用");
         if(action.kind=="select") {if(action.room) this.RMSelectRoom(action.room);this.RMSelect(action.key);}
         else if(action.kind=="button") {
            var control:Object=this.ed.getChildByName(String(action.control));
            if(!control) throw new Error("测试控件不存在："+action.control);
            for each(var mouseType:String in [MouseEvent.MOUSE_OVER,MouseEvent.MOUSE_MOVE,MouseEvent.MOUSE_DOWN,MouseEvent.MOUSE_UP,MouseEvent.CLICK,MouseEvent.MOUSE_OUT]) control.dispatchEvent(new MouseEvent(mouseType,true));
         }
         else if(action.kind=="input") this.RMInput(action.raw);
         else if(action.kind=="check") this.checkXML(new MouseEvent(MouseEvent.CLICK));
         else if(action.kind=="paint") {
            this.brushPip.ids=["","","","","",""];this.brushPip.frames=[0,0,0,0,0,0];this.brushPip.ids[action.layer]=action.id;this.brush=this.brushPip;
            this.dey="mat";this.begx=action.x;this.endx=action.x2===undefined ? action.x : action.x2;this.begy=action.y;this.endy=action.y2===undefined ? action.y : action.y2;this.isDraw=true;this.mup(false,false);
         } else if(action.kind=="copyRoom") {this.ed.RoomName.text=action.name;this.tolistClick(new MouseEvent(MouseEvent.CLICK));}
         else if(action.kind=="fileName") this.ed.FileName.text=action.raw;
         else if(action.kind=="language") this.rmPort.preference(action.language);
         else if(action.kind=="preview") this.toolsLoader.content["RMPreview"]();
         else if(action.kind=="exportPreview") this.toolsLoader.content["RMExportPreview"]();
         else if(action.kind=="fixedBlank") this.onMapClick(new MouseEvent(MouseEvent.CLICK,false,false,(Number(action.x)-this.minX+1)*this.spacex*this.roomsc+1,(Number(action.y)-this.minY+1)*this.spacey*this.roomsc+1));
         else if(action.kind=="view") return this.RMView();
         return this.RMInspect();
      }
