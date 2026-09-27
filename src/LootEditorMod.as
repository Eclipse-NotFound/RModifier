package {
    import flash.events.TimerEvent;
    import flash.utils.Timer;
    import flash.utils.Dictionary;
    import flash.utils.ByteArray;
    import flash.system.ApplicationDomain;
    import flash.filesystem.File;
    import flash.filesystem.FileMode;
    import flash.filesystem.FileStream;
    import flash.desktop.NativeApplication;
    import loot.RuleEngine;

    public class LootEditorMod {
        public static const VERSION:String="0.1.0";
        [Embed(source="../desktop/data/catalog.json",mimeType="application/octet-stream")]
        private static var CatalogBytes:Class;
        private static var timer:Timer;
        private static var world:*;
        private static var lootClass:Class;
        private static var itemClass:Class;
        private static var groundClass:Class;
        private static var catalog:Object;
        private static var items:Object={};
        private static var rules:Object={};
        private static var snapshots:Dictionary=new Dictionary(true);
        private static var profile:Object;
        private static var profileHash:String="";
        private static var session:String=String(new Date().time);
        private static var ready:Boolean=false;
        private static var menuReady:Boolean=false;
        private static var enabled:Boolean=true;
        private static var diag:int=0;
        private static var heartbeat:int=0;
        private static var configError:String="";

        public static function init(main:*):void {
            if(timer!=null)return;
            log("v"+VERSION+" loaded app="+NativeApplication.nativeApplication.applicationID+" session="+session);
            timer=new Timer(500);timer.addEventListener(TimerEvent.TIMER,tick);timer.start();
        }
        public static function log(s:String):void {
            var fs:FileStream=new FileStream();
            try {fs.open(File.applicationStorageDirectory.resolvePath("LootEditor.log"),FileMode.APPEND);fs.writeUTFBytes("[LootEditor] "+s+"\n");} catch(e:*) {} finally {try{fs.close();}catch(ignore:*){}}
        }
        private static function read(file:File):String {
            var fs:FileStream=new FileStream();var text:String;
            try {fs.open(file,FileMode.READ);if(fs.bytesAvailable>2000000)throw new Error("profile too large");text=fs.readUTFBytes(fs.bytesAvailable);}finally{fs.close();}
            return text.replace(/^\uFEFF/,"");
        }
        private static function loadProfile():void {
            var b:ByteArray=new CatalogBytes();catalog=JSON.parse(b.readUTFBytes(b.length));
            for each(var item:Object in catalog.items)items[item.key]=item;
            var file:File=File.applicationDirectory.resolvePath("mods/LootEditor/config/active.json");
            var candidates:Array=[file,file.parent.resolvePath("active.previous.json")];
            for each(var candidate:File in candidates){
                if(!candidate.exists)continue;
                try {
                    var raw:String=read(candidate);var parsed:Object=JSON.parse(raw);var error:String=RuleEngine.validate(parsed,catalog);
                    if(error!="")throw new Error(error);
                    profile=parsed;profileHash=RuleEngine.fingerprint(raw);
                    for each(var r:Object in profile.rules)rules[r.target]=r;
                    log("config accepted name="+profile.name+" hash="+profileHash+" fallback="+(candidate!=file));return;
                }catch(e:*){configError=String(e);log("config rejected "+candidate.name+" "+e);}
            }
            log("original rules retained; no valid active profile");
        }
        private static function tick(e:TimerEvent):void {
            try {
                if(!ready){
                    var domain:ApplicationDomain=ApplicationDomain.currentDomain;
                    var wc:Class=domain.getDefinition("fe.World") as Class;world=wc["w"];
                    if(world==null||world.landData==null)return;
                    if(Number(wc["boxDamage"])!=0.2){log("unsupported host; module inactive");configError="unsupported game version";receipt("unsupported");timer.stop();return;}
                    lootClass=domain.getDefinition("fe.serv.LootGen") as Class;
                    if(!("lootEditorBridge" in lootClass)){log("bridge missing; original game unchanged");configError="bridge missing";receipt("bridge-missing");timer.stop();return;}
                    itemClass=domain.getDefinition("fe.serv.Item") as Class;groundClass=domain.getDefinition("fe.loc.Loot") as Class;
                    loadProfile();
                    lootClass["lootEditorBridge"]={select:selectRule,emit:emitRule,capture:capture,death:death};
                    ready=true;receipt("ready");log("bridge ready");
                }
                if(!menuReady)registerMenu();
                if(++heartbeat%20==0){log("heartbeat "+heartbeat+" ready="+ready);}
            }catch(error:*){if(diag++<12)log("init/tick error "+error);}
        }
        private static function receipt(status:String):void {
            var fs:FileStream=new FileStream();
            try {
                fs.open(File.applicationStorageDirectory.resolvePath("LootEditor.receipt.json"),FileMode.WRITE);
                fs.writeUTFBytes(JSON.stringify({version:VERSION,session:session,startedAt:Number(session),readAt:new Date().time,status:status,profileHash:profileHash,profileName:profile?profile.name:"原版",profileId:profile?profile.id:"",enabled:enabled,error:configError,gameVersion:status=="unsupported"?"unsupported":"1.02",gameRoot:File.applicationDirectory.nativePath,applicationId:NativeApplication.nativeApplication.applicationID}));
            }catch(e:*){log("receipt failed "+e);}finally{try{fs.close();}catch(ignore:*){}}
        }
        private static function registerMenu():void {
            var carrier:*=world.main.getChildByName("ModSettingsCarrier");if(carrier==null)return;
            var api:*=carrier["modAPI"];
            api.registerPage("loot-editor","掉落工坊",[{key:"session-enabled",label:"本次运行启用掉落工坊",kind:"check",def:true,hint:"临时暂停；重启后按独立编辑器中的方案启用。",
                get:function():*{return enabled;},set:function(v:*):void{enabled=Boolean(v);receipt("ready");}}],null,
                "方案："+(profile?profile.name:"原版")+"。在独立窗口“掉落工坊”中修改并应用，下次启动游戏生效。原有随机弹药与拾枪赠弹保留。",
                {moduleId:"loot-editor",moduleName:"掉落工坊",featureName:"方案状态",featureOrder:0});
            menuReady=true;log("ModLoader settings registered");
        }
        public static function selectRule(ctx:Object):Object {
            if(!enabled||profile==null)return null;
            var model:String="";
            try{if(ctx.inter!=null&&ctx.inter.owner!=null)model=String(ctx.inter.owner.id);}catch(e:*){}
            var r:Object=rules[ctx.kind+":model:"+model];
            return r||rules[ctx.kind+":table:"+ctx.key]||null;
        }
        public static function emitRule(ctx:Object,rule:Object):Boolean {
            var ok:Boolean=false;
            try {
                var stage:int=world.land?world.land.gameStage:0;
                var plan:Array=RuleEngine.rewards(rule.rewards,{stage:stage,hero:ctx.hero},Math.random,items);
                ok=emitPlan(ctx,plan);if(diag++<60)log("ordinary "+rule.target+" mode="+rule.mode+" stacks="+plan.length+" generated="+ok);
            }catch(e:*){log("emission stopped; native table will not be replayed: "+e);}
            return ok;
        }
        private static function emitPlan(ctx:Object,plan:Array):Boolean {
            // Construct every item before committing any drops or quota counters.
            var prepared:Array=[];
            for each(var d:Object in plan){
                var meta:Object=items[d.key];if(meta==null)throw new Error("missing item "+d.key);
                var tip:String=meta.kind=="item"?"":meta.kind;
                var it:*=new itemClass(tip,meta.id,meta.kind=="item"?d.count:2,int(d.variant));
                if(it.xml==null)throw new Error("host item missing "+d.key);
                if(meta.kind!="item")it.sost=d.durability;
                it.imp=0;it.multHP=ctx.broken?0.4:1;
                if(it.id=="money")it.kol*=world.pers.capsMult*world.pers.difCapsMult;
                if(it.id=="bit")it.kol*=world.pers.bitsMult*world.pers.difCapsMult;
                if(ctx.broken&&(it.id=="money"||it.id=="bit"))it.kol*=0.5;
                if(it.kol<=0)continue;
                if(ctx.broken&&(it.tip=="a"||it.tip=="e")&&Math.random()<0.5)continue;
                prepared.push(it);
            }
            var count:int=0;
            for each(it in prepared){
                var xml:XML=it.xml;
                if(xml.@limit.length()){
                    var used:Number=world.game.getLimit(String(xml.@limit));var limit:Number=world.land.lootLimit;
                    if(xml.@mlim.length())limit*=Number(xml.@mlim);
                    if(used>=limit||(xml.@maxlim.length()&&used>=Number(xml.@maxlim)))continue;
                    world.game.addLimit(String(xml.@limit),1);
                }
                if(world.testLoot)world.invent.take(it);else new groundClass(ctx.loc,it,ctx.x,ctx.y,true);
                count++;
            }
            return count>0;
        }
        public static function capture(unit:*):void {
            if(!enabled||profile==null||!profile.ammo.enabled||unit==null||unit===world.gg||unit.lootIsDrop)return;
            // Resurrection can call die again after faction has become zero. Keep the last live snapshot.
            if(!(unit.fraction>0&&unit.fraction<100))return;
            var w:*=unit.currentWeapon;var weapon:Object=null;
            if(w!=null)weapon={id:String(w.id),ammo:String(w.ammo),ammoBase:String(w.ammoBase),tip:int(w.tip),recharg:Boolean(w.recharg)};
            snapshots[unit]={weapon:weapon,model:String(unit.id),done:false};
        }
        public static function death(unit:*):void {
            var snapshot:Object=snapshots[unit];if(snapshot==null||snapshot.done||!enabled||profile==null)return;
            snapshot.done=true;
            try {
                var d:Object=RuleEngine.ammo(profile.ammo,snapshot.weapon,snapshot.model,items,Math.random);
                if(d==null)return;
                var ok:Boolean=emitPlan({loc:unit.loc,x:unit.X,y:unit.Y-unit.scY/2,broken:false},[d]);
                if(diag++<60)log("ammo enemy="+snapshot.model+" weapon="+snapshot.weapon.id+" item="+d.key+" count="+d.count+" generated="+ok);
            }catch(e:*){log("ammo error "+e);}
        }
    }
}
