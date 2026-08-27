# Ethical Monetization Designer (EMD)

Repository นี้เป็น Source Code สำหรับแพลตฟอร์ม EMD ซึ่งมีฟีเจอร์หลักคือ AI Assistant, ระบบสร้าง Game Design Document (GDD) แบบ Interactive และเครื่องมือวิเคราะห์ Monetization เชิงจริยธรรม

## 🌟 มีอะไรใหม่ (อัปเดตล่าสุด)

### 🤖 AI Assistant
- **AI Provider:** ใช้ Gemini เป็น provider หลัก ระบบเลือก provider ได้แบบ pluggable ผ่าน adapter registry (`getProvider()`) ดูรายละเอียดที่ [`api/lib/ai-provider.ts`](api/lib/ai-provider.ts) — ฝั่ง backend เชื่อมต่อไว้ 3 ตัว คือ Gemini, Gemma (ผ่าน API/key เดียวกับ Gemini) และ OpenRouter Free Models Router (เลือก free model ที่ยังใช้งานได้ให้อัตโนมัติ แทนการปักหมุด model slug เดียวที่อาจตายได้ทุกเมื่อ) แต่ผู้ใช้ทั่วไปเลือกได้เองจากตัวเลือกในแชตแค่ Gemini กับ Gemma เท่านั้น (`SELECTABLE_PROVIDERS` ใน `src/features/projects/services/providers.ts`) — OpenRouter Free ถูกกันไม่ให้เลือกเพราะเทสจริงแล้วพบว่า topic-lock พังกับคุณภาพภาษาไทยแย่กว่าตัวอื่น ยังคงอยู่ใน registry ไว้ใช้งานผ่าน env var `AI_PROVIDER`/`AI_PROVIDER_CHAIN` เท่านั้น (ค่า default ของ `AI_PROVIDER` คือ Gemini)
- **Model Fallback Chain:** แต่ละ request จะไล่ลองโมเดล Gemini ตามลำดับที่กำหนดไว้ ถ้า API key ทุกตัวของโมเดลนั้นโดนใช้จน quota หมดแล้ว ระบบจะขยับไปลองโมเดลถัดไปในลำดับให้อัตโนมัติ — ดูรายชื่อโมเดลจริงที่ `MODEL_CHAIN` ใน [`api/lib/gemini-adapter.ts`](api/lib/gemini-adapter.ts) (ตั้งใจไม่ลอกรายชื่อมาใส่ในเอกสารนี้ตรงๆ เพื่อกันข้อมูลเก่าไม่ตรงกับโค้ดจริงในอนาคต)
- **API Key Rotation:** มี Gemini API key หลายตัว (`GEMINI_API_KEY`, `GEMINI_API_KEY1`–`3` ใน env) ระบบจะสุ่มลำดับการใช้ key ในแต่ละ request (ดู `buildKeyOrder()` ในไฟล์เดียวกัน) เพื่อกระจายโหลดข้าม key ตั้งแต่ request แรก แทนที่จะยิง key เดียวรัวๆ จนชน rate limit ก่อนค่อยสลับ
- **Streaming Responses:** คำตอบจากแชตจะ stream ออกมาทีละ token ผ่าน Server-Sent Events (`api/chat.ts`) ทำให้ UI แสดงข้อความบางส่วนได้ทันทีที่มาถึง ไม่ต้องรอคำตอบเต็มก่อน
- **ตอบตามภาษาที่เลือกไว้ในเว็บ:** AI จะตอบเป็นภาษาไทยหรืออังกฤษตามที่ปุ่มสลับภาษาบนเว็บตั้งไว้ ไม่ใช่ตอบภาษาไทยตายตัวไม่ว่านักศึกษาจะพิมพ์ภาษาอะไรมาเหมือนก่อนหน้านี้
- **สรุปคำแนะนำตามความพอใจของผู้ใช้:** แทนที่จะบังคับให้นักศึกษาต้องคุยจนครบ checklist ระบบจะให้คะแนนบทสนทนาว่ามีคำแนะนำที่ปฏิบัติได้จริงมากพอหรือยัง พอถึงจุดที่พอจะสรุปได้ จะขึ้นตัวเลือกให้เลือกเองว่า "สรุปตอนนี้เลย" หรือ "คุยต่อ" — ให้ผู้ใช้เป็นคนตัดสินใจว่าพอหรือยัง
- **Chat Panel ลากขยับและปรับขนาดได้:** panel แชตแบบลอยสามารถลากจาก header ไปวางตำแหน่งไหนก็ได้ และปรับขนาดจากมุมได้ โดยมีการ clamp ตำแหน่ง/ขนาดไว้ไม่ให้หลุดออกนอกจอ

### 🎨 UI & UX (การปรับปรุงหน้าตาและการใช้งาน)
- **AI Chat Interface:** เพิ่ม UI แชตแบบลอย (Floating) สำหรับผู้ช่วยออกแบบเกม
- **Toaster Notifications:** ระบบแจ้งเตือนสถานะต่างๆ แจ้งให้ผู้ใช้ทราบแบบ Real-time
- **Skeleton Loaders:** เพิ่มอนิเมชันโหลดข้อมูล UI เพื่อให้รู้สึกว่าระบบทำงานลื่นไหล
- **Animated UI:** เพิ่ม Transition และลูกเล่นการขยับต่างๆ ทั่วทั้งแดชบอร์ด

### 🗄️ Database (Supabase)
- **AI Suggestions Table:** เพิ่มตารางใหม่ในฐานข้อมูลสำหรับบันทึกและดึงข้อมูลคำแนะนำจาก AI ของแต่ละโปรเจกต์โดยเฉพาะ

### 📄 Export (PDF & CSV)
- **PDF Export ผ่าน Browser Print:** เปลี่ยนวิธีสร้าง PDF จากเดิมที่วาดเป็นรูปภาพผ่าน canvas/jsPDF มาเป็นการ render รายงานด้วย HTML/CSS จริงในหน้าเว็บ (ซ่อนไว้บนจอ โชว์เฉพาะผ่าน print stylesheet) แล้วเรียก `window.print()` ของ browser โดยตรง ข้อความในไฟล์ที่ export ออกมาจึงเป็นข้อความจริง copy/select ได้ และไม่มีปัญหาสระไทยเพี้ยนที่เคยเกิดจากการวาดข้อความลง canvas อีกต่อไป
- **คำแนะนำจาก AI ใน PDF:** รายงานที่ export จะดึงคำแนะนำที่ AI สรุปและบันทึกไว้ของโปรเจกต์นั้นมาแสดงด้วย
- **CSV รูปแบบตรงกับ PDF:** ลำดับ section และหัวคอลัมน์ของไฟล์ CSV ปรับให้ตรงกับโครงสร้างของรายงาน PDF (Project Context → Ads Strategy → IAP Catalog → Configuration Notes → Case for Ethics) ให้ทั้งสองไฟล์เล่าเรื่องเดียวกัน ไม่ใช่คนละแบบ

### 📝 Setup
- **Custom Genre:** นอกจาก genre ที่มีให้เลือกในระบบแล้ว นักศึกษาสามารถพิมพ์และเพิ่ม genre ของตัวเองได้ ถ้า genre ที่ต้องการไม่มีในตัวเลือกที่กำหนดไว้

### 🛠️ Developer Tools
- **Debug Toolkit (เฉพาะ Dev Mode):** panel ลอยสำหรับเทส UI เบื้องต้น (toast แต่ละแบบ, color palette ของ design system) โดยไม่ต้องไล่คลิกทดสอบผ่าน flow จริงของแอป — panel นี้ถูกตัดออกจาก production build โดยสมบูรณ์

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
```

ตั้งค่าไฟล์ `.env` ให้ครบ (ดูตัวอย่างที่ `.env.example` ถ้ามี) อย่างน้อยต้องมี:

```bash
GEMINI_API_KEY=...
GEMINI_API_KEY1=...   # optional — เพิ่มเพื่อเปิดใช้ key rotation
GEMINI_API_KEY2=...
GEMINI_API_KEY3=...
```

### รันโปรเจกต์

```bash
vercel dev
```

เปิดที่ `http://localhost:3000`