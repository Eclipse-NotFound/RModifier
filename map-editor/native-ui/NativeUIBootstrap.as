package {
 import flash.display.*;
 import flash.events.*;
 import flash.desktop.NativeApplication;
 import flash.filesystem.*;
 import flash.net.URLRequest;
 import flash.system.*;
 import flash.utils.*;
 import flash.text.TextField;
 import flash.text.TextFormat;
 import flash.geom.Rectangle;
 import flash.ui.Keyboard;

 public class NativeUIBootstrap extends Sprite {
  private var config:Object;
  private var sessionDirectory:File;
  private var loader:Loader=new Loader();
  private var editor:Object;
  private var timer:Timer;
  private var command:int=0;
  private var eventSeq:int=0;
  private var ackSeq:int=0;
  private var pending:Object={};
  private var outbound:Array=[];
  private var activeCommand:Object;
  private var lastInput:String="";
  private var ready:Boolean=false;
  private var viewport:Sprite=new Sprite();
  private var scene:Sprite=new Sprite();
  private var toolbar:Sprite=new Sprite();
  private var zoomLabel:TextField=new TextField();
  private var zoom:Number=1;
  private var deviceScale:Number=1;
  private var uiScale:Number=1;
  private var clientWidth:Number=0;
  private var panX:Number=0;
  private var panY:Number=0;
  private var fit:Boolean=false;
  private var spaceDown:Boolean=false;
  private var drag:Object;
  public var composing:Boolean=false;
  public function NativeUIBootstrap() {
   NativeApplication.nativeApplication.addEventListener(InvokeEvent.INVOKE,invoke);
   loaderInfo.uncaughtErrorEvents.addEventListener(UncaughtErrorEvent.UNCAUGHT_ERROR,function(e:UncaughtErrorEvent):void {e.preventDefault();fatal(e.error);});
  }
  private function read(file:File):String {var s:FileStream=new FileStream();s.open(file,FileMode.READ);var r:String=s.readUTFBytes(s.bytesAvailable);s.close();return r;}
  private function write(file:File,value:Object):void {file.parent.createDirectory();var temp:File=new File(file.nativePath+".tmp");var s:FileStream=new FileStream();s.open(temp,FileMode.WRITE);s.writeUTFBytes(JSON.stringify(value));s.close();temp.moveTo(file,true);}
  private function invoke(e:InvokeEvent):void {
   if(config) return;
   try {
    config=JSON.parse(read(new File(e.arguments[0])));sessionDirectory=new File(config.sessionRoot);
    stage.scaleMode=StageScaleMode.NO_SCALE;stage.align=StageAlign.TOP_LEFT;
    stage.nativeWindow.title=config.titleToken;
    stage.nativeWindow.addEventListener(Event.CLOSING,function(e:Event):void {e.preventDefault();action("close");});
    stage.addEventListener(IMEEvent.IME_START_COMPOSITION,function(e:IMEEvent):void {composing=true;});
    stage.addEventListener(IMEEvent.IME_COMPOSITION,function(e:IMEEvent):void {composing=false;});
    stage.addEventListener(KeyboardEvent.KEY_DOWN,keyDown,true);
    stage.addEventListener(KeyboardEvent.KEY_UP,function(e:KeyboardEvent):void {if(e.keyCode==Keyboard.SPACE)spaceDown=false;},true);
    stage.addEventListener(Event.DEACTIVATE,function(e:Event):void {spaceDown=false;drag=null;});
    stage.addEventListener(Event.RESIZE,resize);
    stage.addEventListener(MouseEvent.MOUSE_DOWN,startPan,true,1000);
    stage.addEventListener(MouseEvent.MOUSE_MOVE,movePan,true,1000);
    stage.addEventListener(MouseEvent.MOUSE_UP,function(e:MouseEvent):void {if(drag){drag=null;e.stopImmediatePropagation();}},true,1000);
    stage.addEventListener(MouseEvent.MOUSE_WHEEL,wheel,true,1000);
    scene.addChild(loader);viewport.addChild(scene);addChild(viewport);addChild(toolbar);buildToolbar();resize(null);
    loader.contentLoaderInfo.addEventListener(Event.COMPLETE,loaded);
    loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR,function(e:IOErrorEvent):void {fatal(e.text);});
    loader.load(new URLRequest(config.editorURL),new LoaderContext(false,new ApplicationDomain(null)));
   } catch(error:Error) {fatal(error);}
  }
  private function loaded(e:Event):void {
   try {editor=loader.content["RMStart"](config,this);timer=new Timer(40);timer.addEventListener(TimerEvent.TIMER,tick);timer.start();}
   catch(error:Error){fatal(error);}
  }
  private function keyDown(e:KeyboardEvent):void {
   if(e.keyCode==Keyboard.SPACE && !(stage.focus is TextField))spaceDown=true;
   if(!e.ctrlKey || !ready) return;
   if(e.keyCode==Keyboard.S) {e.preventDefault();e.stopImmediatePropagation();action("save");}
   if((e.keyCode==Keyboard.Z || e.keyCode==Keyboard.Y) && !(stage.focus is TextField)) {e.preventDefault();e.stopImmediatePropagation();action(e.keyCode==Keyboard.Z ? "undo" : "redo");}
  }
  private function tool(label:String,x:int,width:int,callback:Function):void {var b:Sprite=new Sprite();b.x=x;b.graphics.beginFill(0x324A5F);b.graphics.drawRoundRect(0,3,width,27,5);b.graphics.endFill();var t:TextField=new TextField();t.defaultTextFormat=new TextFormat("Microsoft YaHei UI",13,0xFFFFFF);t.text=label;t.width=width;t.height=25;t.y=4;t.mouseEnabled=false;t.selectable=false;b.addChild(t);b.buttonMode=true;b.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void {callback();e.stopImmediatePropagation();});toolbar.addChild(b);}
  private function buildToolbar():void {tool("适应",8,48,function():void {setViewport({fit:true});});tool("100%",62,58,function():void {setViewport({zoom:1,panX:0,panY:0});});tool("－",126,32,function():void {setViewport({zoom:zoom/1.2});});tool("＋",164,32,function():void {setViewport({zoom:zoom*1.2});});tool("←",202,30,function():void {setViewport({panX:panX+180*uiScale});});tool("↑",238,30,function():void {setViewport({panY:panY+160*uiScale});});tool("↓",274,30,function():void {setViewport({panY:panY-160*uiScale});});tool("→",310,30,function():void {setViewport({panX:panX-180*uiScale});});tool("原点",346,48,function():void {setViewport({panX:0,panY:0});});zoomLabel.defaultTextFormat=new TextFormat("Microsoft YaHei UI",13,0xFFFFFF);zoomLabel.x=406;zoomLabel.y=5;zoomLabel.width=620;zoomLabel.height=26;zoomLabel.selectable=false;toolbar.addChild(zoomLabel);}
  public function get viewportState():Object {return {zoom:zoom,panX:panX,panY:panY,fit:fit,width:stage.stageWidth,height:stage.stageHeight-34*uiScale,deviceScale:deviceScale,uiScale:uiScale,clientWidth:clientWidth,effectiveScale:zoom*uiScale,minZoom:0.25,maxZoom:3,minPanX:Math.min(0,stage.stageWidth-1800*zoom*uiScale),minPanY:Math.min(0,stage.stageHeight-34*uiScale-950*zoom*uiScale)};}
  public function setViewport(v:Object):Object {if(v.clientWidth!==undefined)clientWidth=Number(v.clientWidth);if(v.deviceScale!==undefined)deviceScale=Math.max(0.5,Math.min(4,Number(v.deviceScale)));if(v.zoom!==undefined){zoom=Math.max(0.25,Math.min(3,Number(v.zoom)));fit=false;}if(v.fit!==undefined)fit=Boolean(v.fit);if(v.panX!==undefined)panX=Number(v.panX);if(v.panY!==undefined)panY=Number(v.panY);resize(null);return viewportState;}
  private function resize(e:Event):void {uiScale=clientWidth>0 ? Math.max(0.5,Math.min(4,deviceScale*stage.stageWidth/clientWidth)) : 1;var w:Number=stage.stageWidth,h:Number=Math.max(1,stage.stageHeight-34*uiScale);if(fit)zoom=Math.min(w/1800,h/950)/uiScale;var effective:Number=zoom*uiScale;panX=Math.max(Math.min(0,w-1800*effective),Math.min(0,panX));panY=Math.max(Math.min(0,h-950*effective),Math.min(0,panY));scene.scaleX=scene.scaleY=effective;scene.x=panX;scene.y=panY;viewport.scrollRect=new Rectangle(0,0,w,h);toolbar.y=h;toolbar.scaleX=toolbar.scaleY=uiScale;toolbar.graphics.clear();toolbar.graphics.beginFill(0x1A2B39);toolbar.graphics.drawRect(0,0,w/uiScale,34);toolbar.graphics.endFill();zoomLabel.text="原界面 "+Math.round(zoom*100)+"%  ·  空格拖动平移，Ctrl + 滚轮缩放";}
  private function startPan(e:MouseEvent):void {if(spaceDown && e.stageY<toolbar.y){drag={x:e.stageX,y:e.stageY,px:panX,py:panY};e.stopImmediatePropagation();e.preventDefault();}}
  private function movePan(e:MouseEvent):void {if(drag){panX=drag.px+e.stageX-drag.x;panY=drag.py+e.stageY-drag.y;resize(null);e.stopImmediatePropagation();}}
  private function wheel(e:MouseEvent):void {if(!e.ctrlKey || e.stageY>=toolbar.y)return;var z:Number=Math.max(0.25,Math.min(3,zoom*Math.pow(1.15,e.delta)));panX=e.stageX-(e.stageX-panX)*z/zoom;panY=e.stageY-(e.stageY-panY)*z/zoom;zoom=z;fit=false;resize(null);e.preventDefault();e.stopImmediatePropagation();}
  private function emit(kind:String,payload:Object,callback:Function=null):int {
   var id:int=++eventSeq;
   var state:Object=editor ? editor.RMInspect() : {};
   outbound.push({protocol:1,sessionId:config.sessionId,epoch:config.epoch,sequence:id,kind:kind,payload:payload,documentId:state.documentId,expectedRevision:state.revision});
   pending[id]=callback;return id;
  }
  public function commit(ops:Array,input:Object,done:Function):void {emit("commit",{operations:ops,input:input},done);}
  public function action(name:String):void {emit("action",{name:name});}
  public function preference(language:String):void {emit("preference",{language:language});}
  public function exportImage(bytes:ByteArray,filename:String):void {var name:String="export-"+(eventSeq+1)+".png";var stream:FileStream=new FileStream();stream.open(sessionDirectory.resolvePath(name),FileMode.WRITE);stream.writeBytes(bytes);stream.close();emit("exportPNG",{file:name,filename:filename});}
  public function beforeTools(done:Function):void {
   editor.RMFlush();
   emit("beforeTools",{},function(result:Object):void {if(result.error) editor.RMError(result.error);else done();});
  }
  private function finish(value:Object):void {
   value.sessionId=config.sessionId;value.epoch=config.epoch;value.requestId=activeCommand.requestId;
   write(sessionDirectory.resolvePath("responses/"+activeCommand.sequence+".json"),value);activeCommand=null;
  }
  private function tick(e:TimerEvent):void {
   try {
    if(!ready) {if(!editor.RMReady()) return;ready=true;write(sessionDirectory.resolvePath("ready.json"),{sessionId:config.sessionId,protocol:1,titleToken:config.titleToken});}
    editor.RMPoll();
    var file:File=sessionDirectory.resolvePath("acks/"+(ackSeq+1)+".json");
    while(file.exists) {var ack:Object=JSON.parse(read(file));if(ack.sessionId!=config.sessionId || ack.epoch!=config.epoch) throw new Error("过期原生回执");ackSeq++;editor.RMAcceptState(ack.state);var fn:Function=pending[ackSeq];delete pending[ackSeq];if(fn!=null) fn(ack);file=sessionDirectory.resolvePath("acks/"+(ackSeq+1)+".json");}
    if(outbound.length && outbound[0].sequence==ackSeq+1) {var next:Object=outbound.shift();var current:Object=editor.RMInspect();if(next.documentId==current.documentId) next.expectedRevision=current.revision;write(sessionDirectory.resolvePath("events/"+next.sequence+".json"),next);}
    if(!activeCommand) {file=sessionDirectory.resolvePath("commands/"+(command+1)+".json");if(file.exists) {activeCommand=JSON.parse(read(file));if(activeCommand.sessionId!=config.sessionId || activeCommand.epoch!=config.epoch) throw new Error("过期宿主请求");command++;execute();}}
    if(activeCommand && activeCommand.waiting && !editor.RMInspect().busy && ackSeq==eventSeq) {if(activeCommand.operation=="suspend" && !composing)editor.RMLock(true);finish({ok:true,input:editor.RMInspect()});}
    var inspected:Object=editor.RMInspect(),value:String=JSON.stringify({documentId:inspected.documentId,inputs:inspected.inputs,view:inspected.view,composing:inspected.composing});
    if(value!=lastInput && !inspected.busy) {lastInput=value;emit("inspect",inspected);}
   } catch(error:Error) {if(activeCommand) finish({ok:false,error:error.message,stack:error.getStackTrace()});else fatal(error);}
  }
  private function execute():void {
   var c:Object=activeCommand;
   if(c.operation=="load") {editor.RMLoad(c.model);lastInput="";finish({ok:true,input:editor.RMInspect()});}
   else if(c.operation=="flush") {editor.RMFlush();c.waiting=true;}
   else if(c.operation=="suspend") {editor.RMFlush();c.waiting=true;}
   else if(c.operation=="resume") {editor.RMLock(false);finish({ok:true,input:editor.RMInspect()});}
   else if(c.operation=="visible") {stage.nativeWindow.visible=Boolean(c.visible);if(!c.visible){spaceDown=false;drag=null;stage.focus=null;}finish({ok:true,visible:stage.nativeWindow.visible});}
   else if(c.operation=="inspect") finish({ok:true,input:editor.RMInspect()});
   else if(c.operation=="viewport") finish({ok:true,viewport:setViewport(c.options)});
   else if(c.operation=="capture") {if(!config.testRoot) throw new Error("测试入口未启用");var pixels:BitmapData=new BitmapData(stage.stageWidth,stage.stageHeight,false,0xFFFFFF);pixels.draw(this);var png:ByteArray=pixels.encode(pixels.rect,new PNGEncoderOptions());var stream:FileStream=new FileStream();stream.open(sessionDirectory.resolvePath("capture-"+c.sequence+".png"),FileMode.WRITE);stream.writeBytes(png);stream.close();pixels.dispose();finish({ok:true,png:"capture-"+c.sequence+".png"});}
   else if(c.operation=="test") {var result:Object=editor.RMTest(c.action);c.waiting=true;}
   else if(c.operation=="dispose") {finish({ok:true});timer.stop();NativeApplication.nativeApplication.exit();}
   else throw new Error("未知宿主操作");
  }
  private function fatal(value:*):void {try {if(sessionDirectory) write(sessionDirectory.resolvePath("fatal.json"),{sessionId:config.sessionId,error:String(value),stack:value is Error ? value.getStackTrace() : null});}catch(e:Error){}trace(value);}
 }
}
