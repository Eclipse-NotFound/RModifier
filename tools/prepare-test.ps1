param([string]$AppId='pfe-loot-test-20260927', [switch]$Fallback, [switch]$AllMods, [ValidateSet('','en','zh')][string]$Language='')
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$game=Split-Path (Split-Path $project -Parent) -Parent
$test=Join-Path $project 'build/out/game'
New-Item -ItemType Directory -Force -Path $test,(Join-Path $test 'fixtures'),(Join-Path $test 'mods/RModifier/release'),(Join-Path $test 'mods/RModifier/config'),(Join-Path $test 'mods/LootProbe/release'),(Join-Path $test 'mods/ModLoader/release') | Out-Null
foreach($name in @('sprite.swf','sprite1.swf','texture.swf','texture1.swf','sound.swf','sound_unit.swf','sound_weapon.swf','rooms.xml','lang.xml')) {Copy-Item -LiteralPath (Join-Path $game $name) -Destination $test}
Get-ChildItem -LiteralPath $game -Filter 'text_*.xml' | Copy-Item -Destination $test
if($Language){
 $testLanguageFile=Join-Path $test 'lang.xml'
 $testLanguageXml=[xml][IO.File]::ReadAllText($testLanguageFile)
 $testLanguageXml.all.SetAttribute('default',$Language)
 $testLanguageXml.Save($testLanguageFile)
}
if(!(Test-Path -LiteralPath (Join-Path $test 'Rooms'))){Copy-Item -LiteralPath (Join-Path $game 'Rooms') -Destination $test -Recurse}
Copy-Item -LiteralPath (Join-Path $project 'build/out/pfe-loot-safe.swf') -Destination (Join-Path $test 'pfe.swf')
Copy-Item -LiteralPath (Join-Path $project 'build/out/LootEditorMod.swf') -Destination (Join-Path $test 'mods/RModifier/release/LootEditorMod.swf')
Copy-Item -LiteralPath (Join-Path $project 'build/out/LootProbeMod.swf') -Destination (Join-Path $test 'mods/LootProbe/release/LootProbeMod.swf')
Copy-Item -LiteralPath (Join-Path $game 'mods/ModLoader/release/ModLoaderMod.swf') -Destination (Join-Path $test 'mods/ModLoader/release/ModLoaderMod.swf')
Copy-Item -LiteralPath (Join-Path $project 'build/out/fixtures/profile.json') -Destination (Join-Path $test 'mods/RModifier/config/active.json')
if($Fallback){
 Copy-Item -LiteralPath (Join-Path $project 'build/out/fixtures/profile.json') -Destination (Join-Path $test 'mods/RModifier/config/active.previous.json')
 [IO.File]::WriteAllText((Join-Path $test 'mods/RModifier/config/active.json'),'{"schemaVersion":999}',[Text.UTF8Encoding]::new($false))
}
Copy-Item -LiteralPath (Join-Path $project 'desktop/data/catalog.json') -Destination (Join-Path $test 'fixtures/catalog.json')
Copy-Item -LiteralPath (Join-Path $project 'build/out/fixtures/golden.json') -Destination (Join-Path $test 'fixtures/golden.json')
$manifest="ModLoader|ModLoaderMod|1|0|0`nRModifier|LootEditorMod|1|0|0`nLootProbe|LootProbeMod|1|0|0`n"
if($AllMods){
 foreach($line in [IO.File]::ReadAllLines((Join-Path $game 'mods/loader-manifest.txt'))){
  if($line -match '^([^#|]+)\|([^|]+)\|1\|[01]\|[01]$' -and $Matches[1] -ne 'ModLoader' -and $Matches[1] -notin @('LootEditor','RModifier')){
   $name=$Matches[1];$entry=$Matches[2]
   $from=Join-Path $game "mods/$name/release";$to=Join-Path $test "mods/$name/release"
   New-Item -ItemType Directory -Force -Path $to | Out-Null
   Copy-Item -LiteralPath (Join-Path $from "$entry.swf") -Destination $to
   Get-ChildItem -LiteralPath $from -File | Where-Object { $_.Extension -in @('.txt','.json','.xml') } | Copy-Item -Destination $to
   $manifest+=$line+"`n"
  }
 }
}
[IO.File]::WriteAllText((Join-Path $test 'mods/loader-manifest.txt'),$manifest,[Text.UTF8Encoding]::new($false))
$xml=[IO.File]::ReadAllText((Join-Path $game 'application.xml')).Replace('<id>pfe</id>',"<id>$AppId</id>").Replace('<visible>true</visible>','<visible>false</visible>')
[IO.File]::WriteAllText((Join-Path $test 'app_loot_test.xml'),$xml,[Text.UTF8Encoding]::new($false))
Write-Output "Prepared isolated app $AppId at $test"
