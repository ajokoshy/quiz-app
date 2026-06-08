# Quiz Craft by Future Next Technologies

A production-grade multiple-choice quiz platform built with Next.js 14, Neon PostgreSQL, and Vercel.

---

## Required Environment Variables

Set all three in Vercel → Settings → Environment Variables:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Auto-set by Vercel when Neon is connected | (auto) |
| `ADMIN_USERNAME` | Your admin login username | `admin` |
| `ADMIN_PASSWORD` | Your admin login password | `MyPass2024!` |
| `SESSION_SECRET` | Random 32+ char string for JWT signing | (see below) |

**Generate SESSION_SECRET:** Visit https://generate-secret.vercel.app/32 and copy the result.

---

## Database Setup (run once in Neon SQL Editor)

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

---

## App Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/quiz/[id]` | Public | Take a quiz |
| `/admin/login` | Public | Admin login |
| `/admin` | Admin only | Dashboard + Analytics |
| `/admin/create` | Admin only | Create quiz |
| `/admin/quiz/[id]` | Admin only | Manage quiz + view scores |

---

## Security Features

- JWT sessions via HttpOnly cookies (4-hour expiry)
- Username + password authentication against env vars
- Rate limiting: 5 failed login attempts per minute per IP → 5-minute block
- Next.js middleware protects all /admin routes and /api/admin routes
- Zod input validation on all API endpoints
- Database transactions for quiz creation
- No credentials ever stored in source code

## Deployment

Push to GitHub → Vercel auto-deploys on every commit.

---

## Adding Archive Table (existing users)

If you already have the app running, run this **one extra SQL** in Neon SQL Editor, then call the migration endpoint once:

```sql
CREATE TABLE IF NOT EXISTS attempts_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  quiz_title TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  answers JSONB,
  attempted_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  batch_number INT NOT NULL DEFAULT 1
);
```

Or just call this URL once after deploying (while logged into admin):
`POST https://your-app.vercel.app/api/admin/archive/migrate`

## Auto-Archive Behaviour

- When a quiz hits exactly 100 entries, the submit transaction automatically:
  1. Copies all 100 attempts to `attempts_archive` with a `batch_number`
  2. Clears `attempts` for that quiz
  3. Quiz immediately accepts new participants (Batch 2 begins)
- Each quiz can have unlimited batches (Batch 1, Batch 2, ...)
- Admins can view archive per-quiz under the **Archive tab** in quiz detail
- Full archive view at `/admin/archive`
- **Delete All Archive Data** button clears entire archive permanently
