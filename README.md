# NeuroHire – Full Stack Setup Guide

This project includes:

- ⚛️ React (Vite) frontend  
- 🚀 FastAPI backend  
- 🐘 Neon PostgreSQL database  
- 📦 UploadThing file storage (CV + Video)

---

## ⚠️ IMPORTANT – Environment Variables

Create a `.env` file in the **project root**.

- ❌ Do **NOT** commit this file.  
- ❌ Do **NOT** paste secrets into this README.

**Example `.env`** (use your own values):

```env
DATABASE_URL=postgresql://neondb_owner:npg_7Yzfsr8QoSkI@ep-raspy-bar-a1doe4s3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require 
UPLOADTHING_TOKEN='eyJhcGlLZXkiOiJza19saXZlXzc5ZWVhMmFkZTg1MmZjNjMwYjI3OTlkY2RlYWFkNzc0NWZlZTM4ZTY0N2Y1OGViNTRkNTg1MDM5NTRkNGJhMzYiLCJhcHBJZCI6Inpqd3RkNzllcTIiLCJyZWdpb25zIjpbInNlYTEiXX0='
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `UPLOADTHING_TOKEN` | UploadThing API secret (for CV + video uploads) |

Ensure `.env` is listed in `.gitignore`.

---

## 1️⃣ Prerequisites

Install:

- **Node.js** (LTS)
- **Python 3.10+**
- **Git**
- **Neon PostgreSQL** project
- **UploadThing** account

---

## 2️⃣ Frontend Setup (React + Vite)

From project root:

```bash
npm install
npm run dev
```

Frontend runs on:

**http://localhost:3000**

(Vite may use a different port if 3000 is in use; check the terminal output.)

---

## 3️⃣ Backend Setup (FastAPI)

Navigate to the backend folder:

```bash
cd Backend
```

Install required Python packages:

```bash
python -m pip install fastapi uvicorn asyncpg python-dotenv requests email-validator gradio_client
```

If using a virtual environment (recommended):

```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
```

Then run the install command above from inside the activated venv.

### ▶ Run Backend

From `Backend/`:

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend runs on:

**http://127.0.0.1:8000**

---

## ✅ Verify Database Connection

With the backend running, open:

**http://127.0.0.1:8000/health**  
or  
**http://127.0.0.1:8000/db-health**

Expected response:

```json
{ "ok": 1 }
```

API documentation:

**http://127.0.0.1:8000/docs**

---

## 4️⃣ UploadThing Setup

If using the UploadThing server:

```bash
npm run uploadthing-server
```

Ensure:

- `UPLOADTHING_TOKEN` is set in `.env`
- Backend saves only file **metadata** (URL + file key)
- Files are **not** stored in the database

---

## 5️⃣ Prisma Setup (If Using Prisma)

From project root:

```bash
npm install prisma --save-dev
npm install @prisma/client
```

Initialize Prisma (if not already):

```bash
npx prisma init
```

Sync schema:

```bash
npx prisma db push
npx prisma generate
```

Open Prisma Studio:

```bash
npx prisma studio
```

---

## 6️⃣ Full System Run Order

1. **Start backend** (from `Backend/`):

   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

2. **Start UploadThing** (if required, from project root):

   ```bash
   npm run uploadthing-server
   ```

3. **Start frontend** (from project root):

   ```bash
   npm run dev
   ```

---

## 7️⃣ Architecture Overview

**System flow:**

```
Frontend
   ↓
UploadThing (stores file)
   ↓
Backend saves metadata to DB
   ↓
AI Model fetches file using URL
   ↓
Scores stored in DB
```

Only **file metadata** is stored in the database:

- File URL  
- File key  
- File size  
- MIME type  

No binary files are stored in PostgreSQL.

---

## 8️⃣ Required Dependencies

**Python**

- fastapi  
- uvicorn  
- asyncpg  
- python-dotenv  
- requests  
- email-validator  
- gradio_client  
- pip install openai

**Node**

- react  
- vite  
- prisma  
- @prisma/client  
- uploadthing  
- @uploadthing/react  

---

## 🔐 Security Reminder

- Never commit `.env`
- Never expose `DATABASE_URL`
- Never expose `UPLOADTHING_TOKEN`
- Rotate secrets immediately if leaked
