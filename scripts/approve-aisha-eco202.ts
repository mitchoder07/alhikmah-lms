// Approve + finalize Aisha in ECO202 so she can pay for the certificate (test checkout)
import { db } from '../src/lib/db'

async function main() {
  const aisha = await db.user.findUnique({ where: { email: 'aisha@student.alhikmah.edu.ng' } })
  if (!aisha) { console.error('Aisha not found'); process.exit(1) }
  const eco202 = await db.course.findUnique({ where: { code: 'ECO202' } })
  if (!eco202) { console.error('ECO202 not found'); process.exit(1) }

  let enrollment = await db.enrollment.findFirst({ where: { userId: aisha.id, courseId: eco202.id } })
  if (!enrollment) {
    enrollment = await db.enrollment.create({ data: { userId: aisha.id, courseId: eco202.id, lecturerApproved: true } })
  }
  await db.enrollment.update({
    where: { id: enrollment.id },
    data: { lecturerApproved: true, finalScore: 82, completedAt: new Date() },
  })
  console.log(`Aisha approved + finalized in ECO202 with score 82%. Enrollment ID: ${enrollment.id}`)
  console.log('She can now visit Certificates → Pay & Get Certificate for ECO202')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
