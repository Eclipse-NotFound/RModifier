import java.lang.reflect.*;
class Reflect {
 public static void main(String[] args)throws Exception {
  for(String name:args){Class<?> c=Class.forName(name);System.out.println("CLASS "+name);
   for(Constructor<?> v:c.getConstructors())System.out.println(v);
   for(Field v:c.getFields())System.out.println(v);
   for(Method v:c.getDeclaredMethods())if(Modifier.isPublic(v.getModifiers()))System.out.println(v);
  }
 }
}
