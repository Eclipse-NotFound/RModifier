// RModifier's owned AIR content surface. This adapter never launches or kills AIR.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

class SurfaceHost {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int left, top, right, bottom; }
    [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
    delegate bool EnumProc(IntPtr window, IntPtr arg);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc fn, IntPtr arg);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr window);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong(IntPtr window, int index);
    [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW", SetLastError=true)] static extern IntPtr SetLong(IntPtr window, int index, IntPtr value);
    [DllImport("kernel32.dll")] static extern void SetLastError(uint error);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll", SetLastError=true)] static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr SetFocus(IntPtr window);
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint from, uint to, bool attach);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder text, int length);

    static readonly object gate=new object(), outputGate=new object();
    static readonly JavaScriptSerializer json=new JavaScriptSerializer();
    static IntPtr owner, surface;
    static int ownerPid, airPid, top, bottom;
    static long ownerStart, airStart, originalStyle, originalExStyle;
    static bool wanted, stopping;
    static string lastBounds="";
    static Timer follow;
    static string Text(IntPtr window, bool cls) { var s=new StringBuilder(1024); if(cls)GetClassName(window,s,s.Capacity);else GetWindowText(window,s,s.Capacity);return s.ToString(); }
    static void Write(object value) { lock(outputGate)Console.WriteLine(json.Serialize(value)); }
    static void Set(IntPtr window,int index,long value) {
        SetLastError(0);var result=SetLong(window,index,new IntPtr(value));int error=Marshal.GetLastWin32Error();
        if(result==IntPtr.Zero && error!=0)throw new Exception("Window style update failed: "+error);
    }
    static bool SameProcessWindow(IntPtr window,int pid,long started) {
        uint found;if(!IsWindow(window))return false;GetWindowThreadProcessId(window,out found);
        if(found!=pid)return false;try{using(var process=Process.GetProcessById(pid))return process.StartTime.ToUniversalTime().Ticks==started;}catch{return false;}
    }
    static void Check() {
        if(!SameProcessWindow(owner,ownerPid,ownerStart))throw new Exception("The owner window is gone");
        if(surface!=IntPtr.Zero && !SameProcessWindow(surface,airPid,airStart))throw new Exception("The owned AIR window is gone");
    }
    static void Sync() {
        Check();if(surface==IntPtr.Zero)return;
        bool visible=wanted && IsWindowVisible(owner) && !IsIconic(owner);
        if(!visible){if(IsWindowVisible(surface))ShowWindow(surface,0);return;}
        Rect r;GetClientRect(owner,out r);Point p=new Point();ClientToScreen(owner,ref p);
        int height=r.bottom-r.top-top-bottom;if(height<1||r.right-r.left<1){ShowWindow(surface,0);return;}
        string bounds=p.x+","+(p.y+top)+","+(r.right-r.left)+","+height;
        if(bounds!=lastBounds){
            // No z-order changes while following: never raise over another application.
            if(!SetWindowPos(surface,IntPtr.Zero,p.x,p.y+top,r.right-r.left,height,0x14|0x20|0x4000))throw new Exception("Window layout failed: "+Marshal.GetLastWin32Error());
            lastBounds=bounds;
        }
        if(!IsWindowVisible(surface))ShowWindow(surface,4);
    }
    static object Snapshot() {
        Check();Rect c,r;GetClientRect(owner,out c);GetWindowRect(surface,out r);Point p=new Point();ClientToScreen(owner,ref p);
        long style=GetLong(surface,-16).ToInt64(),ex=GetLong(surface,-20).ToInt64();
        return new {kind="owned-surface",owner=owner.ToInt64(),hwnd=surface.ToInt64(),pid=airPid,ownerMatches=GetParent(surface)==owner,isChild=(style&0x40000000)!=0,isPopup=(style&0x80000000L)!=0,isTopmost=(ex&8)!=0,isToolWindow=(ex&0x80)!=0,visible=IsWindowVisible(surface),wanted,ownerMinimized=IsIconic(owner),dpi=GetDpiForWindow(surface),ownerDpi=GetDpiForWindow(owner),bounds=new{x=r.left-p.x,y=r.top-p.y,width=r.right-r.left,height=r.bottom-r.top},client=new{width=c.right-c.left,height=c.bottom-c.top},title=Text(surface,false)};
    }
    static object Run(Dictionary<string,object> value) {
        string op=(string)value["op"];
        if(op=="attach") {
            if(surface!=IntPtr.Zero)throw new Exception("Surface is already bound");
            airPid=Convert.ToInt32(value["pid"]);var proc=Process.GetProcessById(airPid);airStart=proc.StartTime.ToUniversalTime().Ticks;
            long observed=(airStart-new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc).Ticks)/10000;
            if(Math.Abs(observed-Convert.ToInt64(value["startedAt"]))>10000)throw new Exception("AIR start time does not match this session");
            if(!string.Equals(Path.GetFullPath(proc.MainModule.FileName),Path.GetFullPath((string)value["executable"]),StringComparison.OrdinalIgnoreCase))throw new Exception("Unexpected AIR executable");
            string token=(string)value["titleToken"];var windows=new List<IntPtr>();
            EnumWindows((w,a)=>{uint pid;GetWindowThreadProcessId(w,out pid);if(pid==airPid&&Text(w,true)=="ApolloRuntimeContentWindow"&&Text(w,false)==token)windows.Add(w);return true;},IntPtr.Zero);
            if(windows.Count!=1)throw new Exception("Expected one ready window from this AIR session");
            surface=windows[0];Check();originalStyle=GetLong(surface,-16).ToInt64();originalExStyle=GetLong(surface,-20).ToInt64();
            ShowWindow(surface,0);
            Set(surface,-16,(originalStyle&~0x40CF0000L)|0x80000000L|0x04000000);
            Set(surface,-20,(originalExStyle&~0x40308L)|0x80);
            Set(surface,-8,owner.ToInt64());if(GetParent(surface)!=owner)throw new Exception("AIR ownership could not be set");
            wanted=false;return Snapshot();
        }
        if(op=="detach") {
            wanted=false;if(surface!=IntPtr.Zero&&SameProcessWindow(surface,airPid,airStart)){ShowWindow(surface,0);Set(surface,-8,0);Set(surface,-16,originalStyle&~0x10000000L);Set(surface,-20,originalExStyle);}
            surface=IntPtr.Zero;stopping=true;return new{detached=true};
        }
        Check();if(surface==IntPtr.Zero)throw new Exception("No AIR surface is bound");
        if(op=="layout") {top=Convert.ToInt32(value["top"]);bottom=Convert.ToInt32(value["bottom"]);if(top<0||bottom<0||top>10000||bottom>10000)throw new Exception("Invalid content bounds");lastBounds="";Sync();}
        else if(op=="visible") {wanted=Convert.ToBoolean(value["visible"]);Sync();}
        else if(op=="focus") {
            Sync();IntPtr foreground=GetForegroundWindow();uint foregroundPid;GetWindowThreadProcessId(foreground,out foregroundPid);
            if(wanted&&IsWindowVisible(surface)&&(foregroundPid==ownerPid||foregroundPid==airPid)){
                SetForegroundWindow(surface);uint ignored;uint target=GetWindowThreadProcessId(surface,out ignored),current=GetCurrentThreadId();bool joined=AttachThreadInput(current,target,true);try{SetFocus(surface);}finally{if(joined)AttachThreadInput(current,target,false);}
            }
        }
        else if(op!="inspect")throw new Exception("Unknown surface operation");
        return Snapshot();
    }
    static void Main(string[] args) {
        owner=new IntPtr(long.Parse(args[0]));ownerPid=int.Parse(args[1]);ownerStart=Process.GetProcessById(ownerPid).StartTime.ToUniversalTime().Ticks;SetThreadDpiAwarenessContext(new IntPtr(-4));
        follow=new Timer(_=>{lock(gate){if(stopping||surface==IntPtr.Zero)return;try{SetThreadDpiAwarenessContext(new IntPtr(-4));Sync();}catch(Exception e){wanted=false;if(SameProcessWindow(surface,airPid,airStart))ShowWindow(surface,0);Write(new{eventName="surface-error",message=e.Message});stopping=true;}}},null,16,16);
        string line;while((line=Console.ReadLine())!=null){object id=null;try{if(line.Length>16000)throw new Exception("Surface request too large");var command=json.Deserialize<Dictionary<string,object>>(line);id=command["id"];object result;lock(gate)result=Run(command);Write(new{id,ok=true,result});if(stopping)break;}catch(Exception e){Write(new{id,ok=false,error=e.Message});}}
        follow.Dispose();lock(gate){if(surface!=IntPtr.Zero&&SameProcessWindow(surface,airPid,airStart))ShowWindow(surface,0);}
    }
}
