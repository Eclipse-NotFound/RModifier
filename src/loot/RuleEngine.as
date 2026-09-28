package loot {
    import flash.utils.ByteArray;
    public class RuleEngine {
        public static function fingerprint(text:String):String {
            var b:ByteArray=new ByteArray();b.writeUTFBytes(text);b.position=0;
            var h:uint=2166136261;
            while(b.bytesAvailable){h^=b.readUnsignedByte();h=uint(h+(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24));}
            var s:String=h.toString(16);while(s.length<8)s="0"+s;return "fnv1a-"+s;
        }
        public static function seeded(seed:uint):Function {
            var x:uint=seed||1;
            return function():Number {x^=x<<13;x^=x>>>17;x^=x<<5;return Number(x)/4294967296;};
        }
        private static function number(v:*,min:Number,max:Number,integer:Boolean=true):Boolean {
            return (v is Number) && isFinite(v) && v>=min && v<=max && (!integer||Math.floor(v)==v);
        }
        public static function validate(p:Object,catalog:Object):String {
            if(p==null||p.schemaVersion!==1||p.gameVersion!=="1.02")return "unsupported schema/game version";
            if(!(p.name is String)||p.name.length<1||p.name.length>60||!(p.id is String)||!/^[-\w]{1,80}$/.test(p.id))return "invalid profile identity";
            if(!(p.rules is Array)||p.rules.length>300)return "invalid rules";
            var items:Object={};var targets:Object={};var seen:Object={};var i:Object;
            for each(i in catalog.items)items[i.key]=i;
            for each(i in catalog.sources)targets[i.key]=true;
            for each(var r:Object in p.rules){
                if(r==null||!targets.hasOwnProperty(r.target)||seen.hasOwnProperty(r.target)||(r.mode!="append"&&r.mode!="replace")||!(r.rewards is Array)||r.rewards.length>40)return "invalid rule target/mode";
                seen[r.target]=true;var stackBudget:Number=0;
                for each(var v:Object in r.rewards){
                    if(v==null||!number(v.chance,0,100,false)||!number(v.min,1,9999)||!number(v.max,v.min,9999)||!number(v.repeat,1,20))return "invalid reward quantity/probability";
                    if(!number(v.durabilityMin,1,100)||!number(v.durabilityMax,v.durabilityMin,100)||!number(v.variant,0,1))return "invalid weapon condition";
                    if(["any","normal","elite"].indexOf(v.elite)<0||!number(v.minStage,0,99)||!number(v.maxStage,v.minStage,99))return "invalid reward condition";
                    if(!(v.pick is Array)||v.pick.length<1||v.pick.length>60)return "invalid choices";
                    var choices:Object={};var weapon:Boolean=false;
                    for each(var c:Object in v.pick){
                        if(c==null||!items.hasOwnProperty(c.key)||!number(c.weight,1,1000))return "invalid item/weight";
                        i=items[c.key];var baseKey:String=i.baseKey||i.key;
                        var identity:String=baseKey+"^"+int(i.variant||v.variant);
                        if(choices.hasOwnProperty(identity))return "duplicate item variant";
                        choices[identity]=true;weapon=weapon||i.kind=="weapon"||i.kind=="armor";
                        if(v.variant && !(i.kind=="weapon"&&items.hasOwnProperty(baseKey+"^1")))return "item has no special variant";
                    }
                    stackBudget+=v.repeat*(weapon?v.max:1);
                }
                if(stackBudget>200)return "more than 200 ground stacks per event";
            }
            var a:Object=p.ammo;
            if(a==null||!(a.enabled is Boolean)||!(a.useBase is Boolean)||!(a.includeExplosive is Boolean)||["pack","fixed","range"].indexOf(a.mode)<0)return "invalid ammo options";
            if(!number(a.chance,0,100,false)||!number(a.explosiveChance,0,100,false)||!number(a.packPercent,1,500))return "invalid ammo probability";
            if(!number(a.min,1,9999)||!number(a.max,a.min,9999)||!number(a.explosiveMin,1,9999)||!number(a.explosiveMax,a.explosiveMin,9999))return "invalid ammo amount";
            if(!(a.models is Array)||a.models.length>200)return "invalid enemy filter";
            for each(var m:* in a.models)if(!targets["enemy:model:"+m])return "unknown enemy filter";
            if(!(a.weaponOverrides is Array)||a.weaponOverrides.length>100)return "invalid ammo overrides";
            for each(var o:Object in a.weaponOverrides)if(o==null||!items["weapon:"+o.weapon]||!items[o.key]||items[o.key].tip!="a")return "unknown ammo override";
            return "";
        }
        private static function quantity(a:Number,b:Number,rng:Function):int{return a+Math.floor(rng()*(b-a+1));}
        public static function rewards(rewards:Array,ctx:Object,rng:Function,items:Object):Array {
            var drops:Array=[];
            for each(var r:Object in rewards){
                if(ctx.stage<r.minStage||ctx.stage>r.maxStage||(r.elite=="elite"&&!ctx.hero)||(r.elite=="normal"&&ctx.hero))continue;
                for(var n:int=0;n<r.repeat;n++){
                    if(r.chance<=0||(r.chance<100&&rng()*100>=r.chance))continue;
                    var chosen:Object=r.pick[0];var c:Object;
                    if(r.pick.length>1){var total:Number=0;for each(c in r.pick)total+=c.weight;var p:Number=rng()*total;for each(c in r.pick){p-=c.weight;if(p<0){chosen=c;break;}}}
                    var item:Object=items[chosen.key];var count:int=quantity(r.min,r.max,rng);
                    if(item.kind=="weapon"||item.kind=="armor"){
                        for(var j:int=0;j<count;j++)drops.push({key:item.baseKey||chosen.key,count:1,durability:quantity(r.durabilityMin,r.durabilityMax,rng)/100,variant:item.variant||r.variant});
                    }else drops.push({key:chosen.key,count:count,durability:1,variant:0});
                }
            }
            return drops;
        }
        public static function explosive(i:Object):Boolean {
            return ["rocket","gren40","egg"].indexOf(i.base||i.id)>=0;
        }
        public static function ammo(a:Object,weapon:Object,model:String,items:Object,rng:Function):Object {
            if(!a.enabled||weapon==null||weapon.recharg||weapon.ammo=="not"||weapon.tip==1||weapon.tip==4||weapon.tip==5||(a.models.length&&a.models.indexOf(model)<0))return null;
            var key:String="item:"+(a.useBase?(weapon.ammoBase||weapon.ammo):weapon.ammo);
            for each(var o:Object in a.weaponOverrides)if(o.weapon==weapon.id){key=o.key;break;}
            var i:Object=items[key];if(i==null||i.tip!="a"||i.id=="recharg"||i.id=="not")return null;
            if(a.useBase&&i.base){key="item:"+i.base;i=items[key];if(i==null)return null;}
            var rare:Boolean=explosive(i);if(rare&&!a.includeExplosive)return null;
            var chance:Number=rare?a.explosiveChance:a.chance;
            if(chance<=0||(chance<100&&rng()*100>=chance))return null;
            var count:int=rare?quantity(a.explosiveMin,a.explosiveMax,rng):a.mode=="pack"?Math.max(1,Math.floor(i.count*a.packPercent/100)):a.mode=="fixed"?a.min:quantity(a.min,a.max,rng);
            return {key:key,count:count,durability:1,variant:0,ammoBonus:true};
        }
    }
}
