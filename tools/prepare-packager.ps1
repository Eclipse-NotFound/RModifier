param([string]$Mirror='https://github.com/electron-userland/electron-builder-binaries/releases/download')
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$cache=Join-Path $project 'build/cache'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$sevenZip=Join-Path $project 'node_modules/electron-winstaller/vendor/7z-x64.exe'
if(!(Test-Path -LiteralPath $sevenZip)){throw 'Install locked npm dependencies first'}
$assets=@(
 @{Name='nsis-3.0.4.1';Hash='9877df902530f96357d13a7a31ae2b9df67f48b11ffc9a1700a7c961574ec5fa';Folder='nsis'},
 @{Name='nsis-resources-3.4.1';Hash='593a9a92ef958321293ac6a2ee61e64bf1bd543142a5bd6b3d310709cc924103';Folder='nsis-resources'}
)
foreach($asset in $assets){
 $archive=Join-Path $cache ($asset.Name+'.7z')
 if(!(Test-Path -LiteralPath $archive)){
  try{Invoke-WebRequest -Uri ($Mirror+'/'+$asset.Name+'/'+$asset.Name+'.7z') -OutFile $archive -TimeoutSec 25}
  catch{Invoke-WebRequest -Uri ('https://npmmirror.com/mirrors/electron-builder-binaries/'+$asset.Name+'/'+$asset.Name+'.7z') -OutFile $archive -TimeoutSec 25}
 }
 if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $asset.Hash){throw ('Checksum mismatch: '+$archive)}
 $output=Join-Path $cache $asset.Folder
 & $sevenZip x $archive ('-o'+$output) -y
 if($LASTEXITCODE -ne 0){throw ('Extraction failed: '+$asset.Name)}
}
Write-Output 'Verified NSIS components ready in build/cache'
