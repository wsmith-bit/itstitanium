# tools/suggest-image-map.ps1
# Run: powershell -ExecutionPolicy Bypass -File .\tools\suggest-image-map.ps1
$ErrorActionPreference = 'Stop'
$incoming = "public/assets/img/incoming"
$outCsv   = "tools/image-map.csv"

# locate magick.exe
$magick = (Get-Command magick -ErrorAction SilentlyContinue)
if(-not $magick){
  $cand = Get-ChildItem "C:\Program Files","C:\Program Files (x86)" -Recurse -Filter magick.exe -ErrorAction SilentlyContinue |
          Where-Object { $_.FullName -match "ImageMagick" } | Select-Object -First 1
  if($cand){ $magick = @{ Source = $cand.FullName } }
}
if(-not $magick){ throw "ImageMagick not found. Install it, then open a NEW PowerShell window." }
$magickCmd = $magick.Source

# list sources
$srcs = Get-ChildItem $incoming -File | Where-Object { $_.Extension -match '\.(png|jpe?g|webp|avif)$' }
if(-not $srcs -or $srcs.Count -eq 0){ throw "No images found in $incoming" }

# measure and create objects WITH a 'used' flag
$info = @()
foreach($s in $srcs){
  $dim = & "$magickCmd" identify -format "%w,%h" "$($s.FullName)"
  $w,$h = $dim.Split(",") | ForEach-Object {[int]$_}
  $ar = [math]::Round($w/$h,3)
  $o = [pscustomobject]@{ name=$s.Name; w=$w; h=$h; ar=$ar; used=$false }
  $info += $o
}

# desired targets
$targets = @(
  @{ out="itstitaniun-hero-pans-1600.webp"; w=1600; h=900;  alt="Titanium-reinforced skillets on a black induction cooktop with soft reflections" },
  @{ out="itstitaniun-hero-pans-1200.webp"; w=1200; h=900;  alt="Titanium-reinforced skillets on a black induction cooktop with soft reflections" },
  @{ out="itstitaniun-hero-pans-800.webp";  w=800;  h=900;  alt="Titanium-reinforced skillets on a black induction cooktop with soft reflections" },
  @{ out="itstitaniun-hero-og-1200x630.webp"; w=1200; h=630; alt="Titanium-reinforced skillets on a black induction cooktop with soft reflections" },
  @{ out="itstitaniun-tldr-flatlay-1200.webp"; w=1200; h=800; alt="Flat lay of nonstick skillet with silicone spatula, thermometer, and sponge" },
  @{ out="itstitaniun-coating-cutaway-1200.webp"; w=1200; h=900; alt="Exploded cutaway showing aluminum base, induction disk, and titanium-reinforced coating layers" },
  @{ out="itstitaniun-compare-banner-1800.webp"; w=1800; h=600; alt="Abstract dark banner with mint and aqua light sweep" },
  @{ out="itstitaniun-cta-counter-1400.webp"; w=1400; h=788; alt="Minimal countertop scene with utensils and a skillet edge" },
  @{ out="itstitaniun-portable-induction-1400.webp"; w=1400; h=788; alt="Small induction burner with skillet cooking vegetables on a compact counter" },
  @{ out="itstitaniun-induction-disk-1200.webp"; w=1200; h=800; alt="Macro of a pan’s stainless induction base disk" },
  @{ out="itstitaniun-cleaning-tools-1200.webp"; w=1200; h=1200; alt="Top-down grid of gentle cleaning tools for nonstick cookware" },
  @{ out="itstitaniun-scratch-resistance-1200.webp"; w=1200; h=800; alt="Abstract particles reinforcing a nonstick surface matrix" },
  @{ out="itstitaniun-care-cleaning-1400.webp"; w=1400; h=788; alt="Cooled nonstick pan beside a sink with soft sponge and soap" },
  @{ out="itstitaniun-weight-balance-1200.webp"; w=1200; h=900; alt="Side view of skillet balanced on fingertips near the handle" },
  @{ out="itstitaniun-handle-detail-1200.webp"; w=1200; h=1200; alt="Close-up of a riveted stainless pan handle" },
  @{ out="itstitaniun-delicate-fish-1200.webp"; w=1200; h=800; alt="Salmon fillet releasing cleanly from a nonstick skillet" },
  @{ out="itstitaniun-egg-release-1200.webp"; w=1200; h=900; alt="Scrambled eggs sliding from a nonstick skillet with a silicone spatula" },
  @{ out="itstitaniun-oven-safe-1400.webp"; w=1400; h=788; alt="Nonstick pan with silicone handle on an oven rack" },
  @{ out="itstitaniun-magnet-test-1200.webp"; w=1200; h=800; alt="Magnet sticking to a pan’s stainless base to check induction compatibility" },
  @{ out="itstitaniun-rim-comparison-1200.webp"; w=1200; h=900; alt="Macro of two pan rims showing material differences" },
  @{ out="itstitaniun-even-browning-1200.webp"; w=1200; h=800; alt="Overhead pancake showing even browning across the pan surface" }
)

function Closest($ar){
  $best = $null; $min = 999
  foreach($s in $info){
    if($s.used){ continue }
    $d = [math]::Abs($s.ar - $ar)
    if($d -lt $min){ $min = $d; $best = $s }
  }
  return $best
}

$rows = @()
$heroSrc = $null

foreach($t in $targets){
  $arTarget = [math]::Round($t.w/$t.h,3)

  if($t.out -match '^itstitaniun-hero-'){
    if(-not $heroSrc){
      $heroSrc = Closest $arTarget
      if($heroSrc){ $heroSrc.used = $true }
    }
    $pick = $heroSrc
  } else {
    $pick = Closest $arTarget
    if($pick){ $pick.used = $true }
  }

  $rows += [pscustomobject]@{
    source = $(if($pick){ $pick.name } else { "" })
    out    = $t.out
    width  = $t.w
    height = $t.h
    alt    = $t.alt
  }
}

# write CSV
"source,out,width,height,alt" | Set-Content -Encoding UTF8 $outCsv
foreach($r in $rows){
  $line = ('"{0}","{1}",{2},{3},"{4}"' -f $r.source,$r.out,$r.width,$r.height,$r.alt.Replace('"','""'))
  Add-Content -Encoding UTF8 $outCsv $line
}
Write-Host "Suggested mapping -> $outCsv"

# contact sheet for visual verification
$temp = Join-Path $incoming "_thumbs"
New-Item -ItemType Directory -Path $temp -Force | Out-Null
$i=1
foreach($s in $srcs){
  & "$magickCmd" "$($s.FullName)" -resize "600x600>" -gravity south -splice 0x60 `
    -fill white -undercolor "#00000080" -gravity south -pointsize 28 `
    -annotate +0+10 ("#{0}  {1}" -f $i,$s.Name) "$temp\thumb-$i.jpg"
  $i++
}
& "$magickCmd" "$temp\thumb-*.jpg" -tile 4x -geometry +10+10 -background "#111" -gravity center -append "$incoming\_contact-sheet.jpg"
Write-Host "Contact sheet -> $incoming\_contact-sheet.jpg"
