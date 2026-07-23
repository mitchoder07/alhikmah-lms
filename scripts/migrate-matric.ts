// Migrate existing student matric numbers from AHU/ECO/YY/1234 format to 20/03ECO00X format
import { db } from '../src/lib/db'

async function main() {
  const students = await db.user.findMany({ where: { role: 'STUDENT' } })
  console.log(`Found ${students.length} students`)

  // Map old matric to new matric
  const matricMap: Record<string, string> = {
    'AHU/ECO/20/1001': '20/03ECO001',
    'AHU/ECO/20/1002': '20/03ECO002',
    'AHU/ECO/20/1003': '20/03ECO003',
    'AHU/ECO/20/1004': '20/03ECO004',
    'AHU/ECO/21/1005': '21/03ECO005',
    'AHU/ECO/21/1006': '21/03ECO006',
  }

  let updated = 0
  for (const s of students) {
    if (s.matricNumber && matricMap[s.matricNumber]) {
      await db.user.update({
        where: { id: s.id },
        data: { matricNumber: matricMap[s.matricNumber] },
      })
      console.log(`  ${s.name}: ${s.matricNumber} → ${matricMap[s.matricNumber]}`)
      updated++
    } else if (s.matricNumber) {
      console.log(`  ${s.name}: ${s.matricNumber} (no mapping, leaving as-is)`)
    }
  }
  console.log(`Done! Updated ${updated} matric numbers.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
