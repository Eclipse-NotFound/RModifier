// Generated from local Remains 1.02 LootGen. Never accepts user code.
export function vanillaTable(kind, key, env, emit, random) {
const Math = Object.create(globalThis.Math); Math.random = random;
const Item = {"L_ITEM": "item", "L_ARMOR": "armor", "L_WEAPON": "weapon", "L_UNIQ": "uniq", "L_SPELL": "spell", "L_AMMO": "a", "L_EXPL": "e", "L_MED": "med", "L_BOOK": "book", "L_HIM": "him", "L_POT": "pot", "L_FOOD": "food", "L_SCHEME": "scheme", "L_PAINT": "paint", "L_COMPA": "compa", "L_COMPW": "compw", "L_COMPE": "compe", "L_COMPM": "compm", "L_COMPP": "compp", "L_SPEC": "spec", "L_INSTR": "instr", "L_STUFF": "stuff", "L_ART": "art", "L_IMPL": "impl", "L_KEY": "key"};
const World = {w:env.world}, loc = env.loc, nx=0, ny=0;
const param1=loc, param2=0, param3=0, param4=key, param5=env.hero||0, param6=env.bonus??50;
let lootBroken=!!env.broken, is_loot=0;
const replic=()=>{};
const newLoot=(...args)=>{ const ok=emit(...args); if(ok) is_loot++; return ok; };
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
            newLoot(0.7,Item.L_AMMO);
            newLoot(0.25,Item.L_AMMO);
            newLoot(0.15,Item.L_AMMO);
            if(World.w.pers.freel)
            {
               newLoot(0.7,Item.L_AMMO);
            }
         }
         else if(param4 == "metal")
         {
            if(!newLoot(0.5,Item.L_ITEM,"money",Math.random() * 30 * (_loc7_ * 0.15 + 1) + 5))
            {
               newLoot(1,Item.L_AMMO);
            }
         }
         else if(param4 == "bomb")
         {
            _loc8_ = 3;
            _loc9_ = 0;
            while(_loc9_ < _loc8_)
            {
               newLoot(1,Item.L_EXPL,"dinamit");
               _loc9_++;
            }
         }
         else if(param4 == "expl")
         {
            _loc8_ = Math.floor(Math.random() * 4 - 1);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot(1,Item.L_EXPL);
               _loc9_++;
            }
            newLoot(0.5,Item.L_COMPE);
            if(World.w.pers.freel)
            {
               newLoot(0.5,Item.L_EXPL);
            }
         }
         else if(param4 == "bigexpl")
         {
            _loc8_ = Math.floor(Math.random() * 4 + 2);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot(1,Item.L_EXPL);
               _loc9_++;
            }
            if(World.w.pers.freel)
            {
               newLoot(0.5,Item.L_EXPL);
            }
            newLoot(0.5,Item.L_COMPE);
         }
         else if(param4 == "wbattle")
         {
            if(!newLoot(0.04,Item.L_UNIQ))
            {
               if(Math.random() < Math.min(_loc7_ / 5,0.7))
               {
                  newLoot(1,Item.L_WEAPON,"4",1);
               }
               else
               {
                  newLoot(1,Item.L_WEAPON,"3",1);
               }
            }
            newLoot(0.8,Item.L_AMMO);
            if(World.w.pers.freel)
            {
               newLoot(0.5,Item.L_AMMO);
            }
            newLoot(0.1,Item.L_ITEM,"stealth");
            if(World.w.pers.barahlo)
            {
               newLoot(0.1,Item.L_COMPA,"intel_comp");
            }
         }
         else if(param4 == "case")
         {
            newLoot(0.9,Item.L_ITEM,"money",Math.random() * 20 * (_loc7_ * 0.11 + 1) + 5);
         }
         else if(param4 == "wbig")
         {
            if(!newLoot(0.08,Item.L_UNIQ))
            {
               if(Math.random() < 0.5)
               {
                  newLoot(1,Item.L_WEAPON,"5",1);
               }
               else
               {
                  newLoot(1,Item.L_WEAPON,"4",1);
               }
            }
            newLoot(0.5,Item.L_EXPL,"",Math.floor(Math.random() * 4));
            newLoot(0.5,Item.L_AMMO,"",Math.floor(Math.random() * 4));
            if(World.w.pers.freel)
            {
               newLoot(0.5,Item.L_AMMO);
            }
            if(World.w.pers.barahlo)
            {
               newLoot(0.5,Item.L_COMPA,"intel_comp");
            }
         }
         else if(param4 == "robocell")
         {
            newLoot(1,Item.L_COMPM);
         }
         else if(param4 == "instr")
         {
            newLoot(0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            if(!newLoot(0.35,Item.L_WEAPON,"2",1))
            {
               newLoot(0.5,Item.L_ITEM,"rep");
            }
            newLoot(0.85,Item.L_COMPA);
            newLoot(0.7,Item.L_COMPW);
            newLoot(0.1,Item.L_COMPE);
            newLoot(0.5,Item.L_COMPM);
            newLoot(0.5,Item.L_PAINT);
            if(World.w.pers.barahlo)
            {
               newLoot(0.85,Item.L_COMPA);
               newLoot(0.7,Item.L_COMPW);
               newLoot(0.1,Item.L_COMPE);
               newLoot(0.1,Item.L_COMPE);
               newLoot(0.5,Item.L_COMPA);
            }
         }
         else if(param4 == "instr2")
         {
            newLoot(0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            if(!newLoot(0.35,Item.L_WEAPON,"2",1))
            {
               newLoot(0.5,Item.L_ITEM,"rep");
            }
            newLoot(0.75,Item.L_COMPA);
            newLoot(0.4,Item.L_COMPW);
            newLoot(0.5,Item.L_COMPM);
            newLoot(0.2,Item.L_PAINT);
            if(World.w.pers.barahlo)
            {
               newLoot(0.75,Item.L_COMPA);
               newLoot(0.4,Item.L_COMPW);
               newLoot(0.1,Item.L_COMPE);
               newLoot(0.5,Item.L_COMPA);
            }
         }
         else if(param4 == "trash")
         {
            if(loc.land.act.biom == 0)
            {
               newLoot(0.25,Item.L_FOOD,"radcookie");
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
                  newLoot(1,Item.L_STUFF);
                  _loc9_++;
               }
               newLoot(0.4,Item.L_ITEM,"money",Math.random() * 10 * (_loc7_ * 0.1 + 1) + 5);
            }
         }
         else if(param4 == "fridge")
         {
            newLoot(0.5,Item.L_FOOD,"sparklecola");
            newLoot(0.5,Item.L_FOOD,"sars");
            newLoot(0.1,Item.L_FOOD,"radcola");
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
                  newLoot(1,Item.L_FOOD);
                  _loc9_++;
               }
               newLoot(0.3,Item.L_COMPP,"herbs",Math.floor(Math.random() * 6 + 1));
            }
         }
         else if(param4 == "food")
         {
            if(loc.land.act.biom == 0)
            {
               newLoot(0.25,Item.L_FOOD,"radcookie");
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
               newLoot(0.8,Item.L_FOOD);
               newLoot(0.5,Item.L_STUFF);
               newLoot(0.2,Item.L_COMPP,"herbs",Math.floor(Math.random() * 6 + 1));
               newLoot(0.05,"co");
            }
         }
         else if(param4 == "med")
         {
            newLoot(0.05,Item.L_ITEM,"pin",Math.floor(Math.random() * 2 + 1));
            _loc8_ = Math.floor(Math.random() * 3 - 1);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot(1,Item.L_MED);
               _loc9_++;
            }
            newLoot(0.25,Item.L_HIM);
            newLoot(0.03,Item.L_MED,"firstaid");
            newLoot(0.05,Item.L_POT,"potHP");
            newLoot(0.25,Item.L_ITEM,"gel");
         }
         else if(param4 == "med2")
         {
            newLoot(0.75,Item.L_POT,"potHP");
            _loc8_ = Math.floor(Math.random() * 3);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot(1,Item.L_MED);
               _loc9_++;
            }
            newLoot(1,Item.L_HIM);
            newLoot(0.5,Item.L_MED,"firstaid");
            newLoot(0.5,Item.L_MED,"doctor");
            newLoot(0.5,Item.L_MED,"surgeon");
            newLoot(0.8,Item.L_ITEM,"gel");
         }
         else if(param4 == "table")
         {
            newLoot(0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            if(!newLoot(0.08,Item.L_BOOK))
            {
               newLoot(0.5,Item.L_ITEM,"money",Math.random() * 50 + 5 + 3 * _loc7_);
            }
            newLoot(0.1,Item.L_FOOD);
            newLoot(0.13,Item.L_WEAPON,"3");
            newLoot(0.3,Item.L_AMMO);
            newLoot(0.1,Item.L_ITEM,"dart");
            newLoot(0.1,Item.L_ITEM,"app");
            newLoot(0.04,Item.L_SCHEME);
            newLoot(0.25,Item.L_FOOD);
            newLoot(0.08,"co");
            newLoot(0.1,Item.L_MED,"potm1");
         }
         else if(param4 == "filecab")
         {
            newLoot(0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            newLoot(0.5,Item.L_ITEM,"money",Math.random() * 20);
            newLoot(0.1,Item.L_ITEM,"app");
            newLoot(0.02,Item.L_SCHEME);
            newLoot(0.08,"co");
         }
         else if(param4 == "cup")
         {
            newLoot(0.06,Item.L_ITEM,"pin",Math.floor(Math.random() * 3 + 1));
            newLoot(0.3,Item.L_ITEM,"money",Math.random() * 20);
            newLoot(0.25,Item.L_COMPA);
            newLoot(0.75,Item.L_STUFF);
            newLoot(0.2,Item.L_COMPA,"kombu_comp");
            newLoot(0.2,Item.L_COMPA,"antirad_comp");
            newLoot(0.2,Item.L_COMPA,"antihim_comp");
         }
         else if(param4 == "bloat")
         {
            loc.createUnit("bloat",nx,ny,true);
         }
         else if(param4 == "book")
         {
            if(!newLoot(0.3,Item.L_BOOK))
            {
               newLoot(1,Item.L_ITEM,"lbook");
            }
            newLoot(0.1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
            newLoot(0.25,Item.L_SCHEME);
            newLoot(0.3,"co");
            if(param1.itemsTip == "bibl")
            {
               newLoot(0.5,Item.L_ITEM,"book_cm");
            }
         }
         else if(param4 == "term" || param4 == "info")
         {
            if(param1.land.act.id == "minst")
            {
               newLoot(1,Item.L_ITEM,"datast");
            }
            else if(!newLoot(0.25,Item.L_ITEM,"disc"))
            {
               newLoot(1,Item.L_ITEM,"data");
            }
            newLoot(0.5,Item.L_COMPM);
         }
         else if(param4 == "cryo")
         {
            _loc8_ = Math.floor(Math.random() * 3);
            _loc9_ = 0;
            while(_loc9_ <= _loc8_)
            {
               newLoot(1,Item.L_ITEM,"pcryo");
               _loc9_++;
            }
            newLoot(0.5,Item.L_ITEM,"gel");
         }
         else if(param4 == "chest")
         {
            newLoot(0.1,Item.L_ITEM,"pin",Math.floor(Math.random() * 5 + 1));
            newLoot(0.2,Item.L_WEAPON,"3",2);
            newLoot(0.2,Item.L_ITEM,"bit",Math.random() * 50 + 7 * _loc7_ + 2);
            newLoot(0.3,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
            newLoot(0.25,Item.L_COMPA);
            newLoot(0.03,Item.L_BOOK);
            newLoot(0.5,Item.L_AMMO);
            newLoot(0.03,Item.L_SCHEME);
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
               newLoot(param6 / 100,Item.L_UNIQ);
               newLoot(0.1 + param6 / 100,Item.L_ITEM,"sphera");
               newLoot(0.2 + param6 / 200,Item.L_ITEM,"stealth");
               newLoot(0.25 + param6 / 100,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
               newLoot(0.2,Item.L_MED);
               newLoot(0.25,Item.L_ITEM,"retr");
               newLoot(0.1,Item.L_ITEM,"runa");
               newLoot(0.1,Item.L_ITEM,"reboot");
               newLoot(0.2 + param6 / 100,Item.L_BOOK);
               newLoot(0.1 + param6 / 100,Item.L_COMPP);
               newLoot(1,Item.L_ITEM,"bit",Math.random() * (param6 + 10) * 8 + 2 + 4 * _loc7_);
               newLoot(0.1 + param6 / 300,Item.L_SCHEME);
               newLoot(0.25,Item.L_POT,"potMP");
               newLoot(0.1,Item.L_POT,"potHP");
               if(!newLoot(0.4,Item.L_MED,"potm2"))
               {
                  newLoot(0.3,Item.L_MED,"potm3");
               }
               if(is_loot == 0)
               {
                  newLoot(1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
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
               newLoot(1,Item.L_WEAPON,_loc10_[Math.floor(Math.random() * _loc10_.length)]);
            }
            else
            {
               newLoot(1,Item.L_UNIQ);
            }
         }
         else if(param4 == "specalc")
         {
            newLoot(1,Item.L_SPEC,"alc7");
            newLoot(1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
         }
         else if(param4 == "speclp")
         {
            newLoot(1,Item.L_SPEC,"lp_item");
            newLoot(1,Item.L_ITEM,"gem" + Math.floor(Math.random() * 3 + 1));
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
            newLoot(1,Item.L_COMPA,"chitin_comp");
            newLoot(0.25,Item.L_COMPP,"gland");
            newLoot(0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "slime")
         {
            newLoot(0.75,Item.L_ITEM,"acidslime");
         }
         else if(param4 == "pinkslime")
         {
            newLoot(0.75,Item.L_ITEM,"pinkslime");
         }
         else if(param4 == "raider")
         {
            newLoot(0.25,"eda");
            newLoot(0.25,Item.L_AMMO);
            newLoot(0.12,Item.L_EXPL);
         }
         else if(param4 == "alicorn1" || param4 == "alicorn2" || param4 == "alicorn3")
         {
            newLoot(1,Item.L_COMPP,"mdust");
            newLoot(0.1,Item.L_POT,"potMP");
            if(!newLoot(0.3,Item.L_MED,"potm1"))
            {
               newLoot(0.2,Item.L_MED,"potm2");
            }
         }
         else if(param4 == "ranger1" || param4 == "ranger2" || param4 == "ranger3")
         {
            newLoot(1,Item.L_ITEM,"frag",Math.floor(Math.random() * 3 + 1));
            newLoot(0.5,Item.L_ITEM,"scrap",Math.floor(Math.random() * 3 + 1));
            newLoot(1,Item.L_COMPA,"power_comp");
            newLoot(0.25,Item.L_AMMO);
         }
         else if(param4 == "encl2" || param4 == "encl3" || param4 == "encl4")
         {
            newLoot(0.5,Item.L_ITEM,"frag",Math.floor(Math.random() * 3 + 1));
            if(!newLoot(0.3,Item.L_AMMO,"batt"))
            {
               newLoot(0.5,Item.L_AMMO,"crystal");
            }
            newLoot(0.3,Item.L_COMPA,"power_comp");
         }
         else if(param4 == "hellhound1")
         {
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPW,"kogt");
            }
         }
         else if(param4 == "zombie")
         {
            newLoot(0.35,Item.L_COMPP,"ghoulblood");
            newLoot(0.15,Item.L_COMPP,"radslime");
            newLoot(0.5,Item.L_COMPA,"skin_comp");
         }
         else if(param4 == "zombie4")
         {
            newLoot(0.8,Item.L_COMPP,"ghoulblood");
            newLoot(1,Item.L_COMPP,"radslime");
         }
         else if(param4 == "zombie5")
         {
            newLoot(1,Item.L_COMPP,"ghoulblood");
            newLoot(0.3,Item.L_COMPP,"metal_comp");
         }
         else if(param4 == "zombie6")
         {
            newLoot(1,Item.L_COMPP,"ghoulblood");
            newLoot(0.3,Item.L_COMPA,"battle_comp");
            newLoot(0.8,Item.L_COMPP,"acidslime");
         }
         else if(param4 == "zombie7")
         {
            newLoot(0.6,Item.L_COMPP,"ghoulblood");
            newLoot(0.2,Item.L_COMPP,"pinkslime");
            if(param5 > 0)
            {
               newLoot(0.6,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "zombie8")
         {
            newLoot(0.6,Item.L_COMPP,"ghoulblood");
            newLoot(1,Item.L_COMPP,"pinkslime");
            if(param5 > 0)
            {
               newLoot(0.8,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "zombie9")
         {
            newLoot(0.6,Item.L_COMPP,"ghoulblood");
            newLoot(1,Item.L_COMPP,"whorn");
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPM,"darkfrag");
            }
         }
         else if(param4 == "bloodwing")
         {
            newLoot(0.2,Item.L_COMPP,"wingmembrane");
            newLoot(0.16,Item.L_COMPP,"vampfang");
            newLoot(0.25,Item.L_FOOD,"meat");
         }
         else if(param4 == "bloodwing2")
         {
            newLoot(0.3,Item.L_COMPP,"wingmembrane");
            newLoot(0.2,Item.L_COMPP,"vampfang");
            newLoot(0.4,Item.L_COMPP,"pinkslime");
         }
         else if(param4 == "bloat0")
         {
            newLoot(0.2,Item.L_COMPP,"bloatwing");
            newLoot(0.1,Item.L_COMPP,"bloateye");
         }
         else if(param4 == "bloat1")
         {
            newLoot(0.2,Item.L_COMPP,"bloatwing");
            newLoot(0.1,Item.L_COMPP,"bloateye");
            newLoot(0.2,Item.L_COMPP,"acidslime");
         }
         else if(param4 == "bloat2")
         {
            newLoot(0.2,Item.L_COMPP,"bloatwing");
            newLoot(0.1,Item.L_COMPP,"bloateye");
            newLoot(0.1,Item.L_COMPP,"gland");
         }
         else if(param4 == "bloat3")
         {
            newLoot(0.3,Item.L_COMPP,"bloatwing");
            newLoot(0.2,Item.L_COMPP,"bloateye");
            newLoot(0.1,Item.L_COMPP,"molefat");
         }
         else if(param4 == "bloat4")
         {
            newLoot(0.4,Item.L_COMPP,"bloatwing");
            newLoot(0.3,Item.L_COMPP,"bloateye");
         }
         else if(param4 == "rat")
         {
            newLoot(0.35,Item.L_COMPP,"ratliver");
            newLoot(0.25,Item.L_COMPP,"rattail");
            newLoot(0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "molerat")
         {
            newLoot(0.5,Item.L_COMPP,"ratliver");
            newLoot(1,Item.L_COMPP,"molefat");
            newLoot(0.25,Item.L_FOOD,"meat");
         }
         else if(param4 == "fish1")
         {
            newLoot(0.5,Item.L_COMPP,"fishfat");
         }
         else if(param4 == "fish2")
         {
            newLoot(1,Item.L_COMPP,"fishfat");
         }
         else if(param4 == "ant1")
         {
            newLoot(0.15,Item.L_COMPA,"chitin_comp");
            newLoot(0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "ant2")
         {
            newLoot(0.3,Item.L_COMPA,"chitin_comp");
            newLoot(0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "ant3")
         {
            newLoot(0.2,Item.L_COMPA,"chitin_comp");
            newLoot(1,Item.L_COMPP,"firegland");
            newLoot(0.1,Item.L_FOOD,"meat");
         }
         else if(param4 == "necros")
         {
            newLoot(0.5,Item.L_ITEM,"dsoul");
         }
         else if(param4 == "ebloat")
         {
            newLoot(1,Item.L_COMPP,"essence");
         }
         else if(param4 == "turret")
         {
            newLoot(0.5,Item.L_ITEM,"scrap");
            newLoot(0.35,Item.L_COMPW,"frag");
            if(!newLoot(0.2,Item.L_AMMO,"batt"))
            {
               newLoot(0.2,Item.L_AMMO,"energ");
            }
         }
         else if(param4 == "turret1")
         {
            newLoot(0.5,Item.L_ITEM,"scrap");
            newLoot(0.5,Item.L_ITEM,"scrap");
            newLoot(0.85,Item.L_COMPW,"frag");
            newLoot(0.52,Item.L_COMPA,"magus_comp");
            if(!newLoot(0.4,Item.L_AMMO,"batt"))
            {
               newLoot(0.8,Item.L_AMMO,"energ");
            }
         }
         else if(param4 == "robobrain")
         {
            newLoot(0.25,Item.L_ITEM,"scrap");
            newLoot(0.15,Item.L_COMPW,"frag");
            newLoot(0.5,Item.L_COMPM);
            newLoot(0.5,Item.L_AMMO,"batt");
            newLoot(0.4,Item.L_COMPA,"metal_comp");
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPM,"impgen");
            }
         }
         else if(param4 == "protect")
         {
            newLoot(0.3,Item.L_ITEM,"scrap");
            newLoot(0.25,Item.L_COMPW,"frag");
            newLoot(0.6,Item.L_COMPM);
            newLoot(0.9,Item.L_AMMO,"batt");
            newLoot(0.4,Item.L_COMPA,"metal_comp");
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPM,"uscan");
            }
         }
         else if(param4 == "gutsy")
         {
            newLoot(0.45,Item.L_ITEM,"scrap");
            newLoot(0.5,Item.L_COMPW,"frag");
            newLoot(0.7,Item.L_COMPM);
            newLoot(0.85,Item.L_COMPA,"battle_comp");
            if(!newLoot(0.4,Item.L_AMMO,"fuel"))
            {
               newLoot(0.75,Item.L_AMMO,"energ");
            }
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPM,"tlaser");
            }
         }
         else if(param4 == "eqd")
         {
            newLoot(0.45,Item.L_ITEM,"scrap");
            newLoot(0.5,Item.L_COMPW,"frag");
            newLoot(0.8,Item.L_COMPM);
            newLoot(0.85,Item.L_COMPA,"magus_comp");
            newLoot(1,Item.L_AMMO,"energ");
            newLoot(0.5,Item.L_ITEM,"data");
            if(param5 > 0)
            {
               newLoot(1,Item.L_COMPM,"pcrystal");
            }
         }
         else if(param4 == "sentinel")
         {
            newLoot(0.85,Item.L_ITEM,"scrap");
            newLoot(0.5,Item.L_COMPW,"frag");
            newLoot(1,Item.L_COMPM);
            if(!newLoot(0.4,Item.L_AMMO,"p5"))
            {
               newLoot(1,Item.L_AMMO,"crystal");
            }
            newLoot(0.85,Item.L_AMMO,"rocket");
            newLoot(0.5,Item.L_COMPW);
            newLoot(1,Item.L_COMPM,"motiv");
         }
         else if(param4 == "vortex" || param4 == "spritebot" || param4 == "roller")
         {
            newLoot(0.2,Item.L_ITEM,"scrap");
         }
         return is_loot > 0;

}
}
