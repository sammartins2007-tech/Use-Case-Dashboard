<#
  Publish-RadarKit.ps1  -  releases the AI Use Case Radar kit (kit owner only; this script is never in the zip).

  Git is the master copy. This script turns the latest commit into the ONE distributed file:
    1. Pulls the latest main from your personal GitHub repository (optionally commits and pushes local changes first).
    2. Builds AI-Use-Case-Radar-kit.zip from that commit with git archive
       (everything except this script and .gitignore; customer data never lives in the repository).
    3. Overwrites AI-Use-Case-Radar-kit.zip in your synced OneDrive folder "AI Use Case Radar - Kit"
       and copies START-HERE.html next to it as AI-Use-Case-Radar-install-guide.html.
  Same file names every time, so the shared link never changes. No tags, no GitHub releases.

  Run it:
    powershell -ExecutionPolicy Bypass -File .\Publish-RadarKit.ps1            # build and publish the zip
    powershell -ExecutionPolicy Bypass -File .\Publish-RadarKit.ps1 -Push      # commit + push local changes first
    powershell -ExecutionPolicy Bypass -File .\Publish-RadarKit.ps1 -DryRun    # build in TEMP only, publish nothing

  Optional parameters
    -RepoPath    your local clone                      (default: the folder this script is in)
    -KitFolder   the synced shared folder               (default: <OneDrive>\AI Use Case Radar - Kit)
#>
[CmdletBinding()]
param(
  [string]$RepoPath  = $PSScriptRoot,
  [string]$KitFolder = "",
  [switch]$Push,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$ExpectedRemote = "github.com/sammartins2007-tech/Use-Case-Dashboard"
$ZipName   = "AI-Use-Case-Radar-kit.zip"
$GuideName = "AI-Use-Case-Radar-install-guide.html"
function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

Step "Checking the repository"
if (-not (Test-Path (Join-Path $RepoPath ".git"))) { throw "$RepoPath is not a git repository." }
Push-Location $RepoPath
try {
  $remote = git remote get-url origin
  if ($remote -notmatch [regex]::Escape($ExpectedRemote)) { throw "origin is '$remote', not the kit repository. Stopping." }
  git checkout main --quiet

  if ($Push) {
    Step "Committing and pushing local changes"
    git add -A
    if (git diff --cached --name-only) {
      $v = (Get-Content VERSION -Raw).Trim()
      git commit -m "Kit $v" --quiet
      git push origin main
    } else { Write-Host "No local changes." }
  }
  git pull --ff-only origin main --quiet
  if (git status --porcelain) { throw "Uncommitted local changes. Commit them (or run with -Push) so the zip matches GitHub." }

  $version = (Get-Content VERSION -Raw).Trim()
  $commit  = (git rev-parse --short HEAD).Trim()
  Write-Host "Kit $version (commit $commit)"

  Step "Building $ZipName"
  $tmp = Join-Path $env:TEMP ("radar-kit-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zipTmp = Join-Path $tmp $ZipName
  git archive --format=zip --prefix=AI-Use-Case-Radar-kit/ -o $zipTmp HEAD -- . ':(exclude)Publish-RadarKit.ps1' ':(exclude).gitignore'
  if ($LASTEXITCODE -ne 0) { throw "git archive failed." }
  Write-Host ("Built {0:N0} bytes" -f (Get-Item $zipTmp).Length)

  if ($DryRun) { Write-Host "`nDry run: the zip is in $tmp. Nothing published."; return }

  Step "Publishing to the shared folder"
  if (-not $KitFolder) {
    $root = @($env:OneDriveCommercial, $env:OneDrive) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if (-not $root) { throw "OneDrive folder not found. Pass -KitFolder." }
    $KitFolder = Join-Path $root "AI Use Case Radar - Kit"
  }
  if (-not (Test-Path $KitFolder)) { New-Item -ItemType Directory -Path $KitFolder | Out-Null }
  Copy-Item $zipTmp (Join-Path $KitFolder $ZipName) -Force
  Copy-Item (Join-Path $RepoPath "START-HERE.html") (Join-Path $KitFolder $GuideName) -Force
  Remove-Item $tmp -Recurse -Force
  Write-Host "`nPublished kit $version to $KitFolder (same file names, same link)." -ForegroundColor Green
}
finally { Pop-Location }
