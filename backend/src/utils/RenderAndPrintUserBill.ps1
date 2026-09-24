param(
    [string]$PrinterName = "POS-80C",
    [string]$BillJsonPath = ""
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

# Raw Printer P/Invoke Helper
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawUserInvoicePrinter
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
        di.pDocName = "IAS Food Invoice Bill";
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

if (-not ([System.Management.Automation.PSTypeName]'RawUserInvoicePrinter').Type) {
    Add-Type -TypeDefinition $code -Language CSharp
}

# Read Bill JSON
$billData = $null
if (-not [string]::IsNullOrWhiteSpace($BillJsonPath) -and (Test-Path $BillJsonPath)) {
    $billData = Get-Content $BillJsonPath -Raw | ConvertFrom-Json
}

if (-not $billData) {
    $billData = [PSCustomObject]@{
        invoiceNo = "INV-" + (Get-Date -Format "yyMMdd") + "-001"
        userName = "IAS Officer"
        designation = "Special Duty Officer"
        department = "Cabinet Secretariat"
        date = (Get-Date -Format "dd MMM yyyy")
        time = (Get-Date -Format "hh:mm tt")
        paymentStatus = "PAID"
        paymentMethod = "Online UPI"
        totalAmount = 260
        items = @(
            [PSCustomObject]@{ id = 1; name = "Veg Biryani"; qty = 1; price = 120; total = 120 },
            [PSCustomObject]@{ id = 2; name = "Paneer Butter Masala"; qty = 1; price = 140; total = 140 }
        )
    }
}

$userName = if ($billData.userName) { [string]$billData.userName } else { "IAS Officer" }
$invoiceNo = if ($billData.invoiceNo) { [string]$billData.invoiceNo } else { "INV-" + (Get-Date -Format "yyyyMMddHHmm") }
$dateStr = if ($billData.date) { [string]$billData.date } else { (Get-Date -Format "dd MMM yyyy") }
$timeStr = if ($billData.time) { [string]$billData.time } else { (Get-Date -Format "hh:mm tt") }
$totalAmount = if ($billData.totalAmount) { [string]$billData.totalAmount } else { "0" }

$items = @($billData.items)
$itemCount = $items.Count
$rowHeight = 44
$canvasWidth = 576
$canvasHeight = 880 + ($itemCount * $rowHeight)

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
$g.DrawString("GOVERNMENT OF INDIA", $fontBrandSub, $blackBrush, 130, 84)
$g.DrawString("GOOD FOOD. GREATER SERVICE.", $fontBrandSub, $blackBrush, 130, 98)

# Vertical line separator
$g.DrawLine($blackPen, 345, 18, 345, 120)

# Values Column
$fontValues = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$g.DrawString("OFFICIAL", $fontValues, $blackBrush, 360, 26)
$g.DrawString("TAX INVOICE", $fontValues, $blackBrush, 360, 48)
$g.DrawString("PAID RECEIPT", $fontValues, $blackBrush, 360, 70)
$g.DrawString("DIGITAL COPY", $fontValues, $blackBrush, 360, 92)

# 2. Paid Invoice Badge (Inverted Black Bar)
$g.FillRectangle($blackBrush, 60, 140, 456, 48)
$fontBadge = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
$formatCenter = New-Object System.Drawing.StringFormat
$formatCenter.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("FOOD INVOICE (PAID)", $fontBadge, $whiteBrush, 288, 148, $formatCenter)

$fontBadgeSub = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$g.DrawString("ONLINE PAYMENT VERIFIED", $fontBadgeSub, $blackBrush, 288, 196, $formatCenter)

# Dashed Line 1
$g.DrawLine($dashedPen, 20, 224, 556, 224)

# 3. Invoice & Officer Details
$fontMeta = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$fontMetaVal = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)

$metaY = 240
$g.DrawString("Invoice No :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($invoiceNo, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Officer     :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($userName, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Date         :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($dateStr, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Time         :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString($timeStr, $fontMetaVal, $blackBrush, 150, $metaY)

$metaY += 36
$g.DrawString("Status      :", $fontMeta, $blackBrush, 25, $metaY)
$g.DrawString("PAID (UPI)", $fontMetaVal, $blackBrush, 150, $metaY)

# Dashed Line 2
$dash2Y = $metaY + 46
$g.DrawLine($dashedPen, 20, $dash2Y, 556, $dash2Y)

# 4. Items Table Header
$fontTableHeader = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$g.DrawString("#", $fontTableHeader, $blackBrush, 25, ($dash2Y + 12))
$g.DrawString("ITEM", $fontTableHeader, $blackBrush, 65, ($dash2Y + 12))
$g.DrawString("QTY", $fontTableHeader, $blackBrush, 330, ($dash2Y + 12), $formatCenter)
$g.DrawString("RATE", $fontTableHeader, $blackBrush, 430, ($dash2Y + 12), $formatCenter)

$formatRight = New-Object System.Drawing.StringFormat
$formatRight.Alignment = [System.Drawing.StringAlignment]::Far
$g.DrawString("AMT (Rs)", $fontTableHeader, $blackBrush, 550, ($dash2Y + 12), $formatRight)

$g.DrawLine($blackPen, 20, ($dash2Y + 40), 556, ($dash2Y + 40))

# Items List
$curY = $dash2Y + 50
$fontItem = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $items.Count; $i++) {
    $item = $items[$i]
    $g.DrawString([string]($i + 1), $fontItem, $blackBrush, 25, $curY)
    $g.DrawString([string]$item.name, $fontItem, $blackBrush, 65, $curY)
    $g.DrawString([string]$item.qty, $fontItem, $blackBrush, 330, $curY, $formatCenter)
    $priceVal = if ($item.price) { [string]$item.price } else { "0" }
    $g.DrawString($priceVal, $fontItem, $blackBrush, 430, $curY, $formatCenter)
    $totVal = if ($item.total) { [string]$item.total } else { ([int]$item.qty * [double]$priceVal).ToString() }
    $g.DrawString($totVal, $fontItem, $blackBrush, 550, $curY, $formatRight)
    $curY += $rowHeight
}

# Dashed Line 3
$curY += 10
$g.DrawLine($dashedPen, 20, $curY, 556, $curY)

# 5. Total Paid Box
$curY += 20
$fontTotalLabel = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
$fontTotalVal = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)

$g.DrawString("TOTAL PAID :", $fontTotalLabel, $blackBrush, 25, $curY)
$g.DrawString("Rs. $totalAmount", $fontTotalVal, $blackBrush, 550, $curY, $formatRight)

# Dashed Line 4
$curY += 50
$g.DrawLine($dashedPen, 20, $curY, 556, $curY)

# 6. Footer Section
$curY += 22
$fontFooterCallout = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$g.DrawString("THANK YOU FOR YOUR SERVICE", $fontFooterCallout, $blackBrush, 288, $curY, $formatCenter)

# Thank You Graphic / Script
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

# Save rendered image for direct PDF export
$tempBillPng = "C:\Users\Nikhil\Downloads\restaurant\backend\temp_user_bill.png"
try {
    $bmp.Save($tempBillPng, [System.Drawing.Imaging.ImageFormat]::Png)
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

Write-Host "Transmitting exact User Paid Invoice raster ($($bytes.Count) bytes) to $PrinterName..."
$success = [RawUserInvoicePrinter]::SendBytesToPrinter($PrinterName, $bytes.ToArray())

if ($success) {
    Write-Host "Exact User Paid Invoice printed on $PrinterName successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to send User Paid Invoice to $PrinterName." -ForegroundColor Red
}
