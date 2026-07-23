#!/bin/bash
# Export the Al-Hikmah LMS project as a deployment-ready ZIP for VSCode + Vercel + Neon
# This script:
#   1. Copies all source files to a temp directory
#   2. Switches Prisma from SQLite to PostgreSQL (for Neon)
#   3. Cleans up package.json scripts for Vercel
#   4. Adds .env.example, .gitignore, README, DEPLOY guide
#   5. Zips everything up

set -e

PROJECT_DIR="/home/z/my-project"
EXPORT_DIR="/tmp/alhikmah-lms-export"
ZIP_FILE="/home/z/my-project/download/alhikmah-lms-deploy.zip"

# Clean up any previous export
rm -rf "$EXPORT_DIR" "$ZIP_FILE"
mkdir -p "$EXPORT_DIR"

echo "==> Copying project files..."
cd "$PROJECT_DIR"

# Copy everything except heavy/sandbox-specific/private dirs
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='.zscripts' \
  --exclude='db/' \
  --exclude='download/' \
  --exclude='/upload/' \
  --exclude='examples/' \
  --exclude='skills/' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.tsbuildinfo' \
  --exclude='Caddyfile' \
  ./ "$EXPORT_DIR/"

echo "==> Switching Prisma provider from sqlite to postgresql..."
sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$EXPORT_DIR/prisma/schema.prisma"

echo "==> Cleaning up package.json for Vercel..."
# Use a Python one-liner to safely edit the JSON
python3 -c "
import json
with open('$EXPORT_DIR/package.json') as f:
    pkg = json.load(f)
# Clean scripts for local dev + Vercel
pkg['scripts'] = {
    'dev': 'next dev',
    'build': 'prisma generate && next build',
    'start': 'next start',
    'lint': 'eslint .',
    'db:push': 'prisma db push',
    'db:generate': 'prisma generate',
    'db:migrate': 'prisma migrate dev',
    'db:reset': 'prisma migrate reset',
    'seed': 'bun run scripts/seed.ts',
    'postinstall': 'prisma generate'
}
# Rename project
pkg['name'] = 'alhikmah-lms'
pkg['version'] = '1.0.0'
with open('$EXPORT_DIR/package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')
"
echo "    package.json updated."

echo "==> Creating .env.example..."
cat > "$EXPORT_DIR/.env.example" << 'ENVEOF'
# ============================================================
# Al-Hikmah LMS Environment Variables
# ============================================================
# Copy this file to .env and fill in your real values.
# For local dev, you can use the same Neon database as production.

# ---- Database (Neon Postgres) ----
# Get this from your Neon dashboard: https://console.neon.tech
# Format: postgresql://USER:PASSWORD@ep-XXX-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require
# IMPORTANT: use the pooled connection (the one with "-pooler" in the hostname) for serverless platforms like Vercel.
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# ---- Paystack (optional) ----
# Get your secret key from https://dashboard.paystack.com/#/settings/developer
# Leave empty to use demo mode (payments are simulated, no real charge).
PAYSTACK_SECRET_KEY=

# ---- Flutterwave (optional) ----
# Get your secret key from https://dashboard.flutterwave.com/dashboard/settings/apis
# Leave empty to use demo mode.
FLW_SECRET_KEY=

# ---- App URL ----
# After your first Vercel deploy, set this to your production URL.
# Used for Paystack/Flutterwave callback redirects.
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

echo "==> Creating .env (copy of example for immediate local use)..."
cp "$EXPORT_DIR/.env.example" "$EXPORT_DIR/.env"

echo "==> Creating .gitignore..."
cat > "$EXPORT_DIR/.gitignore" << 'GITEOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
bun-debug.log*

# local env files
.env
.env*.local

# prisma
/prisma/migrations/dev.db

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# logs
*.log
dev.log
server.log
GITEOF

echo "==> Creating README.md..."
cat > "$EXPORT_DIR/README.md" << 'READMEEOF'
# Al-Hikmah LMS — Department of Economics

A modern Learning Management System for the Department of Economics, Al-Hikmah University, Ilorin. Built with Next.js 16, TypeScript, Tailwind CSS, Prisma, and PostgreSQL (Neon).

## Features
- Moodle-style course management (Modules → Lessons → Files, Quizzes)
- Video lectures with progress tracking
- Live class links (Zoom / Google Meet / Teams)
- AI Study Buddy (powered by z-ai-web-dev-sdk)
- Auto-graded quizzes with pass marks
- QR-verifiable printable certificates
- Paystack + Flutterwave payment integration
- PWA (installable, offline-capable)
- Lecturer/admin dashboard with analytics, gradebook, revenue tracking
- Open student registration (any email, optional matric)
- Separate, hidden staff portal

## Quick Start (Local Dev)

1. Install dependencies:
   ```bash
   bun install
   # or: npm install
   ```

2. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env and paste your Neon DATABASE_URL
   ```

3. Create the database schema:
   ```bash
   bun run db:push
   ```

4. Seed demo data:
   ```bash
   bun run seed
   ```

5. Start the dev server:
   ```bash
   bun run dev
   ```

6. Open http://localhost:3000

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the complete Vercel + Neon deployment guide.

## Demo Credentials

After running the seed script:
- **Student:** aisha@student.alhikmah.edu.ng / student123
- **Lecturer:** dr.yusuf@alhikmah.edu.ng / lecturer123
- **Admin:** admin@alhikmah.edu.ng / admin123

The staff portal is hidden from public view. Access it at `/?view=staff-login` (bookmark this URL; do not share with students).

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + PostgreSQL (Neon)
- z-ai-web-dev-sdk (AI Study Buddy)
- Paystack + Flutterwave (payments)
- Recharts (analytics)
- QRCode (certificate verification)

## License
© Al-Hikmah University, Ilorin. Department of Economics.
READMEEOF

echo "==> Creating DEPLOY.md (Vercel + Neon guide)..."
cat > "$EXPORT_DIR/DEPLOY.md" << 'DEPLOYEOF'
# Deployment Guide: Vercel + Neon

This guide walks you through deploying the Al-Hikmah LMS to production using Vercel (frontend) and Neon (PostgreSQL database).

---

## Step 1: Create a Neon Database

1. Go to https://neon.tech and sign up (free tier is enough).
2. Click "Create Project".
3. Name it `alhikmah-lms` (or any name you prefer).
4. Select the region closest to your users (e.g., `AWS ap-south-1 — Mumbai` for Nigeria, or `AWS us-east-1` for global).
5. Click "Create Project".
6. On the project dashboard, find the "Connection Details" section.
7. Copy the **pooled connection string** (the one with `-pooler` in the hostname). It looks like:
   ```
   postgresql://neondb_owner:AbCdEfGh@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   IMPORTANT: Use the **pooled** version, not the direct one. Vercel serverless functions need pooled connections.
8. Save this string somewhere safe — you will need it for both local `.env` and Vercel env vars.

---

## Step 2: Set Up Local Development (Optional but Recommended)

1. Unzip this project to a folder on your computer.
2. Open the folder in VSCode.
3. Open the VSCode terminal (Ctrl/Cmd + `).
4. Install dependencies:
   ```bash
   bun install
   ```
   If you don't have Bun, install it first: https://bun.sh
   (Alternatively, you can use npm: `npm install`)

5. Copy the env example:
   ```bash
   cp .env.example .env
   ```

6. Open `.env` and paste your Neon connection string:
   ```
   DATABASE_URL="postgresql://neondb_owner:AbCdEfGh@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

7. Create the database tables:
   ```bash
   bun run db:push
   ```
   This creates all the tables in your Neon database.

8. Seed demo data:
   ```bash
   bun run seed
   ```
   This creates the admin, lecturer, students, courses, and a demo certificate.

9. Start the dev server:
   ```bash
   bun run dev
   ```

10. Open http://localhost:3000 in your browser. You should see the landing page.

---

## Step 3: Push to GitHub

Vercel deploys from a Git repository, so you need to push your code to GitHub first.

1. Create a new repository on GitHub: https://github.com/new
   - Name: `alhikmah-lms`
   - Set to **Private** (recommended for a school project)
   - Do NOT initialize with README (you already have one)
   - Click "Create repository"

2. In VSCode terminal, initialize git and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Al-Hikmah LMS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/alhikmah-lms.git
   git push -u origin main
   ```

   If you haven't configured git with GitHub before, you may need to:
   - Set your name: `git config --global user.name "Your Name"`
   - Set your email: `git config --global user.email "you@example.com"`
   - Authenticate: `gh auth login` (if you have GitHub CLI) OR use a personal access token when prompted for password.

---

## Step 4: Deploy to Vercel

1. Go to https://vercel.com and sign in with your GitHub account.

2. Click "Add New..." → "Project".

3. Import your `alhikmah-lms` repository from GitHub. (If Vercel cannot see it, click "Adjust GitHub App Permissions" and grant access to the repo.)

4. Vercel auto-detects Next.js. The default settings should work:
   - Framework Preset: **Next.js**
   - Build Command: `bun run build` (or leave as default — Vercel auto-detects)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `bun install` (or `npm install`)

5. **IMPORTANT: Add Environment Variables** before clicking Deploy:
   - Click "Environment Variables" to expand the section.
   - Add the following variables:

   | Key | Value | Environments |
   |-----|-------|-------------|
   | `DATABASE_URL` | `postgresql://neondb_owner:AbCd...@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require` | Production, Preview, Development |
   | `PAYSTACK_SECRET_KEY` | `sk_test_...` (your Paystack test key, or leave empty for demo mode) | Production, Preview |
   | `FLW_SECRET_KEY` | `FLWSECK-...` (your Flutterwave secret key, or leave empty for demo mode) | Production, Preview |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (set this AFTER first deploy — see step 6) | Production |

   NOTE: For `DATABASE_URL`, paste the same Neon pooled connection string you used in `.env`.

6. Click "Deploy".

7. Wait 2 to 5 minutes for the build to complete. Vercel will show you a success screen with your production URL (e.g., `https://alhikmah-lms.vercel.app`).

8. Click on the URL to view your live site.

---

## Step 5: Update NEXT_PUBLIC_APP_URL

After your first deploy, Vercel gives you a production URL like `https://alhikmah-lms.vercel.app`. You need to set this so Paystack and Flutterwave can redirect back to your site after payment.

1. Go to your Vercel project dashboard.
2. Click "Settings" → "Environment Variables".
3. Find `NEXT_PUBLIC_APP_URL` and update its value to your Vercel URL:
   ```
   https://alhikmah-lms.vercel.app
   ```
4. Click "Save".
5. Go to "Deployments" → click the three dots next to your latest deployment → "Redeploy".
6. Wait for the redeploy to finish.

---

## Step 6: Seed the Production Database

Your Neon database is empty at this point. You need to run the seed script against it.

Option A — From your local machine (easiest):

1. Make sure your local `.env` `DATABASE_URL` points to your **production Neon database** (the same one Vercel uses).
2. Run:
   ```bash
   bun run db:push
   bun run seed
   ```
3. Visit your Vercel URL and log in with the demo credentials:
   - Student: aisha@student.alhikmah.edu.ng / student123
   - Lecturer: dr.yusuf@alhikmah.edu.ng / lecturer123 (via `/?view=staff-login`)
   - Admin: admin@alhikmah.edu.ng / admin123 (via `/?view=staff-login`)

Option B — From the Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.production.local
bun run db:push
bun run seed
```

---

## Step 7: Configure Live Payments (Optional)

### Paystack
1. Sign up at https://paystack.com (works for Nigerian businesses).
2. Go to Settings → API Keys & Webhooks.
3. Copy your **Secret Key** (starts with `sk_live_` for production or `sk_test_` for test mode).
4. In Vercel: Settings → Environment Variables → update `PAYSTACK_SECRET_KEY` with your key.
5. Redeploy.

### Flutterwave
1. Sign up at https://flutterwave.com.
2. Go to Dashboard → Settings → API Keys.
3. Copy your **Secret Key** (starts with `FLWSECK-`).
4. In Vercel: Settings → Environment Variables → update `FLW_SECRET_KEY` with your key.
5. Redeploy.

Until you add these keys, the checkout page runs in **demo mode**: students can click "I have completed payment" to simulate a successful payment and get a certificate. This is fine for testing but no real money is charged.

---

## Step 8: Custom Domain (Optional)

To use a custom domain like `lms.alhikmah.edu.ng`:

1. Go to your Vercel project → "Settings" → "Domains".
2. Enter your domain and click "Add".
3. Vercel shows you the DNS records to add. Log into your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare) and add the records.
4. Wait for DNS to propagate (5 minutes to 24 hours).
5. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to your custom domain.
6. Redeploy.

---

## Troubleshooting

### Build fails on Vercel with "Prisma Client not found"
This should not happen because `package.json` has `"postinstall": "prisma generate"`. But if it does, add a build step:
- Vercel → Settings → Build & Development Settings → override Build Command to: `prisma generate && next build`

### Database connection errors
- Make sure you are using the **pooled** connection string (with `-pooler` in the hostname).
- Make sure `?sslmode=require` is at the end of the connection string.
- Test the connection locally first: `bun run db:push` should succeed.

### Payments not working
- Check that `PAYSTACK_SECRET_KEY` or `FLW_SECRET_KEY` is set in Vercel env vars.
- Check that `NEXT_PUBLIC_APP_URL` matches your Vercel URL (for callback redirects).
- Look at Vercel → Functions → Logs for any errors.

### AI Study Buddy not responding
- The AI uses `z-ai-web-dev-sdk`. On Vercel, it should work out of the box (the SDK is bundled).
- If it times out, the fallback message will be shown. Check Vercel function logs.

### Certificate QR code not scanning
- The QR code points to `/?view=verify-certificate&cert=XXX` on your domain.
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly.
- The verification page is public — no login required.

---

## Cost Estimate

- **Vercel**: Free Hobby tier is enough for a small LMS (100GB bandwidth, 100GB-hours serverless function execution per month).
- **Neon**: Free tier includes 0.5GB storage and 100 compute hours per month. Enough for hundreds of students.
- **Paystack**: No setup fee. They charge 1.5% + ₦100 per local transaction (capped at ₦2,000).
- **Flutterwave**: No setup fee. They charge 1.4% for local cards.

For a class of 200 students paying ₦5,000 per certificate, you would collect ₦1,000,000. Payment processor fees would be roughly ₦21,500, leaving ₦978,500.

---

## Support

If you run into issues during deployment, check:
1. Vercel deployment logs (Vercel dashboard → your project → Deployments → click on a deployment → "Build Logs")
2. Vercel function logs (Vercel dashboard → your project → Functions → click on any function → "Logs")
3. Neon query history (Neon dashboard → your project → "SQL Editor" → run a query like `SELECT * FROM User LIMIT 5;`)

DEPLOYEOF

echo "==> Creating the ZIP archive..."
cd /tmp
zip -r "$ZIP_FILE" "alhikmah-lms-export/" \
  -x "*.DS_Store" \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -q

# Clean up the temp dir
rm -rf "$EXPORT_DIR"

echo ""
echo "==> Export complete!"
echo "    ZIP file: $ZIP_FILE"
echo "    Size: $(du -h "$ZIP_FILE" | cut -f1)"
echo ""
echo "    The ZIP contains a deployment-ready Next.js project configured for Neon Postgres."
echo "    Unzip it locally, open in VSCode, and follow DEPLOY.md inside."
