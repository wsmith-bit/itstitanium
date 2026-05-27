# tools\process-images-robust.ps1  (PowerShell 5 safe)

$ErrorActionPreference = "Stop"
$incoming = "public\assets\img\incoming"
$outDir   = "public\assets\img"
$mapPath  = "tools\image-map.csv"

# --- find magick.exe
$magickCmd = $null
$cmd = Get-Command magick -ErrorAction SilentlyContinue
if ($cmd) { $magickCmd = $cmd.Source }
if (-not $magickCmd) {
  $cand = Get-ChildItem "C:\Program Files","C:\Program Files (x86)" -Recurse -Filter magick.exe -ErrorAction SilentlyContinue |
          Where-Object { $_.FullName -match "ImageMagick" } | Select-Object -First 1 -ExpandProperty FullName
  if ($cand) { $magickCmd = $cand }
}
if (-not $magickCmd) { throw "ImageMagick not found. Install or reopen PowerShell so PATH refreshes." }

# --- optional exiftool
$exif = Join-Path (Get-Location) "exiftool.exe"
$hasExif = Test-Path $exif

# --- load mapping
if (!(Test-Path $mapPath)) { throw "Missing $mapPath" }
$rows = Import-Csv $mapPath

# --- helpers
function Resolve-Source([string]$token){
  $t = ""
  if ($null -ne $token) { $t = $token.Trim() }
  if ([string]::IsNullOrWhiteSpace($t)) { return $null }

  $try = Join-Path $incoming $t
  if (Test-Path -LiteralPath $try) { return (Get-Item -LiteralPath $try).FullName }

  # substring wildcard match inside incoming/
  $hits = Get-ChildItem $incoming -File | Where-Object { $_.Name -like ("*{0}*" -f $t) }
  if ($hits -and $hits.Count -ge 1) { return $hits[0].FullName }
  return $null
}

# crop amount for Gemini star watermark (bottom-right)
$chop = "32x32"   # bump to 40x40 if any star remains

# collect alt text for alts.json
$altMap = @{}

foreach($row in $rows){
  $srcTok = ""
  if ($null -ne $row.source) { $srcTok = $row.source.Trim() }

  $out = ""
  if ($null -ne $row.out) { $out = $row.out.Trim() }

  $w = 0; $h = 0
  [void][int]::TryParse("$($row.width)", [ref]$w)
  [void][int]::TryParse("$($row.height)", [ref]$h)

  $alt = ""
  if ($null -ne $row.alt) { $alt = $row.alt.Trim() }

  if ([string]::IsNullOrWhiteSpace($out) -or $w -le 0 -or $h -le 0) {
    Write-Warning "Skipping row with missing out/size: $($row | ConvertTo-Json -Compress)"
    continue
  }

  $srcPath = Resolve-Source $srcTok
  if (-not $srcPath) {
    Write-Warning ("MISSING source for token: {0}" -f $srcTok)
    continue
  }

  $dest = Join-Path $outDir $out
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null

  & "$magickCmd" "$srcPath" `
    -auto-orient -gravity southeast -chop $chop `
    -resize "$($w)x$($h)^" -gravity center -extent "$($w)x$($h)" `
    -define webp:method=6 -quality 88 "$dest"

  if ($LASTEXITCODE -ne 0) { Write-Warning "ImageMagick returned $LASTEXITCODE for $srcPath -> $dest" }

  if ($hasExif) {
    & "$exif" -overwrite_original `
      ("-XMP-dc:Title<{0}" -f ($out -replace '\.webp$','')) `
      ("-XMP-dc:Description={0}" -f $alt) "$dest" | Out-Null
  }

  if (-not [string]::IsNullOrWhiteSpace($alt)) { $altMap[$out] = $alt }
  Write-Host ("✓ {0}  ←  {1}" -f $out,(Split-Path $srcPath -Leaf))
}

# write alts.json for reference
$altsJson = (ConvertTo-Json $altMap -Depth 3)
$altsPath = Join-Path $outDir "alts.json"
Set-Content -Encoding UTF8 $altsPath $altsJson
Write-Host "`nWrote $altsPath"
