// Seed additional paid courses for bulk-discount testing.
// Makes ECO301 (Monetary Economics) paid at ₦3,000 for 6 months,
// ECO401 (Econometrics) paid at ₦5,000 for 12 months,
// and re-affirms ECO302 paid at ₦2,000 for 6 months.
import { db } from '../src/lib/db'

async function main() {
  const targets = [
    { code: 'ECO302', courseFee: 2000, accessDurationMonths: 6 },
    { code: 'ECO301', courseFee: 3000, accessDurationMonths: 6 },
    { code: 'ECO401', courseFee: 5000, accessDurationMonths: 12 },
  ]

  for (const t of targets) {
    const course = await db.course.findUnique({ where: { code: t.code } })
    if (!course) {
      console.warn(`Course ${t.code} not found — skipping`)
      continue
    }
    await db.course.update({
      where: { id: course.id },
      data: {
        isPaid: true,
        courseFee: t.courseFee,
        accessDurationMonths: t.accessDurationMonths,
        allowDownload: false,
        watermarkMaterials: true,
      },
    })
    console.log(`${t.code} is now a paid course (₦${t.courseFee.toLocaleString()} for ${t.accessDurationMonths} months access)`)
  }

  // Summary
  const paidCourses = await db.course.findMany({
    where: { isPaid: true },
    select: { code: true, title: true, courseFee: true, accessDurationMonths: true },
  })
  console.log(`\nTotal paid courses now: ${paidCourses.length}`)
  for (const c of paidCourses) {
    console.log(`  ${c.code}: ${c.title} — ₦${c.courseFee.toLocaleString()} / ${c.accessDurationMonths} months`)
  }

  console.log('\nDone!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
