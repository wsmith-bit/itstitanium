# tools\process-images.ps1 — run with:
# powershell -ExecutionPolicy Bypass -File .\tools\process-images.ps1
$ErrorActionPreference = 'Stop'

$incoming = "public/assets/img/incoming"
$outdir   = "public/assets/img"
$mapPath  = "tools/image-map.csv"
$chop     = "24x24"  # increase to 32x32 if any watermark pixels remain

# 1) Locate magick.exe (PATH or Program Files) — PS5-safe
$magickCmd = $null
$cmd = Get-Command magick -ErrorAction SilentlyContinue
if ($cmd) { $magickCmd = $cmd.Source }
if (-not $magickCmd) {
  $cands = @(
    Get-ChildItem "C:\Program Files" -Recurse -Filter magick.exe -ErrorAction SilentlyContinue;
    Get-ChildItem "C:\Program Files (x86)" -Recurse -Filter magick.exe -ErrorAction SilentlyContinue
  ) | Where-Object { $_.FullName -match "ImageMagick" } | Select-Object -First 1
  if ($cands) { $magickCmd = $cands.FullName }
}
if (-not $magickCmd) { throw "ImageMagick not found. Install it, then open a NEW PowerShell window and re-run." }

# 2) Optional exiftool in repo root
$exif = Join-Path (Get-Location) "exiftool.exe"
$hasExif = Test-Path $exif

# 3) Validations
if (!(Test-Path $incoming)) { throw "Missing folder: $incoming" }
if (!(Test-Path $mapPath))  { throw "Missing mapping CSV: $mapPath" }

# 4) Load CSV (ignore commented lines)
$rows = Get-Content $mapPath | Where-Object {$_ -notmatch '^\s*#'} | ConvertFrom-Csv
if (-not $rows -or $rows.Count -eq 0) { throw "No rows found in $mapPath" }

# 5) Process
$alts = @{}
foreach ($r in $rows) {
  $srcRel = Join-Path $incoming $r.source
  $dstRel = Join-Path $outdir   $r.out
  $w = [int]$r.width
  $h = [int]$r.height

  if (!(Test-Path $srcRel)) { Write-Warning "Missing source: $($r.source)"; continue }
  New-Item -ItemType Directory -Path (Split-Path $dstRel) -Force | Out-Null

  & "$magickCmd" "$srcRel" -gravity southeast -chop $chop `
    -resize "${w}x${h}^" -gravity center -extent "${w}x${h}" `
    -quality 82 -define webp:method=6 "$dstRel"

  if ($hasExif) {
    & $exif -overwrite_original `
      "-XMP-dc:Title=$([IO.Path]::GetFileNameWithoutExtension($r.out))" `
      "-XMP-dc:Description=$($r.alt)" "$dstRel" | Out-Null
  }

  $alts[$r.out] = $r.alt
  Write-Host ("`u2713 {0}  ({1}×{2})" -f $r.out,$w,$h)
}

# 6) Alt map + helper snippet
$alts | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 (Join-Path $outdir "alts.json")

$snippet = @()
foreach ($r in $rows) {
  $dst = $r.out
  if (Test-Path (Join-Path $outdir $dst)) {
$snippet += @"
<figure>
  <img src="/assets/img/$dst" width="$($r.width)" height="$($r.height)" alt="$($r.alt)" decoding="async" loading="lazy">
  <figcaption>$($r.alt)</figcaption>
</figure>
"@
  }
}
$snippet -join "`r`n" | Set-Content -Encoding UTF8 "tools/snippet.html"
Write-Host "Alt map   -> public/assets/img/alts.json"
Write-Host "Snippet   -> tools/snippet.html"
Write-Host "Done."
