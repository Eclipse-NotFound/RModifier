package {
 import flash.display.Sprite;
 import flash.events.TimerEvent;
 import flash.filesystem.*;
 import flash.system.ApplicationDomain;
 import flash.utils.Timer;
 import map.PoolHash;

 /** Append authored variants to the game's existing pools; never mutate a live Land. */
 public class MapPoolMod extends Sprite {
  public static const VERSION:String="0.1.0";
  private static var instance:MapPoolMod;
  public var mapAPI:Object;
  private var main:Object,world:Object,timer:Timer;
  private var configuration:String="",selections:Object={},installed:Object={},lastGame:Object;
  private var lastError:String="",loaded:Boolean=false;
  public function MapPoolMod(){mapAPI={version:VERSION,status:status,refresh:refresh};}
  public static function init(host:*):void{if(instance)return;instance=new MapPoolMod();instance.name="RModifierMapPools";instance.main=host;host.addChild(instance);instance.timer=new Timer(500);instance.timer.addEventListener(TimerEvent.TIMER,instance.tick);instance.timer.start();instance.log("v"+VERSION+" loaded");}
  private function read(file:File):String{var stream:FileStream=new FileStream();stream.open(file,FileMode.READ);var raw:String=stream.readUTFBytes(stream.bytesAvailable);stream.close();return raw;}
  private function log(message:String):void{try{var file:File=File.applicationStorageDirectory.resolvePath("RModifierMapPools.log"),s:FileStream=new FileStream();s.open(file,FileMode.APPEND);s.writeUTFBytes(new Date().toUTCString()+" "+message+"\n");s.close();}catch(e:*){}}
  private function status():Object{return {version:VERSION,loaded:loaded,error:lastError,pools:installed};}
  private function tick(e:TimerEvent):void{try{refresh();}catch(error:*){var message:String=String(error);if(lastError!=message)log("ERROR "+message);lastError=message;}}
  private function refresh():void{
   var domain:ApplicationDomain=ApplicationDomain.currentDomain;if(!domain.hasDefinition("fe.World"))return;var W:Class=domain.getDefinition("fe.World") as Class;world=W["w"];if(!world||!world.landData)return;
   if(Number(Object(world).constructor.boxDamage)!=0.2){if(!lastError){lastError="仅支持 Remains 1.02";log(lastError);}timer.stop();return;}
   var file:File=File.applicationDirectory.resolvePath("mods/RModifier/config/map-pools.json"),raw:String=file.exists?read(file):"{\"version\":1,\"selections\":{}}",changed:Boolean=raw!=configuration;
   if(changed){var next:Object=JSON.parse(raw);if(next.version!=1||!next.selections)throw new Error("地图设置格式无效");var checked:Object={};
    for(var source:String in next.selections){var s:Object=next.selections[source];if(s.mode!="mix"||!s.file||!/^projects\/maps\/published\/[a-f0-9-]+\/[a-f0-9]{64}\.xml$/.test(s.file))throw new Error("地图副本路径无效");var content:String=read(File.applicationDirectory.resolvePath("mods/RModifier/"+s.file));if(PoolHash.hash(content)!=s.sha256)throw new Error("地图副本内容已变化："+s.name);var xml:XML=new XML(content);if(String(xml.name())!="all"||!xml.room.length())throw new Error("房间池为空");for each(var room:XML in xml.room){if(String(room.@name).indexOf("rm_")!=0)throw new Error("自建房间缺少独立名称");}checked[source]={meta:s,xml:xml};}
    selections=checked;configuration=raw;installed={};loaded=true;lastError="";log("configuration loaded "+count(selections)+" pools");
   }
   // The same World lives across load/new-game. Rebind the new Game before any later regeneration.
   var G:Class=domain.getDefinition("fe.GameData") as Class;
   for each(var land:XML in G["d"].land){var landId:String=String(land.@id);if(!land.@rnd.length())continue;var loader:Object=world.landData[landId];if(!loader||!loader.loaded||!loader.allroom)continue;var sourceFile:String=String(land.@file)+".xml",selection:Object=selections[sourceFile],signature:String=selection?String(selection.meta.sha256):"original";
    if(changed||!installed[landId]||installed[landId].signature!=signature){loader.allroom=merge(loader.allroom,selection?selection.xml:null);installed[landId]={signature:signature,total:loader.allroom.room.length(),added:selection?selection.xml.room.length():0};log("pool "+landId+" added="+installed[landId].added+" total="+installed[landId].total);}
    if(world.game&&world.game.lands[landId]){var act:Object=world.game.lands[landId];if(changed||lastGame!==world.game)act.allroom=merge(act.allroom,selection?selection.xml:null);}
   }
   lastGame=world.game;
  }
  private function count(o:Object):int{var n:int=0;for(var k:String in o)n++;return n;}
  private function merge(current:XML,extra:XML):XML{var value:XML=current.copy();for(var i:int=value.room.length()-1;i>=0;i--)if(String(value.room[i].@name).indexOf("rm_")==0)delete value.room[i];if(extra)for each(var room:XML in extra.room)value.appendChild(room.copy());return value;}
 }
}
