param(
 [string]$Java='D:/Program Files/Adobe Animate 2024/jre/bin/java.exe',
 [string]$FFDec='D:/RemainsMod/mods/Sandevistan/build/tools/ffdec',
 [string]$Python='C:/Users/hello/Documents/_sandevistan_dev/python3/python.exe',
 [switch]$ReuseExports
)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$game=Split-Path (Split-Path $project -Parent) -Parent
$source=Join-Path $game 'pfe.swf'
$expected='b78244657ed407d03808c90e97325509db35f802122835f58933fff8003305ac'
# Baseline is the user's current 1.02 SWF, already containing the manifest ModLoader.
if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Game baseline changed; inspect new game methods before rebuilding this bridge'}
$oldAppData=$env:APPDATA;$oldLocalData=$env:LOCALAPPDATA
Push-Location $project
try{
 New-Item -ItemType Directory -Force -Path 'build/out','build/tool-home' | Out-Null
 $env:APPDATA=(Resolve-Path 'build/tool-home').Path;$env:LOCALAPPDATA=$env:APPDATA
 function FF([string[]]$Options,[string]$Log){
   & $Java '-Xmx3g' '-Dfile.encoding=UTF-8' '-jar' (Join-Path $FFDec 'ffdec-cli.jar') @Options *> $Log
   if($LASTEXITCODE -ne 0){throw "FFDec failed; see $Log"}
 }
 if(!$ReuseExports){
   FF @('-selectclass','MainFE,fe.AllData,fe.serv.LootGen,fe.serv.Interact,fe.unit.Unit','-export','script','build/out/current',$source) 'build/out/export.log'
   FF @('-selectclass','fe.serv.LootGen,fe.serv.Interact,fe.unit.Unit','-format','script:pcode','-export','script','build/out/original-pcode',$source) 'build/out/pcode-export.log'
   & $Python 'tools/patch_bridge.py'
   if($LASTEXITCODE -ne 0){throw 'Bridge source transformation failed'}
   FF @('-importScript',$source,'build/out/pfe-loot.swf','build/out/bridge-scripts') 'build/out/patch.log'
   FF @('-selectclass','fe.serv.LootGen,fe.serv.Interact,fe.unit.Unit','-format','script:pcode','-export','script','build/out/compiled-pcode','build/out/pfe-loot.swf') 'build/out/compiled-pcode.log'
   New-Item -ItemType Directory -Force -Path 'build/out/loot-only/fe/serv' | Out-Null
   Copy-Item -LiteralPath 'build/out/bridge-scripts/fe/serv/LootGen.as' -Destination 'build/out/loot-only/fe/serv/LootGen.as'
   FF @('-importScript',$source,'build/out/pfe-loot-base.swf','build/out/loot-only') 'build/out/loot-only.log'
 }
 # Donor SWF is NEVER installable. Only two method bodies are transplanted from it.
 & $Java '-Xmx3g' '-Dfile.encoding=UTF-8' '-cp' (Join-Path $FFDec 'ffdec.jar') 'tools/PatchMethods.java' 'build/out/pfe-loot-base.swf' $source 'build/out' 'build/out/pfe-loot-safe.swf' *> 'build/out/method-patch.log'
 if($LASTEXITCODE -ne 0){throw 'Method verification failed; see build/out/method-patch.log'}
 Get-Content -LiteralPath 'build/out/method-patch.log'
 if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected){throw 'Live game changed during build; do not install'}
} finally{$env:APPDATA=$oldAppData;$env:LOCALAPPDATA=$oldLocalData;Pop-Location}
