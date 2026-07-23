// Seed a demo certificate so the verify + preview features can be tested.
import { db } from '../src/lib/db'

async function main() {
  // Find Aisha's enrollment in ECO201
  const aisha = await db.user.findUnique({ where: { email: 'aisha@student.alhikmah.edu.ng' } })
  if (!aisha) { console.error('Aisha not found'); process.exit(1) }
  const eco201 = await db.course.findUnique({ where: { code: 'ECO201' } })
  if (!eco201) { console.error('ECO201 not found'); process.exit(1) }
  const enrollment = await db.enrollment.findFirst({ where: { userId: aisha.id, courseId: eco201.id } })
  if (!enrollment) { console.error('Enrollment not found'); process.exit(1) }

  // Mark enrollment as completed + approved
  await db.enrollment.update({
    where: { id: enrollment.id },
    data: { completedAt: new Date(), finalScore: 78, lecturerApproved: true },
  })

  // Create a demo certificate (only if it doesn't already exist)
  const existing = await db.certificate.findUnique({ where: { enrollmentId: enrollment.id } })
  if (existing) {
    // Update it to use a recognizable demo number
    await db.certificate.update({
      where: { id: existing.id },
      data: { certificateNumber: 'AHK-CERT-2025-DEMO01', score: 78 },
    })
    console.log('Updated demo certificate:', existing.id)
  } else {
    const cert = await db.certificate.create({
      data: {
        enrollmentId: enrollment.id,
        userId: aisha.id,
        courseId: eco201.id,
        certificateNumber: 'AHK-CERT-2025-DEMO01',
        score: 78,
        verified: true,
      },
    })
    console.log('Created demo certificate:', cert.id)
  }

  // Add a live class link to ECO201 for testing the live class feature
  await db.course.update({
    where: { id: eco201.id },
    data: {
      liveClassUrl: 'https://meet.google.com/abc-defg-hij',
      liveClassTitle: 'Week 6 Live Tutorial — Demand & Supply Applications',
      liveClassScheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
  })
  console.log('Added live class link to ECO201')

  console.log('Done!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
