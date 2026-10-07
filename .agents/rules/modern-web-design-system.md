---
description: "UI/UX Master Rule - Modern Web Design System"
always_on: true
---

# UI/UX MASTER RULE — MODERN WEB DESIGN SYSTEM

คุณต้องออกแบบและพัฒนา UI โดยยึด Design System นี้เป็นข้อบังคับ
ห้ามออกแบบ CSS ตามจินตนาการแบบ Dashboard สำเร็จรูป

## TECHNOLOGY STACK

- Tailwind CSS ล่าสุด
- daisyUI@latest
- React / Next.js
- Lucide React สำหรับ icons
- ใช้ CSS custom เท่าที่จำเป็น
- ห้ามสร้าง component UI ด้วย CSS ดิบซ้ำ ๆ หาก daisyUI มี component รองรับอยู่แล้ว

ติดตั้งและใช้งาน daisyUI เวอร์ชันล่าสุดเสมอ

ห้ามใช้:
- Bootstrap
- Material UI
- Ant Design
- shadcn/ui หากไม่ได้รับอนุญาต
- CSS Framework อื่น
- gradient เยอะเกินจำเป็น
- glassmorphism แบบหนัก ๆ
- UI ที่ดูเหมือนระบบราชการยุคเก่า
- Card ซ้อน Card โดยไม่มีเหตุผล
- ปุ่มหลายสีโดยไม่มี semantic meaning


# DESIGN DIRECTION

เป้าหมายคือ:

"Premium Modern SaaS / AI Product UI"

ต้องให้ความรู้สึกเหมือนผลิตภัณฑ์ระดับ:
- Linear
- Vercel
- Stripe
- Raycast
- Notion
- Arc
- modern AI SaaS

แต่ห้าม copy UI ของเว็บไซต์เหล่านี้โดยตรง


# CORE DESIGN PRINCIPLES

1. Minimal
2. Clean
3. Premium
4. High information density แต่ไม่อึดอัด
5. Typography ต้องชัด
6. Visual hierarchy ต้องชัดเจน
7. ใช้ whitespace อย่างมีระบบ
8. ลดเส้นกรอบที่ไม่จำเป็น
9. ลดจำนวนสี
10. ทุก component ต้องมีเหตุผลในการมีอยู่


# COLOR SYSTEM

ใช้ color system จาก daisyUI เป็นหลัก

Primary:
- ใช้สำหรับ CTA และ action สำคัญ

Secondary:
- ใช้เฉพาะ action รอง

Accent:
- ใช้เน้นข้อมูลสำคัญ

Neutral:
- ใช้สำหรับพื้นหลัง / surface / text

Success:
- สำเร็จ

Warning:
- แจ้งเตือน

Error:
- ผิดพลาด / destructive action

Info:
- ข้อมูลเพิ่มเติม

ห้ามสุ่มสีใหม่ในแต่ละ component

ห้ามใช้สีมากกว่า 1-2 accent colors ในหน้าเดียว


# DARK MODE

ต้องรองรับ Dark Mode เป็นหลัก

ใช้ daisyUI theme system

ตัวอย่าง:
- dark
- light

อย่า hard-code สีด้วย hex ซ้ำ ๆ เช่น

❌ #111827
❌ #1f2937
❌ #3b82f6

ให้ใช้ semantic color ของ Tailwind / daisyUI เช่น

✅ bg-base-100
✅ bg-base-200
✅ bg-base-300
✅ text-base-content
✅ text-primary
✅ text-secondary
✅ border-base-300
✅ btn-primary
✅ badge-success


# TYPOGRAPHY

ใช้ font ที่อ่านภาษาไทยได้ดี

แนะนำ:
Noto Sans Thai / IBM Plex Sans Thai / Geist + Noto Sans Thai

Hierarchy:

Page Title
text-2xl ถึง text-3xl
font-semibold

Section Title
text-lg ถึง text-xl
font-semibold

Body
text-sm ถึง text-base

Secondary text
text-sm
opacity-60 ถึง opacity-70

อย่าใช้ font-weight 700 หรือ 800 กับทุก element


# LAYOUT

ใช้ responsive layout แบบ modern SaaS

Desktop:
- max-width ประมาณ 1280–1440px
- ใช้ grid / flex
- sidebar กว้างประมาณ 240–280px เมื่อจำเป็น

Mobile:
- 1 column
- ปุ่มต้องกดง่าย
- spacing ลดลงอย่างเหมาะสม

ห้ามสร้าง layout ที่ทุกอย่างถูกยัดอยู่ใน card


# CARDS

Card ต้องใช้เฉพาะเมื่อมีการแบ่งกลุ่มข้อมูลจริง ๆ

ใช้:

card
card-body
bg-base-100
border border-base-300/50
rounded-2xl

แต่:

ห้ามทำทุก section เป็น card

ห้ามใช้ shadow หนัก

แนะนำ:
shadow-sm

หรือไม่มี shadow


# BUTTONS

ใช้ daisyUI button

เช่น:

btn
btn-primary
btn-secondary
btn-outline
btn-ghost
btn-error

Primary CTA ต้องโดดเด่นเพียง 1 action ต่อ section

หลีกเลี่ยงปุ่มสีส้ม / น้ำเงิน / เขียว / แดงเต็มหน้าพร้อมกัน


# INPUTS

ใช้ daisyUI:

input
textarea
select
file-input
toggle
checkbox
radio

ต้องมี:
- label
- placeholder
- helper text เมื่อจำเป็น
- validation state

Input ต้องมีพื้นที่หายใจเพียงพอ

ห้ามใช้ input ที่สูงหรือเตี้ยเกินไป


# ICONS

ใช้ Lucide React

ห้ามใช้ emoji เป็น icon ของ UI หลัก

❌ 🔥
❌ 📦
❌ ✨
❌ 🎯

ใช้:

Check
Upload
Sparkles
Settings
FileText
Image
Video
ArrowRight
Plus
Trash2

แทน

Emoji ใช้ได้เฉพาะใน content ที่ตั้งใจให้เป็น playful เท่านั้น


# SPACING

ใช้ Tailwind spacing system

แนะนำ:

space-y-4
space-y-6
space-y-8

p-4
p-6
p-8

อย่าใช้ spacing แบบสุ่ม เช่น:

13px
17px
23px

เว้นแต่มีเหตุผลด้าน visual design


# BORDER RADIUS

ใช้ modern radius

rounded-xl
rounded-2xl

หลีกเลี่ยง:
rounded-sm
rounded-md

สำหรับ main UI

อย่าทำทุกอย่างเป็น pill


# ANIMATION

ใช้ animation อย่างพอดี

อนุญาต:

transition
duration-200
ease-out

hover
focus
active

ใช้ motion อย่างมีเหตุผล

ห้าม:
- animation ทุก element
- bounce เยอะ
- flashy animation
- loading ที่รบกวนผู้ใช้


# RESPONSIVE

ต้องออกแบบ:

mobile
tablet
desktop
large desktop

ห้ามสร้าง desktop UI แล้วค่อยย่อด้วย CSS อย่างเดียว

ต้องคิด mobile layout ตั้งแต่แรก


# ACCESSIBILITY

ต้องรองรับ:

- keyboard navigation
- focus-visible
- aria-label
- contrast
- semantic HTML

ทุก icon-only button ต้องมี aria-label


# COMPONENT ARCHITECTURE

สร้าง reusable components เช่น:

Button
Input
Modal
Dialog
Dropdown
Tabs
Badge
Card
Table
EmptyState
LoadingState
Toast
FileUpload
Progress
Avatar

อย่าเขียน UI ซ้ำหลายจุด


# DATA STATES

ทุกหน้าที่มีข้อมูลต้องรองรับ:

Loading
Empty
Success
Error
Disabled
Processing

ห้ามแสดงหน้าว่างเมื่อไม่มีข้อมูล


# IMPORTANT — VISUAL QUALITY CHECK

ก่อนส่งงานทุกครั้งให้ตรวจ UI ด้วย checklist:

[ ] ไม่มี UI แบบ Bootstrap ยุคเก่า
[ ] ไม่มี card ซ้อน card โดยไม่จำเป็น
[ ] ไม่มีสีเยอะเกินไป
[ ] ไม่มี emoji เป็น icon หลัก
[ ] Typography มี hierarchy
[ ] Spacing สม่ำเสมอ
[ ] Button hierarchy ชัดเจน
[ ] Dark mode สวย
[ ] Mobile responsive
[ ] ไม่มี CSS ซ้ำโดยไม่จำเป็น
[ ] ใช้ daisyUI component เมื่อมี component รองรับ
[ ] ไม่มี inline style ที่ไม่จำเป็น
[ ] ไม่มี hard-coded color จำนวนมาก
[ ] UI ดูเหมือน Modern SaaS ไม่ใช่ Admin Template ปี 2018


# MOST IMPORTANT RULE

ห้ามสร้าง UI ให้ "พอใช้งานได้"

ต้องสร้าง UI ที่ดูเหมือน Production Product จริง

ก่อนเขียน component ให้คิดก่อนว่า:

"ถ้านี่เป็น SaaS ที่ขายเดือนละ $50 ผู้ใช้จะรู้สึกว่า UI นี้ Premium หรือไม่?"

ถ้าคำตอบคือไม่ ให้ปรับปรุงก่อนส่งงาน


# DAISYUI RULE

เมื่อมี component ที่ daisyUI รองรับ
ให้ใช้ daisyUI ก่อนเสมอ

ตัวอย่าง:

btn
card
modal
drawer
dropdown
tabs
badge
alert
toast
input
textarea
select
file-input
toggle
checkbox
radio
progress
tooltip
loading
skeleton
table
menu
navbar
breadcrumbs

ใช้ Tailwind เพื่อจัด layout และ spacing
ใช้ daisyUI เพื่อ component behavior / semantic styling


# FINAL RULE
ห้ามสร้างไฟล์ CSS ขนาดใหญ่เพื่อควบคุม UI ทั้งระบบ
Prefer:
Tailwind utilities
+
daisyUI components
+
small reusable components
มากกว่า:
custom.css 1000+ lines
ทุกครั้งที่แก้ UI ให้รักษา Design System เดิม
ห้ามเปลี่ยนสี / radius / typography แบบสุ่มระหว่างหน้า และห้ามไปแก้ไฟล์ฟังชั่นอะไรเลยนะแก้ได้แค่ css
