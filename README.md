# agroWish — Smart Agricultural Decision Support & Integrated Farm Planning Platform

**Course:** SE-331 Software Engineering Project Lab (Department of Software Engineering, Daffodil International University)  
**Team Members:**
- **Md Adnan Ul Islam (ID: 241-35-103)** — Core AI Engine, Recommendation & Costing Algorithm Lead
- **Most Tasnim Jahan Rifa (ID: 241-35-116)** — Backend Architecture, Database Schema & Authentication Lead
- **Tasdid Al Amin (ID: 241-35-108)** — Frontend, Bangla Usability & Farm Profiling Lead

---

## 1. Architecture Overview

| Layer | Technology Stack | Key Responsibilities |
| :--- | :--- | :--- |
| **Database** | MySQL 8.0+ (`utf8mb4_unicode_ci`) | 17 relational tables covering users, farm profiles, detailed resources, crops, varieties, cost items, integrated combinations, waste-to-value rules, recommendations, knowledge documents, chat sessions/messages, feedbacks, and audit logs. |
| **Backend API** | Node.js + Express (`mysql2/promise`, `bcryptjs`, `jsonwebtoken`) | Role-based JWT authentication (`FARMER` vs `ADMIN`), strict input validation (`FR-07`), user data isolation (`FR-27`), multi-option SRS decision engine, grounded Bangla AI chat with automatic offline fallback, and automatic audit logging. |
| **Frontend UI** | React 18 + Vite + Tailwind CSS v4 + Lucide Icons | Responsive Bangla-first UI (`Hind Siliguri`) with single-row navigation, accessible tabs/tables/forms, side-by-side comparison cards, cost/return ranges, safety warnings, recommendation history, Bangla chat, and role-gated Admin Dashboard. |

---

## 2. Prerequisites & Setup Steps

### Prerequisites
- **Node.js** v18+ (tested on v24)
- **MySQL Server** 8.0+ running locally (default service `MySQL80` on port `3306`)

### Step 1: Install Dependencies
From the project root (`agro wish/`):
```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Step 2: Configure Environment (`backend/.env`)
Ensure `backend/.env` matches your local MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345678
DB_NAME=agrowish_db
JWT_SECRET=agrowish_secret_key_jwt_2026

# Optional: Enable LLM synthesis for Bangla AI Assistant (FR-28 graceful fallback works even without keys)
# GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
```

### Step 3: Initialize & Migrate Database
Execute the base schema followed by the full SRS expansion migration:
```powershell
# 1. Base schema & initial Bangladesh crops/varieties
mysql -u root -p < database/schema.sql

# 2. Full SRS tables, ALTERs, test users, cost items, integrated rules, waste rules & Bangla knowledge base
mysql -u root -p agrowish_db < database/update_full_srs.sql
```
*(Both scripts are safe and `update_full_srs.sql` is idempotent across repeated executions.)*

### Step 4: Run Full Stack (`backend` + `frontend`)
From the project root:
```powershell
npm run dev
```
- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000` (Health check: `GET http://localhost:5000/api/health`)

---

## 3. Default Seeded Test Credentials & Crops

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@agrowish.com` *(or `admin@agrowish.bd`)* | `Admin@123` | Full Farmer views + `অ্যাডমিন প্যানেল` for CRUD on Crops, Varieties, Cost Items, Integrated Rules, Waste-to-Value Rules, Knowledge Base, and Audit Logs. |
| **FARMER** | `farmer@agrowish.bd` | `Farmer@123` | Pre-filled farm profile (Bogura, 50 শতক, দোআঁশ, রবি, ৳35,000), 3 recorded resources (pond, livestock, poultry), recommendations, history, feedback, Bangla AI chat. |

### Pre-Seeded Bangladeshi Crops (9 Major Crops)
Boro Rice (`বোরো ধান`), Aman Rice (`আমন ধান`), Wheat (`গম`), Potato (`আলু`), Maize (`ভুট্টা`), Mustard (`সরিষা`), Tomato (`টমেটো`), Lentil (`মসুর ডাল`), and Jute (`পাট`) — complete with BRRI/BARI/BJRI certified varieties and itemized BDT/decimal cost ranges.

---

## 4. Automated Evaluation & Verification (`backend/tests/evaluate.js`)

Run the 10-scenario SRS evaluation suite (`NFR-06` & SRS Section 6.1) covering Rabi/Kharif matching, tight budget filtering, pond+poultry integrated farming, waste-to-value safety rules, extreme fallback (`FR-35`), Bangla AI knowledge grounding (`FR-20`, `FR-28`, `FR-29`), traceability/feedback (`FR-24`, `FR-32`, `FR-34`), and RBAC/IDOR/Audit security (`FR-02`, `FR-27`, `FR-33`):

```powershell
cd backend
node tests/evaluate.js
```
Or from the project root:
```powershell
npm test
```

---

## 5. Core REST API Endpoints

### Auth & Farm Profile
- `POST /api/auth/register` — Register `FARMER` / `ADMIN` with bcrypt hashing & JWT
- `POST /api/auth/login` — Authenticate and issue 1-day JWT
- `GET /api/auth/me` & `POST /api/auth/logout` — Session verification & logout
- `GET /api/profile/me` & `POST /api/profile` — Upsert & fetch farm conditions

### Resource Inventory & Goals (`FR-05`, `FR-06`, `FR-11`, `FR-27`)
- `GET /api/resources` — List user-owned resources & farming goals
- `POST /api/resources` — Add pond, livestock, poultry, crop_residue, organic_material, or water resource
- `PUT /api/resources/goals` — Update farming budget, goal, and risk preference
- `PUT /api/resources/:id` & `DELETE /api/resources/:id` — Update/delete user-owned resource

### Recommendations, History & Feedback (`FR-08`..`FR-16`, `FR-21`..`FR-24`, `FR-32`, `FR-34`, `FR-35`)
- `POST /api/recommendations/generate` — Generate & persist comparable Crop, Integrated Farming, and Waste-to-Value options
- `GET /api/recommendations` — Backward-compatible current profile recommendation query
- `GET /api/recommendations/history` — Fetch past recommendations with input snapshots & model version
- `GET /api/recommendations/:id` — Fetch specific recommendation owned by user
- `POST /api/recommendations/:id/feedback` — Submit thumbs up/down & rating/comment feedback

### Bangla AI Agricultural Assistant (`FR-18`..`FR-20`, `FR-28`, `FR-29`, `FR-35`)
- `GET /api/chat/sessions` — List user's chat sessions
- `GET /api/chat/sessions/:sessionId/messages` — Load messages for an owned session
- `POST /api/chat/message` — Retrieve grounded `knowledge_documents`, synthesize via Gemini/OpenAI if configured, or return curated Bangla fallback with source citation (or safe officer referral if unmatched)

### Admin Management & Audit Trail (`FR-02`, `FR-25`, `FR-26`, `FR-33`)
*(All `/api/admin/*` routes require `role === 'ADMIN'` and automatically log to `audit_logs`)*
- `GET /api/admin/stats`
- CRUD: `/api/admin/crops`, `/api/admin/varieties`, `/api/admin/cost-items`, `/api/admin/integrated-combinations`, `/api/admin/waste-rules`, `/api/admin/knowledge`
- `GET /api/admin/audit-logs`

---

## 6. End-to-End SRS Feature Verification Checklist

- [x] **FR-01 / FR-07 / FR-31:** Registration, Login, RFC email & BD phone validation, JWT session persistence & logout.
- [x] **FR-02 / FR-27:** Role-based access control (`FARMER` blocked with `403` on `/api/admin/*`) and per-user data isolation on profiles, resources, recommendations, and chat sessions.
- [x] **FR-03 / FR-04 / FR-05 / FR-06 / FR-11:** 3-card Bangla Farm Profile form + Resource & Goal Manager (`pond`, `livestock`, `poultry`, `crop_residue`, `organic_material`, `water`).
- [x] **FR-08 / FR-09 / FR-10 / FR-14 / FR-15 / FR-16 / FR-23:** Bilingual season/soil/budget-filtered crop & certified variety recommendations with cost/return ranges and itemized cost breakdowns.
- [x] **FR-12 / FR-13:** Integrated farming combinations & safe Waste-to-Value rules matched against farmer's recorded resources with mandatory `safety_note`.
- [x] **FR-17 / FR-21 / FR-22:** Full Bangla UI, Estimate Disclaimer, and Expert Verification badges.
- [x] **FR-18 / FR-19 / FR-20 / FR-28 / FR-29 / FR-35:** Grounded Bangla AI Assistant with `knowledge_documents` keyword + FULLTEXT retrieval, source attribution badges, LLM/offline fallback, and safe no-match guidance.
- [x] **FR-24 / FR-32 / FR-34:** Recommendation history with input snapshot traceability, model version, and thumbs up/down usefulness feedback.
- [x] **FR-25 / FR-26 / FR-33:** Tabbed Admin Dashboard CRUD for reference/knowledge tables with automatic `audit_logs` tracking.
