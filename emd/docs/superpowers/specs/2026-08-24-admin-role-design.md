# Admin Role & Multi-Role Access — Design Spec

Date: 2026-08-24
Status: Approved by Yuuko, pending implementation plan

## 1. Background

ตอนนี้ระบบมี role เดียวต่อ user เก็บใน `profiles.role: 'student' | 'instructor'`
ใช้เทียบตรง ๆ ใน `RoleRoute.tsx`, `router.tsx`, `Sidebar.tsx` ฯลฯ

ต้องการเพิ่ม **role admin** ที่:
- มี panel แยก จัดการ user ได้ (ดูรายชื่อ/สถิติ user ทั้งหมด, มอบ/ถอน role)
- **ไม่ต้อง**เห็นเนื้อหา GDD/project ของนักเรียน (ส่วนนั้นเป็นของอาจารย์เท่านั้น — ไม่แตะ)
- รองรับ **หลาย role ต่อ user พร้อมกัน** (เช่น instructor + admin) โดยสิทธิ์เป็นแบบ **union** — มีทุก role ไหนก็เข้าถึงสิ่งที่ role นั้นเข้าถึงได้ทั้งหมด ไม่ใช่เลือกได้ทีละ role
- ออกแบบให้ขยายเพิ่ม role ใหม่ในอนาคตได้ง่าย (มีแผนเพิ่ม **TA** ทีหลัง — ยังไม่ต้องสร้าง TA feature ตอนนี้ แค่ schema ต้องไม่ต้องรื้อซ้ำ)

## 2. Non-goals

- Admin ไม่เห็น/แก้เนื้อหา GDD, project, guardrail score ของนักเรียน
- ไม่แตะ logic ของ AI Guardrail (เป็นของอาจารย์ในทีม)
- ไม่ทำ TA feature จริงตอนนี้ — แค่เผื่อ schema ไว้
- ไม่ทำ workflow อนุมัติ/สมัคร role เอง — grant/revoke ทำโดย admin เท่านั้นผ่าน panel

## 3. Data model

ตารางใหม่ `user_roles` — many-to-many ระหว่าง user กับ role "เสริม" (ไม่รวม student/instructor ที่ยังอยู่ใน `profiles.role` เดิม):

```sql
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('admin', 'ta')),
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  unique (user_id, role)
);
```

เหตุผลที่ไม่แตะ `profiles.role`:
- routing เดิมของ student/instructor (`RoleRoute`, `router.tsx`, `Sidebar.tsx`, `RoleRedirect`) ยังทำงานเหมือนเดิมทุกอย่าง ไม่ breaking change
- `profiles.role` = "role หลัก" (ใช้กำหนดหน้า home/routing เริ่มต้น), `user_roles` = "role เสริม" (สิทธิ์เพิ่มเติมแบบ additive)

Helper function สำหรับใช้ทั้งใน RLS และ frontend:

```sql
create or replace function public.has_role(uid uuid, target_role text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = target_role
  );
$$;
```

## 4. RLS policies

- `user_roles`:
  - SELECT: user เห็น row ของตัวเอง, admin (`has_role(auth.uid(), 'admin')`) เห็นทุก row
  - INSERT/UPDATE/DELETE: เฉพาะ admin เท่านั้น
- `profiles`:
  - เพิ่ม policy ใหม่: admin `SELECT` ได้ทุกแถว (เพิ่มเติมจาก policy เดิมที่มีอยู่ — **ไม่ลบ policy เดิม** แค่เพิ่ม policy คู่ขนานสำหรับ admin)
  - admin **ไม่มี** สิทธิ์ UPDATE/DELETE profiles คนอื่น (แก้ role ทำผ่าน `user_roles` เท่านั้น ไม่ใช่ไปแก้ `profiles` ตรง ๆ)

> หมายเหตุ: policy เดิมของ `profiles`/`projects` ที่มีอยู่จริงในโปรเจกต์ ยังไม่เคยเห็น SQL จริง (ไม่มี migration file ในโปรเจกต์ — Yuuko รัน SQL เองใน Supabase dashboard) ตอน implementation ต้องขอดู policy ปัจจุบันก่อนเขียน SQL เพิ่ม เพื่อไม่ให้ชนหรือซ้ำ

## 5. Frontend

**AuthContext** (`src/features/auth/context/AuthContext.tsx`)
- เพิ่ม fetch `user_roles` คู่กับ `fetchProfile` (ผูกกับ user.id เดียวกัน)
- เพิ่ม `roles: string[]` และ `isAdmin: boolean` เข้า `AuthContextValue`
- preview auth mode (`PreviewAuthProvider`) เพิ่ม `roles: []` (หรือรับ query param เพื่อ preview admin — ตัดสินใจตอน implement)

**Route guard** — ไฟล์ใหม่ `src/app/AdminRoute.tsx`
- คล้าย `RoleRoute.tsx` แต่เช็ค `isAdmin` แทน equality กับ `profile.role`
- ครอบ route ใหม่ `/admin/*`
- คนละ guard กับ `RoleRoute` เดิม เพื่อไม่ปนกัน — instructor route ยังเช็ค `profile.role === 'instructor'` เหมือนเดิม, admin route เช็ค `isAdmin` แยก → **union access** ได้เองโดยธรรมชาติ (ทั้งสอง guard ผ่านพร้อมกันได้ถ้ามีทั้งสอง role)

**Pages** — `src/features/admin/pages/`
- `AdminDashboardPage.tsx` — การ์ดสรุป: จำนวน user ทั้งหมด, breakdown ตาม role (student / instructor / admin / ta)
- `AdminUsersPage.tsx` — ตาราง list user (ชื่อ, email, role หลักจาก `profiles.role`, role เสริมจาก `user_roles`) + ปุ่ม grant/revoke role ต่อแถว (dropdown เลือก role → insert/delete `user_roles`)

**Sidebar** (`src/app/layout/Sidebar.tsx`)
- ถ้า `isAdmin` true → เพิ่มเมนู "Admin" ต่อท้าย `mainItems` ที่มีอยู่ (ไม่แยก layout ทั้งชุด) ลิงก์ไป `/admin/dashboard`

**Service** — `src/features/admin/services/admin.service.ts`
- `getUserStats()` — นับ user แยกตาม role
- `listUsers()` — ดึง profiles ทั้งหมด join `user_roles`
- `grantRole(userId, role)` / `revokeRole(userId, role)`

## 6. Bootstrap

Admin คนแรกต้อง insert เองผ่าน SQL editor ใน Supabase (ยังไม่มี admin คนไหน grant ให้ใครได้):

```sql
insert into public.user_roles (user_id, role, granted_by)
values ('<uid-ของ-yuuko>', 'admin', '<uid-ของ-yuuko>');
```

## 7. Testing

- RLS: user ธรรมดา query `user_roles`/`profiles` ของคนอื่นต้องโดนบล็อก, admin ต้องผ่าน
- Route: non-admin เข้า `/admin/*` ต้อง redirect ออก (เหมือน `RoleRoute` เดิม)
- Union access: user ที่มี role instructor + admin เข้าได้ทั้ง `/instructor/*` และ `/admin/*`
- Grant/revoke: หลัง grant role แล้ว user เห็นเมนู/เข้าถึงได้ทันทีในเซสชันถัดไป (หรือ refetch roles หลัง grant ถ้า realtime ไม่จำเป็น)

## 8. Open items ที่ยังไม่ตัดสินใจตอนนี้ (ทำตอน implement ได้)

- preview auth mode จะ mock เป็น admin ได้ยังไง (ไม่ critical)
- pagination ของ `AdminUsersPage` ถ้า user เยอะ (YAGNI ตอนนี้ — จำนวน user ยังน้อย)
