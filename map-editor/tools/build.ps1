param(
 [string]$Java='D:/Program Files/Adobe Animate 2024/jre/bin/java.exe',
 [string]$Sdk='D:/RemainsMod/mods/Sandevistan/build/tools/flexsdk'
)
$ErrorActionPreference='Stop'
$component=Split-Path $PSScriptRoot -Parent
$buildRoot=Join-Path (Split-Path $component -Parent) 'build/out/map-build'
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
$taskConfig=Join-Path $buildRoot 'compiler.xml'
$swc=Join-Path $Sdk 'frameworks/libs/air/airglobal.swc'
$fonts=Join-Path $Sdk 'frameworks/localFonts.ser'
$native=Join-Path $component 'native'
$nativeXml=[Security.SecurityElement]::Escape($native)
$swcXml=[Security.SecurityElement]::Escape($swc)
$fontsXml=[Security.SecurityElement]::Escape($fonts)
$xml="<flex-config><compiler><source-path><path-element>$nativeXml</path-element></source-path><library-path><path-element>$swcXml</path-element></library-path><fonts><local-fonts-snapshot>$fontsXml</local-fonts-snapshot></fonts><debug>false</debug><optimize>true</optimize></compiler><target-player>32.0</target-player><swf-version>32</swf-version><use-network>false</use-network><static-link-runtime-shared-libraries>true</static-link-runtime-shared-libraries></flex-config>"
[IO.File]::WriteAllText($taskConfig,$xml)
& $Java '-Dfile.encoding=UTF-8' '-jar' (Join-Path $Sdk 'lib/mxmlc.jar') '-load-config' $taskConfig '-theme=' '-output' (Join-Path $component 'component/SceneHost.swf') (Join-Path $native 'SceneHost.as')
if($LASTEXITCODE -ne 0){throw 'SceneHost compilation failed'}
$sources=@{}
Get-ChildItem -LiteralPath $native -Recurse -Filter '*.as' | ForEach-Object { $sources[$_.FullName.Substring($component.Length+1).Replace('\','/')]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower() }
$result=@{sources=$sources; SceneHost=(Get-FileHash -LiteralPath (Join-Path $component 'component/SceneHost.swf') -Algorithm SHA256).Hash.ToLower(); NativeScene=(Get-FileHash -LiteralPath (Join-Path $component 'component/NativeScene.swf') -Algorithm SHA256).Hash.ToLower()}
[IO.File]::WriteAllText((Join-Path $component 'build-manifest.json'),($result | ConvertTo-Json -Depth 4))
