param(
 [string]$Java = 'D:/Program Files/Adobe Animate 2024/jre/bin/java.exe',
 [string]$Sdk = 'D:/RemainsMod/mods/Sandevistan/build/tools/flexsdk',
 [string]$Source = 'src/LootEditorDoc.as',
 [string]$Output = 'build/out/LootEditorMod.swf'
)
$ErrorActionPreference='Stop'
$project = Split-Path $PSScriptRoot -Parent
Push-Location $project
try {
 New-Item -ItemType Directory -Force -Path (Split-Path $Output) | Out-Null
 $env:AIR_HOME = $Sdk
 $compilerArgs = @("-Dapplication.home=$Sdk",'-Dfile.encoding=UTF-8','-jar',"$Sdk/lib/mxmlc.jar",'+configname=air','-source-path=src','-target-player=32.0','-swf-version=32','-debug=false','-optimize=true',"-output=$Output",$Source)
 & $Java @compilerArgs
 if ($LASTEXITCODE -ne 0) { throw 'AS3 build failed' }
} finally { Pop-Location }
