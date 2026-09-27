"""Transform only freshly exported classes; fail on unexpected anchors.
This script never writes the live game. FFDec imports the result into a copy.
"""
import sys, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'build/out/current/scripts'
out=ROOT/'build/out/bridge-scripts'

def once(s,a,b):
    if s.count(a)!=1: raise RuntimeError('Anchor is not unique: '+a[:100])
    return s.replace(a,b,1)

files={p:(src/p).read_text(encoding='utf-8-sig') for p in ['fe/serv/LootGen.as','fe/serv/Interact.as','fe/unit/Unit.as']}
if any('lootEditorBridge' in s for s in files.values()): raise RuntimeError('Bridge already exists; use baseline or verify installed version')
s=files['fe/serv/LootGen.as']
s=once(s,'      public function LootGen()', '''      // LootEditor bridge v1. Inert until registered by the manifest-loaded module.
      public static var lootEditorBridge:Object = null;
      public static var lootEditorContext:Object = null;
      private static var lootEditorSuppress:Boolean = false;
      private static var lootEditorSpawn:Boolean = false;

      public function LootGen()''')
s=once(s,'         var _loc9_:String = null;', '''         if(lootEditorSuppress) { return false; }
         var _loc9_:String = null;''')
for name in ('lootCont','lootDrop'):
    s=once(s,'public static function '+name+'(', 'private static function '+name+'Native(')
safe=s.index('else if(param4 == "safe")')
s=s[:safe]+once(s[safe:],'                  loc.createUnit("bloat",nx,ny,true);','                  lootEditorSpawn = true;\n                  loc.createUnit("bloat",nx,ny,true);')
wrappers='''
      public static function lootCont(param1:Location, param2:Number, param3:Number, param4:String, param5:Boolean = false, param6:Number = 0) : Boolean
      {
         return lootEditorRun("container",param1,param2,param3,param4,param5,param6,0);
      }
      public static function lootDrop(param1:Location, param2:Number, param3:Number, param4:String, param5:int = 0) : Boolean
      {
         return lootEditorRun("enemy",param1,param2,param3,param4,false,0,param5);
      }
      private static function lootEditorRun(kind:String, place:Location, x:Number, y:Number, key:String, broken:Boolean, bonus:Number, hero:int) : Boolean
      {
         var ctx:Object;
         var rule:Object = null;
         var result:Boolean = false;
         var prevSuppress:Boolean = lootEditorSuppress;
         var prevSpawn:Boolean = lootEditorSpawn;
         if(place == null) { return false; }
         ctx = {kind:kind,loc:place,x:x,y:y,key:key,broken:broken,bonus:bonus,hero:hero,inter:lootEditorContext};
         if(lootEditorBridge != null)
         {
            try { rule = lootEditorBridge.select(ctx); } catch(selectError:*) { rule = null; }
         }
         lootEditorSuppress = rule != null && rule.mode == "replace";
         lootEditorSpawn = false;
         try
         {
            if(kind == "container") { result = lootContNative(place,x,y,key,broken,bonus); }
            else { result = lootDropNative(place,x,y,key,hero); }
            if(rule != null && !lootEditorSpawn)
            {
               // After emission starts we never re-run the native table on failure.
               try { result = Boolean(lootEditorBridge.emit(ctx,rule)) || result; }
               catch(emitError:*) { }
            }
         }
         finally
         {
            lootEditorSuppress = prevSuppress;
            lootEditorSpawn = prevSpawn;
         }
         return result;
      }
'''
pos=s.rfind('   }')
s=s[:pos]+wrappers+s[pos:]
files['fe/serv/LootGen.as']=s
s=files['fe/serv/Interact.as']
# Add explicit context argument by wrapping only the ordinary-loot block.
a='''            if(this.owner is Unit)
            {
               _loc4_ = LootGen.lootDrop'''
s=once(s,a,'''            var lootEditorPrevious:Object = LootGen.lootEditorContext;
            LootGen.lootEditorContext = this;
            try
            {
            if(this.owner is Unit)
            {
               _loc4_ = LootGen.lootDrop''')
a='''         if(!_loc4_ && this.owner is Box && !World.w.testLoot)'''
s=once(s,a,'''            }
            finally { LootGen.lootEditorContext = lootEditorPrevious; }
         if(!_loc4_ && this.owner is Box && !World.w.testLoot)''')
# Above closes the outer block too early; move its final brace behind finally.
s=s.replace('''            }
         }
            }
            finally { LootGen.lootEditorContext = lootEditorPrevious; }''','''            }
            }
            finally { LootGen.lootEditorContext = lootEditorPrevious; }
         }''')
files['fe/serv/Interact.as']=s
s=files['fe/unit/Unit.as']
s=once(s,'''      override public function die(param1:int = 0) : *
      {''','''      override public function die(param1:int = 0) : *
      {
         if(LootGen.lootEditorBridge != null)
         {
            try { LootGen.lootEditorBridge.capture(this); } catch(lootEditorCaptureError:*) { }
         }''')
s=once(s,'''            this.dropLoot();
            this.incStat();''','''            this.dropLoot();
            if(LootGen.lootEditorBridge != null)
            {
               try { LootGen.lootEditorBridge.death(this); } catch(lootEditorDeathError:*) { }
            }
            this.incStat();''')
files['fe/unit/Unit.as']=s
for p,s in files.items():
    dest=out/p; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_text(s,encoding='utf-8')
manifest={p:hashlib.sha256((src/p).read_bytes()).hexdigest() for p in files}
(out.parent/'bridge-inputs.json').write_text(json.dumps(manifest,indent=2))
print('Prepared 3 classes. MainFE and existing ModLoader unchanged.')
