Add-Type -AssemblyName System.Drawing

$tabDir = "E:\yzsai\Documents\dsh-1\miniprogram-demo\images\tab"
New-Item -ItemType Directory -Path $tabDir -Force | Out-Null

function New-Icon {
    param(
        [string]$Path,
        [string]$Hex,
        [scriptblock]$Draw
    )
    $bmp = New-Object System.Drawing.Bitmap 81, 81
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $r = [Convert]::ToInt32($Hex.Substring(1, 2), 16)
    $grn = [Convert]::ToInt32($Hex.Substring(3, 2), 16)
    $b = [Convert]::ToInt32($Hex.Substring(5, 2), 16)
    $color = [System.Drawing.Color]::FromArgb(255, $r, $grn, $b)
    $pen = New-Object System.Drawing.Pen $color, 5.0
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    & $Draw $g $pen

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $pen.Dispose()
}

# Home: roof + walls + door
$DrawHome = {
    param($g, $pen)
    $g.DrawLines($pen, @(
        (New-Object System.Drawing.Point 14, 42),
        (New-Object System.Drawing.Point 40, 18),
        (New-Object System.Drawing.Point 66, 42)
    ))
    $g.DrawLines($pen, @(
        (New-Object System.Drawing.Point 14, 42),
        (New-Object System.Drawing.Point 14, 66),
        (New-Object System.Drawing.Point 66, 66),
        (New-Object System.Drawing.Point 66, 42)
    ))
    $g.DrawRectangle($pen, 33, 50, 15, 16)
}

# English: open book
$DrawEnglish = {
    param($g, $pen)
    $g.DrawLines($pen, @(
        (New-Object System.Drawing.Point 14, 22),
        (New-Object System.Drawing.Point 40, 30),
        (New-Object System.Drawing.Point 66, 22),
        (New-Object System.Drawing.Point 66, 62),
        (New-Object System.Drawing.Point 40, 70),
        (New-Object System.Drawing.Point 14, 62),
        (New-Object System.Drawing.Point 14, 22)
    ))
    $g.DrawLine($pen, 40, 30, 40, 70)
}

# Fitness: dumbbell
$DrawFitness = {
    param($g, $pen)
    $g.DrawLine($pen, 22, 40, 59, 40)
    $g.DrawRectangle($pen, 10, 28, 12, 24)
    $g.DrawRectangle($pen, 59, 28, 12, 24)
    $g.DrawLine($pen, 17, 34, 17, 46)
    $g.DrawLine($pen, 64, 34, 64, 46)
}

# Account: ledger
$DrawAccount = {
    param($g, $pen)
    $g.DrawRectangle($pen, 18, 14, 44, 56)
    $g.DrawLine($pen, 28, 28, 52, 28)
    $g.DrawLine($pen, 28, 40, 52, 40)
    $g.DrawLine($pen, 28, 52, 44, 52)
}

# Profile: person silhouette
$DrawProfile = {
    param($g, $pen)
    $g.DrawEllipse($pen, 30, 20, 20, 20)
    $top = New-Object System.Drawing.Point[] 4
    $top[0] = New-Object System.Drawing.Point 18, 66
    $top[1] = New-Object System.Drawing.Point 18, 56
    $top[2] = New-Object System.Drawing.Point 30, 46
    $top[3] = New-Object System.Drawing.Point 50, 46
    $btm = New-Object System.Drawing.Point[] 3
    $btm[0] = New-Object System.Drawing.Point 50, 46
    $btm[1] = New-Object System.Drawing.Point 62, 56
    $btm[2] = New-Object System.Drawing.Point 62, 66
    $g.DrawLines($pen, $top)
    $g.DrawLines($pen, $btm)
}

$inactive = "#6B6660"
$active   = "#2D5F3F"

New-Icon -Path (Join-Path $tabDir 'home.png')         -Hex $inactive -Draw $DrawHome
New-Icon -Path (Join-Path $tabDir 'home-active.png')  -Hex $active   -Draw $DrawHome
New-Icon -Path (Join-Path $tabDir 'english.png')       -Hex $inactive -Draw $DrawEnglish
New-Icon -Path (Join-Path $tabDir 'english-active.png') -Hex $active   -Draw $DrawEnglish
New-Icon -Path (Join-Path $tabDir 'fitness.png')        -Hex $inactive -Draw $DrawFitness
New-Icon -Path (Join-Path $tabDir 'fitness-active.png') -Hex $active   -Draw $DrawFitness
New-Icon -Path (Join-Path $tabDir 'account.png')        -Hex $inactive -Draw $DrawAccount
New-Icon -Path (Join-Path $tabDir 'account-active.png') -Hex $active   -Draw $DrawAccount
New-Icon -Path (Join-Path $tabDir 'profile.png')        -Hex $inactive -Draw $DrawProfile
New-Icon -Path (Join-Path $tabDir 'profile-active.png') -Hex $active   -Draw $DrawProfile

Get-ChildItem -Path $tabDir -Filter '*.svg' -ErrorAction SilentlyContinue | Remove-Item

Write-Host "DONE"
Get-ChildItem -Path $tabDir -File | Select-Object Name, Length | Format-Table -AutoSize
