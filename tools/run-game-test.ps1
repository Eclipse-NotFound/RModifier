param([string]$AppId=('pfe-loot-test-'+(Get-Date -Format 'yyyyMMdd-HHmmss')), [switch]$StopOnly, [switch]$Fallback, [switch]$AllMods)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$game=Split-Path (Split-Path $project -Parent) -Parent
$descriptor=Join-Path $project 'build/out/game/app_loot_test.xml'
$record=Join-Path $project 'build/out/test-process.json'
if(Test-Path -LiteralPath $record){
  $old=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
  if($old.descriptor -ne $descriptor){throw 'Unexpected test descriptor; refusing to stop a process'}
  $previous=Get-CimInstance Win32_Process -Filter "ProcessId = $($old.pid)"
  if($previous){
    if(!$previous.CommandLine -or !$previous.CommandLine.Contains($descriptor)){throw 'Process identity changed; refusing to stop it'}
    Stop-Process -Id $old.pid
  }
}
if($StopOnly){return}
if($AppId -notmatch '^pfe-loot-test-[-\w]+$'){throw 'Use an isolated test application ID'}
& (Join-Path $PSScriptRoot 'prepare-test.ps1') -AppId $AppId -Fallback:$Fallback -AllMods:$AllMods
$process=Start-Process -FilePath (Join-Path $game 'adl64.exe') -ArgumentList @('-runtime',('"'+(Join-Path $game 'runtimes/air/win64')+'"'),('"'+$descriptor+'"')) -WorkingDirectory (Join-Path $project 'build/out/game') -WindowStyle Hidden -PassThru
@{pid=$process.Id;descriptor=$descriptor;appId=$AppId} | ConvertTo-Json | Set-Content -LiteralPath $record -Encoding utf8
Write-Output "Launched isolated $AppId PID $($process.Id)"
