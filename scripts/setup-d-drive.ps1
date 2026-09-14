<#
  把 HeartopiaHub 迁移到 D 盘并完成构建。
  用法（在项目当前所在目录执行）:
      powershell -ExecutionPolicy Bypass -File scripts\setup-d-drive.ps1
  可选参数:
      -Target 目标目录，默认 D:\codex\projects\HeartopiaHub
      -SkipBuild 只复制，不执行 npm install / npm run build
#>
param(
  [string]$Target = 'D:\codex\projects\HeartopiaHub',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$source = Split-Path -Parent $PSScriptRoot
Write-Host "源目录: $source" -ForegroundColor Cyan
Write-Host "目标目录: $Target" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath (Split-Path -Parent $Target))) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $Target) -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $Target)) {
  New-Item -ItemType Directory -Path $Target -Force | Out-Null
}

# 只复制源码，依赖和构建产物在目标目录重新生成
$excludeDirs = @('node_modules', 'dist', '.astro', '.tmp', '.tmp-verify')

Get-ChildItem -LiteralPath $source -Force | Where-Object {
  $_.Name -notin $excludeDirs
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $Target -Recurse -Force
}

Write-Host '源码复制完成。' -ForegroundColor Green

if ($SkipBuild) {
  Write-Host "已跳过 npm install / npm run build。进入 $Target 后手动执行即可。" -ForegroundColor Yellow
  exit 0
}

Push-Location $Target
try {
  Write-Host 'npm install ...' -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { throw 'npm install 失败' }

  Write-Host 'npm run build ...' -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build 失败' }

  Write-Host '构建成功，产物在 dist 目录。本地预览：npm run preview' -ForegroundColor Green
}
finally {
  Pop-Location
}
