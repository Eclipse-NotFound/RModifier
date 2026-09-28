param(
 [string]$Java='D:/Program Files/Adobe Animate 2024/jre/bin/java.exe',
 [string]$Sdk='D:/RemainsMod/mods/Sandevistan/build/tools/flexsdk',
 [string]$FFDec='D:/RemainsMod/mods/Sandevistan/build/tools/ffdec/ffdec-cli.jar',
 [string]$Python='C:/Users/hello/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
)
$ErrorActionPreference='Stop'
$project=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$game=Split-Path (Split-Path $project -Parent) -Parent
$build=Join-Path $project 'build/out/map-native-ui-build'
$source=Join-Path $project 'map-editor/native-ui'
$target=Join-Path $source 'component'
New-Item -ItemType Directory -Path $target -Force | Out-Null
& $Python (Join-Path $PSScriptRoot 'prepare-native-ui.py')
if($LASTEXITCODE -ne 0){throw 'Source preparation failed'}
& $Java '-Dfile.encoding=UTF-8' '-jar' $FFDec '-importScript' (Join-Path $game 'Editor.swf') (Join-Path $target 'Editor.swf') (Join-Path $build 'scripts')
if($LASTEXITCODE -ne 0){throw 'Editor candidate compilation failed'}
foreach($entry in @(@{Name='NativeUIBootstrap'; Source=$source},@{Name='EditorTools';Source=(Join-Path $build 'tools')})){
 $cfg=Join-Path $build ($entry.Name+'.xml')
 $srcXml=[Security.SecurityElement]::Escape($entry.Source)
 $swcXml=[Security.SecurityElement]::Escape((Join-Path $Sdk 'frameworks/libs/air/airglobal.swc'))
 $fontsXml=[Security.SecurityElement]::Escape((Join-Path $Sdk 'frameworks/localFonts.ser'))
 [IO.File]::WriteAllText($cfg,"<flex-config><compiler><source-path><path-element>$srcXml</path-element></source-path><library-path><path-element>$swcXml</path-element></library-path><fonts><local-fonts-snapshot>$fontsXml</local-fonts-snapshot></fonts><debug>false</debug><optimize>true</optimize></compiler><target-player>32.0</target-player><swf-version>32</swf-version><use-network>false</use-network><static-link-runtime-shared-libraries>true</static-link-runtime-shared-libraries><default-size><width>1800</width><height>950</height></default-size></flex-config>")
 & $Java '-Dfile.encoding=UTF-8' '-jar' (Join-Path $Sdk 'lib/mxmlc.jar') '-load-config' $cfg '-theme=' '-output' (Join-Path $target ($entry.Name+'.swf')) (Join-Path $entry.Source ($entry.Name+'.as'))
 if($LASTEXITCODE -ne 0){throw ($entry.Name+' compilation failed')}
}
Copy-Item -LiteralPath (Join-Path $project 'map-editor/component/NativeScene.swf') -Destination (Join-Path $target 'NativeScene.swf')
Copy-Item -LiteralPath (Join-Path $project 'map-editor/localization/editor-zh.xml') -Destination (Join-Path $target 'editor-zh.xml')
foreach($language in @('en','ru')){Copy-Item -LiteralPath (Join-Path $game ('Editor/Resources/text_'+$language+'.xml')) -Destination (Join-Path $target ('editor-'+$language+'.xml'))}
$manifest=@{protocol=1;outputs=@{};sources=@{}}
Get-ChildItem -LiteralPath $target | Where-Object {$_.Extension -in '.swf','.xml'} | ForEach-Object {$manifest.outputs[$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()}
foreach($file in @((Join-Path $source 'NativeUIBootstrap.as'),(Join-Path $source 'EditorAdapter.as.inc'),(Join-Path $source 'NativeDocumentControls.as'),(Join-Path $PSScriptRoot 'prepare-native-ui.py'))){$manifest.sources[(Split-Path $file -Leaf)]=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower()}
[IO.File]::WriteAllText((Join-Path $target 'manifest.json'),(($manifest|ConvertTo-Json -Depth 5).Replace("`r`n","`n")+"`n"))
