package tests {
    import flash.display.Loader;
    import flash.events.Event;
    import flash.events.TimerEvent;
    import flash.net.URLRequest;
    import flash.system.ApplicationDomain;
    import flash.system.LoaderContext;
    import flash.utils.Timer;
    import flash.utils.ByteArray;
    import flash.utils.getQualifiedClassName;
    import flash.filesystem.File;
    import flash.filesystem.FileStream;
    import flash.filesystem.FileMode;
    import flash.display.BitmapData;
    import flash.display.PNGEncoderOptions;
    import flash.geom.Matrix;
    import flash.geom.Rectangle;
    public class GameProbe {
        private static var timer:Timer;
        private static var w:*;
        private static var step:int=0;
        private static var ticks:int=0;
        private static var assertions:int=0;
        private static var failures:int=0;
        private static var loader:Loader;
        private static var engine:Class;
        private static var catalog:Object;
        private static var items:Object={};
        private static var gameDone:Boolean=false;
        public static function init(main:*):void {log("probe init");timer=new Timer(500);timer.addEventListener(TimerEvent.TIMER,tick);timer.start();}
        private static function log(s:String):void{var f:FileStream=new FileStream();f.open(File.applicationStorageDirectory.resolvePath("LootProbe.log"),FileMode.APPEND);f.writeUTFBytes(s+"\n");f.close();}
        private static function read(p:String):Object{var f:FileStream=new FileStream();f.open(File.applicationDirectory.resolvePath(p),FileMode.READ);var s:String=f.readUTFBytes(f.bytesAvailable);f.close();return JSON.parse(s);}
        private static function check(ok:Boolean,name:String):void{assertions++;if(!ok)failures++;log((ok?"PASS ":"FAIL ")+name);}
        private static function same(a:*,b:*):Boolean{if(a===b)return true;if(a==null||b==null||typeof a!=typeof b)return false;if(typeof a!="object")return false;var k:String;var ca:int=0;var cb:int=0;for(k in a){ca++;if(!same(a[k],b[k]))return false;}for(k in b)cb++;return ca==cb;}
        private static function tick(e:TimerEvent):void{
            try{
                ticks++;
                if(ticks>180){log("TIMEOUT step="+step);timer.stop();return;}
                var domain:ApplicationDomain=ApplicationDomain.currentDomain;
                if(w==null){var wc:Class=domain.getDefinition("fe.World") as Class;w=wc["w"];}
                if(w==null||w.landData==null)return;
                if(w.verror&&w.verror.visible){log("GAME ERROR "+w.verror.txt.text);timer.stop();return;}
                if(step==0){
                    if(w.mm==null||!w.mm.loaded||!w.allLandsLoaded||!w.textLoaded)return;
                    var lg:Class=domain.getDefinition("fe.serv.LootGen") as Class;if(lg["lootEditorBridge"]==null)return;
                    check(true,"manifest module registered bridge");
                    loader=new Loader();loader.contentLoaderInfo.addEventListener(Event.COMPLETE,loaded);
                    var context:LoaderContext=new LoaderContext(false,new ApplicationDomain(domain));context.allowCodeImport=true;
                    loader.load(new URLRequest("app:/mods/RModifier/release/LootEditorMod.swf"),context);
                    w.mm.active=false;w.newGame(-1,"LP",null);step=1;log("new game requested");return;
                }
                if(step==1&&w.gg!=null&&w.loc!=null&&w.game!=null&&w.land!=null&&engine!=null){step=2;log("world ready land="+w.game.curLandId);w.gg.invulner=true;runGame();gameDone=true;return;}
                if(step==2&&ticks%10==0){log("heartbeat after tests "+ticks);if(ticks>50){check(gameDone,"world loop alive after drop tests");log("COMPLETE assertions="+assertions+" failures="+failures);timer.stop();}}
            }catch(error:*){log("FATAL step="+step+" "+error+" "+error.getStackTrace());timer.stop();}
        }
        private static function loaded(e:Event):void{
            try{
                engine=loader.contentLoaderInfo.applicationDomain.getDefinition("loot.RuleEngine") as Class;
                catalog=read("fixtures/catalog.json");for each(var i:Object in catalog.items)items[i.key]=i;
                var golden:Object=read("fixtures/golden.json");check(engine["fingerprint"](golden.hashInput)==golden.hashExpected,"UTF-8 config fingerprint parity");
                for each(var v:Object in golden.validation)check((engine["validate"](v.profile,catalog)=="")==v.valid,"profile validation parity");
                for each(var c:Object in golden.cases){var result:*=c.kind=="rewards"?engine["rewards"](c.rewards,c.ctx,engine["seeded"](c.seed),items):engine["ammo"](c.a,c.weapon,"",items,engine["seeded"](c.seed));check(same(result,c.expected),"JS/AIR "+c.kind+" seed="+c.seed);}
                log("golden complete");
            }catch(error:*){log("GOLDEN ERROR "+error);}
        }
        private static function ground():Array{var list:Array=[];var o:*=w.loc.firstObj;var guard:int=0;while(o!=null&&guard++<20000){if(getQualifiedClassName(o)=="fe.loc::Loot")list.push(o);o=o.nobj;}return list;}
        private static function sum(id:String):int{var n:int=0;for each(var o:* in ground())if(o.item.id==id)n+=o.item.kol;return n;}
        private static function enemy(type:String="raider",variant:String="1"):*{var u:*=w.loc.createUnit(type,w.gg.X+300,w.gg.Y,true,null,variant);u.hero=0;u.isDropArm=false;u.currentWeapon=weaponClass()["create"](u,"p10mm");u.hp=0;return u;}
        private static function weaponClass():Class{return ApplicationDomain.currentDomain.getDefinition("fe.weapon.Weapon") as Class;}
        private static function runGame():void{
            var lg:Class=ApplicationDomain.currentDomain.getDefinition("fe.serv.LootGen") as Class;
            var before:int=sum("p10");lg["lootCont"](w.loc,w.gg.X+300,w.gg.Y,"ammo",false,50);check(sum("p10")-before==13,"direct container table replacement = 13 rounds");
            var box:*=w.loc.createObj("ammobox","box",8,8,new XML('<obj code="loot-probe-box"><item id="p9" kol="3" imp="1"/></obj>'));
            before=sum("p10");var p9:int=sum("p9");box.inter.loot();check(sum("p10")-before==17,"real box model overrides table = 17 rounds");check(sum("p9")-p9==3,"map-specified important item preserved");
            before=sum("p10");box.inter.loot();check(sum("p10")==before,"opened container cannot drop again");
            var important:*;for each(var loot:* in ground())if(loot.item.id=="p9"&&loot.item.cont===box.inter)important=loot;
            check(important!=null&&important.item.imp==2,"important item retains receipt owner and flag");
            if(important){important.take(true);check(box.inter.saveLoot==1,"picking important item acknowledges receipt");}
            var savedBox:Object={};box.inter.save(savedBox);var restoredBox:*=w.loc.createObj("ammobox","box",10,8,new XML('<obj code="loot-probe-restored"><item id="p9" kol="3" imp="1"/></obj>'));before=sum("p10");p9=sum("p9");restoredBox.inter.load(savedBox);restoredBox.inter.loot();check(sum("p10")==before&&sum("p9")==p9,"saved opened container stays settled after native load");
            var u:*=enemy();before=sum("p10");u.die();check(sum("p10")-before==6,"hostile gun user adds 6 rounds after native death");
            before=sum("p10");u.die();check(sum("p10")==before,"duplicate death adds no ammo");
            u=enemy();u.isDropArm=true;before=sum("p10");u.die();check(sum("p10")-before==6,"native gun drop still receives separate ammo");var droppedGun:*;for each(var object:* in ground())if(object.item.id=="p10mm"&&object.item.tip=="weapon")droppedGun=object;check(droppedGun!=null,"native weapon drop preserved");if(droppedGun){var inventoryAmmo:int=w.invent.items["p10"].kol;droppedGun.take(true);var gained:int=w.invent.items["p10"].kol-inventoryAmmo;check(gained>=1&&gained<=12,"picking dropped weapon retains original 1..12 bonus ammo");}
            u=enemy();u.fraction=100;before=sum("p10");u.die();check(sum("p10")==before,"friendly excluded");
            u=enemy();u.isRes=true;before=sum("p10");u.die();check(sum("p10")==before&&!u.lootIsDrop,"revivable downed unit does not pay");u.hp=-100000;u.die();check(sum("p10")-before==6,"final death after downing pays once despite faction zero");before=sum("p10");u.die();check(sum("p10")==before,"final death cannot pay twice");
            u=enemy("ranger","1");before=sum("p10");u.die();check(sum("p10")-before==6,"ranger gets ammo despite no weapon drop");
            u=enemy();u.currentWeapon=weaponClass()["create"](u,"p10mm");u.currentWeapon.setAmmo("p10_1");before=sum("p10_1");u.die();check(sum("p10_1")-before==Math.max(1,Math.floor(items["item:p10_1"].count/2)),"uses actual specialized ammo");
            u=enemy();u.currentWeapon=weaponClass()["create"](u,"mlau");before=sum("rocket");u.die();check(sum("rocket")==before,"rare rocket toggle excludes new rockets");
            u=enemy();u.currentWeapon=weaponClass()["create"](u,"bat");before=sum("p10");u.die();check(sum("p10")==before,"melee produces no fictional ammo");
            var bridge:Object=lg["lootEditorBridge"];lg["lootEditorBridge"]=null;before=ground().length;lg["lootCont"](w.loc,w.gg.X+300,w.gg.Y,"specalc");check(ground().length>before,"absent module preserves native drops");lg["lootEditorBridge"]=bridge;
            var quota:Number=w.land.lootLimit;w.land.lootLimit=0;before=sum("repair");bridge.emit({loc:w.loc,x:w.gg.X+300,y:w.gg.Y,broken:false,hero:0},{target:"test",mode:"append",rewards:[reward("item:repair",1)]});check(sum("repair")==before,"custom skill book respects exhausted native quota");w.land.lootLimit=quota;
            var caps:Number=w.pers.capsMult,dif:Number=w.pers.difCapsMult;w.pers.capsMult=2;w.pers.difCapsMult=1;before=sum("money");bridge.emit({loc:w.loc,x:w.gg.X+300,y:w.gg.Y,broken:true,hero:0},{target:"test",mode:"append",rewards:[reward("item:money",10)]});check(sum("money")-before==10,"custom caps retain perk multiplier and broken-container loss");w.pers.capsMult=caps;w.pers.difCapsMult=dif;
            var api:*=w.main.getChildByName("ModSettingsCarrier");check(api!=null,"existing ModLoader settings host present");if(api){var registered:Boolean=false;for each(var page:Object in api.modAPI.getPages())if(page.modId=="loot-editor")registered=true;check(registered,"LootEditor status page registered with ModLoader");}
            testWeaponVariants(lg,bridge);
            exportIcons();log("gameplay complete");
        }
        private static function variantCount(id:String,variant:int):int{var count:int=0;for each(var o:* in ground())if(o.item.id==id&&o.item.variant==variant)count++;return count;}
        private static function testWeaponVariants(lg:Class,bridge:Object):void{
            var normal:int=variantCount("rail",0),advanced:int=variantCount("rail",1),zero:int=variantCount("mont",1);
            lg["lootCont"](w.loc,w.gg.X+300,w.gg.Y,"wbig",false,50);
            check(variantCount("rail",0)==normal+1,"container ordinary rail at 100 percent");
            check(variantCount("rail",1)==advanced+1,"container Paladin at 100 percent is real variant 1");
            check(variantCount("mont",1)==zero,"advanced weapon at zero percent does not drop");
            advanced=variantCount("rail",1);var u:*=enemy("ranger","1");u.die();
            check(variantCount("rail",1)==advanced+1,"enemy model rule drops actual Paladin");
            var ctx:Object={loc:w.loc,x:w.gg.X+300,y:w.gg.Y,broken:false,hero:0};
            var legacy:Object=reward("weapon:rail",1);legacy.variant=1;advanced=variantCount("rail",1);
            bridge.emit(ctx,{target:"test",mode:"append",rewards:[legacy,reward("weapon:mont^1",1)]});
            check(variantCount("rail",1)==advanced+1,"legacy variant profile still creates Paladin");
            check(variantCount("mont",1)==zero+1,"defined zero-pool-weight upgrade can explicitly drop");
            var paladin:*;for each(var loot:* in ground())if(loot.item.id=="rail"&&loot.item.variant==1)paladin=loot;
            var res:Class=ApplicationDomain.currentDomain.getDefinition("fe.Res") as Class;
            var expectedName:String=String(res["txt"]("w","rail^1"));
            log("advanced weapon name="+(paladin?paladin.item.nazv:"missing")+" expected="+expectedName);
            check(paladin!=null&&String(paladin.item.nazv)==expectedName&&expectedName!=String(res["txt"]("w","rail")),"ground item displays actual localized advanced name");
            if(paladin){paladin.take(true);check(w.invent.weapons["rail"]!=null&&w.invent.weapons["rail"].variant==1,"picking Paladin adds upgraded weapon to inventory");}
        }
        private static function reward(key:String,count:int):Object{return {chance:100,min:count,max:count,repeat:1,pick:[{key:key,weight:1}],durabilityMin:100,durabilityMax:100,variant:0,elite:"any",minStage:0,maxStage:99};}
        private static function exportIcons():void{
            var dir:File=File.applicationStorageDirectory.resolvePath("LootEditorIcons");dir.createDirectory();var index:Object={};var domain:ApplicationDomain=ApplicationDomain.currentDomain;var res:Class=domain.getDefinition("fe.Res") as Class;
            for each(var item:Object in catalog.items){
                try{
                    var cls:Class;var clip:*;var label:String=item.base||item.id;
                    if(item.kind=="weapon"||item.tip=="e")cls=res["getClass"]("vis"+item.id,null);
                    else cls=domain.getDefinition(item.tip=="a"?"visualAmmo":"visualItem") as Class;
                    if(cls==null)continue;clip=new cls();clip.stop();if(item.kind!="weapon"&&item.tip!="e"){try{clip.gotoAndStop(label);}catch(e:*){continue;}}
                    var rect:Rectangle=clip.getBounds(clip);if(rect.width<=0||rect.height<=0)continue;var scale:Number=Math.min(56/rect.width,56/rect.height,2);var matrix:Matrix=new Matrix(scale,0,0,scale,32-(rect.x+rect.width/2)*scale,32-(rect.y+rect.height/2)*scale);var bmp:BitmapData=new BitmapData(64,64,true,0);bmp.draw(clip,matrix,null,null,null,true);
                    var png:ByteArray=bmp.encode(bmp.rect,new PNGEncoderOptions());var f:FileStream=new FileStream();var filename:String=item.kind+"_"+item.id+".png";f.open(dir.resolvePath(filename),FileMode.WRITE);f.writeBytes(png);f.close();bmp.dispose();index[item.key]=filename;
                }catch(error:*){}
            }
            var out:FileStream=new FileStream();out.open(dir.resolvePath("index.json"),FileMode.WRITE);out.writeUTFBytes(JSON.stringify(index));out.close();log("icons exported");
        }
    }
}
