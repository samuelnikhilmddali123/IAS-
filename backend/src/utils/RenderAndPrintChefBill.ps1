param(
    [string]$PrinterName = "POS-80C",
    [string]$OrderJsonPath = ""
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

# Raw Printer P/Invoke Helper
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawChefPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes)
    {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Chief Bill Kitchen Order";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero))
            return false;

        if (!StartDocPrinter(hPrinter, 1, di))
        {
            ClosePrinter(hPrinter);
            return false;
        }

        if (!StartPagePrinter(hPrinter))
        {
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return false;
        }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        int dwWritten = 0;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);

        return success && (dwWritten == bytes.Length);
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawChefPrinter').Type) {
    Add-Type -TypeDefinition $code -Language CSharp
}

# Read Order JSON
$orderData = $null
if ([string]::IsNullOrWhiteSpace($OrderJsonPath) -or -not (Test-Path $OrderJsonPath)) {
    $defaultJson = "C:\Users\Nikhil\Downloads\Printer-Test\chef bill\last_order.json"
    if (Test-Path $defaultJson) {
        $orderData = Get-Content $defaultJson -Raw | ConvertFrom-Json
    }
} else {
    $orderData = Get-Content $OrderJsonPath -Raw | ConvertFrom-Json
}

if (-not $orderData) {
    $orderData = [PSCustomObject]@{
        orderNo = "#CS" + (Get-Date -Format "yyMMdd") + "01"
        userName = "IAS Officer"
        date = (Get-Date -Format "dd MMM yyyy")
        time = (Get-Date -Format "hh:mm tt")
        table = "T-08"
        orderType = "Dine In"
        instructions = "No onion. Serve hot."
        footerNote = "KINDLY PREPARE AND SERVE FRESH"
        items = @(
            [PSCustomObject]@{ id = 1; name = "Veg Biryani"; qty = 1; remarks = "-" },
            [PSCustomObject]@{ id = 2; name = "Paneer Butter Masala"; qty = 1; remarks = "Less Spicy" },
            [PSCustomObject]@{ id = 3; name = "Chapati"; qty = 2; remarks = "-" }
        )
    }
}

$userName = if ($orderData.userName) { [string]$orderData.userName } elseif ($orderData.officerName) { [string]$orderData.officerName } elseif ($orderData.user -and $orderData.user.name) { [string]$orderData.user.name } elseif ($orderData.name) { [string]$orderData.name } else { "Officer" }
$items = @($orderData.items)
$itemCount = $items.Count
$rowHeight = 48
$canvasWidth = 576
$canvasHeight = 900 + ($itemCount * $rowHeight)

# Create High Resolution In-Memory Bitmap
$bmp = New-Object System.Drawing.Bitmap($canvasWidth, $canvasHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

$blackBrush = [System.Drawing.Brushes]::Black
$whiteBrush = [System.Drawing.Brushes]::White
$blackPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2.0)
$dashedPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2.0)
$dashedPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

# Asset Paths
$chefDir = "C:\Users\Nikhil\Downloads\Printer-Test\chef bill"
$logoPath = Join-Path $chefDir "logo.png"
$noteIconPath = Join-Path $chefDir "note_icon.png"
$thankYouPath = Join-Path $chefDir "thankyou_crop.png"

# 1. Header: Logo + Brand + Values Column
if (Test-Path $logoPath) {
    try {
        $logoImg = [System.Drawing.Image]::FromFile($logoPath)
        $g.DrawImage($logoImg, 20, 20, 100, 95)
        $logoImg.Dispose()
    } catch {}
}

# Brand Text
$fontBrandTitle = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
$fontBrandSub = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$g.DrawString("CANTEEN", $fontBrandTitle, $blackBrush, 130, 22)
$g.DrawString("SERVICES", $fontBrandTitle, $blackBrush, 130, 52)
$g.DrawString("GOOD FOOD", $fontBrandSub, $blackBrush, 130, 84)
$g.DrawString("GREATER SERVICE", $fontBrandSub, $blackBrush, 130, 98)

# Vertical line separator
$g.DrawLine($blackPen, 345, 18, 345, 120)

# Values Column
$fontValues = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$g.DrawString("FRESH", $fontValues, $blackBrush, 360, 26)
$g.DrawString("HYGIENIC", $fontValues, $blackBrush, 360, 48)
$g.DrawString("NUTRITIOUS", $fontValues, $blackBrush, 360, 70)
$g.DrawString("FOR A BETTER YOU", $fontValues, $blackBrush, 360, 92)

# 2. Kitchen Order Badge (Inverted Black Bar)
$g.FillRectangle($blackBrush, 60, 140, 456, 48)
$fontKot = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
$formatCenter = New-Object System.Drawing.StringFormat
$formatCenter.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("KITCHEN ORDER", $fontKot, $whiteBrush, 288, 148, $formatCenter)

$fontKotSub = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$g.DrawString("PREPARE WITH CARE", $fontKotSub, $blackBrush, 288, 196, $formatCenter)

# Dashed Line 1
$g.DrawLine($dashedPen, 20, 224, 556, 224)

# 3. Order Details (Larger Font Size + User Name Added)
$fontMeta = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$fontMetaVal = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)

$metaY = 240
$g.DrawString("Order No   :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($orderData.orderNo, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Officer     :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($userName, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Date         :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($orderData.date, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Time         :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($orderData.time, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Table        :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($orderData.table, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Order Type :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($orderData.orderType, $fontMetaVal, $blackBrush, 150, $metaY)

# Table Box on Right
$tableBoxPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2.5)
$g.DrawRectangle($tableBoxPen, 390, 240, 162, 185)
$fontTableLabel = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
$fontTableNum = New-Object System.Drawing.Font("Arial", 40, [System.Drawing.FontStyle]::Bold)
$g.DrawString("TABLE", $fontTableLabel, $blackBrush, 471, 260, $formatCenter)
$g.DrawString($orderData.table, $fontTableNum, $blackBrush, 471, 315, $formatCenter)

# Dashed Line 2
$dash2Y = $metaY + 46
$g.DrawLine($dashedPen, 20, $dash2Y, 556, $dash2Y)

# 4. Items Table Header (Larger Font Size)
$fontTableHeader = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$g.DrawString("#", $fontTableHeader, $blackBrush, 25, ($dash2Y + 12))
$g.DrawString("ITEM", $fontTableHeader, $blackBrush, 70, ($dash2Y + 12))
$g.DrawString("QTY", $fontTableHeader, $blackBrush, 360, ($dash2Y + 12), $formatCenter)
$formatRight = New-Object System.Drawing.StringFormat
$formatRight.Alignment = [System.Drawing.StringAlignment]::Far
$g.DrawString("REMARKS", $fontTableHeader, $blackBrush, 550, ($dash2Y + 12), $formatRight)

$g.DrawLine($blackPen, 20, ($dash2Y + 42), 556, ($dash2Y + 42))

# Items List (Larger, High Visibility Font)
$curY = $dash2Y + 54
$fontItem = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $items.Count; $i++) {
    $item = $items[$i]
    $g.DrawString([string]($i + 1), $fontItem, $blackBrush, 25, $curY)
    $g.DrawString([string]$item.name, $fontItem, $blackBrush, 70, $curY)
    $g.DrawString([string]$item.qty, $fontItem, $blackBrush, 360, $curY, $formatCenter)
    $rem = if ($item.remarks) { [string]$item.remarks } else { "-" }
    $g.DrawString($rem, $fontItem, $blackBrush, 550, $curY, $formatRight)
    $curY += $rowHeight
}

# Dashed Line 3
$curY += 10
$g.DrawLine($dashedPen, 20, $curY, 556, $curY)

# 5. Special Instructions (Larger Font Size)
$curY += 20
if (Test-Path $noteIconPath) {
    try {
        $noteImg = [System.Drawing.Image]::FromFile($noteIconPath)
        $g.DrawImage($noteImg, 25, $curY, 32, 40)
        $noteImg.Dispose()
    } catch {}
}

$fontInstTitle = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$fontInstText = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$g.DrawString("SPECIAL INSTRUCTIONS :", $fontInstTitle, $blackBrush, 68, $curY)
$instText = if ($orderData.instructions) { [string]$orderData.instructions } else { "None" }
$g.DrawString($instText, $fontInstText, $blackBrush, 68, ($curY + 28))

# Dashed Line 4
$curY += 68
$g.DrawLine($dashedPen, 20, $curY, 556, $curY)

# 6. Footer Section (Larger Font Size)
$curY += 22
$fontFooterCallout = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$g.DrawString("KINDLY PREPARE AND SERVE FRESH", $fontFooterCallout, $blackBrush, 288, $curY, $formatCenter)

# Thank You with decorative lines
$curY += 30
$g.DrawLine($blackPen, 70, $curY + 16, 185, $curY + 16)

if (Test-Path $thankYouPath) {
    try {
        $tyImg = [System.Drawing.Image]::FromFile($thankYouPath)
        $g.DrawImage($tyImg, 205, $curY - 6, 166, 38)
        $tyImg.Dispose()
    } catch {
        $fontThankYou = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Italic)
        $g.DrawString("Thank You", $fontThankYou, $blackBrush, 288, $curY, $formatCenter)
    }
} else {
    $fontThankYou = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Italic)
    $g.DrawString("Thank You", $fontThankYou, $blackBrush, 288, $curY, $formatCenter)
}

$g.DrawLine($blackPen, 390, $curY + 16, 505, $curY + 16)

# Footer Branding
$curY += 44
$fontFootBrand = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$fontFootSub = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$g.DrawString("CANTEEN SERVICES", $fontFootBrand, $blackBrush, 288, $curY, $formatCenter)
$g.DrawString("GOOD FOOD. GREATER SERVICE.", $fontFootSub, $blackBrush, 288, ($curY + 20), $formatCenter)

$g.Dispose()

# Save generated PNG for debugging / archiving
$tempPngPath = "C:\Users\Nikhil\Downloads\Printer-Test\chef bill\temp_print.png"
try {
    $bmp.Save($tempPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
} catch {}

# Convert Bitmap to ESC/POS Raster Bytes
$width = $bmp.Width
$height = $bmp.Height
$widthBytes = [int](($width + 7) / 8)

$bytes = New-Object System.Collections.Generic.List[byte]

# Reset / initialize
$bytes.Add(0x1B); $bytes.Add(0x40)
# Line spacing 0
$bytes.Add(0x1B); $bytes.Add(0x33); $bytes.Add(0x00)
# Center alignment
$bytes.Add(0x1B); $bytes.Add(0x61); $bytes.Add(0x01)

# GS v 0 0 xL xH yL yH
$bytes.Add(0x1D); $bytes.Add(0x76); $bytes.Add(0x30); $bytes.Add(0x00)
$bytes.Add([byte]($widthBytes -band 0xFF))
$bytes.Add([byte](($widthBytes -shr 8) -band 0xFF))
$bytes.Add([byte]($height -band 0xFF))
$bytes.Add([byte](($height -shr 8) -band 0xFF))

$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = [Math]::Abs($bmpData.Stride)
$rawBytes = New-Object byte[] ($stride * $height)
[System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $rawBytes, 0, $rawBytes.Length)
$bmp.UnlockBits($bmpData)
$bmp.Dispose()

for ($y = 0; $y -lt $height; $y++) {
    $rowOffset = $y * $stride
    for ($xb = 0; $xb -lt $widthBytes; $xb++) {
        $byteVal = 0
        for ($bit = 0; $bit -lt 8; $bit++) {
            $px = ($xb * 8) + $bit
            if ($px -lt $width) {
                $pixelOffset = $rowOffset + ($px * 4)
                $b = $rawBytes[$pixelOffset]
                $g = $rawBytes[$pixelOffset + 1]
                $r = $rawBytes[$pixelOffset + 2]
                $lum = 0.299 * $r + 0.587 * $g + 0.114 * $b
                if ($lum -lt 180) {
                    $byteVal = $byteVal -bor (0x80 -shr $bit)
                }
            }
        }
        $bytes.Add([byte]$byteVal)
    }
}

# Feed 4 lines
$bytes.Add(0x1B); $bytes.Add(0x64); $bytes.Add(0x04)
# Cut paper
$bytes.Add(0x1D); $bytes.Add(0x56); $bytes.Add(0x42); $bytes.Add(0x00)

Write-Host "Transmitting exact Large-Font Chef Bill raster ($($bytes.Count) bytes) to $PrinterName..."
$success = [RawChefPrinter]::SendBytesToPrinter($PrinterName, $bytes.ToArray())

if ($success) {
    Write-Host "Exact Large-Font Chef Bill printed on $PrinterName successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to send Chef Bill to $PrinterName." -ForegroundColor Red
}
