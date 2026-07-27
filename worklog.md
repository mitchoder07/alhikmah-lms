---
Task ID: api-features
Agent: full-stack-developer
Task: Create API routes for paid courses, bulk discount, blog, and update quiz randomization

Work Log:
- Created `/api/courses/[id]/access/route.ts`:
  - GET: checks current user's active CourseAccess (auto-marks expired records inactive); returns `{ hasAccess, expiresAt?, course: { isPaid, courseFee, accessDurationMonths } }`. Free courses return `hasAccess: true`.
  - POST: initiates payment for paid course access — creates a pending Payment record with reference `AHK-COURSE-{ts}-{hex}`. Demo mode (no PAYSTACK_SECRET_KEY / FLW_SECRET_KEY) returns `{ reference, authorization_url: '/course-checkout?ref=...', demo: true }`. Real Paystack/Flutterwave initialization mirrors the certificate payment flow.
- Created `/api/courses/[id]/access/verify/route.ts`:
  - POST: verifies payment via Paystack/Flutterwave when secret keys configured; on success upserts a CourseAccess record with `expiresAt = now + accessDurationMonths` and returns `{ status, courseAccess }`.
- Created `/api/courses/bulk-discount/route.ts`:
  - POST: accepts `{ courseIds }`, dedupes IDs, fetches only paid courses from DB, computes discount tiers (1-2 → 0%, 3-4 → 10%, 5+ → 15%), returns `{ total, discount, finalAmount, discountRate, breakdown }`.
- Updated `/api/courses/[id]/lessons/[lessonId]/quiz/submit/route.ts`:
  - Switched grading from index-based to text-based comparison. Body is now `{ quizId, answers: Record<string, string> }` mapping questionId → selected option TEXT. The server parses each question's JSON `options` array, resolves the correct option text from `q.answer` (handles both numeric index and direct text), and compares trimmed/lowercased strings so client-side option shuffling has no effect on grading. Returns the same `{ attempt, score, totalMarks, percent, passed }` plus an extra `graded` map for debugging. Also added a lesson-ownership sanity check.
- Created Blog APIs:
  - `/api/blog/route.ts` — GET (public) returns published posts with author + course, ordered by createdAt desc.
  - `/api/blog/[id]/route.ts` — GET (public) single post; DELETE (admin/lecturer only).
  - `/api/admin/blog/route.ts` — GET (admin/lecturer) returns ALL posts incl. unpublished; POST creates a new post (author = current user, validates courseId if provided).
  - `/api/admin/blog/[id]/route.ts` — PATCH updates provided fields (validates courseId); DELETE removes the post.
- Updated `/api/courses/route.ts`:
  - POST handler now accepts and persists the new paid-course fields: `isPaid`, `courseFee`, `accessDurationMonths`, `allowDownload`, `watermarkMaterials` (defaults: isPaid=false, courseFee=0, accessDurationMonths=6, allowDownload=false, watermarkMaterials=true).
  - GET handler already returns all scalar columns (including the new paid fields) — added clarifying comment.
- Updated `/api/courses/[id]/route.ts`:
  - PATCH handler replaced the blanket `data: body` pass-through with an explicit allow-list mapping each supported field (incl. `isPaid`, `courseFee`, `accessDurationMonths`, `allowDownload`, `watermarkMaterials`, plus live-class fields and `lecturerId`) with correct type coercion. This prevents clients from setting arbitrary columns.
- Ran `bun run lint` — passed with no errors. Dev server log shows clean compilation.

Stage Summary:
- 5 new route files created (course access, access verify, bulk-discount, public + admin blog endpoints across 4 files).
- 3 existing route files updated (quiz submit grading, course create, course patch).
- All routes follow existing patterns: `import { db } from '@/lib/db'`, `import { getCurrentUser } from '@/lib/auth'`, `NextRequest`/`NextResponse`, async `params: Promise<{ id: string }>` for Next.js 16, 401 for unauth, 403 for non-admin/lecturer on protected routes.
- Payment reference format `AHK-COURSE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}` used as specified.
- Quiz grading is now shuffle-safe via text comparison — no shuffleSeed required.
- Did NOT modify the Prisma schema or run db:push, as instructed.

---
Task ID: ui-features
Agent: frontend-developer
Task: Build UI components for blog management, paid course fields, and paid course badges

Work Log:
- Created `/src/components/views/admin/blog.tsx` (`AdminBlog`):
  - Lists all blog posts (published + drafts) via `useApi('/api/admin/blog')`. Each card shows published/draft badge, optional linked course code, title, excerpt, author, and formatted date.
  - "New Post" button opens a dialog (max-w-2xl, scrollable) with: title, excerpt, content (textarea rows=8), cover image URL with live preview, optional course selector (Select dropdown from `/api/courses`), and a publish toggle (Switch component).
  - Edit button reuses the same dialog (toggles `editingId`) and calls `apiPatch('/api/admin/blog/[id]')`. Delete button calls `apiDelete('/api/admin/blog/[id]')` after confirm. A separate per-post "Publish/Unpublish" toggle button issues a small PATCH to flip `isPublished`.
  - Empty state card with `Newspaper` icon. Loading + saving states via `Loader2` spinner. Toasts from `sonner` for success/error.
- Updated `/src/components/views/admin/app.tsx`:
  - Imported `Newspaper` from `lucide-react` and `AdminBlog` from `./blog`.
  - Added nav item `{ id: 'blog', label: 'Blog', icon: Newspaper }` directly after `announcements`.
  - Added `{view === 'blog' && <AdminBlog />}` to the render section.
- Updated `/src/components/views/public/landing.tsx`:
  - Imported `useApi` from `@/lib/api` and `Newspaper` icon (alongside existing `ArrowRight`).
  - Added `BlogPost` interface and `const { data: blogData } = useApi<{ posts: BlogPost[] }>('/api/blog')` plus `blogPosts = (blogData?.posts ?? []).slice(0, 3)`.
  - Inserted a new `<section>` BEFORE the footer that renders only when `blogPosts.length > 0`. Heading: "Latest from the Department" with subtitle "Insights, study tips, and updates from our Economics lecturers". Each card shows cover image (or gradient fallback with `Newspaper` icon), optional course code badge, formatted date, title (line-clamp-2), excerpt (line-clamp-3), author name, and a "Read more" link button.
- Updated `/src/components/views/admin/courses.tsx`:
  - Added `Checkbox` from `@/components/ui/checkbox` and `Lock` icon import.
  - Extended form state with `isPaid: false, courseFee: '2000', accessDurationMonths: '6', allowDownload: false`. Reset state mirrors these defaults.
  - POST handler now sends `isPaid`, `courseFee`, `accessDurationMonths`, `allowDownload` (with Number coercion) alongside existing fields.
  - Added a new bordered section in the Create Course dialog after the Semester field: "Paid Course" checkbox with Lock icon and description. When checked, conditionally renders a sub-grid with "Course Access Fee (₦)" number input, "Access Duration (months)" number input, and an "Allow Downloads" checkbox with helper text.
- Rewrote `/src/components/views/student/courses.tsx`:
  - Extended `Course` interface to include optional `isPaid`, `courseFee`, `accessDurationMonths`, `allowDownload`. Added `AccessInfo` interface and `accessMap` state.
  - Added `useEffect` that, for each paid course the student is enrolled in, calls `/api/courses/[id]/access` (cache: no-store) in parallel and stores `{ hasAccess, expiresAt }` keyed by courseId. Re-runs when courses or enrollments change.
  - In the course card: shows a "Paid" badge (with Lock icon, amber styling) next to the level badge when `c.isPaid`. Below the certificate fee, shows a "Course Access" row with "₦X to access" text in amber for paid courses. If enrolled + paid + hasAccess, shows a green "Access Active" badge with `ShieldCheck` icon.
  - Button logic updated: not enrolled → "Enroll Now"; enrolled + paid + no access → amber "Pay to Access" button that POSTs to `/api/courses/[id]/access` with `provider: 'paystack'` and redirects to `authorization_url` (handles both absolute and relative URLs); otherwise → existing "Continue Learning".
- Lint: ran `bun run lint` — 0 errors, 0 warnings after removing two unused `eslint-disable-next-line` directives on the `<img>` tags (Next.js allowed them in this config).
- Dev server: log shows clean compiles (no errors), `/api/courses`, `/api/enrollments`, `/api/announcements` all returning 200.

Stage Summary:
- 1 new component file created (`admin/blog.tsx`).
- 4 existing component files updated (`admin/app.tsx`, `public/landing.tsx`, `admin/courses.tsx`, `student/courses.tsx`).
- All components use `'use client'`, shadcn/ui components, `useApi`/`apiPost`/`apiPatch`/`apiDelete` from `@/lib/api`, `toast` from `sonner`, icons from `lucide-react`.
- Followed existing styling patterns (Card / CardContent / CardHeader, Badge variants, alhikmah-gradient for course headers, responsive `sm:`/`lg:` grid layouts, consistent padding `p-4` / `p-6`).
- Did NOT modify any API routes, prisma schema, or run db:push — as instructed.

---
Task ID: blog-cart-upload-scheduling
Agent: full-stack-developer
Task: Blog detail page, image upload component, scheduling, course cart, more paid courses

Work Log:
- Created `/src/app/blog/[id]/page.tsx` (Task 1):
  - Public `'use client'` page using `useParams` to read the blog post ID and `useRouter` for navigation.
  - Fetches from `GET /api/blog/${id}` with proper loading + error + not-found states.
  - Renders header (title, author with `User` icon, date with `Calendar` icon, optional course badge), cover image (aspect-video), full content with `whitespace-pre-wrap` inside an `article.prose` wrapper, and a CTA card at the bottom ("Ready to start learning? Create Account" linking to `/register`).
  - "Back to Home" button at top + sticky header with brand and Home button. Al-Hikmah green/gold theme using `bg-background`, `alhikmah-gradient`, and `text-gold`.
  - Footer uses `mt-auto` to stick to bottom (flex-col layout). Responsive `sm:`/`lg:` typography.
- Updated `/src/components/views/public/landing.tsx` (Task 2):
  - Wrapped the existing "Read more" `Button` in `<a href={`/blog/${post.id}`}>` so links open the new blog detail route instead of `/register`. Uses anchor tag (not `router.push`) so navigation is a fresh page load.
- Created `/src/components/lms/image-upload.tsx` (Task 3):
  - Reusable client component. Props: `{ value: string | null, onChange, label? }`.
  - "Upload Image" button with `Upload` icon, hidden file input with `accept="image/*"`.
  - POSTs `FormData` with field name `file` to `/api/upload`, shows `Loader2` spinner while uploading, error toast on failure, success toast on completion.
  - When `value` is set: shows a thumbnail preview with a hover "X" remove button (top-right) and a small "Replace" button. Clicking remove calls `onChange(null)`.
  - When `value` is null: shows a dashed-border drop-zone styled button.
- Created `/src/app/api/upload/route.ts` (necessary supporting endpoint):
  - The task description referenced `/api/upload` as an "existing endpoint", but no such route existed in the codebase. Created a generic POST handler that accepts FormData with a `file` field, requires authentication (any logged-in user via `getCurrentUser`), saves to `/public/uploads/`, and returns `{ url, filename, fileType, size }` exactly as expected by the `ImageUpload` component. Mirrors the existing `/api/admin/lessons/[id]/files` upload pattern (same UPLOAD_DIR, same `detectFileType` helper).
- Updated `/src/components/views/admin/blog.tsx` (Task 4):
  - Imported `ImageUpload` from `@/components/lms/image-upload`.
  - Replaced the "Cover Image URL" text input with `<ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url ?? '' })} label="Cover Image (optional)" />`.
  - Added `publishAt` to form state (datetime-local string). On edit, hydrates from `post.publishAt` via `.toISOString().slice(0, 16)`.
  - Added "Schedule Publish (optional)" `datetime-local` input below the publish toggle with helper text. Saves as ISO string (or `null` if blank) in both POST and PATCH payloads.
  - Opened `openEdit` to accept `post: any` (instead of strict `BlogPost`) so `publishAt` is reachable.
- Updated `/src/components/views/admin/course-builder.tsx` (Tasks 5 + 11):
  - Imported `ImageUpload`.
  - `QuizEditor`: questions state typed as `Array<{ text; options; answer; imageUrl }>`. Each question card now includes an `ImageUpload` (label "Question Image (optional)") below the question text input. Added a small "+" button ("Add Question Below") at the bottom of each question card via a new `insertQ(i)` helper that splices a new question at index `i+1`. Existing inline "Add Question" button after the last question retained. POST body maps each question to `{ text, options, answer, imageUrl: q.imageUrl || null }`.
  - `LessonEditor`: updated the "Video URL" label to "Video URL (YouTube, MP4, or any video link)" and added helper text: "Paste a YouTube embed URL (https://www.youtube.com/embed/VIDEO_ID), a direct MP4 link, or any video URL."
- Updated `/src/components/views/admin/final-exam-editor.tsx` (Task 6):
  - Imported `ImageUpload`. Added `imageUrl` to question state shape and to the `updateQ` field union. `useEffect` hydration now reads `q.imageUrl`. Save payload maps each question with `imageUrl: q.imageUrl || null`.
  - Each question card now has an `ImageUpload` (label "Question Image (optional)") below the question text. Added `insertQ(i)` helper and a "Add Question Below" button at the bottom of each card. Added an additional inline "Add Question" button after the last question, right before the footer.
- Updated `/src/components/views/admin/announcements.tsx` (Task 7):
  - Added `publishAt` (datetime-local string) to form state. POST body now sends `publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null`.
  - Added "Schedule (optional)" `datetime-local` input below the course selector with helper text. Reset on submit.
- Updated `/src/app/api/admin/announcements/route.ts` (Task 8):
  - POST now accepts and persists `publishAt` (`publishAt: publishAt ? new Date(publishAt) : null`).
- Updated `/src/app/api/announcements/route.ts` (Task 8):
  - GET now filters with `where: { OR: [{ publishAt: null }, { publishAt: { lte: now } }] }`.
- Updated `/src/app/api/blog/route.ts` (Task 8):
  - GET now filters `where: { isPublished: true, OR: [{ publishAt: null }, { publishAt: { lte: now } }] }`.
- Updated `/src/app/api/admin/blog/route.ts` and `/src/app/api/admin/blog/[id]/route.ts` (Task 4 + 8):
  - POST and PATCH now accept and persist `publishAt` (`publishAt: publishAt ? new Date(publishAt) : null`). PATCH allow-list updated.
- Updated `/src/app/api/admin/quizzes/route.ts` (Task 5):
  - POST now persists `imageUrl: q.imageUrl || null` on each created `QuizQuestion`.
- Updated `/src/app/api/admin/courses/[id]/final-exam/route.ts` (Task 6):
  - POST now persists `imageUrl: q.imageUrl || null` on each created `FinalExamQuestion`.
- Updated `/src/components/views/student/courses.tsx` (Task 9 + Task 10 supporting UI):
  - For paid courses, added an "Access Duration" row below the course fee showing `{months} months access` (or "1 month access" singular).
  - Imported `ShoppingCart` and `Trash2` icons + `useCartIds` hook from `./course-cart`. When a paid course is enrolled-but-not-paid, the card now shows both a "Pay to Access" button (single-course payment) AND an "Add to Cart"/"Remove from Cart" toggle button.
- Created `/src/components/views/student/course-cart.tsx` (Task 10):
  - Exports `StudentCourseCart` component plus a `useCartIds` hook (with `getCartIds`/`saveCartIds` helpers) backed by `localStorage` under key `alhikmah-course-cart`. Cart changes dispatch a synthetic `alhikmah-cart-change` window event so the courses page subscribes and re-renders.
  - Page shows a header, a "Bulk Discount Tiers" explainer card (1–2 → 0%, 3–4 → 10%, 5+ → 15%), the list of cart items (each with course code, title, level/paid badges, lecturer, fee, remove button), and a sticky order summary card with subtotal, discount tier badge, savings line, total, and a "Pay for All" button.
  - On mount/cart change, calls `POST /api/courses/bulk-discount` with the paid course IDs to fetch the canonical totals. Shows `Loader2` while calculating.
  - "Pay for All" sequentially calls `POST /api/courses/[id]/access` for each cart course. If any returns a real (non-demo) `authorization_url` starting with `http`, redirects there. Otherwise (demo mode), calls `POST /api/courses/[id]/access/verify` with `{ reference, status: 'success' }` for each, clears the cart, and shows a success screen with "Browse Courses" and "Go to Dashboard" buttons.
  - "Clear Cart" button with confirm dialog. Empty state with "Browse Courses" CTA.
- Updated `/src/components/views/student/app.tsx` (Task 10):
  - Imported `ShoppingCart` icon and `StudentCourseCart`. Added `{ id: 'cart', label: 'Course Cart', icon: ShoppingCart }` to `navItems` (placed after `courses`) and added the render branch `{view === 'cart' && <StudentCourseCart onNavigate={navigate} />}`.
- Created `/scripts/seed-more-paid.ts` (Task 11):
  - New seed script that marks ECO302 (₦2,000 / 6 months), ECO301 Monetary Economics (₦3,000 / 6 months), and ECO401 Econometrics (₦5,000 / 12 months) as paid courses. Prints a summary of all paid courses at the end. (Did not modify the existing `seed-blog-paid.ts` per the task hint that a new script is acceptable.)
- Verified Task 12: `grep -r "Randomized"` across `src/` returns zero matches. Both `quiz-modal.tsx` and `final-exam.tsx` already had the "Randomized" badge removed; the only shuffle-related UI text is the "Pass mark" / questions count in the description. No code changes were needed.
- Regenerated Prisma client (`bun run db:generate`) — the schema already had `publishAt` columns on `BlogPost` and `Announcement` (and `imageUrl` on `QuizQuestion`/`FinalExamQuestion`), but the cached Prisma Client in `node_modules` was stale. After regeneration, the new queries with `publishAt` filters work correctly.
- Restarted dev server (it had crashed during Prisma regeneration testing) by running `bun run dev` in the background. The server compiles cleanly with no errors.
- Ran `bun run lint` — passes with 0 errors and 0 warnings.

Stage Summary:
- 4 new files created:
  - `src/app/blog/[id]/page.tsx` (public blog detail page)
  - `src/components/lms/image-upload.tsx` (reusable image upload component)
  - `src/app/api/upload/route.ts` (generic image upload endpoint — was missing despite task assuming it existed)
  - `src/components/views/student/course-cart.tsx` (bulk course cart with discount tiers + localStorage persistence)
  - `scripts/seed-more-paid.ts` (marks 3 paid courses for bulk-discount testing)
- 11 existing files updated:
  - `src/components/views/public/landing.tsx` (Read more → /blog/[id])
  - `src/components/views/admin/blog.tsx` (ImageUpload + publishAt)
  - `src/components/views/admin/course-builder.tsx` (QuizEditor image upload + inline add buttons; LessonEditor video URL label clarification)
  - `src/components/views/admin/final-exam-editor.tsx` (image upload + inline add buttons)
  - `src/components/views/admin/announcements.tsx` (publishAt scheduling)
  - `src/components/views/student/courses.tsx` (access duration display + Add to Cart button)
  - `src/components/views/student/app.tsx` (Course Cart nav item + route)
  - `src/app/api/blog/route.ts` (publishAt filter)
  - `src/app/api/announcements/route.ts` (publishAt filter)
  - `src/app/api/admin/announcements/route.ts` (persist publishAt)
  - `src/app/api/admin/blog/route.ts` + `[id]/route.ts` (persist publishAt)
  - `src/app/api/admin/quizzes/route.ts` (persist question imageUrl)
  - `src/app/api/admin/courses/[id]/final-exam/route.ts` (persist question imageUrl)
- All components use `'use client'`, shadcn/ui components, `useApi`/`apiPost`/`apiPatch`/`apiDelete` from `@/lib/api`, `toast` from `sonner`, icons from `lucide-react`.
- Did NOT modify prisma/schema.prisma (already had `publishAt` on BlogPost + Announcement, and `imageUrl` on QuizQuestion + FinalExamQuestion). Did NOT run `db:push`.
- Dev server confirmed running cleanly; `bun run lint` passes; `/api/blog` and `/blog/[id]` return 200.

---
Task ID: bugfix-batch-7
Agent: full-stack-developer
Task: Fix notification routing, certificate UI/verification, cart discount, add courses + course search

Work Log:
- Issue 1 — Admin/Lecturer notification routing (`src/components/lms/app-shell.tsx`):
  - The "View all" button and each notification-item button previously called `onNavigate('notifications')`, but admins/lecturers have no `notifications` view (only students do).
  - Updated both onClick handlers to use `onNavigate(user?.role === 'STUDENT' ? 'notifications' : 'announcements')`. The `user` object is already destructured from `useSession()` at the top of the component, so no new imports were needed.
- Issue 2 + Issue 3 — Certificate preview duplicate close button + Download button (`src/components/lms/certificate-preview.tsx`):
  - Removed the redundant `{onClose && (...)}` X button block from the header — the parent `Dialog` already renders its own X close button, so the duplicate was cluttering the toolbar.
  - Renamed "Print / Save PDF" button to "Download Certificate" and swapped the icon from `Printer` to `Download` (same `window.print()` behavior — users can save as PDF from the browser's print dialog). Helper text under the heading was also updated to "Download or print to save as PDF."
  - Removed the now-unused `onClose` prop from the component signature, removed unused imports (`Badge`, `useRouter`, `Printer`, `X`), and removed the unused `CertData` interface and `router` const.
  - Updated both callers to stop passing `onClose`: `student/certificates.tsx` and `public/verify-certificate.tsx`. The parent `Dialog onOpenChange` handlers still control closing.
- Issue 4 — Certificate verification "Network error" (`src/app/api/certificates/verify/route.ts`):
  - **Root cause** (found in `dev.log`): Prisma was throwing `Unknown field 'course' for include statement on model 'Certificate'`. The Certificate model in the schema only has `enrollment` and `user` relations — it stores `courseId` as a scalar FK column but has no `course` relation defined. The route's `include: { course: ... }` was invalid, causing a 500 error. The frontend's `await res.json()` then threw because the 500 response body was an HTML error page, which surfaced as the catch-block's generic "Network error" message.
  - Rewrote the route to fetch the course through the `enrollment.course` relation (Enrollment does have a `course` relation). The response shape is unchanged: `{ certificate: { certificateNumber, issuedAt, score, verified, studentName, matricNumber, department, courseCode, courseTitle, creditUnit, lecturerName } }`.
  - Wrapped the entire handler in try/catch so any unexpected error returns a proper JSON `{ error: 'Failed to verify certificate' }` with status 500 (no more HTML error pages). 404 for missing certs and 400 for missing `cert` param are unchanged.
  - The frontend already used a relative URL (`/api/certificates/verify?cert=...`) — verified, no changes needed there.
  - Verified with curl: valid cert → 200 + full payload; invalid cert → 404 `{error:'Certificate not found'}`; no param → 400 `{error:'Certificate number required'}`. Dev log confirms clean 200/404/400 responses (no more 500s).
- Issue 5 — Cart discount showing "0% off" and "Pay for All (₦0)" with 3 courses in cart (`src/components/views/student/course-cart.tsx`):
  - **Root cause**: The bulk-discount `useEffect` had a dependency array of `[ids.join(',')]`. On mount, `ids` is loaded synchronously from localStorage (3 IDs), but `allCourses` (from `useApi('/api/courses')`) is still fetching, so `cartCourses = allCourses.filter(c => ids.includes(c.id) && c.isPaid)` is empty on the first run. The effect short-circuits with `setDiscount(null)` and returns. When `allCourses` finishes loading a moment later, `cartCourses` becomes the expected 3 paid courses — but the effect does NOT re-fire because `ids.join(',')` hasn't changed. Result: `discount` stays `null` forever, and the UI shows "0% off" / "₦0".
  - Fix: introduced `const cartKey = cartCourses.map(c => c.id).join(',')` and switched the dependency to `[cartKey]`. This key changes both when the cart contents change AND when the catalog finishes loading (resolving empty cartCourses into the real paid-course list), so the bulk-discount API call fires correctly.
  - The API logic in `/api/courses/bulk-discount/route.ts` was already correct (only counts `isPaid: true` courses, 1-2→0%, 3-4→10%, 5+→15%), so no backend changes were needed. The "Pay for All" button already uses `discount?.finalAmount ?? 0` — once the API call actually fires, it now shows the correct discounted total.
- Issue 6 — Seed 5 more Economics courses (`scripts/seed-more-courses.ts`):
  - Created new seed script following the pattern of existing `scripts/seed-more-paid.ts`. Looks up `dr.yusuf@alhikmah.edu.ng` lecturer first (exits with a helpful error message if missing).
  - Defines an array of 5 course specs (ECO101, ECO102 free; ECO303, ECO402, ECO403 paid) with the exact code/title/level/semester/creditUnit/certificateFee/courseFee/accessDurationMonths from the task spec.
  - For each course: if the code already exists, log `[skip]`; otherwise `db.course.create()` with `isPublished: true`, `passMark: 50`, `lecturerId`, paid-course fields when applicable (`isPaid`, `courseFee`, `accessDurationMonths`), plus `allowDownload: false` and `watermarkMaterials: true` defaults.
  - Prints a summary table of ALL Economics courses (sorted by level/code) at the end so the operator can verify.
  - Script is idempotent — re-running will skip the 5 courses already inserted.
  - Ran the script: all 5 courses inserted successfully. Catalog now has 11 courses total (5 new + 6 existing including one pre-existing draft `ECO251`).
- Issue 7 — Search bar + filter dropdowns on student course catalog (`src/components/views/student/courses.tsx`):
  - Added three pieces of state: `search` (string), `levelFilter` (`'All' | '100' | '200' | '300' | '400'`), `typeFilter` (`'All' | 'Free' | 'Paid'`).
  - Added a `useMemo` that filters `courses` by: level match, paid/free match, and case-insensitive substring match against `${code} ${title} ${description}`.
  - New UI: a `Card` at the top of the catalog containing a search bar (with leading `Search` icon, `Input` with `type="search"`) and two `Select` dropdowns (Level / Type). Layout uses `flex flex-col sm:flex-row` — search is full width on mobile, filters drop below it; on sm+ everything is inline. The filter selects are wrapped in a `grid grid-cols-2 sm:flex` so they sit side-by-side on mobile too.
  - Below the controls: a "Showing X of Y courses" counter and a "Clear filters" button (only shown when any filter is active). Each `Select` has a proper `<Label>` for accessibility.
  - When `filteredCourses.length === 0`, shows a friendly empty-state Card with `BookOpen` icon and a "Clear all filters" CTA (separate from the loading-skeleton branch and the results grid).
  - The existing card grid (with enroll / pay-to-access / add-to-cart / continue-learning buttons) is unchanged — just iterates `filteredCourses` instead of `courses`.
- Ran `bun run lint` — passes with 0 errors and 0 warnings. (An initial unused-`eslint-disable-next-line` warning was removed.)
- Verified dev log: certificate verify route now returns clean 200/404/400 responses with proper JSON (no more 500 errors / "Network error"). Other routes unaffected.

Stage Summary:
- Files modified (5):
  - `src/components/lms/app-shell.tsx` — notification routing fix (2 onClick handlers).
  - `src/components/lms/certificate-preview.tsx` — removed duplicate close button, renamed button to "Download Certificate" with Download icon, cleaned up unused imports/props/interface.
  - `src/components/views/student/certificates.tsx` — stopped passing `onClose` to `CertificatePreview`.
  - `src/components/views/public/verify-certificate.tsx` — stopped passing `onClose` to `CertificatePreview`.
  - `src/app/api/certificates/verify/route.ts` — fixed Prisma include to go through `enrollment.course` (Certificate has no direct `course` relation), wrapped in try/catch.
  - `src/components/views/student/course-cart.tsx` — fixed bulk-discount effect dependency so it re-fires when the catalog finishes loading (was the root cause of the "0% off" / "₦0" bug).
  - `src/components/views/student/courses.tsx` — added search bar + Level/Type filter dropdowns + result count + empty state.
- Files created (1):
  - `scripts/seed-more-courses.ts` — seeds 5 new Economics courses (ECO101, ECO102 free; ECO303, ECO402, ECO403 paid). Idempotent. Already executed: 5/5 created, catalog now 11 courses.
- Did NOT modify `prisma/schema.prisma`. Did NOT run `db:push` or `bun run dev`.
- `bun run lint` passes cleanly (0 errors, 0 warnings). Dev server log shows clean compiles and the certificate-verify endpoint now returning 200/404/400 as expected.

---
Task ID: transcript-feature
Agent: full-stack-developer
Task: Build student transcript API + admin transcript page, add Edit Score to gradebook, add explanation card

Work Log:
- Created `/src/app/api/admin/students/[id]/transcript/route.ts` (Task 1):
  - `GET` handler (admin/lecturer only — returns 403 otherwise, 404 for unknown student).
  - Loads the student (`name, email, matricNumber, department`), all their enrollments (with `course.code/title/creditUnit/level/semester` and the related `certificate`), every `quizAttempt` (with `quiz.lesson.module.courseId` for grouping), and every `finalExamAttempt` (with `exam.courseId`).
  - Computes per-enrollment:
    - `quizAverage` = mean of `(score/totalMarks)*100` across all quiz attempts for that course (rounded).
    - `finalExamScore` = best `FinalExamAttempt` percentage for that course (rounded).
    - `finalScore` = `enrollment.finalScore` (lecturer-assigned, may be null).
    - `grade` + `gradePoint` computed from `finalScore`: A≥70 (5) · B≥60 (4) · C≥50 (3) · D≥40 (2) · F<40 (0). Null if not finalized.
    - `certificateStatus`: "Issued" (cert exists) | "Eligible" (completedAt + lecturerApproved, no cert yet) | "Pending".
    - `enrolledAt` and `completedAt` returned as ISO strings.
  - Computes cumulative GPA as `Σ(gradePoint × creditUnit) ÷ Σ(creditUnit)` across finalized enrollments only; returned as a 2-decimal number (or `null` if no completed courses).
  - Also returns `totals: { coursesEnrolled, coursesCompleted, certificatesIssued, totalCreditUnits }`.
  - Used clean sum/count Maps for quiz averaging (not the messy two-step approach I started with).
- Created `/src/components/views/admin/transcript.tsx` (Task 2):
  - `AdminTranscript` component, `'use client'`, green/gold themed.
  - Loads the full student roster via `useApi('/api/admin/students')` and renders a `Select` dropdown (with a `Search` Input to filter the list by name/email/matric) at the top.
  - When a student is selected, fetches `/api/admin/students/{id}/transcript` via `useApi(url, [selectedId])`.
  - Student info header (Avatar with initials, name, matric, email, department + 4 stat tiles: Courses, Completed, Certificates, Credit Units) and a "Print Transcript" button.
  - Enrollments table with columns: Course Code, Title (with Level/Semester/CU subtitle), CU, Quiz Avg, Final Exam, Final Score, Grade, Status, Action.
  - Each row has an "Edit" button (outline, with `Pencil` icon) that opens a dialog pre-filled with the current `finalScore`, posts to `/api/enrollments/{id}/finalize` on save, and refreshes via `refetch()`.
  - GPA summary card (gold border) at the bottom showing GPA out of 5.00 with explanatory text.
  - "Print Transcript" opens a clean new window via `window.open('', '_blank')` and writes a full HTML document (BEC logo, header, student block, transcript table, GPA row, grading scale, signature lines) mirroring the certificate download approach. Includes a print button + `@page { size: A4 portrait }` + `@media print` rules.
  - `escapeHtml()` helper sanitizes all student/course strings before injecting into the print HTML.
  - Empty state ("Select a student above…") and loading spinner handled.
- Updated `/src/components/views/admin/app.tsx` (Task 3):
  - Imported `FileText` from `lucide-react` and `AdminTranscript` from `./transcript`.
  - Added nav item `{ id: 'transcript', label: 'Transcripts', icon: FileText }` directly after `gradebook` in the nav array.
  - Added `{view === 'transcript' && <AdminTranscript />}` to the render section (right after the `gradebook` branch).
- Updated `/src/app/api/enrollments/[id]/finalize/route.ts` (Task 4):
  - The POST handler now works for BOTH new finalization AND updating existing scores. It no longer implicitly overwrites `completedAt` — it looks up the existing enrollment first, preserves `completedAt` if already set (otherwise stamps `new Date()`), and always sets `finalScore` + `lecturerApproved=true`.
  - Added input validation: returns 400 with a clear message if `finalScore` is missing/NaN/out of [0,100].
  - Returns 404 if the enrollment doesn't exist.
  - Did NOT add any "must not be completed" check, so editing already-finalized scores works seamlessly.
- Updated `/src/components/views/admin/gradebook.tsx` (Tasks 4 + 5):
  - Added ability to EDIT an already-finalized score: when an enrollment has `completedAt` set (whether or not a certificate exists), a small `Pencil` icon button now appears next to the score badge. Clicking it opens the same finalize dialog pre-filled with the current score.
  - The dialog title dynamically reads "Edit Score" when `mode === 'edit'` and "Finalize Course Score" when `mode === 'new'`. The button label and description text also change with the mode.
  - Refactored the modal state into a single `FinalizeModalState` object with a `mode: 'new' | 'edit'` discriminator, and split the open handlers into `openNewFinalize` (clears `finalScore`) vs `openEdit` (pre-fills `finalScore` from the existing score).
  - Fixed a latent bug in the prior code: the original click handler called `setFinalizeScore(...)` which didn't exist (only `setFinalScore` was defined) — the click would have crashed at runtime. Replaced with the correct `setFinalScore` calls inside the new open handlers.
  - Added input validation client-side (0–100 numeric) before posting to the finalize endpoint, with a `toast.error` if invalid.
  - Added a prominent explanation Card at the top of the gradebook page (Task 5): titled "How to read this gradebook" with an `Info` icon, light primary background, and a responsive 1/2/3-column grid of legend items that render the actual badges/buttons next to their explanations:
    - "Enrolled" = student has joined but hasn't taken quizzes.
    - "XX%" (outline) = average quiz score (auto-calculated from all attempts).
    - "Approved" (amber) = you have approved the student for certification.
    - "XX%" (solid) = final score you assigned via "Finalize".
    - "Cert" = certificate has been issued.
    - "Finalize" button = assign a final score and approve for certification.
    - "Edit" button = change an already-assigned final score.
    - green checkmark = all enrolled courses for this student have been finalized.
- Verified endpoints respond correctly without auth: `curl /api/admin/students/abc/transcript` → 403, `curl -X POST /api/enrollments/.../finalize` → 403. Both compile cleanly (dev log shows fresh `✓ Compiled in …ms` entries + the expected 403 responses, no errors).
- Ran `bun run lint` — passes with 0 errors and 0 warnings.

Stage Summary:
- 2 new files created:
  - `src/app/api/admin/students/[id]/transcript/route.ts` (transcript API)
  - `src/components/views/admin/transcript.tsx` (transcript admin view)
- 3 existing files updated:
  - `src/components/views/admin/app.tsx` (added Transcripts nav + render branch)
  - `src/app/api/enrollments/[id]/finalize/route.ts` (supports editing existing scores, preserves `completedAt`, validates input)
  - `src/components/views/admin/gradebook.tsx` (added Edit button per finalized cell, dynamic dialog title, info card with legend, fixed prior `setFinalizeScore` runtime bug)
- All components use `'use client'`, shadcn/ui components, `useApi`/`apiPost` from `@/lib/api`, `toast` from `sonner`, icons from `lucide-react`. Transcript print HTML mirrors the certificate download pattern (`window.open('', '_blank')` + `document.write`).
- Did NOT modify `prisma/schema.prisma`. Did NOT run `db:push` or `bun run dev`.
- `bun run lint` passes cleanly (0 errors, 0 warnings). Dev server log shows clean compiles for the new routes and the expected 403 responses on unauthenticated requests.
