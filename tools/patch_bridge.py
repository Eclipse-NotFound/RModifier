"""Transform only freshly exported classes; fail on unexpected anchors.
This script never writes the live game. FFDec imports the result into a copy.
"""
import sys, json, hashlib
from pathlib import Path
from loot_entries import annotate, arguments
import re
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'build/out/current/scripts'
out=ROOT/'build/out/bridge-scripts'

def once(s,a,b):
    if s.count(a)!=1: raise RuntimeError('Anchor is not unique: '+a[:100])
    return s.replace(a,b,1)

files={p:(src/p).read_text(encoding='utf-8-sig') for p in ['fe/serv/LootGen.as','fe/serv/Interact.as','fe/unit/Unit.as']}
if any('lootEditorBridge' in s for s in files.values()): raise RuntimeError('Bridge already exists; use baseline or verify installed version')
s=files['fe/serv/LootGen.as']
catalog=json.loads((ROOT/'desktop/data/catalog.json').read_text(encoding='utf-8'))
constants=dict(re.findall(r'public static const (\w+):\* = "([^"]+)";', (ROOT.parents[1]/'game-reference/decompiled/1.02/src102/scripts/fe/serv/Item.as').read_text(encoding='utf-8-sig')))
for method,kind in [('lootCont','container'),('lootDrop','enemy')]:
    start=s.index('{',s.index('public static function '+method)); end=start+1; depth=1
    while depth:
        depth+=(s[end]=='{')-(s[end]=='}'); end+=1
    marked,rows=annotate(s[start+1:end-1],kind,constants,catalog['items'])
    if any(catalog['nativeTables'][key]!=value for key,value in rows.items()): raise RuntimeError('Native entry IDs differ from catalogue')
    lines=[]
    for line in marked.splitlines():
        if 'newLoot(' in line:
            args,a,b=arguments(line); slot=args.pop(0)
            while len(args)<4: args.append('null' if len(args)==2 else '-1')
            line=line[:a]+','.join(args+['0','null',slot])+line[b:]
        lines.append(line)
    s=s[:start+1]+'\n'.join(lines)+s[end-1:]
s=once(s,'      public function LootGen()', '''      // LootEditor bridge v1. Inert until registered by the manifest-loaded module.
      public static const lootEditorBridgeVersion:int = 2;
      public static var lootEditorBridge:Object = null;
      public static var lootEditorContext:Object = null;
      private static var lootEditorRule:Object = null;
      private static var lootEditorSuppress:Boolean = false;
      private static var lootEditorSpawn:Boolean = false;

      public function LootGen()''')
s=once(s,'param6:Interact = null) : Boolean','param6:Interact = null, lootEditorSlot:String = null) : Boolean')
s=once(s,'         var _loc9_:String = null;', '''         if(lootEditorSuppress) { return false; }
         var edit:Object = lootEditorSlot != null && lootEditorRule != null && lootEditorRule.native != null ? lootEditorRule.native[lootEditorSlot] : null;
         if(edit != null && (edit.disabled === true || edit.chance === 0)) { return false; }
         if(edit != null && edit.hasOwnProperty("chance")) { param1 = edit.chance / 100; }
         var _loc9_:String = null;''')
s=once(s,'         var _loc7_:Number = 1;', '''         var copies:int = 1;
         if(edit != null)
         {
            var adjusted:Object = lootEditorBridge.nativeParams(edit,param2,param3,param4);
            param2 = adjusted.type; param3 = adjusted.id; param4 = adjusted.count; copies = adjusted.copies;
         }
         var _loc7_:Number = 1;''')
s=once(s,'         var _loc8_:Item = new Item(param2,param3,param4);', '''         var generated:int = 0;
         for(var copy:int = 0; copy < copies; copy++)
         {
         var _loc8_:Item = new Item(param2,param3,param4);
         if(edit != null && edit.hasOwnProperty("durabilityMin") && (_loc8_.tip == Item.L_WEAPON || _loc8_.tip == Item.L_ARMOR))
         {
            _loc8_.sost = (edit.durabilityMin + Math.floor(Math.random() * (edit.durabilityMax - edit.durabilityMin + 1))) / 100;
         }''')
# A partial equipment batch still counts as success for native fallback branches.
a=s.index('         var generated:int = 0;'); b=s.index('      public static function lootId(',a)
part=s[a:b].replace('return false;','return generated > 0;')
part=once(part,'         return true;','         generated++;\n         }\n         return generated > 0;')
s=s[:a]+part+s[b:]
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
         var prevRule:Object = lootEditorRule;
         if(place == null) { return false; }
         ctx = {kind:kind,loc:place,x:x,y:y,key:key,broken:broken,bonus:bonus,hero:hero,inter:lootEditorContext};
         if(lootEditorBridge != null)
         {
            try { rule = lootEditorBridge.select(ctx); } catch(selectError:*) { rule = null; }
         }
         lootEditorRule = rule;
         lootEditorSuppress = rule != null && rule.mode == "replace" && rule.native == null;
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
            lootEditorRule = prevRule;
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
