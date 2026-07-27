# Ethical Monetization Designer (EMD)

Repository นี้เป็น Source Code สำหรับแพลตฟอร์ม EMD ซึ่งมีฟีเจอร์หลักคือ AI Assistant, ระบบสร้าง Game Design Document (GDD) แบบ Interactive และเครื่องมือวิเคราะห์ Monetization เชิงจริยธรรม

## 🌟 มีอะไรใหม่ (อัปเดตล่าสุด)

### 🤖 AI Assistant Chat
- **Multi-Model AI Provider:** โครงสร้างที่ออกแบบมาให้รองรับการเชื่อมต่อ AI หลายโมเดล
- **Gemini Integration:** ใช้ขุมพลังจาก **Gemini 3.1 Flash Lite** พร้อมระบบ **API Shuffle Streaming** สลับ API Key 3 ตัวเพื่อรองรับจำนวน Request ที่มากขึ้นโดยไม่ติด Limit
- **โมเดลที่รองรับในปัจจุบัน:**
  - Gemini (Active)
  - Owl Alpha ผ่าน OpenRouter (Active)
  - DeepSeek (Pending / รอแก้ไขปัญหา)
- **Local Dev Tools:** มีเครื่องมือสลับโมเดล AI ในตัว เพื่อให้ง่ายต่อการทดสอบและเปลี่ยนโมเดลระหว่างรัน Local

### 🎨 UI & UX (การปรับปรุงหน้าตาและการใช้งาน)
- **AI Chat Interface:** เพิ่ม UI แชตแบบลอย (Floating) สำหรับผู้ช่วยออกแบบเกม
- **Toaster Notifications:** ระบบแจ้งเตือนสถานะต่างๆ แจ้งให้ผู้ใช้ทราบแบบ Real-time
- **Skeleton Loaders:** เพิ่มอนิเมชันโหลดข้อมูล UI เพื่อให้รู้สึกว่าระบบทำงานลื่นไหล
- **Animated UI:** เพิ่ม Transition และลูกเล่นการขยับต่างๆ ทั่วทั้งแดชบอร์ด

### 🗄️ Database (Supabase)
- **AI Suggestions Table:** เพิ่มตารางใหม่ในฐานข้อมูลสำหรับบันทึกและดึงข้อมูลคำแนะนำจาก AI ของแต่ละโปรเจกต์โดยเฉพาะ

### 📄 PDF Exporter (ระบบส่งออก PDF)
- อัปเดตให้ระบบ PDF สามารถดึงข้อมูลจากตาราง AI Suggestions มาแสดงผลได้แล้ว
- *(หมายเหตุ: ปัจจุบันระบบส่งออกยังใช้ Canvas Image เพื่อแก้ปัญหาสระและฟอนต์ภาษาไทยชั่วคราว การปรับไปใช้ Native Text Rendering จะตามมาเร็วๆ นี้)*

### 🐛 Bug Fixes (การแก้ไขข้อผิดพลาด)
- แก้บั๊ก Supabase Auth (Race condition) ที่อม AuthSession ไว้จนทำให้ระบบบังคับล็อกอินใหม่ตลอดเวลา
- แก้ปัญหารัน API ไม่ผ่านและ Routing errors
- ปรับแก้ UI บางส่วนที่แสดงผลผิดพลาด
- แก้บั๊ก PDF Exporter เรื่องการจัดหน้า (Alignment) ให้ตรงเป๊ะมากขึ้น

---

## 🚀 การรันโปรเจกต์ (Local Development)

**⚠️ สำคัญมาก:** ให้ใช้ `vercel dev` แทน `npm run dev` สำหรับ localhost เพื่อให้รัน API ได้

เนื่องจากโปรเจกต์นี้มีการใช้ Serverless Functions ของ Vercel (เช่น API Routes สำหรับเรียก AI) คุณต้องใช้ **Vercel CLI** ในการรัน เพื่อให้สภาพแวดล้อม Local ทำงานได้เหมือนกับตอนนำขึ้น Production จริงๆ

### สิ่งที่ต้องเตรียม
ติดตั้ง Vercel CLI ในเครื่อง (ถ้ายังไม่มี):
```bash
npm i -g vercel