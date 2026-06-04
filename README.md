# QuizCraft 🎯

A beautiful multiple-choice quiz app built with **Next.js 14**, **Neon PostgreSQL**, and **Vercel**.

---

## What this app does

| URL | Purpose |
|-----|---------|
| `/admin` | Login + manage all quizzes |
| `/admin/create` | Create a new 10-question quiz |
| `/admin/quiz/[id]` | Edit questions, view all scores |
| `/quiz/[id]` | Take the quiz (share this link!) |

---

## Step-by-Step Setup (Total: ~20 minutes)

### STEP 1 — Create a GitHub account & repo

1. Go to https://github.com and sign up (free)
2. Click **"New repository"** (green button, top right)
3. Name it `quiz-app`
4. Keep it **Public** (easier for Vercel)
5. Click **"Create repository"**
6. Keep this page open — you'll need the repo URL

---

### STEP 2 — Install Git & Node.js on your computer

- Download **Node.js** from https://nodejs.org (choose "LTS" version)
- Git usually comes with Node, or get it from https://git-scm.com
- Verify by opening Terminal (Mac/Linux) or Command Prompt (Windows) and typing:
  ```
  node --version
  npm --version
  git --version
  ```
  All three should show version numbers.

---

### STEP 3 — Set up the project on your computer

Open Terminal / Command Prompt, then:

```bash
# Go to your desired folder (e.g. Desktop)
cd Desktop

# Unzip the quiz-app folder you downloaded, then enter it
cd quiz-app

# Install all dependencies
npm install
```

---

### STEP 4 — Push to GitHub

Still in Terminal:

```bash
git init
git add .
git commit -m "Initial quiz app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

Go to your GitHub repo page and refresh — you should see all the files there!

---

### STEP 5 — Create a Vercel account & deploy

1. Go to https://vercel.com and sign up with your **GitHub account**
2. Click **"Add New Project"**
3. You'll see your `quiz-app` repo — click **"Import"**
4. Don't change any settings — click **"Deploy"**
5. Vercel will build and deploy your app (takes ~1 minute)
6. You'll get a URL like `https://quiz-app-xyz.vercel.app` — this is your live app!

---

### STEP 6 — Add Neon Database inside Vercel

1. In Vercel, go to your project dashboard
2. Click the **"Storage"** tab at the top
3. Click **"Create Database"**
4. Choose **"Neon Serverless Postgres"**
5. Give it a name like `quiz-db`, choose a region close to you (e.g. Mumbai/Singapore)
6. Click **"Create"**
7. Vercel automatically adds `DATABASE_URL` to your environment variables — you don't need to do anything!

---

### STEP 7 — Set up database tables

You need to create the tables in your Neon database. Two ways:

**Option A (easiest) — Neon web console:**

1. In Vercel → Storage → click your Neon database
2. Click **"Open in Neon"** 
3. In Neon dashboard, click **"SQL Editor"**
4. Paste and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL,
  order_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  answers JSONB,
  attempted_at TIMESTAMP DEFAULT NOW()
);
```

5. Click **"Run"** — you should see "Success"

---

### STEP 8 — Set the Admin Password

1. In Vercel → your project → **"Settings"** tab
2. Click **"Environment Variables"** in the left sidebar
3. Add a new variable:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** `whatever password you want` (e.g. `quiz2024`)
4. Click **"Save"**
5. Go back to **"Deployments"** and click **"Redeploy"** → **"Redeploy"** (to apply the new env var)

---

### STEP 9 — Test your app!

1. Visit your Vercel URL (e.g. `https://quiz-app-xyz.vercel.app`)
2. Go to `/admin` — enter your admin password
3. Create a quiz at `/admin/create`
4. Copy the quiz link and share it with someone!
5. View scores at `/admin/quiz/[id]` under the "Attempts" tab

---

## Local Development (optional, for making changes)

```bash
# 1. Copy the env file
cp .env.example .env.local

# 2. Fill in your DATABASE_URL from Vercel → Storage → Neon → .env tab
# Also set ADMIN_PASSWORD=yourpassword

# 3. Run locally
npm run dev

# Open http://localhost:3000
```

To deploy changes after editing:
```bash
git add .
git commit -m "My changes"
git push
```
Vercel auto-deploys on every push to `main`!

---

## Project Structure

```
quiz-app/
├── app/
│   ├── admin/
│   │   ├── page.tsx          ← Admin login + dashboard
│   │   ├── create/page.tsx   ← Create quiz form
│   │   └── quiz/[id]/page.tsx ← Edit questions + view scores
│   ├── quiz/
│   │   └── [id]/page.tsx     ← Quiz-taking page
│   ├── api/                  ← All backend API routes
│   ├── globals.css           ← All styles
│   └── layout.tsx
├── lib/
│   └── db.ts                 ← Database connection
└── scripts/
    └── setup-db.js           ← DB table creation script
```

---

## Need help?

- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
- Next.js docs: https://nextjs.org/docs
