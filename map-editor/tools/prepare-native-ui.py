"""Prepare isolated native-UI candidate sources. Never writes the installed Editor."""
from pathlib import Path
import hashlib, json, re, shutil

project=Path(__file__).resolve().parents[2]
game=project.parents[1]
owned=project/'map-editor/native-ui'
build=project/'build/out/map-native-ui-build'
scripts=build/'scripts'
tools=build/'tools'
scripts.mkdir(parents=True,exist_ok=True)
tools.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'Editor.swf':'e99e231f83128ea24cd13b2ae36b0dd294e5180a16f54ba3c7b3cb8fa24d99fd','Editor/Enhancements/EditorTools.swf':'d7ad493f19867c96b600599151275877349a7dbf2155794be42483656ae0f002'}
for p,h in expected.items():
    if sha(game/p)!=h:raise SystemExit('Original editor changed; inspect new source first: '+p)

source=(game/'Editor/Enhancements/readback/scripts/Editor.as').read_text(encoding='utf-8-sig')
def replace(a,b):
    global source
    if source.count(a)!=1:raise Exception('Patch location ambiguous: '+a[:100])
    source=source.replace(a,b)
def body(name,new):
    global source
    m=re.search(r'      (?:public|private|internal) function '+name+r'\([^\n]*\)[^\n]*\n      \{',source)
    if not m:raise Exception('Method missing '+name)
    start=m.end(); end=source.find('\n      }',start)
    source=source[:start]+'\n'+new+source[end:]
def prepend(name,text):
    global source
    source,n=re.subn(r'(      (?:public|private|internal) function '+name+r'\([^\n]*\)[^\n]*\n      \{)',lambda m:m[0]+'\n'+text,source)
    assert n==1,name
replace('public function Editor(param1:MovieClip)','public function Editor(param1:MovieClip, config:Object, port:Object)')
replace('         this.allroom = new XML();','         this.rmConfig=config;this.rmPort=port;\n         this.allroom = new XML();')
replace('         this.configObj = SharedObject.getLocal("EditorConf");','         this.configObj = SharedObject.getLocal("RModifierNativeUI");\n         this.configObj.data.language=config.language || "zh";')
replace('         this.configObj.data.language = _loc2_;','         this.configObj.data.language = _loc2_;\n         this.rmPort.preference(_loc2_);')
replace('new LangsList(this.LanguagesListLoaded)','new LangsList(this.LanguagesListLoaded, String(config.langsURL))')
replace('new URLRequest("texture1.swf")','new URLRequest(String(config.textureURL))')
replace('   import flash.geom.Matrix;','   import flash.geom.Matrix;\n   import flash.geom.Point;')
replace('this.mdown(param1.stageX,param1.stageY,param1.altKey);','var point:Point=this.ed.globalToLocal(new Point(param1.stageX,param1.stageY));\n         this.mdown(point.x,point.y,param1.altKey);')
replace('this.mmove(param1.stageX,param1.stageY);','var point:Point=this.ed.globalToLocal(new Point(param1.stageX,param1.stageY));\n            this.mmove(point.x,point.y);')
replace('         this.loader.load(this.request);','         // Host supplies the full map only after resources are ready.') if source.count('         this.loader.load(this.request);')==1 else None
# The constructor and old load handler both contain this call. Remove the constructor block only.
start=source.index('         if(this.configObj.data.fileName)')
end=source.index('         this.chars = new Array();',start)
source=source[:start]+source[end:]
replace('new URLRequest("Editor/Enhancements/EditorTools.swf")','new URLRequest(String(this.rmConfig.toolsURL))')
body('saveClick','         this.rmPort.action("save");')
body('loadClick','         this.rmPort.action("open");')
body('encodeAll','         throw new Error("托管地图由主程序保存完整原文");')
body('encodeCurrent','         this.RMCommit();')
body('tolistClick','''         if(this.rmBusy || !this.RMCheckInput()) return;
         this.rmOps.push({kind:"createRoom",name:this.ed.RoomName.text,copyOf:this.rmRoom ? this.rmRoom.key : null,coordinates:this.rndMode ? {} : {x:this.cmapX,y:this.cmapY,z:this.cmapZ}});
         this.RMCommit();''')
body('deleteClick','''         if(!this.RMGuard()) return;
         if(param1.ctrlKey && this.rmRoom) {this.rmOps.push({kind:"removeNode",nodeKey:this.rmRoom.key});this.RMCommit();}''')
body('ToolsSnapshot','''         if(!this.inited || this.rmBusy || this.RMInspect().inputs.length) throw new Error("请先提交当前属性并等待同步");
         if(!this.rmRoom) throw new Error("请先创建房间");
         var names:Array=[];for each(var r:Object in this.rmModel.rooms) names.push(r.name);
         var full:XML=this.RMXML(String(this.rmModel.raw));
         return {room:new XML(this.rmRoom.raw),land:full.land.length() ? full.land[0].copy() : null,filename:this.ed.FileName.text,roomNames:names};''')
body('updSelObj','         return this.RMCheckInput();')
body('showSelect','''         if(!param1) {if(!this.updSelObj()) return;this.selobj=null;}
         this.ed.SelObj.visible=this.selobj!=null;
         this.ed.SelObj.text=this.selobj ? String(this.selobj.rmRaw || this.selobj.xml.toXMLString()).replace(/\\r\\n?/g,"\\n") : "";
         if(this.selobj) this.selobj.rmDisplay=this.ed.SelObj.text;''')
body('checkXML','         if(this.updSelObj()) {this.RMCommit();this.showSelect();}')
for method in ['changeHandler','onMapClick','zlayClick','mdown','changeOpt']:
    prepend(method,'         if(!this.RMGuard()) return;')
# Random room collections have no coordinate/floor map. drawMap() returns before
# creating mapArr, so the original floor button must not enter that branch.
for method in ['onMapClick','zlayClick']:
    prepend(method,'         if(this.rndMode) {this.RMError("随机房间集合没有上下层；切换层仅适用于固定地图。");return;}')
# Selection cannot overwrite invalid input. Imported objects get exact sidecar identities.
replace('         var s:XML = param1;','         var s:XML = param1;\n         this.RMDecodeBegin(s);')
replace('''            for each(obj in s.obj)
            {
               this.addObj(obj.@x,obj.@y,obj.@id,obj);
            }
            for each(obj in s.back)
            {
               this.addObj(obj.@x,obj.@y,obj.@id,obj);
            }''','''            var rmIndex:int=0;
            for each(obj in s.obj) {this.rmNextNode=this.RMNode("obj",rmIndex++);this.addObj(obj.@x,obj.@y,obj.@id,obj);}
            rmIndex=0;
            for each(obj in s.back) {this.rmNextNode=this.RMNode("back",rmIndex++);this.addObj(obj.@x,obj.@y,obj.@id,obj);}''')
replace('         this.mActive = false;','         this.mActive = false;\n         this.RMDecodeEnd();')
replace('if(obj.xml.@code.length() == 0)','if(!this.rmHydrating && obj.xml.@code.length() == 0)')
replace('         this.objs.push(obj);','''         obj.rmKey=this.rmHydrating && this.rmNextNode ? this.rmNextNode.key : this.RMKey();
         obj.rmRaw=this.rmHydrating && this.rmNextNode ? this.rmNextNode.raw : obj.xml.toXMLString();
         this.objs.push(obj);
         if(!this.rmHydrating) {this.RMEnsureRoom();this.rmOps.push({kind:"insertObject",roomKey:this.rmRoom.key,key:obj.rmKey,raw:obj.rmRaw});}''')
prepend('mup','         if(this.rmBusy || !this.RMCheckInput()) return;')
replace('''         this.isDraw = false;
         this.ed.ramka.visible = false;''','''         this.isDraw = false;
         this.ed.ramka.visible = false;
         this.RMCommit();''')
prepend('drawTile','''         if(this.RMProtected(param1)) return;
         var rmBefore:Array=param1.ids.concat();var rmShape:int=param1.zForm;''')
replace('         param1.upd();','         this.RMPaint(param1,rmBefore,rmShape);\n         param1.upd();')
source=source.replace('            param1.vis.parent.removeChild(param1.vis);','            param1.vis.parent.removeChild(param1.vis);\n            if(!this.rmHydrating) this.rmOps.push({kind:"removeNode",nodeKey:param1.rmKey});')
adapter=(owned/'EditorAdapter.as.inc').read_text(encoding='utf-8')
replace('      private var toolsLoader:Loader;', '      private var toolsLoader:Loader;\n'+adapter)
(scripts/'Editor.as').write_text(source,encoding='utf-8')
(scripts/'MainEd.as').write_text('''package { import flash.display.MovieClip; public class MainEd extends MovieClip {
public var ved:visualEditor; internal var ed:Editor;
public function MainEd(){super();}
public function RMStart(config:Object,port:Object):Object {if(ed) throw new Error("Already initialized"); ed=new Editor(ved,config,port);return ed;}
}}''',encoding='utf-8')
lang=(game/'Editor/Source/localization-code/scripts/Editor/LangsList.as').read_text(encoding='utf-8-sig')
lang=lang.replace('public function LangsList(param1:Function)','public function LangsList(param1:Function, url:String)')
lang=lang.replace('this.loadCallback = param1;','this.loadCallback = param1;\n         this.langsURL=url;')
(scripts/'Editor').mkdir(exist_ok=True)
(scripts/'Editor/LangsList.as').write_text(lang,encoding='utf-8')
# Current enhanced source includes RandomRooms review. Copy, then change only roots/host bridges.
for p in (game/'Editor/Enhancements/src').rglob('*.as'):
    if 'Harness' in p.name:continue
    rel=p.relative_to(game/'Editor/Enhancements/src'); target=tools/rel;target.parent.mkdir(parents=True,exist_ok=True)
    text=p.read_text(encoding='utf-8-sig')
    if p.name=='EditorTools.as':
        text=text.replace('public class EditorTools extends Sprite {','public class EditorTools extends Sprite {\n        public static var roots:Object;')
        text=text.replace('button=new ToolButton("预渲染",116,30);','button=new ToolButton("预渲染",116,30);\n            button.name="RModifier_PreviewEntry";')
        text=text.replace('host=editor;','host=editor;roots=host.RMRoots();')
        text=text.replace('if(preview.isOpen) preview.close();','host.RMBeforeTools(function():void {openReviewReady();});\n        }\n        private function openReviewReady():void {\n            if(preview.isOpen) preview.close();')
        text=text.replace('            preview.open();','            host.RMBeforeTools(function():void {preview.open();});')
        text=text.replace('new File(File.applicationDirectory.resolvePath("Editor/logs/"+name+".json").nativePath)','new File(roots.sessionRoot).resolvePath("logs/"+name+".json")')
        text=text.replace('        public function get diagnostics()', '''        public function RMPreview():void {openPreview(null);}
        public function RMView():Object {return preview.state;}
        public function RMRestoreView(value:Object):void {preview.restore(value);}
        public function RMExportPreview():void {preview.exportCurrent();}
        public function get diagnostics()''')
    if p.name=='NativeRenderer.as':
        text=text.replace('File.applicationDirectory.resolvePath("Editor/Enhancements/NativeScene.swf")','File.applicationDirectory.resolvePath(String(EditorTools.roots.componentRelative)+"/NativeScene.swf")')
    if p.name=='PreviewPanel.as':
        text=text.replace('private var snapshot:Object;', 'private var snapshot:Object;\n        private var pendingRestore:Object;')
        text=text.replace('                    changeZoom(1);','''                    changeZoom(1);
                    if(pendingRestore) {changeZoom(pendingRestore.zoom);content.x=pendingRestore.x;content.y=pendingRestore.y;constrain();pendingRestore=null;}''')
        text=text.replace('new FileReference().save(bytes,filename+"-preview.png");','host.RMExportPNG(bytes,filename+"-preview.png");')
        text=text.replace('        public function dispose():void', '''        public function get state():Object {return {open:isOpen,region:region,mirror:mirrored,difficulty:difficulty,zoom:zoom,x:content ? content.x : 0,y:content ? content.y : 0,objects:objectVisible,entities:entityVisible,examples:exampleVisible,busy:busy,ready:renderer.ready};}
        public function restore(value:Object):void {if(!value || !value.open){close();return;}if(isOpen)return;pendingRestore=value;region=value.region;mirrored=value.mirror;difficulty=value.difficulty;objectVisible=value.objects;entityVisible=value.entities;exampleVisible=value.examples;open();}
        public function exportCurrent():void {exportImage(null);}
        public function dispose():void''')
    target.write_text(text,encoding='utf-8')
(build/'source-inputs.json').write_text(json.dumps({'installed':expected,'generated':{str(p.relative_to(build)):sha(p) for p in [*scripts.rglob('*.as'),*tools.rglob('*.as')]}},indent=2),encoding='utf-8')
print(build)
