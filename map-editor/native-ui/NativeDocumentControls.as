package {
    import flash.display.*;
    import flash.events.*;
    import flash.geom.Rectangle;
    import flash.text.*;
    import flash.utils.getTimer;

    // Document actions live in the original Flash file controls. No outer bar.
    public class NativeDocumentControls {
        private var host:Object;
        private var view:MovieClip;
        private var undo:ToolButton;
        private var redo:ToolButton;
        private var saveAs:ToolButton;
        private var feedback:Sprite = new Sprite();
        private var message:TextField = new TextField();
        private var busy:Boolean = false;
        private var latest:Object = {};
        private var hideAt:int = 0;
        private var library:NativeSceneLibrary;
        private var libraryButton:ToolButton;

        public function NativeDocumentControls(editor:Object) {
            host=editor;view=host.ToolsContext().view;
            var bounds:Rectangle=view.butLoad.getBounds(view);
            var gap:Number=4,width:Number=(bounds.width-gap*2)/3;
            var y:Number=bounds.bottom+5;
            saveAs=addButton("另存","saveAs",bounds.x,y,width);
            undo=addButton("撤销","undo",bounds.x+width+gap,y,width);
            redo=addButton("重做","redo",bounds.x+(width+gap)*2,y,width);
            libraryButton=new ToolButton("场景与房间 · 我的房间池",300,38);libraryButton.name="RModifier_library";libraryButton.x=365;libraryButton.y=612;view.addChild(libraryButton);
            libraryButton.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void{e.stopImmediatePropagation();if(!busy)host.RMAction("library");});
            library=new NativeSceneLibrary(host);
            feedback.name="RModifier_Notice";
            feedback.x=570;feedback.y=14;feedback.visible=false;
            feedback.graphics.lineStyle(1,0x80978C);
            feedback.graphics.beginFill(0xF4F8F3,0.98);
            feedback.graphics.drawRoundRect(0,0,660,66,6);feedback.graphics.endFill();
            message.defaultTextFormat=new TextFormat("Microsoft YaHei UI",16,0x223D30);
            message.x=12;message.y=8;message.width=585;message.height=54;
            message.multiline=true;message.wordWrap=true;message.selectable=true;
            feedback.addChild(message);
            var close:ToolButton=new ToolButton("关闭",52,26);close.x=600;close.y=8;
            close.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void {feedback.visible=false;});
            feedback.addChild(close);view.addChild(feedback);tick();
        }
        private function addButton(label:String,action:String,x:Number,y:Number,width:Number):ToolButton {
            var button:ToolButton=new ToolButton(label,width,22);
            button.name="RModifier_"+action;button.x=x;button.y=y;view.addChild(button);
            button.addEventListener(MouseEvent.CLICK,function(e:MouseEvent):void {
                e.stopImmediatePropagation();if(!busy)host.RMAction(action);
            });
            return button;
        }
        public function update(value:Object):void {
            if(!value)return;
            if(value.state)latest=value.state;
            if(value.busy!==undefined){busy=Boolean(value.busy);if(!busy)library.unlock();}
            if(value.message) {
                message.text=String(value.message);
                message.textColor=value.error ? 0x962B28 : 0x223D30;
                feedback.visible=true;hideAt=value.error ? 0 : getTimer()+4500;
            }
            tick();
        }
        public function tick():void {
            var working:Boolean=busy || host.RMInspect().busy;
            view.butSave.enabled=view.butLoad.enabled=saveAs.enabled=libraryButton.enabled=!working;
            undo.enabled=!working && latest.canUndo===true;
            redo.enabled=!working && latest.canRedo===true;
            if(hideAt && getTimer()>=hideAt)feedback.visible=false;
            if(feedback.visible)view.setChildIndex(feedback,view.numChildren-1);
        }
        public function get state():Object {
            return {busy:busy,message:message.text,noticeVisible:feedback.visible,library:library.state,
                undoEnabled:undo.mouseEnabled,redoEnabled:redo.mouseEnabled,
                buttons:[rect(saveAs),rect(undo),rect(redo)],roomName:rect(view.RoomName)};
        }
        public function showLibrary(model:Object):void{library.update(model);}
        public function testLibrary(action:Object):void{library.test(action);}
        private function rect(value:DisplayObject):Object {
            var b:Rectangle=value.getBounds(view);
            return {name:value.name,x:b.x,y:b.y,width:b.width,height:b.height};
        }
    }
}
