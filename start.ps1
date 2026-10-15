# ================================================================
#  Shopee Affiliate Video Production System - Startup Script
# ================================================================

$Host.UI.RawUI.WindowTitle = "Shopee Video Production System"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Header {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "       🎬 Shopee Affiliate Video Production System 🛒" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Environment {
    # 1. ตรวจสอบ Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "[X] ไม่พบ Node.js ในระบบ!" -ForegroundColor Red
        Write-Host "กรุณาดาวน์โหลดและติดตั้ง Node.js ก่อนใช้งาน: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "กด Enter เพื่อปิดหน้าต่าง..."
        exit 1
    }

    # 2. ตรวจสอบ .env.local
    if (-not (Test-Path ".env.local")) {
        if (Test-Path ".env.example") {
            Write-Host "[!] ไม่พบไฟล์ .env.local กำลังคัดลอกจาก .env.example..." -ForegroundColor Yellow
            Copy-Item ".env.example" ".env.local"
            Write-Host "[✓] สร้างไฟล์ .env.local เรียบร้อยแล้ว (สามารถใส่ API Key เพิ่มเติมได้)" -ForegroundColor Green
        }
    }

    # 3. ตรวจสอบโฟลเดอร์จำเป็น
    $folders = @("public\uploads", "public\renders", "renders", "data")
    foreach ($dir in $folders) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    if (-not (Test-Path "data\products.json")) {
        Set-Content -Path "data\products.json" -Value "[]" -Encoding UTF8
    }

    # 4. ตรวจสอบ node_modules
    if (-not (Test-Path "node_modules")) {
        Write-Host "[!] ไม่พบโฟลเดอร์ node_modules กำลังติดตั้ง Dependencies (npm install)..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] ติดตั้ง Dependencies ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต" -ForegroundColor Red
            Read-Host "กด Enter เพื่อปิด..."
            exit 1
        }
        Write-Host "[✓] ติดตั้ง Dependencies สำเร็จ!" -ForegroundColor Green
    }
}

function Get-Port3000Process {
    try {
        $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess) {
            return (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue)
        }
    } catch {}
    return $null
}

Show-Header
Check-Environment

# ตรวจสอบสถานะ Port 3000
$existingProc = Get-Port3000Process

if ($existingProc) {
    Write-Host "🟢 ตรวจพบเซิร์ฟเวอร์เปิดใช้งานอยู่แล้วที่ http://localhost:3000 (PID: $($existingProc.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "ตัวเลือกด่วน:" -ForegroundColor Yellow
    Write-Host " [1] เปิดหน้าต่างเบราว์เซอร์ไปที่ระบบทันที [ค่าเริ่มต้น]" -ForegroundColor Green
    Write-Host " [2] รีสตาร์ตเซิร์ฟเวอร์ใหม่ (ปิดตัวเดิมแล้วเปิดใหม่)"
    Write-Host " [3] เริ่มต้น Dev Server เพิ่มเติมบนพอร์ตสำรอง"
    Write-Host " [4] ไปที่เมนูหลัก (เลือกเมนูอื่น ๆ)"
    Write-Host " [0] ออกจากโปรแกรม (Exit)"
    Write-Host ""
    
    $quickChoice = Read-Host "กรุณาเลือก [กด Enter เพื่อเลือก 1]:"
    if ([string]::IsNullOrWhiteSpace($quickChoice)) { $quickChoice = "1" }

    if ($quickChoice -eq "1") {
        Write-Host "🌐 กำลังเปิดเบราว์เซอร์ http://localhost:3000 ..." -ForegroundColor Cyan
        Start-Process "http://localhost:3000"
        Start-Sleep -Seconds 1
        exit 0
    } elseif ($quickChoice -eq "2") {
        Write-Host "กำลังปิด Process เดิม (PID: $($existingProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $existingProc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "[✓] ปิดเซิร์ฟเวอร์เดิมเรียบร้อยแล้ว กำลังเริ่มใหม่..." -ForegroundColor Green
        # จะไหลไปรัน dev
        $choice = "1"
        goto RunSelectedOption
    } elseif ($quickChoice -eq "3") {
        # รัน dev ซึ่ง Next.js จะเลือกพอร์ตถัดไป (เช่น 3001) ให้อัตโนมัติ
        $choice = "1"
        goto RunSelectedOption
    } elseif ($quickChoice -eq "0") {
        exit 0
    }
}

Show-Header

Write-Host "เมนูการทำงาน (เลือกตัวเลขแล้วกด Enter):"
Write-Host "----------------------------------------------------------------"
Write-Host " [1] เริ่มต้น Web Dashboard (Next.js Dev - http://localhost:3000) *แนะนำ*" -ForegroundColor Green
Write-Host " [2] เริ่มต้น Remotion Preview Studio (สำหรับพัฒนาแอนิเมชันวิดีโอ)"
Write-Host " [3] เรนเดอร์วิดีโอทดสอบผ่าน CLI (scripts/render.mjs)"
Write-Host " [4] อัปเดต/ติดตั้งแพ็กเกจใหม่ (npm install)"
Write-Host " [5] Build และรันในโหมด Production (npm run build & npm start)"
Write-Host " [0] ออกจากโปรแกรม (Exit)"
Write-Host "----------------------------------------------------------------"
Write-Host ""

$choice = Read-Host "กรุณาเลือกตัวเลือก [กด Enter เพื่อเริ่มข้อ 1 ทันที]"
if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "1"
}

:RunSelectedOption

switch ($choice) {
    "1" {
        Show-Header
        Write-Host "🚀 กำลังเริ่มต้นระบบ Shopee Video Dashboard..." -ForegroundColor Green
        Write-Host "🌐 URL: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "💡 ระบบจะเปิดเบราว์เซอร์ให้อัตโนมัติเมื่อเซิร์ฟเวอร์พร้อม..." -ForegroundColor Yellow
        Write-Host ""

        # สั่งเปิดเบราว์เซอร์หลังจากเซิร์ฟเวอร์เริ่มบูต (3 วินาที)
        Start-Job -ScriptBlock {
            Start-Sleep -Seconds 3
            Start-Process "http://localhost:3000"
        } | Out-Null

        npm run dev
    }
    "2" {
        Show-Header
        Write-Host "🎬 กำลังเปิด Remotion Preview Studio..." -ForegroundColor Cyan
        npm run remotion:preview
    }
    "3" {
        Show-Header
        Write-Host "🎥 กำลังรันสคริปต์เรนเดอร์ทดสอบ (scripts/render.mjs)..." -ForegroundColor Cyan
        node scripts/render.mjs
        Write-Host ""
        Read-Host "กด Enter เพื่อกลับ..."
    }
    "4" {
        Show-Header
        Write-Host "📦 กำลังติดตั้งหรืออัปเดต Dependencies (npm install)..." -ForegroundColor Yellow
        npm install
        Write-Host ""
        Write-Host "[✓] ดำเนินการเสร็จสิ้น!" -ForegroundColor Green
        Read-Host "กด Enter เพื่อปิด..."
    }
    "5" {
        Show-Header
        Write-Host "🏗️ กำลัง Build สำหรับ Production..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[✓] Build สำเร็จ! กำลังเริ่ม Production Server..." -ForegroundColor Green
            Start-Job -ScriptBlock {
                Start-Sleep -Seconds 3
                Start-Process "http://localhost:3000"
            } | Out-Null
            npm run start
        } else {
            Write-Host ""
            Write-Host "[X] Build ล้มเหลว กรุณาตรวจสอบข้อผิดพลาดด้านบน" -ForegroundColor Red
            Read-Host "กด Enter เพื่อปิด..."
        }
    }
    default {
        exit 0
    }
}