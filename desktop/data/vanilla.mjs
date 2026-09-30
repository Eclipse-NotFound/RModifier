// Generated from local Remains 1.02 LootGen. Never accepts user code.
export function vanillaTable(kind, key, env, emit, random) {
const Math = Object.create(globalThis.Math); Math.random = random;
const Item = {"L_ITEM": "item", "L_ARMOR": "armor", "L_WEAPON": "weapon", "L_UNIQ": "uniq", "L_SPELL": "spell", "L_AMMO": "a", "L_EXPL": "e", "L_MED": "med", "L_BOOK": "book", "L_HIM": "him", "L_POT": "pot", "L_FOOD": "food", "L_SCHEME": "scheme", "L_PAINT": "paint", "L_COMPA": "compa", "L_COMPW": "compw", "L_COMPE": "compe", "L_COMPM": "compm", "L_COMPP": "compp", "L_SPEC": "spec", "L_INSTR": "instr", "L_STUFF": "stuff", "L_ART": "art", "L_IMPL": "impl", "L_KEY": "key"};
const World = {w:env.world}, loc = env.loc, nx=0, ny=0;
const param1=loc, param2=0, param3=0, param4=key, param5=env.hero||0, param6=env.bonus??50;
let lootBroken=!!env.broken, is_loot=0;
const replic=()=>{};
const newLoot=(slot,chance,type,id=null,count=-1)=>{ const ok=emit(chance,type,id,count,slot); if(ok) is_loot++; return ok; };
if(kind === "container") {

         var _loc9_ = undefined;
         var _loc10_ = null;
         if(param1 == null)
         {
            return false;
         }




         is_loot = 0;
         var _loc7_ = Math.min(loc.locDifLevel,20);
         var _loc8_ = 1;
         if(param4 == "ammo")
         {
            newLoot("container:ammo:1",0.7,Item.L_AMMO);
            newLoot("container:ammo:2",0.25,Item.L_AMMO);
            newLoot("container:ammo:3",0.15,Item.L_AMMO);
            if(World.w.pers.freel)
            {
               newLoot("container:ammo:4",0.7,Item.L_AMMO);
            }
         }
         else if(param4 == "metal")
         {
            if(!newLoot("container:metal:1",0.5,Item.L_ITEM,"money",Math.random() * 30 * (_loc7_ * 0.15 + 1) + 5))
            {
               newLoot("container:metal:2",1,Item.L_AMMO);
            }
         }
         else if(param4 == "bomb")
         {
            _loc8_ = 3;
            _loc9_ = 0;
            while(_loc9_ < _loc8_)
            {
               newLoot("container:bomb:1",1,Item.L_EXPL,"dinamit");
               _loc9_++;
            }
         }
         else if(param4 == "expl")
         {
            _loc8_ = Math.floor(Math.random() * 4 - 1);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot("container:expl:1",1,Item.L_EXPL);
               _loc9_++;
            }
            newLoot("container:expl:2",0.5,Item.L_COMPE);
            if(World.w.pers.freel)
            {
               newLoot("container:expl:3",0.5,Item.L_EXPL);
            }
         }
         else if(param4 == "bigexpl")
         {
            _loc8_ = Math.floor(Math.random() * 4 + 2);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot("container:bigexpl:1",1,Item.L_EXPL);
               _loc9_++;
            }
            if(World.w.pers.freel)
            {
               newLoot("container:bigexpl:2",0.5,Item.L_EXPL);
            }
            newLoot("container:bigexpl:3",0.5,Item.L_COMPE);
         }
         else if(param4 == "wbattle")
         {
            if(!newLoot("container:wbattle:1",0.04,Item.L_UNIQ))
            {
               if(Math.random() < Math.min(_loc7_ / 5,0.7))
               {
                  newLoot("container:wbattle:2",1,Item.L_WEAPON,"4",1);
               }
               else
               {
                  newLoot("container:wbattle:3",1,Item.L_WEAPON,"3",1);
               }
            }
            newLoot("container:wbattle:4",0.8,Item.L_AMMO);
            if(World.w.pers.freel)
            {
               newLoot("container:wbattle:5",0.5,Item.L_AMMO);
            }
            newLoot("container:wbattle:6",0.1,Item.L_ITEM,"stealth");
            if(World.w.pers.barahlo)
            {
               newLoot("container:wbattle:7",0.1,Item.L_COMPA,"intel_comp");
            }
         }
         else if(param4 == "case")
         {
            newLoot("container:case:1",0.9,Item.L_ITEM,"money",Math.random() * 20 * (_loc7_ * 0.11 + 1) + 5);
         }
         else if(param4 == "wbig")
         {
            if(!newLoot("container:wbig:1",0.08,Item.L_UNIQ))
            {
               if(Math.random() < 0.5)
               {
                  newLoot("container:wbig:2",1,Item.L_WEAPON,"5",1);
               }
               else
               {
                  newLoot("container:wbig:3",1,Item.L_WEAPON,"4",1);
               }
            }
            newLoot("container:wbig:4",0.5,Item.L_EXPL,"",Math.floor(Math.random() * 4));
            newLoot("container:wbig:5",0.5,Item.L_AMMO,"",Math.floor(Math.random() * 4));
            if(World.w.pers.freel)
            {
               newLoot("container:wbig:6",0.5,Item.L_AMMO);
            }
            if(World.w.pers.barahlo)
            {
               newLoot("container:wbig:7",0.5,Item.L_COMPA,"intel_comp");
            }
         }
         else if(param4 == "robocell")
         {
            newLoot("container:robocell:1",1,Item.L_COMPM);
         }
         else if(param4 == "instr")
         {
            newLoot("container:instr:1",0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            if(!newLoot("container:instr:2",0.35,Item.L_WEAPON,"2",1))
            {
               newLoot("container:instr:3",0.5,Item.L_ITEM,"rep");
            }
            newLoot("container:instr:4",0.85,Item.L_COMPA);
            newLoot("container:instr:5",0.7,Item.L_COMPW);
            newLoot("container:instr:6",0.1,Item.L_COMPE);
            newLoot("container:instr:7",0.5,Item.L_COMPM);
            newLoot("container:instr:8",0.5,Item.L_PAINT);
            if(World.w.pers.barahlo)
            {
               newLoot("container:instr:9",0.85,Item.L_COMPA);
               newLoot("container:instr:10",0.7,Item.L_COMPW);
               newLoot("container:instr:11",0.1,Item.L_COMPE);
               newLoot("container:instr:12",0.1,Item.L_COMPE);
               newLoot("container:instr:13",0.5,Item.L_COMPA);
            }
         }
         else if(param4 == "instr2")
         {
            newLoot("container:instr2:1",0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            if(!newLoot("container:instr2:2",0.35,Item.L_WEAPON,"2",1))
            {
               newLoot("container:instr2:3",0.5,Item.L_ITEM,"rep");
            }
            newLoot("container:instr2:4",0.75,Item.L_COMPA);
            newLoot("container:instr2:5",0.4,Item.L_COMPW);
            newLoot("container:instr2:6",0.5,Item.L_COMPM);
            newLoot("container:instr2:7",0.2,Item.L_PAINT);
            if(World.w.pers.barahlo)
            {
               newLoot("container:instr2:8",0.75,Item.L_COMPA);
               newLoot("container:instr2:9",0.4,Item.L_COMPW);
               newLoot("container:instr2:10",0.1,Item.L_COMPE);
               newLoot("container:instr2:11",0.5,Item.L_COMPA);
            }
         }
         else if(param4 == "trash")
         {
            if(loc.land.act.biom == 0)
            {
               newLoot("container:trash:1",0.25,Item.L_FOOD,"radcookie");
            }
            if(Math.random() < 0.25)
            {
               if(Math.random() < 0.6)
               {
                  loc.createUnit("tarakan",nx,ny,true);
               }
               else
               {
                  loc.createUnit("rat",nx,ny,true);
               }
            }
            else
            {
               _loc8_ = Math.floor(Math.random() * 2);
               if(World.w.pers.barahlo)
               {
                  _loc8_ += 2;
               }
               _loc9_ = 0;
               while(_loc9_ <= _loc8_)
               {
                  newLoot("container:trash:2",1,Item.L_STUFF);
                  _loc9_++;
               }
               newLoot("container:trash:3",0.4,Item.L_ITEM,"money",Math.random() * 10 * (_loc7_ * 0.1 + 1) + 5);
            }
         }
         else if(param4 == "fridge")
         {
            newLoot("container:fridge:1",0.5,Item.L_FOOD,"sparklecola");
            newLoot("container:fridge:2",0.5,Item.L_FOOD,"sars");
            newLoot("container:fridge:3",0.1,Item.L_FOOD,"radcola");
            if(Math.random() < 0.2)
            {
               if(Math.random() < 0.4)
               {
                  loc.createUnit("tarakan",nx,ny,true);
               }
               else if(Math.random() < 0.5)
               {
                  loc.createUnit("rat",nx,ny,true);
               }
               else
               {
                  loc.createUnit("bloat",nx,ny,true);
               }
            }
            else
            {
               _loc8_ = Math.floor(Math.random() * 2);
               _loc9_ = 0;
               while(_loc9_ <= _loc8_)
               {
                  newLoot("container:fridge:4",1,Item.L_FOOD);
                  _loc9_++;
               }
               newLoot("container:fridge:5",0.3,Item.L_COMPP,"herbs",Math.floor(Math.random() * 6 + 1));
            }
         }
         else if(param4 == "food")
         {
            if(loc.land.act.biom == 0)
            {
               newLoot("container:food:1",0.25,Item.L_FOOD,"radcookie");
            }
            if(Math.random() < 0.25)
            {
               if(Math.random() < 0.6)
               {
                  loc.createUnit("tarakan",nx,ny,true);
               }
               else
               {
                  loc.createUnit("rat",nx,ny,true);
               }
            }
            else
            {
               newLoot("container:food:2",0.8,Item.L_FOOD);
               newLoot("container:food:3",0.5,Item.L_STUFF);
               newLoot("container:food:4",0.2,Item.L_COMPP,"herbs",Math.floor(Math.random() * 6 + 1));
               newLoot("container:food:5",0.05,"co");
            }
         }
         else if(param4 == "med")
         {
            newLoot("container:med:1",0.05,Item.L_ITEM,"pin",Math.floor(Math.random() * 2 + 1));
            _loc8_ = Math.floor(Math.random() * 3 - 1);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot("container:med:2",1,Item.L_MED);
               _loc9_++;
            }
            newLoot("container:med:3",0.25,Item.L_HIM);
            newLoot("container:med:4",0.03,Item.L_MED,"firstaid");
            newLoot("container:med:5",0.05,Item.L_POT,"potHP");
            newLoot("container:med:6",0.25,Item.L_ITEM,"gel");
         }
         else if(param4 == "med2")
         {
            newLoot("container:med2:1",0.75,Item.L_POT,"potHP");
            _loc8_ = Math.floor(Math.random() * 3);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot("container:med2:2",1,Item.L_MED);
               _loc9_++;
            }
            newLoot("container:med2:3",1,Item.L_HIM);
            newLoot("container:med2:4",0.5,Item.L_MED,"firstaid");
            newLoot("container:med2:5",0.5,Item.L_MED,"doctor");
            newLoot("container:med2:6",0.5,Item.L_MED,"surgeon");
            newLoot("container:med2:7",0.8,Item.L_ITEM,"gel");
         }
         else if(param4 == "table")
         {
            newLoot("container:table:1",0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            if(!newLoot("container:table:2",0.08,Item.L_BOOK))
            {
               newLoot("container:table:3",0.5,Item.L_ITEM,"money",Math.random() * 50 + 5 + 3 * _loc7_);
            }
            newLoot("container:table:4",0.1,Item.L_FOOD);
            newLoot("container:table:5",0.13,Item.L_WEAPON,"3");
            newLoot("container:table:6",0.3,Item.L_AMMO);
            newLoot("container:table:7",0.1,Item.L_ITEM,"dart");
            newLoot("container:table:8",0.1,Item.L_ITEM,"app");
            newLoot("container:table:9",0.04,Item.L_SCHEME);
            newLoot("container:table:10",0.25,Item.L_FOOD);
            newLoot("container:table:11",0.08,"co");
            newLoot("container:table:12",0.1,Item.L_MED,"potm1");
         }
         else if(param4 == "filecab")
         {
            newLoot("container:filecab:1",0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            newLoot("container:filecab:2",0.5,Item.L_ITEM,"money",Math.random() * 20);
            newLoot("container:filecab:3",0.1,Item.L_ITEM,"app");
            newLoot("container:filecab:4",0.02,Item.L_SCHEME);
            newLoot("container:filecab:5",0.08,"co");
         }
         else if(param4 == "cup")
         {
            newLoot("container:cup:1",0.06,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            newLoot("container:cup:2",0.3,Item.L_ITEM,"money",Math.random() * 20);
            newLoot("container:cup:3",0.25,Item.L_COMPA);
            newLoot("container:cup:4",0.75,Item.L_STUFF);
            newLoot("container:cup:5",0.2,Item.L_COMPA,"kombu_comp");
            newLoot("container:cup:6",0.2,Item.L_COMPA,"antirad_comp");
            newLoot("container:cup:7",0.2,Item.L_COMPA,"antihim_comp");
         }
         else if(param4 == "bloat")
         {
            loc.createUnit("bloat",nx,ny,true);
         }
         else if(param4 == "book")
         {
            if(!newLoot("container:book:1",0.3,Item.L_BOOK))
            {
               newLoot("container:book:2",1,Item.L_ITEM,"lbook");
            }
            newLoot("container:book:3",0.1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
            newLoot("container:book:4",0.25,Item.L_SCHEME);
            newLoot("container:book:5",0.3,"co");
            if(param1.itemsTip == "bibl")
            {
               newLoot("container:book:6",0.5,Item.L_ITEM,"book_cm");
            }
         }
         else if(param4 == "term" || param4 == "info")
         {
            if(param1.land.act.id == "minst")
            {
               newLoot("container:term:1",1,Item.L_ITEM,"datast");
            }
            else if(!newLoot("container:term:2",0.25,Item.L_ITEM,"disc"))
            {
               newLoot("container:term:3",1,Item.L_ITEM,"data");
            }
            newLoot("container:term:4",0.5,Item.L_COMPM);
         }
         else if(param4 == "cryo")
         {
            _loc8_ = Math.floor(Math.random() * 3);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot("container:cryo:1",1,Item.L_ITEM,"pcryo");
               _loc9_++;
            }
            newLoot("container:cryo:2",0.5,Item.L_ITEM,"gel");
         }
         else if(param4 == "chest")
         {
            newLoot("container:chest:1",0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            newLoot("container:chest:2",0.2,Item.L_WEAPON,"3",2);
            newLoot("container:chest:3",0.2,Item.L_ITEM,"bit",Math.random() * 50 + 7 * _loc7_ + 2);
            newLoot("container:chest:4",0.3,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
            newLoot("container:chest:5",0.25,Item.L_COMPA);
            newLoot("container:chest:6",0.03,Item.L_BOOK);
            newLoot("container:chest:7",0.5,Item.L_AMMO);
            newLoot("container:chest:8",0.03,Item.L_SCHEME);
            if(is_loot > 5)
            {
               replic("full");
            }
            if(is_loot < 2)
            {
               replic("empty");
            }
         }
         else if(param4 == "safe")
         {
            if(World.w.land.rnd && param1.prob == null && Math.random() < 0.05)
            {
               _loc9_ = 0;
               while(_loc9_ < 4)
               {
                  loc.createUnit("bloat",nx,ny,true);
                  _loc9_++;
               }
            }
            else
            {
               newLoot("container:safe:1",param6 / 100,Item.L_UNIQ);
               newLoot("container:safe:2",0.1 + param6 / 100,Item.L_ITEM,"sphera");
               newLoot("container:safe:3",0.2 + param6 / 200,Item.L_ITEM,"stealth");
               newLoot("container:safe:4",0.25 + param6 / 100,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
               newLoot("container:safe:5",0.2,Item.L_MED);
               newLoot("container:safe:6",0.25,Item.L_ITEM,"retr");
               newLoot("container:safe:7",0.1,Item.L_ITEM,"runa");
               newLoot("container:safe:8",0.1,Item.L_ITEM,"reboot");
               newLoot("container:safe:9",0.2 + param6 / 100,Item.L_BOOK);
               newLoot("container:safe:10",0.1 + param6 / 100,Item.L_COMPP);
               newLoot("container:safe:11",1,Item.L_ITEM,"bit",Math.random() * (param6 + 10) * 8 + 2 + 4 * _loc7_);
               newLoot("container:safe:12",0.1 + param6 / 300,Item.L_SCHEME);
               newLoot("container:safe:13",0.25,Item.L_POT,"potMP");
               newLoot("container:safe:14",0.1,Item.L_POT,"potHP");
               if(!newLoot("container:safe:15",0.4,Item.L_MED,"potm2"))
               {
                  newLoot("container:safe:16",0.3,Item.L_MED,"potm3");
               }
               if(is_loot == 0)
               {
                  newLoot("container:safe:17",1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
               }
               if(is_loot > 6)
               {
                  replic("full");
               }
               if(is_loot < 2)
               {
                  replic("empty");
               }
            }
         }
         else if(param4 == "specweap")
         {
            _loc8_ = Math.floor(Math.random() * 4);
            _loc10_ = [];
            if(World.w.invent.weapons["lsword"] == null || World.w.invent.weapons["lsword"].variant == 0)
            {
               _loc10_.push("lsword^1");
            }
            if(World.w.invent.weapons["antidrak"] == null || World.w.invent.weapons["antidrak"].variant == 0)
            {
               _loc10_.push("antidrak^1");
            }
            if(World.w.invent.weapons["quick"] == null || World.w.invent.weapons["quick"].variant == 0)
            {
               _loc10_.push("quick^1");
            }
            if(World.w.invent.weapons["mlau"] == null || World.w.invent.weapons["mlau"].variant == 0)
            {
               _loc10_.push("mlau^1");
            }
            if(_loc10_.length)
            {
               newLoot("container:specweap:1",1,Item.L_WEAPON,_loc10_[Math.floor(Math.random() * _loc10_.length)]);
            }
            else
            {
               newLoot("container:specweap:2",1,Item.L_UNIQ);
            }
         }
         else if(param4 == "specalc")
         {
            newLoot("container:specalc:1",1,Item.L_SPEC,"alc7");
            newLoot("container:specalc:2",1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
         }
         else if(param4 == "speclp")
         {
            newLoot("container:speclp:1",1,Item.L_SPEC,"lp_item");
            newLoot("container:speclp:2",1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
         }
         return is_loot > 0;

} else {

         if(param1 == null)
         {
            return false;
         }




         is_loot = 0;
         if(param4 == "scorp")
         {
            newLoot("enemy:scorp:1",1,Item.L_COMPA,"chitin_comp");
            newLoot("enemy:scorp:2",0.25,Item.L_COMPP,"gland");
            newLoot("enemy:scorp:3",0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "slime")
         {
            newLoot("enemy:slime:1",0.75,Item.L_ITEM,"acidslime");
         }
         else if(param4 == "pinkslime")
         {
            newLoot("enemy:pinkslime:1",0.75,Item.L_ITEM,"pinkslime");
         }
         else if(param4 == "raider")
         {
            newLoot("enemy:raider:1",0.25,"eda");
            newLoot("enemy:raider:2",0.25,Item.L_AMMO);
            newLoot("enemy:raider:3",0.12,Item.L_EXPL);
         }
         else if(param4 == "alicorn1" || param4 == "alicorn2" || param4 == "alicorn3")
         {
            newLoot("enemy:alicorn1:1",1,Item.L_COMPP,"mdust");
            newLoot("enemy:alicorn1:2",0.1,Item.L_POT,"potMP");
            if(!newLoot("enemy:alicorn1:3",0.3,Item.L_MED,"potm1"))
            {
               newLoot("enemy:alicorn1:4",0.2,Item.L_MED,"potm2");
            }
         }
         else if(param4 == "ranger1" || param4 == "ranger2" || param4 == "ranger3")
         {
            newLoot("enemy:ranger1:1",1,Item.L_ITEM,"frag",Math.floor(Math.random() * 3 + 1));
            newLoot("enemy:ranger1:2",0.5,Item.L_ITEM,"scrap",Math.floor(Math.random() * 3 + 1));
            newLoot("enemy:ranger1:3",1,Item.L_COMPA,"power_comp");
            newLoot("enemy:ranger1:4",0.25,Item.L_AMMO);
         }
         else if(param4 == "encl2" || param4 == "encl3" || param4 == "encl4")
         {
            newLoot("enemy:encl2:1",0.5,Item.L_ITEM,"frag",Math.floor(Math.random() * 3 + 1));
            if(!newLoot("enemy:encl2:2",0.3,Item.L_AMMO,"batt"))
            {
               newLoot("enemy:encl2:3",0.5,Item.L_AMMO,"crystal");
            }
            newLoot("enemy:encl2:4",0.3,Item.L_COMPA,"power_comp");
         }
         else if(param4 == "hellhound1")
         {
            if(param5 > 0)
            {
               newLoot("enemy:hellhound1:1",1,Item.L_COMPW,"kogt");
            }
         }
         else if(param4 == "zombie")
         {
            newLoot("enemy:zombie:1",0.35,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie:2",0.15,Item.L_COMPP,"radslime");
            newLoot("enemy:zombie:3",0.5,Item.L_COMPA,"skin_comp");
         }
         else if(param4 == "zombie4")
         {
            newLoot("enemy:zombie4:1",0.8,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie4:2",1,Item.L_COMPP,"radslime");
         }
         else if(param4 == "zombie5")
         {
            newLoot("enemy:zombie5:1",1,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie5:2",0.3,Item.L_COMPP,"metal_comp");
         }
         else if(param4 == "zombie6")
         {
            newLoot("enemy:zombie6:1",1,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie6:2",0.3,Item.L_COMPA,"battle_comp");
            newLoot("enemy:zombie6:3",0.8,Item.L_COMPP,"acidslime");
         }
         else if(param4 == "zombie7")
         {
            newLoot("enemy:zombie7:1",0.6,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie7:2",0.2,Item.L_COMPP,"pinkslime");
            if(param5 > 0)
            {
               newLoot("enemy:zombie7:3",0.6,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "zombie8")
         {
            newLoot("enemy:zombie8:1",0.6,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie8:2",1,Item.L_COMPP,"pinkslime");
            if(param5 > 0)
            {
               newLoot("enemy:zombie8:3",0.8,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "zombie9")
         {
            newLoot("enemy:zombie9:1",0.6,Item.L_COMPP,"ghoulblood");
            newLoot("enemy:zombie9:2",1,Item.L_COMPP,"whorn");
            if(param5 > 0)
            {
               newLoot("enemy:zombie9:3",1,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "bloodwing")
         {
            newLoot("enemy:bloodwing:1",0.2,Item.L_COMPP,"wingmembrane");
            newLoot("enemy:bloodwing:2",0.16,Item.L_COMPP,"vampfang");
            newLoot("enemy:bloodwing:3",0.25,Item.L_FOOD,"meat");
         }
         else if(param4 == "bloodwing2")
         {
            newLoot("enemy:bloodwing2:1",0.3,Item.L_COMPP,"wingmembrane");
            newLoot("enemy:bloodwing2:2",0.2,Item.L_COMPP,"vampfang");
            newLoot("enemy:bloodwing2:3",0.4,Item.L_COMPP,"pinkslime");
         }
         else if(param4 == "bloat0")
         {
            newLoot("enemy:bloat0:1",0.2,Item.L_COMPP,"bloatwing");
            newLoot("enemy:bloat0:2",0.1,Item.L_COMPP,"bloateye");
         }
         else if(param4 == "bloat1")
         {
            newLoot("enemy:bloat1:1",0.2,Item.L_COMPP,"bloatwing");
            newLoot("enemy:bloat1:2",0.1,Item.L_COMPP,"bloateye");
            newLoot("enemy:bloat1:3",0.2,Item.L_COMPP,"acidslime");
         }
         else if(param4 == "bloat2")
         {
            newLoot("enemy:bloat2:1",0.2,Item.L_COMPP,"bloatwing");
            newLoot("enemy:bloat2:2",0.1,Item.L_COMPP,"bloateye");
            newLoot("enemy:bloat2:3",0.1,Item.L_COMPP,"gland");
         }
         else if(param4 == "bloat3")
         {
            newLoot("enemy:bloat3:1",0.3,Item.L_COMPP,"bloatwing");
            newLoot("enemy:bloat3:2",0.2,Item.L_COMPP,"bloateye");
            newLoot("enemy:bloat3:3",0.1,Item.L_COMPP,"molefat");
         }
         else if(param4 == "bloat4")
         {
            newLoot("enemy:bloat4:1",0.4,Item.L_COMPP,"bloatwing");
            newLoot("enemy:bloat4:2",0.3,Item.L_COMPP,"bloateye");
         }
         else if(param4 == "rat")
         {
            newLoot("enemy:rat:1",0.35,Item.L_COMPP,"ratliver");
            newLoot("enemy:rat:2",0.25,Item.L_COMPP,"rattail");
            newLoot("enemy:rat:3",0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "molerat")
         {
            newLoot("enemy:molerat:1",0.5,Item.L_COMPP,"ratliver");
            newLoot("enemy:molerat:2",1,Item.L_COMPP,"molefat");
            newLoot("enemy:molerat:3",0.25,Item.L_FOOD,"meat");
         }
         else if(param4 == "fish1")
         {
            newLoot("enemy:fish1:1",0.5,Item.L_COMPP,"fishfat");
         }
         else if(param4 == "fish2")
         {
            newLoot("enemy:fish2:1",1,Item.L_COMPP,"fishfat");
         }
         else if(param4 == "ant1")
         {
            newLoot("enemy:ant1:1",0.15,Item.L_COMPA,"chitin_comp");
            newLoot("enemy:ant1:2",0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "ant2")
         {
            newLoot("enemy:ant2:1",0.3,Item.L_COMPA,"chitin_comp");
            newLoot("enemy:ant2:2",0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "ant3")
         {
            newLoot("enemy:ant3:1",0.2,Item.L_COMPA,"chitin_comp");
            newLoot("enemy:ant3:2",1,Item.L_COMPP,"firegland");
            newLoot("enemy:ant3:3",0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "necros")
         {
            newLoot("enemy:necros:1",0.5,Item.L_ITEM,"dsoul");
         }
         else if(param4 == "ebloat")
         {
            newLoot("enemy:ebloat:1",1,Item.L_COMPP,"essence");
         }
         else if(param4 == "turret")
         {
            newLoot("enemy:turret:1",0.5,Item.L_ITEM,"scrap");
            newLoot("enemy:turret:2",0.35,Item.L_COMPW,"frag");
            if(!newLoot("enemy:turret:3",0.2,Item.L_AMMO,"batt"))
            {
               newLoot("enemy:turret:4",0.2,Item.L_AMMO,"energ");
            }
         }
         else if(param4 == "turret1")
         {
            newLoot("enemy:turret1:1",0.5,Item.L_ITEM,"scrap");
            newLoot("enemy:turret1:2",0.5,Item.L_ITEM,"scrap");
            newLoot("enemy:turret1:3",0.85,Item.L_COMPW,"frag");
            newLoot("enemy:turret1:4",0.52,Item.L_COMPA,"magus_comp");
            if(!newLoot("enemy:turret1:5",0.4,Item.L_AMMO,"batt"))
            {
               newLoot("enemy:turret1:6",0.8,Item.L_AMMO,"energ");
            }
         }
         else if(param4 == "robobrain")
         {
            newLoot("enemy:robobrain:1",0.25,Item.L_ITEM,"scrap");
            newLoot("enemy:robobrain:2",0.15,Item.L_COMPW,"frag");
            newLoot("enemy:robobrain:3",0.5,Item.L_COMPM);
            newLoot("enemy:robobrain:4",0.5,Item.L_AMMO,"batt");
            newLoot("enemy:robobrain:5",0.4,Item.L_COMPA,"metal_comp");
            if(param5 > 0)
            {
               newLoot("enemy:robobrain:6",1,Item.L_COMPM,"impgen");
            }
         }
         else if(param4 == "protect")
         {
            newLoot("enemy:protect:1",0.3,Item.L_ITEM,"scrap");
            newLoot("enemy:protect:2",0.25,Item.L_COMPW,"frag");
            newLoot("enemy:protect:3",0.6,Item.L_COMPM);
            newLoot("enemy:protect:4",0.9,Item.L_AMMO,"batt");
            newLoot("enemy:protect:5",0.4,Item.L_COMPA,"metal_comp");
            if(param5 > 0)
            {
               newLoot("enemy:protect:6",1,Item.L_COMPM,"uscan");
            }
         }
         else if(param4 == "gutsy")
         {
            newLoot("enemy:gutsy:1",0.45,Item.L_ITEM,"scrap");
            newLoot("enemy:gutsy:2",0.5,Item.L_COMPW,"frag");
            newLoot("enemy:gutsy:3",0.7,Item.L_COMPM);
            newLoot("enemy:gutsy:4",0.85,Item.L_COMPA,"battle_comp");
            if(!newLoot("enemy:gutsy:5",0.4,Item.L_AMMO,"fuel"))
            {
               newLoot("enemy:gutsy:6",0.75,Item.L_AMMO,"energ");
            }
            if(param5 > 0)
            {
               newLoot("enemy:gutsy:7",1,Item.L_COMPM,"tlaser");
            }
         }
         else if(param4 == "eqd")
         {
            newLoot("enemy:eqd:1",0.45,Item.L_ITEM,"scrap");
            newLoot("enemy:eqd:2",0.5,Item.L_COMPW,"frag");
            newLoot("enemy:eqd:3",0.8,Item.L_COMPM);
            newLoot("enemy:eqd:4",0.85,Item.L_COMPA,"magus_comp");
            newLoot("enemy:eqd:5",1,Item.L_AMMO,"energ");
            newLoot("enemy:eqd:6",0.5,Item.L_ITEM,"data");
            if(param5 > 0)
            {
               newLoot("enemy:eqd:7",1,Item.L_COMPM,"pcrystal");
            }
         }
         else if(param4 == "sentinel")
         {
            newLoot("enemy:sentinel:1",0.85,Item.L_ITEM,"scrap");
            newLoot("enemy:sentinel:2",0.5,Item.L_COMPW,"frag");
            newLoot("enemy:sentinel:3",1,Item.L_COMPM);
            if(!newLoot("enemy:sentinel:4",0.4,Item.L_AMMO,"p5"))
            {
               newLoot("enemy:sentinel:5",1,Item.L_AMMO,"crystal");
            }
            newLoot("enemy:sentinel:6",0.85,Item.L_AMMO,"rocket");
            newLoot("enemy:sentinel:7",0.5,Item.L_COMPW);
            newLoot("enemy:sentinel:8",1,Item.L_COMPM,"motiv");
         }
         else if(param4 == "vortex" || param4 == "spritebot" || param4 == "roller")
         {
            newLoot("enemy:vortex:1",0.2,Item.L_ITEM,"scrap");
         }
         return is_loot > 0;

}
}
