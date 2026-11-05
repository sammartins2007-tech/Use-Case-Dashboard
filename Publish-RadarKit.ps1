<#
  Publish-RadarKit.ps1  -  pushes the newest AI Use Case Radar kit to your personal GitHub repository.

  What it does
    1. Finds the newest "AI-Use-Case-Radar-Kit-v*.zip" in your OneDrive (Copilot Cowork saves it there).
    2. Unzips it into a temporary folder.
    3. Copies its contents over your local repository (your .git folder is never touched).
    4. Commits with your PERSONAL identity, tags the version and pushes main + tags.

  Run it (once per new kit):
    Right-click > Run with PowerShell
    or:  powershell -ExecutionPolicy Bypass -File .\Publish-RadarKit.ps1

  Optional parameters
    -RepoPath   your local clone          (default C:\Users\sammart\Use-Case-Dashboard)
    -ZipPath    a specific kit zip        (default: newest one found in OneDrive)
    -DryRun     show what would be committed, without committing or pushing
#>
[CmdletBinding()]
param(
  [string]$RepoPath = "C:\Users\sammart\Use-Case-Dashboard",
  [string]$ZipPath  = "",
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$PersonalName  = "Sam Martins"
$PersonalEmail = "sammartins2007@gmail.com"
$ExpectedRemote = "github.com/sammartins2007-tech/Use-Case-Dashboard"

function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

# 1. Find the kit
Step "Looking for the newest kit"
if (-not $ZipPath) {
  $roots = @($env:OneDriveCommercial, $env:OneDrive, "$env:USERPROFILE\OneDrive - Microsoft") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique
  $zip = foreach ($r in $roots) { Get-ChildItem -Path $r -Recurse -Filter "AI-Use-Case-Radar-Kit-v*.zip" -ErrorAction SilentlyContinue }
  $zip = $zip | Sort-Object { [version](($_.BaseName -replace '.*-v', '')) } -Descending | Select-Object -First 1
  if (-not $zip) { throw "No AI-Use-Case-Radar-Kit-v*.zip found in OneDrive. Make sure the Cowork folder is synced, or pass -ZipPath." }
  $ZipPath = $zip.FullName
}
$version = ([IO.Path]::GetFileNameWithoutExtension($ZipPath) -replace '.*-v', '')
Write-Host "Kit: $ZipPath  (version $version)"

# 2. Check the repository
Step "Checking the repository"
if (-not (Test-Path (Join-Path $RepoPath ".git"))) { throw "$RepoPath is not a git repository." }
Push-Location $RepoPath
try {
  $remote = git remote get-url origin
  if ($remote -notmatch [regex]::Escape($ExpectedRemote)) { throw "origin is '$remote', not your personal repository. Stopping." }
  git config user.name  $PersonalName
  git config user.email $PersonalEmail
  git fetch origin --tags --quiet
  git checkout main --quiet
  git pull --ff-only origin main --quiet
  if (git tag --list "v$version") { throw "Tag v$version already exists: this kit is already published." }

  # 3. Unzip and copy over the clone
  Step "Unpacking the kit"
  $tmp = Join-Path $env:TEMP ("radar-kit-" + [guid]::NewGuid())
  Expand-Archive -Path $ZipPath -DestinationPath $tmp -Force
  $src = Join-Path $tmp "ai-use-case-radar"
  if (-not (Test-Path $src)) { $src = $tmp }
  robocopy $src $RepoPath /E /XD .git /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copy failed (robocopy exit $LASTEXITCODE)." }
  Remove-Item $tmp -Recurse -Force

  # 4. Commit, tag, push
  Step "Changes"
  git add -A
  git status --short
  if (-not (git diff --cached --name-only)) { Write-Host "Nothing changed. Done."; return }
  if ($DryRun) { Write-Host "`nDry run: nothing committed. Run again without -DryRun to publish."; git reset --quiet; return }

  Step "Publishing v$version"
  git commit -m "Kit v$version" --quiet
  git tag "v$version"
  git push origin main --tags
  Write-Host "`nPublished v$version to https://$ExpectedRemote" -ForegroundColor Green
}
finally { Pop-Location }
