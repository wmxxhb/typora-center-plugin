param(
  [Parameter(Mandatory = $true)]
  [string]$TyporaPath,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw '请先安装 Node.js 18 或更高版本，并重新打开 PowerShell。' }

$installer = Join-Path $PSScriptRoot 'install.cjs'
if ($Uninstall) { & $node.Source $installer $TyporaPath --uninstall }
else { & $node.Source $installer $TyporaPath }

if ($LASTEXITCODE -ne 0) { throw '操作未完成，请查看上面的原因。' }
