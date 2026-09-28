param([string]$Compiler='C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$output=Join-Path $project 'build/out/native-surface'
New-Item -ItemType Directory -Path $output -Force | Out-Null
& $Compiler /nologo /platform:x64 /target:exe /r:System.Web.Extensions.dll ('/out:'+(Join-Path $output 'NativeSurface.exe')) (Join-Path $PSScriptRoot 'native-surface/SurfaceHost.cs')
if($LASTEXITCODE -ne 0){throw 'Native surface adapter build failed'}
Get-FileHash -LiteralPath (Join-Path $output 'NativeSurface.exe') -Algorithm SHA256
