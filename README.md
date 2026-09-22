# Al-Bashir Academy LMS — Economics

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

## Staff AI tools (admin / lecturer portal)

The staff portal has an **AI Assistant** that reads the lecturer's own uploaded materials and
turns them into graded assessments.

**Configure the model first** — open *Admin → AI Assistant → AI settings* and paste an API key
plus base URL (any OpenAI-compatible endpoint, e.g. OpenAI, OpenRouter, DeepInfra, a local
Ollama/LM Studio server). Settings are stored in the database per deployment; if no settings are
saved the app falls back to the `OPENAI_API_KEY` / `AI_API_BASE_URL` / `AI_MODEL` environment
variables. The key is write-only — the API only ever returns a masked version of it.

**Build an assessment from your documents**
1. Upload your source material on the AI Assistant page — PDF, DOCX, TXT or Markdown, up to 15 MB
   each. The text is extracted server-side and reused by the AI, so the document itself never
   leaves your database.
2. Tell the assistant what you want: *"Set a 10 question quiz on demand elasticity — 7 MCQ and
   3 essay, hard, worth 2 marks each"*. Pick the quiz's lesson, or choose *Final exam* for the
   course.
3. The AI returns a **draft** in the existing quiz / final-exam builder. Nothing goes live until
   you edit and save it. Essay questions carry a marking guide (rubric) and their own mark value;
   MCQs keep the familiar four-option format.

**How marking works**
- Multiple choice is auto-marked on submit exactly as before.
- Essay answers are marked by the AI against the rubric you saved, with written feedback per
  question.
- While an essay is waiting, the student sees **"Under review"** only — no score is released.
  A final exam held for review does **not** set the student's final score or completion date.
- Every pending submission appears in the lecturer's **marking queue** on the Gradebook page.
  Open one to read each answer, see the AI's mark and reasoning, re-mark with the AI, override
  any individual mark, leave a note, and release the result. The AI's original score is kept for
  audit and overridden items are flagged.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the complete Vercel + Neon deployment guide.

## Demo Credentials

After running the seed script:
- **Student:** aisha@student.alhikmah.edu.ng / student123
- **Lecturer:** dr.yusuf@alhikmah.edu.ng / lecturer123
- **Admin:** admin.albashiracademy@gmail.com / albashir123

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
