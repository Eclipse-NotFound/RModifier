package
{
   import flash.display.MovieClip;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol104")]
   public class edTile extends MovieClip
   {
      
      public var vis1:MovieClip;
      
      public var vis3:MovieClip;
      
      public var vis4:MovieClip;
      
      public var vis5:MovieClip;
      
      public var tip:int = 0;
      
      public var id:String;
      
      public var ids:Array = ["","","","","",""];
      
      public var frames:Array = [0,0,0,0,0,0];
      
      public var zForm:int = 0;
      
      public var vis2:MovieClip;
      
      public function edTile()
      {
         super();
         cacheAsBitmap = true;
      }
      
      public function upd() : *
      {
         var _loc1_:* = 1;
         while(_loc1_ < this.ids.length)
         {
            this["vis" + _loc1_].gotoAndStop(this.frames[_loc1_] + 1);
            _loc1_++;
         }
         this.vis1.y = this.zForm * 5;
         this.vis1.scaleY = 1 - this.zForm / 4;
      }
      
      public function enc() : String
      {
         var _loc1_:* = this.ids[1];
         if(_loc1_ == "")
         {
            _loc1_ = "_";
         }
         if(this.zForm == 1)
         {
            _loc1_ += ",";
         }
         if(this.zForm == 2)
         {
            _loc1_ += ";";
         }
         if(this.zForm == 3)
         {
            _loc1_ += ":";
         }
         var _loc2_:* = 2;
         while(_loc2_ < this.ids.length)
         {
            if(this.ids[_loc2_] != "")
            {
               _loc1_ += this.ids[_loc2_];
            }
            _loc2_++;
         }
         return _loc1_;
      }
      
      public function pipetka(param1:edTile) : *
      {
         param1.ids = ["","","","","",""];
         param1.frames = [0,0,0,0,0,0];
         if(this.pip(1,param1) || this.pip(3,param1) || this.pip(4,param1) || this.pip(5,param1) || this.pip(2,param1))
         {
            return;
         }
      }
      
      internal function pip(param1:int, param2:edTile) : Boolean
      {
         if(this.ids[param1] != "")
         {
            param2.ids[param1] = this.ids[param1];
            param2.frames[param1] = this.frames[param1];
            return true;
         }
         return false;
      }
      
      public function isPhis() : Boolean
      {
         if(this.ids[1] == "")
         {
            return false;
         }
         return true;
      }
      
      public function dec(param1:String, param2:Array, param3:Array) : *
      {
         var _loc5_:* = undefined;
         var _loc6_:Object = null;
         this.ids = ["","","","","",""];
         this.frames = [0,0,0,0,0,0];
         this.zForm = 0;
         var _loc4_:String = param1.charAt(_loc5_);
         if(_loc4_ == "_")
         {
            _loc4_ = "";
         }
         this.ids[1] = _loc4_;
         this.frames[1] = param2[_loc4_].frame;
         if(param1.length > 1)
         {
            _loc5_ = 1;
            while(_loc5_ < param1.length)
            {
               _loc4_ = param1.charAt(_loc5_);
               if(_loc4_ == ",")
               {
                  this.zForm = 1;
               }
               else if(_loc4_ == ";")
               {
                  this.zForm = 2;
               }
               else if(_loc4_ == ":")
               {
                  this.zForm = 3;
               }
               else
               {
                  _loc6_ = param3[_loc4_];
                  this.ids[_loc6_.tip] = _loc4_;
                  this.frames[_loc6_.tip] = _loc6_.frame;
               }
               _loc5_++;
            }
         }
      }
   }
}

