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
