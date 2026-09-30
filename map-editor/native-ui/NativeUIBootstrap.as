package {
 import flash.display.*;
 import flash.events.*;
 import flash.desktop.NativeApplication;
 import flash.filesystem.*;
 import flash.net.URLRequest;
 import flash.system.*;
 import flash.utils.*;
 import flash.text.TextField;
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
  private var zoom:Number=1;
  private var deviceScale:Number=1;
  private var uiScale:Number=1;
  private var clientWidth:Number=0;
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
    stage.addEventListener(Event.RESIZE,resize);
    scene.addChild(loader);viewport.addChild(scene);addChild(viewport);resize(null);
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
   if(!e.ctrlKey || !ready) return;
   if(e.keyCode==Keyboard.S) {e.preventDefault();e.stopImmediatePropagation();action(e.shiftKey ? "saveAs" : "save");}
   if((e.keyCode==Keyboard.Z || e.keyCode==Keyboard.Y) && !(stage.focus is TextField)) {e.preventDefault();e.stopImmediatePropagation();action(e.keyCode==Keyboard.Z && !e.shiftKey ? "undo" : "redo");}
  }
  public function get viewportState():Object {return {zoom:zoom,panX:0,panY:0,fit:true,width:stage.stageWidth,height:stage.stageHeight,deviceScale:deviceScale,uiScale:uiScale,clientWidth:clientWidth,effectiveScale:zoom*uiScale};}
  // Old recovery files may contain a manually panned/zoomed viewport. The editor
  // now always fits its full original stage; only renderer DPI metadata survives.
  public function setViewport(v:Object):Object {if(v.clientWidth!==undefined)clientWidth=Number(v.clientWidth);if(v.deviceScale!==undefined)deviceScale=Math.max(0.5,Math.min(4,Number(v.deviceScale)));resize(null);return viewportState;}
  private function resize(e:Event):void {
   uiScale=clientWidth>0 ? Math.max(0.5,Math.min(4,deviceScale*stage.stageWidth/clientWidth)) : 1;
   var w:Number=Math.max(1,stage.stageWidth),h:Number=Math.max(1,stage.stageHeight);
   var effective:Number=Math.min(w/1800,h/950);zoom=effective/uiScale;
   scene.scaleX=scene.scaleY=effective;scene.x=scene.y=0;
   viewport.scrollRect=new Rectangle(0,0,w,h);
  }
  private function notice(value:Object):void {if(editor && editor.RMTools() && "RMStatus" in editor.RMTools()) editor.RMTools().RMStatus(value);}
  private function emit(kind:String,payload:Object,callback:Function=null):int {
   var id:int=++eventSeq;
   var state:Object=editor ? editor.RMInspect() : {};
   outbound.push({protocol:1,sessionId:config.sessionId,epoch:config.epoch,sequence:id,kind:kind,payload:payload,documentId:state.documentId,expectedRevision:state.revision});
   pending[id]=callback;return id;
  }
  public function commit(ops:Array,input:Object,done:Function):void {emit("commit",{operations:ops,input:input},done);}
  public function action(name:String):void {notice({busy:true});emit("action",{name:name});}
  public function library(payload:Object):void {emit("library",payload);}
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
    while(file.exists) {var ack:Object=JSON.parse(read(file));if(ack.sessionId!=config.sessionId || ack.epoch!=config.epoch) throw new Error("过期原生回执");ackSeq++;editor.RMAcceptState(ack.state);notice({state:ack.state});var fn:Function=pending[ackSeq];delete pending[ackSeq];if(fn!=null) fn(ack);file=sessionDirectory.resolvePath("acks/"+(ackSeq+1)+".json");}
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
   else if(c.operation=="visible") {stage.nativeWindow.visible=Boolean(c.visible);if(c.visible)resize(null);else stage.focus=null;finish({ok:true,visible:stage.nativeWindow.visible});}
   else if(c.operation=="notice") {notice(c.value);finish({ok:true});}
   else if(c.operation=="library") {editor.RMTools().RMShowLibrary(c.model);finish({ok:true});}
   else if(c.operation=="inspect") finish({ok:true,input:editor.RMInspect(),controls:editor.RMTools().RMControlsState()});
   else if(c.operation=="viewport") finish({ok:true,viewport:setViewport(c.options)});
   else if(c.operation=="capture") {if(!config.testRoot) throw new Error("测试入口未启用");var pixels:BitmapData=new BitmapData(stage.stageWidth,stage.stageHeight,false,0xFFFFFF);pixels.draw(this);var png:ByteArray=pixels.encode(pixels.rect,new PNGEncoderOptions());var stream:FileStream=new FileStream();stream.open(sessionDirectory.resolvePath("capture-"+c.sequence+".png"),FileMode.WRITE);stream.writeBytes(png);stream.close();pixels.dispose();finish({ok:true,png:"capture-"+c.sequence+".png"});}
   else if(c.operation=="test") {var result:Object=editor.RMTest(c.action);c.waiting=true;}
   else if(c.operation=="dispose") {finish({ok:true});timer.stop();NativeApplication.nativeApplication.exit();}
   else throw new Error("未知宿主操作");
  }
  private function fatal(value:*):void {try {if(sessionDirectory) write(sessionDirectory.resolvePath("fatal.json"),{sessionId:config.sessionId,error:String(value),stack:value is Error ? value.getStackTrace() : null});}catch(e:Error){}trace(value);}
 }
}
