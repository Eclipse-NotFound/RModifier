package {
    import flash.display.*;
    import flash.desktop.NativeApplication;
    import flash.events.*;
    import flash.filesystem.*;
    import flash.utils.*;

    // A private, stage-backed renderer. No gameplay loop or live game connection.
    public class SceneHost extends Sprite {
        private var renderer:NativeRenderer;
        private var directory:File;
        private var session:String;
        private var seen:String="";
        private var timer:Timer;
        private var configured:Boolean=false;
        public function SceneHost() {
            NativeApplication.nativeApplication.addEventListener(InvokeEvent.INVOKE,invoked);
            if(stage) stage.nativeWindow.visible=false;
            else addEventListener(Event.ADDED_TO_STAGE,function(e:Event):void { stage.nativeWindow.visible=false; });
            loaderInfo.uncaughtErrorEvents.addEventListener(UncaughtErrorEvent.UNCAUGHT_ERROR,function(e:UncaughtErrorEvent):void {
                e.preventDefault(); if(directory) write("fatal.json",{error:String(e.error),sessionId:session});
            });
        }
        private function read(file:File):String {
            if(file.size>10000000) throw new Error("绘图输入过大");
            var stream:FileStream=new FileStream(); stream.open(file,FileMode.READ);
            var raw:String=stream.readUTFBytes(stream.bytesAvailable); stream.close(); return raw;
        }
        private function write(name:String,value:Object):void {
            var target:File=directory.resolvePath(name), temp:File=directory.resolvePath(name+".tmp");
            var stream:FileStream=new FileStream(); stream.open(temp,FileMode.WRITE);
            stream.writeUTFBytes(JSON.stringify(value)); stream.close(); temp.moveTo(target,true);
        }
        private function invoked(event:InvokeEvent):void {
            if(configured || event.arguments.length!=1) return;
            configured=true;
            try {
                var config:Object=JSON.parse(read(new File(event.arguments[0])));
                directory=new File(config.sessionRoot); session=String(config.sessionId);
                if(!/^[a-zA-Z0-9-]{1,80}$/.test(session)) throw new Error("会话标识无效");
                renderer=new NativeRenderer(config.gameRoot,config.componentRoot);
                renderer.load(function():void {
                    var regions:Array=[];
                    for each(var r:Object in renderer.regions) regions.push({id:r.id,label:r.label});
                    var s:FileStream=new FileStream(); s.open(directory.resolvePath("definitions.xml"),FileMode.WRITE);
                    s.writeUTFBytes(renderer.definitionsXML()); s.close();
                    write("ready.json",{protocol:1,version:"1.0.0",sessionId:session,regions:regions,capabilities:["static","entities","examples","difficulty","mirror"]});
                    timer=new Timer(100); timer.addEventListener(TimerEvent.TIMER,poll); timer.start();
                },function(error:Error):void { write("fatal.json",{sessionId:session,error:error.message}); NativeApplication.nativeApplication.exit(2); });
            } catch(error:Error) { if(directory) write("fatal.json",{sessionId:session,error:error.message}); NativeApplication.nativeApplication.exit(2); }
        }
        private function poll(event:TimerEvent):void {
            var file:File=directory.resolvePath("request.json"); if(!file.exists) return;
            var request:Object;
            try {
                request=JSON.parse(read(file));
                if(request.sessionId!=session || request.requestId==seen) return;
                var id:String=String(request.requestId);
                if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error("请求编号无效");
                seen=id;
                if(request.operation=="dispose") { write("closed.json",{sessionId:session}); NativeApplication.nativeApplication.exit(); return; }
                if(request.protocol!=1 || request.operation!="render") throw new Error("不支持的绘图协议");
                var xml:XML=new XML(read(directory.resolvePath(id+".xml")));
                if(request.roomIndex<0 || request.roomIndex>=xml.room.length()) throw new Error("房间不存在");
                var names:Array=[]; for each(var room:XML in xml.room) names.push(String(room.@name));
                var snapshot:Object={room:xml.room[int(request.roomIndex)].copy(),land:xml.land.length()?xml.land[0].copy():null,filename:String(request.filename),roomNames:names};
                var opts:Object=request.options||{};
                var region:String=opts.region?String(opts.region):renderer.infer(snapshot);
                var bitmap:BitmapData=renderer.render(snapshot,region,opts.objects!==false,opts.mirror===true,opts.entities!==false,opts.examples!==false,opts.difficulty===undefined?-1:int(opts.difficulty));
                var bytes:ByteArray=PngWriter.encode(bitmap); bitmap.dispose();
                var image:File=directory.resolvePath(id+".png"), stream:FileStream=new FileStream();
                stream.open(image,FileMode.WRITE); stream.writeBytes(bytes); stream.close();
                write(id+".json",{protocol:1,sessionId:session,requestId:id,documentRevision:request.documentRevision,inputHash:request.inputHash,ok:true,png:id+".png",region:region,report:renderer.report});
            } catch(error:Error) {
                if(request && /^[a-zA-Z0-9-]{1,80}$/.test(String(request.requestId)))
                    write(String(request.requestId)+".json",{protocol:1,sessionId:session,requestId:request.requestId,documentRevision:request.documentRevision,inputHash:request.inputHash,ok:false,error:error.message});
                else write("fatal.json",{sessionId:session,error:error.message});
            }
        }
    }
}
