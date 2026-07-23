// Seed 5 MORE Economics courses (ECO101, ECO102, ECO303, ECO402, ECO403)
// assigned to Dr. Yusuf (dr.yusuf@alhikmah.edu.ng).
// ECO303, ECO402, ECO403 are paid courses with courseFee + accessDurationMonths.
// Free courses use isPaid: false (defaults).
//
// Run with: bun run scripts/seed-more-courses.ts
import { db } from '../src/lib/db'

async function main() {
  const lecturer = await db.user.findUnique({
    where: { email: 'dr.yusuf@alhikmah.edu.ng' },
    select: { id: true, name: true, email: true },
  })

  if (!lecturer) {
    console.error('Lecturer with email dr.yusuf@alhikmah.edu.ng not found. Run `bun run scripts/seed.ts` first.')
    process.exit(1)
  }

  console.log(`Assigning new courses to ${lecturer.name} <${lecturer.email}>`)

  type NewCourse = {
    code: string
    title: string
    description: string
    level: string
    semester: string
    creditUnit: number
    certificateFee: number
    isPaid?: boolean
    courseFee?: number
    accessDurationMonths?: number
  }

  const courses: NewCourse[] = [
    {
      code: 'ECO101',
      title: 'Introduction to Economics I',
      description:
        'Foundations of economic thought: scarcity, choice, opportunity cost, basic demand and supply, and an overview of microeconomic and macroeconomic systems.',
      level: '100',
      semester: 'First',
      creditUnit: 3,
      certificateFee: 3000,
    },
    {
      code: 'ECO102',
      title: 'Introduction to Economics II',
      description:
        'Continuation of ECO101: introduction to national income accounting, money and banking, inflation, unemployment, and elementary fiscal and monetary policy.',
      level: '100',
      semester: 'Second',
      creditUnit: 3,
      certificateFee: 3000,
    },
    {
      code: 'ECO303',
      title: 'Public Finance',
      description:
        'Principles of public revenue and expenditure, taxation, government budgeting, public debt, and the role of government in economic development.',
      level: '300',
      semester: 'Second',
      creditUnit: 2,
      certificateFee: 7500,
      isPaid: true,
      courseFee: 2000,
      accessDurationMonths: 6,
    },
    {
      code: 'ECO402',
      title: 'International Economics',
      description:
        'Theories of international trade, comparative advantage, trade policy, balance of payments, exchange rates, and the role of international institutions.',
      level: '400',
      semester: 'Second',
      creditUnit: 3,
      certificateFee: 10000,
      isPaid: true,
      courseFee: 4000,
      accessDurationMonths: 6,
    },
    {
      code: 'ECO403',
      title: 'Petroleum Economics',
      description:
        'Economics of the petroleum industry: upstream/downstream operations, oil pricing, OPEC, resource rent, environmental economics, and the Nigerian oil sector.',
      level: '400',
      semester: 'First',
      creditUnit: 2,
      certificateFee: 10000,
      isPaid: true,
      courseFee: 5000,
      accessDurationMonths: 12,
    },
  ]

  let created = 0
  let skipped = 0

  for (const c of courses) {
    const existing = await db.course.findUnique({ where: { code: c.code } })
    if (existing) {
      console.log(`  [skip] ${c.code} already exists — "${existing.title}"`)
      skipped++
      continue
    }

    await db.course.create({
      data: {
        code: c.code,
        title: c.title,
        description: c.description,
        level: c.level,
        semester: c.semester,
        creditUnit: c.creditUnit,
        certificateFee: c.certificateFee,
        isPublished: true,
        passMark: 50,
        lecturerId: lecturer.id,
        isPaid: c.isPaid ?? false,
        courseFee: c.courseFee ?? 0,
        accessDurationMonths: c.accessDurationMonths ?? 6,
        allowDownload: false,
        watermarkMaterials: true,
      },
    })

    const paidTag = c.isPaid ? ` [PAID ₦${c.courseFee?.toLocaleString()} / ${c.accessDurationMonths}mo]` : ''
    console.log(`  [ok]   ${c.code} — ${c.title}${paidTag}`)
    created++
  }

  console.log(`\nCreated ${created} new course(s), skipped ${skipped} existing.`)

  // Summary: list all Economics courses by level
  const all = await db.course.findMany({
    orderBy: [{ level: 'asc' }, { code: 'asc' }],
    select: {
      code: true,
      title: true,
      level: true,
      semester: true,
      creditUnit: true,
      certificateFee: true,
      isPaid: true,
      courseFee: true,
      accessDurationMonths: true,
      isPublished: true,
    },
  })

  console.log(`\nTotal Economics courses in catalog: ${all.length}`)
  for (const c of all) {
    const paid = c.isPaid ? ` · PAID ₦${c.courseFee.toLocaleString()}/${c.accessDurationMonths}mo` : ''
    const pub = c.isPublished ? '' : ' · DRAFT'
    console.log(
      `  ${c.code}  ${c.level}/${c.semester}  ${c.creditUnit}CU  cert ₦${c.certificateFee.toLocaleString()}${paid}${pub}  — ${c.title}`,
    )
  }

  console.log('\nDone!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
