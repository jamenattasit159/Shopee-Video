# shopee_gpt Studio

สตูดิโอส่วนตัวสำหรับคลิปรีวิวสินค้าไทย: ลิงก์ Shopee → ข้อเท็จจริงและประสบการณ์ → ฟุตเทจจริง → สคริปต์รายซีน → เสียงพากย์ → CapCut × Codex

โปรเจกต์ใหม่นี้แยกจากแอปเดิม ไม่ใช้ Remotion เรนเดอร์คลิป และไม่คัดลอกข้อมูลสินค้าหรือฟุตเทจเดิมเข้าฐานข้อมูลโดยอัตโนมัติ เจ้าของเลือก **ใช้เองก่อนแล้วค่อยขาย** และเลือก UI แบบ B ที่เน้นบทพูดกับการจับคู่ช็อต

## เริ่มใช้

ต้องมี Node.js **22.13 ขึ้นไป** (แนะนำ 24 LTS) และ Python 3.10+ ถ้าจะสร้างเสียงอัตโนมัติ

```powershell
cd 'D:\html pro\shopeevido\shopee_gpt'
npm install
Copy-Item .env.example .env.local
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# ตั้ง PYTHON_PATH ใน .env.local เป็น absolute path ของ .venv/Scripts/python.exe
npm run dev
```

เปิด http://127.0.0.1:3100 — ถ้า .env.local มีอยู่แล้ว **อย่าคัดลอกทับ** การติดตั้งครั้งนี้เตรียม dependencies, Python environment และค่า PYTHON_PATH ไว้แล้ว นำค่า Gemini ที่ตั้งในระบบเดิมมาใช้โดยไม่แสดงค่าใน logs

สคริปต์ runtime ใช้ Node LTS ของ Codex บนเครื่องนี้เป็นทางเลือกเมื่อ PATH ยังเป็น Node 20 บนเครื่องลูกค้าควรติดตั้ง Node LTS ตามปกติ

## ขั้นตอนทำงาน

1. สร้างโปรเจกต์ วางลิงก์หรือข้อความแชร์จาก Shopee ดึงชื่อและราคาจาก Affiliate API เมื่อมี credentials หากดึงไม่ได้กรอกเองได้และระบบแจ้งชัดเจน
2. กรอกข้อเท็จจริงจากสินค้าและสิ่งที่พบจากการใช้งานจริงแยกกัน ตรวจชื่อและราคาแล้วยืนยัน ไม่มีการแต่งรีวิวแทนผู้ใช้
3. อัปโหลดวิดีโอ MP4/MOV/WebM และภาพ JPG/PNG/WebP จัดบทบาทเปิดเรื่อง/สาธิต/รายละเอียด/ปิดท้าย ยืนยันสิทธิ์ในสื่อ
4. วางสคริปต์ ปรับบทพูด ข้อความจอ และแนวภาพ เลือกไฟล์กับช่วงเริ่ม/ความยาวรายซีน ซีนที่เลือกขยายเพื่อแก้และดูไฟล์ต้นฉบับด้านข้าง ซีนอื่นย่อให้อ่านลำดับเรื่องได้เร็ว
5. บันทึกด้วยปุ่มหรือ Ctrl/Cmd+S การเปลี่ยนบทจะยกเลิกการเลือกเสียงเดิมเพื่อป้องกันบทกับเสียงไม่ตรงกัน ระบบแจ้งเมื่อมีข้อมูลที่ยังไม่บันทึกและป้องกันการเขียนทับจากหน้าต่างอื่น
6. เลือก **Gemini 3.8 Flash TTS** (โมเดล `gemini-3.8-flash-tts`) พร้อม Puck/Kore/เสียงมาตรฐานหรือ `voice_` ID เดิม กดโหลดเสียงโคลนจาก Google project ของ API key เดิมได้โดยไม่โคลนซ้ำ มี preset เดิม 6 แบบ, ความเข้ม, style prompt แยกจากบทพูด, ความเร็ว, compressor/EQ/loudness, ตัวอย่างเสียงสั้น และพจนานุกรมคำอ่าน หรือเลือก Edge TTS/เสียงต้นฉบับ/อัปโหลดเสียงเองก็ได้ การทดสอบสร้างไฟล์จริงสำเร็จด้วย Gemini 3.8 และ Niwat ส่วน Premwadee ไม่ส่งเสียงกลับมาในรอบทดสอบนี้ ระบบแจ้งสาเหตุและไม่เปลี่ยนผู้ให้บริการให้เงียบ ๆ
7. ตรวจ readiness แล้วเตรียมงานให้ Codex คัดลอกคำสั่งไปแชตที่ติดตั้ง CapCut ไว้ เพื่อดูพรีวิวและตอบขั้นตอนโต้ตอบ ผลสำเร็จต้องเป็น draft ID และ editor URL ที่ CapCut คืนจริง
8. เปิด draft ตรวจภาพ เสียง ราคา ซับและสิทธิ์เพลงก่อนส่งออก/โพสต์ ระบบนี้ไม่ซื้อเครดิต ไม่ส่งออกจาก CapCut โดยอ้างว่าเสร็จเอง และไม่โพสต์แทนผู้ใช้

## CapCut และ Codex

ติดตั้งจากหน้า [CapCut × Codex ทางการ](https://www.capcut.com/tools/capcut-x-codex) และอนุญาตบัญชีในเบราว์เซอร์ Codex การติดตั้งครั้งนี้ลงปลั๊กอิน **CapCut@CapCut 0.2.1** และอนุญาตบัญชีสำเร็จแล้ว ไม่เก็บ OAuth token ในโปรเจกต์

มีสองช่องทาง:

- **ช่องทางหลัก — แชต Codex:** “เตรียมงานให้ Codex” → คัดลอกคำสั่ง → วางในแชต Codex ที่มีปลั๊กอิน → รับ draft → บันทึกผลผ่าน Studio MCP หรือกรอก ID/URL ที่ได้รับจริง วิธีนี้รองรับพรีวิวและการโต้ตอบของปลั๊กอิน
- **ตัวเชื่อม CLI — ทดลอง:** ทำงานผ่าน `codex exec` ใน process แยก มีคิวครั้งละหนึ่งงาน, snapshot, timeout, ยกเลิก และตรวจหลักฐาน URL/ID จากผล MCP ก่อนบันทึกสำเร็จ ถ้าต้อง OAuth หรือฟอร์มโต้ตอบให้ทำต่อในแชต ไม่รับรองว่า workflow แบบมี interactive card จะทำงานแบบ unattended ได้

พบปลั๊กอินไม่ได้แปลว่าสิทธิ์บัญชีหรือโควตายังใช้ได้ health จึงบอกเพียงสถานะติดตั้ง งานตัดต่อจริงเป็นการตรวจสิทธิ์ใช้งานในขณะนั้น

### Studio MCP

การติดตั้งครั้งนี้ลงทะเบียน `shopee_studio` ใน Codex แล้ว เปิดแชตใหม่เพื่อให้โหลดเครื่องมือชุดใหม่

MCP โหลด `.env.local` จากโฟลเดอร์แอปโดยตรง จึงใช้ Gemini/เสียงโคลนและตำแหน่งข้อมูลเดียวกับเว็บได้แม้ Codex เรียกจากโฟลเดอร์อื่น โดยไม่ส่ง API key กลับผ่านเครื่องมือ

เครื่องมือ: `list_projects`, `get_project`, `create_project`, `update_project`, `archive_project`, `generate_script`, `generate_voice`, `prepare_edit_job`, `get_edit_package`, `list_jobs`, `cancel_job`, `complete_job`

หากย้ายเครื่อง ให้ลงทะเบียนใหม่ด้วย Node LTS และ absolute paths:

```text
codex mcp add shopee_studio --env STUDIO_DATA_DIR=<absolute-project-path>/data --env PYTHON_PATH=<absolute-python-path> -- <absolute-node-path> <absolute-project-path>/node_modules/tsx/dist/cli.mjs <absolute-project-path>/scripts/mcp.ts
```

ตัวอย่างคำสั่งในแชต:

> ใช้ shopee_studio ค้นโปรเจกต์ชื่อ ... อ่านข้อเท็จจริงและประสบการณ์จริง ปรับบทให้เหมาะกับฟุตเทจ แล้วบันทึกด้วย revision ล่าสุด ห้ามแต่งผลลัพธ์การใช้งาน

> ใช้ CapCut × Codex ตัดต่อจาก get_edit_package ของ job ... ตาม brief อัปโหลดเฉพาะไฟล์ที่ manifest เลือกไว้ เมื่อ cloud save สำเร็จให้ complete_job ด้วย draft ID และ editor URL จาก CapCut จริง

## การเก็บข้อมูล

- `data/studio.sqlite`: โปรเจกต์, metadata ของไฟล์, งาน CapCut, activity; SQLite WAL + transaction + optimistic revision
- `data/media/`: ไฟล์ต้นฉบับและ thumbnail ชื่อไฟล์ภายในเป็น UUID ไม่มี executable หรือ SVG ที่อัปโหลดผ่าน UI
- `data/jobs/<job-id>/`: snapshot ของ manifest, brief และผล CLI
- `data/tmp/`: ไฟล์ชั่วคราวระหว่างสร้างเสียง ลบทิ้งหลังทำงาน
- `.env.local`: ค่าของผู้ให้บริการ เก็บนอก Git; ไม่ส่งเข้า ZIP
- `data/diagnostics/issues.jsonl`: ข้อผิดพลาดที่ผ่านการปิดบังข้อมูลลับ พร้อม code/source/เวลา/สาเหตุ/วิธีแก้; บันทึกแยกจาก SQLite เพื่อยังอ่านได้เมื่อฐานข้อมูลมีปัญหา

## เสียงโคลนและศูนย์ข้อผิดพลาด

ในแท็บเสียงพากย์ เลือก Gemini แล้วโหลดเสียงโคลนเดิม (การตรวจครั้งนี้พบ 3 เสียงจากคีย์เดิม) หรือกดโคลนเสียงของฉัน: แนบ/อัดเสียงผู้ใหญ่เจ้าของเสียง 10–30 วินาที และเสียงยินยอมของคนเดียวกันอ่านประโยคที่แสดงทุกคำ ระบบแปลงเป็น WAV mono 24 kHz และส่งให้ Google ตรวจ consent ไม่สร้างเสียงโคลนโดยไม่มีไฟล์จริงและคำยินยอม ไฟล์ชั่วคราวถูกลบหลังคำขอ เสียงที่ Google เก็บสามารถเลือก ลอง และลบได้ โดยการลบมีผลกับทุกโปรเจกต์ในบัญชีนั้น

ปุ่ม “ข้อผิดพลาด” ด้านบนรวบรวม API, browser/React, network, media/resource, voice/consent, CapCut worker และ runtime startup/exit มีรายละเอียดที่ปิดบัง API key, วิธีแก้, รับทราบ และคัดลอกรายงาน มี health check ฐานข้อมูล/สิทธิ์เขียน และ watchdog ทุก 15 วินาที ถ้าเซิร์ฟเวอร์ในเครื่องหยุด หน้าเว็บที่โหลดแล้วจะแสดงแถบแจ้งเตือนและเก็บรายการฝั่งเบราว์เซอร์ไว้ส่งกลับเมื่อเชื่อมต่อได้

แยก output เป็น `.next-dev` และ `.next-production` เพื่อไม่ให้การ build ทำไฟล์ของ dev server หาย ตัว launcher ปฏิเสธ build ขณะ `npm start` ของสตูดิโอยังรันอยู่: หยุด production ก่อน build แล้วค่อย start ใหม่ สำหรับการใช้งานระหว่างพัฒนาใช้ `npm run dev` ที่พอร์ต 3100

สำรองทั้งโฟลเดอร์ `data` เมื่อปิดเว็บและงานตัดต่อแล้ว หรือใช้ SQLite backup API พร้อมสำเนา media อย่าคัดลอกเฉพาะไฟล์ `.sqlite` ขณะที่ WAL กำลังเขียน หากตั้ง `STUDIO_DATA_DIR` ให้ Studio MCP ใช้ตำแหน่งเดียวกัน

แพ็กเกจ ZIP มี `manifest.json`, `EDITING_BRIEF.md`, `caption.txt`, `captions-estimated.srt` และ **ไฟล์รูป วิดีโอ และเสียงที่เลือกใช้จริง** paths ใน ZIP เป็น relative ไม่มี credentials ZIP เป็น handoff package ไม่ใช่ native CapCut project; เวลาซับประมาณจากซีน ต้องจัดตามเสียงจริงใน CapCut

## ตรวจสอบ

```powershell
npm run typecheck
npm test
npm run build
```

ชุดทดสอบตรวจ partial PATCH ไม่ล้างฟิลด์อื่น, creation time/revision, archive, file signatures/metadata, video range requests, readiness, URL validation และ SRT

API smoke test ทำบน server ที่แยกข้อมูลเท่านั้น:

```powershell
$env:STUDIO_DATA_DIR = "$PWD/.tmp/qa-data"
$env:PORT = '3101'
$env:GEMINI_API_KEY = '' # ทดสอบโครงสคริปต์โดยไม่เรียก paid API
npm start
# อีก terminal: node scripts/smoke.mjs (ใช้ Node 22.13+)
```

ทดสอบ UI ด้วย Edge headless บน desktop 1440, tablet 834, mobile 390 และ light theme: แก้บทแล้ว refresh ยังอยู่, เปลี่ยนแท็บได้, ไม่มี horizontal overflow และไม่มี browser page errors ข้อมูล/วิดีโอ QA ถูกระบุว่าเป็นการทดสอบและอยู่คนละฐานข้อมูลกับการใช้จริง

**ยังไม่ได้ทดสอบตัดต่อ CapCut จนได้ draft ด้วยฟุตเทจสินค้าจริงของโปรเจกต์นี้** เพราะยังไม่มีการแนบฟุตเทจจริงให้แอปใหม่ ผลการ OAuth ไม่ใช่ผลการสร้างคลิป

## ก่อนเปิดขาย

นี่คือรุ่นใช้ส่วนตัวบน localhost มี Host/Origin checks และ bind loopback ยังไม่ใช่ multi-tenant SaaS ที่เปิดอินเทอร์เน็ตได้ ไม่ได้เพิ่มระบบสมาชิก ชำระเงิน หรือโฆษณาความนิยมที่ยังไม่มีหลักฐาน ดู [แผนต่อยอดขาย](docs/COMMERCIAL_ROADMAP.md)

CapCut plugin เป็นซอฟต์แวร์ของ CapCut อย่านำ bundle ทางการไปแจกพร้อมสินค้าที่ขายโดยไม่มีสิทธิ์ ให้ลูกค้าติดตั้งและเชื่อมบัญชีของตนผ่านช่องทางผู้ให้บริการ ค่าใช้จ่าย โควตาและสิทธิ์เพลง/เอฟเฟกต์เป็นไปตามบัญชีและเงื่อนไขของผู้ให้บริการ
