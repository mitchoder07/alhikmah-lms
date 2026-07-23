// Update the existing lecturer record to the new name + email
import { db } from '../src/lib/db'

async function main() {
  // Find existing lecturer by old email and update
  const existing = await db.user.findUnique({ where: { email: 'dr.abdulrahman@alhikmah.edu.ng' } })
  if (existing) {
    // Check if new email is taken
    const taken = await db.user.findUnique({ where: { email: 'dr.yusuf@alhikmah.edu.ng' } })
    if (taken) {
      // Just update the name on the existing record with old email
      await db.user.update({ where: { id: existing.id }, data: { name: 'Dr. M.B.O Yusuf' } })
      console.log(`Updated name to "Dr. M.B.O Yusuf" on ${existing.email}`)
    } else {
      await db.user.update({ where: { id: existing.id }, data: { email: 'dr.yusuf@alhikmah.edu.ng', name: 'Dr. M.B.O Yusuf' } })
      console.log('Lecturer renamed: dr.abdulrahman@alhikmah.edu.ng → dr.yusuf@alhikmah.edu.ng (Dr. M.B.O Yusuf)')
    }
  } else {
    // Maybe the new email already exists with old name
    const existingNew = await db.user.findUnique({ where: { email: 'dr.yusuf@alhikmah.edu.ng' } })
    if (existingNew) {
      await db.user.update({ where: { id: existingNew.id }, data: { name: 'Dr. M.B.O Yusuf' } })
      console.log('Updated existing dr.yusuf@alhikmah.edu.ng name to "Dr. M.B.O Yusuf"')
    } else {
      // Create fresh
      const { hashPassword } = await import('../src/lib/auth')
      await db.user.create({
        data: {
          email: 'dr.yusuf@alhikmah.edu.ng',
          name: 'Dr. M.B.O Yusuf',
          password: hashPassword('lecturer123'),
          role: 'LECTURER',
          department: 'Economics',
        },
      })
      console.log('Created new lecturer: dr.yusuf@alhikmah.edu.ng / lecturer123')
    }
  }
  console.log('Done!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
