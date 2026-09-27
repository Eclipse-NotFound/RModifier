import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.abc.*;
import com.jpexs.decompiler.flash.abc.types.*;
import com.jpexs.decompiler.flash.abc.types.traits.*;
import com.jpexs.decompiler.flash.abc.avm2.parser.pcode.ASM3Parser;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.security.MessageDigest;

class PatchMethods {
 static String assembly(Path file,String method)throws Exception {
  String text=Files.readString(file);int anchor=text.indexOf("function "+method+"(");
  if(anchor<0)throw new Exception("Missing method "+method);
  int start=text.indexOf("trait method ",anchor);int end=text.indexOf("end ; method",start)+12;
  if(start<0||end<12)throw new Exception("Missing assembly "+method);
  return text.substring(start,end).replaceAll("(?m)^\\s+","");
 }
 static ScriptPack pack(SWF swf,String name)throws Exception {
  for(ScriptPack p:swf.getAS3Packs())if(p.getClassPath().toString().equals(name))return p;
  throw new Exception("Missing class "+name);
 }
 static Map<String,TraitMethodGetterSetter> methods(ScriptPack p){
  ABC abc=p.abc;int ci=abc.findClassByName(p.getClassPath().toString());
  Map<String,TraitMethodGetterSetter> map=new LinkedHashMap<>();
  for(Traits ts:List.of(abc.instance_info.get(ci).instance_traits,abc.class_info.get(ci).static_traits))for(Trait t:ts.traits)if(t instanceof TraitMethodGetterSetter){
   String n=abc.constants.getString(abc.constants.getMultiname(t.name_index).name_index);map.put(n,(TraitMethodGetterSetter)t);
  }return map;
 }
 static void apply(SWF swf,String cls,String name,String code)throws Exception {
  ScriptPack p=pack(swf,cls);TraitMethodGetterSetter trait=methods(p).get(name);if(trait==null)throw new Exception("No method "+cls+"."+name);
  MethodBody body=p.abc.findBody(trait.method_info);
  body.setCode(ASM3Parser.parse(p.abc,new StringReader(code),trait,body,p.abc.method_info.get(trait.method_info)));
  ((com.jpexs.decompiler.flash.tags.Tag)p.abc.parentTag).setModified(true);System.out.println("Patched body "+cls+"."+name);
 }
 static byte[] code(ABC abc,int index){MethodBody b=abc.findBody(index);return b==null?null:b.getCodeBytes();}
 static byte[] bytes(ScriptPack p,TraitMethodGetterSetter t){if(t==null)throw new IllegalArgumentException("Method disappeared");return code(p.abc,t.method_info);}
 public static void main(String[] args){try{run(args);}catch(Throwable e){e.printStackTrace();System.exit(1);}}
 static void run(String[] args)throws Exception {
  SWF swf=new SWF(new FileInputStream(args[0]),false);SWF original=new SWF(new FileInputStream(args[1]),false);
  Path base=Path.of(args[2]);
  apply(swf,"fe.unit.Unit","die",assembly(base.resolve("compiled-pcode/scripts/fe/unit/Unit.pcode"),"die"));
  apply(swf,"fe.serv.Interact","loot",assembly(base.resolve("compiled-pcode/scripts/fe/serv/Interact.pcode"),"loot"));
  Path originalLoot=base.resolve("original-pcode/scripts/fe/serv/LootGen.pcode");
  var nsPattern=java.util.regex.Pattern.compile("(PrivateNamespace\\([^)]*\\)),\\\"lootBroken\\\"");
  var nsMatch=nsPattern.matcher(Files.readString(originalLoot));
  if(!nsMatch.find())throw new Exception("Missing original private namespace anchor");
  String originalPrivate=nsMatch.group(1);
  for(String m:List.of("init","getRandom","lootId","replic"))apply(swf,"fe.serv.LootGen",m,assembly(originalLoot,m).replace(originalPrivate,"PrivateNamespace(\"fe.serv:LootGen\")"));
  // Every other class keeps its named methods and static/instance initializer bytecode.
  int kept=0;
  Map<String,ScriptPack> outputPacks=new HashMap<>();for(ScriptPack p:swf.getAS3Packs())outputPacks.put(p.getClassPath().toString(),p);
  for(ScriptPack a:original.getAS3Packs()){
   String cls=a.getClassPath().toString();if(cls.equals("fe.serv.LootGen"))continue;
   ScriptPack b=outputPacks.get(cls);if(b==null)throw new Exception("Class disappeared: "+cls);
   int ai=a.abc.findClassByName(cls),bi=b.abc.findClassByName(cls);if(ai<0||bi<0)continue;
   Map<String,TraitMethodGetterSetter> after=methods(b);
   for(var entry:methods(a).entrySet()){
    if(cls.equals("fe.unit.Unit")&&entry.getKey().equals("die")||cls.equals("fe.serv.Interact")&&entry.getKey().equals("loot"))continue;
    if(!Arrays.equals(bytes(a,entry.getValue()),bytes(b,after.get(entry.getKey()))))throw new Exception("Unrelated bytecode changed: "+cls+"."+entry.getKey());kept++;
   }
   for(int[] pair:List.of(new int[]{a.abc.instance_info.get(ai).iinit_index,b.abc.instance_info.get(bi).iinit_index},new int[]{a.abc.class_info.get(ai).cinit_index,b.abc.class_info.get(bi).cinit_index})){
    if(!Arrays.equals(code(a.abc,pair[0]),code(b.abc,pair[1])))throw new Exception("Initializer changed: "+cls);kept++;
   }
  }
  try(OutputStream out=new FileOutputStream(args[3])){swf.saveTo(out);}
  System.out.println("PRESERVED "+kept+" unrelated method bodies byte-for-byte; output "+args[3]);
  System.exit(0);
 }
}
