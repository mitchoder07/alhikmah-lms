import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('Seeding Al-Bashir Academy Academy LMS...')

  // Create admin
  const admin = await db.user.upsert({
    where: { email: 'admin@alhikmah.edu.ng' },
    update: {},
    create: {
      email: 'admin@alhikmah.edu.ng',
      name: 'Portal Administrator',
      password: hashPassword('admin123'),
      role: 'ADMIN',
      department: 'Economics',
    },
  })

  // Create lecturer
  const lecturer = await db.user.upsert({
    where: { email: 'dr.yusuf@alhikmah.edu.ng' },
    update: {},
    create: {
      email: 'dr.yusuf@alhikmah.edu.ng',
      name: 'Dr. M.B.O Yusuf',
      password: hashPassword('lecturer123'),
      role: 'LECTURER',
      department: 'Economics',
    },
  })

  // Create demo students
  const students = [
    { name: 'Aisha Mohammed', email: 'aisha@student.alhikmah.edu.ng', matric: '20/03ECO001' },
    { name: 'Fatima Bello', email: 'fatima@student.alhikmah.edu.ng', matric: '20/03ECO002' },
    { name: 'Yusuf Olatunji', email: 'yusuf@student.alhikmah.edu.ng', matric: '20/03ECO003' },
    { name: 'Khadijah Adeyemi', email: 'khadijah@student.alhikmah.edu.ng', matric: '20/03ECO004' },
    { name: 'Ibrahim Suleiman', email: 'ibrahim@student.alhikmah.edu.ng', matric: '21/03ECO005' },
    { name: 'Zainab Olawale', email: 'zainab@student.alhikmah.edu.ng', matric: '21/03ECO006' },
  ]
  const studentRecords: Array<{ id: string; name: string; email: string }> = []
  for (const s of students) {
    const u = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        password: hashPassword('student123'),
        role: 'STUDENT',
        matricNumber: s.matric,
        department: 'Economics',
      },
    })
    studentRecords.push(u)
  }

  // Create Economics courses
  const courses = [
    { code: 'ECO201', title: 'Microeconomic Theory I', description: 'Consumer behaviour, demand and supply analysis, elasticity, production and cost theory, market structures.', level: '200', semester: 'First', creditUnit: 3, certificateFee: 5000 },
    { code: 'ECO202', title: 'Macroeconomic Theory I', description: 'National income accounting, aggregate demand and supply, fiscal and monetary policy, inflation and unemployment.', level: '200', semester: 'First', creditUnit: 3, certificateFee: 5000 },
    { code: 'ECO301', title: 'Monetary Economics', description: 'The role of money in the economy, central banking, monetary policy transmission, financial institutions.', level: '300', semester: 'First', creditUnit: 2, certificateFee: 7500 },
    { code: 'ECO302', title: 'Development Economics', description: 'Theories of economic growth and development, poverty, inequality, and policy in developing economies.', level: '300', semester: 'Second', creditUnit: 3, certificateFee: 7500 },
    { code: 'ECO401', title: 'Econometrics', description: 'Linear regression, hypothesis testing, multicollinearity, heteroscedasticity, time series models.', level: '400', semester: 'First', creditUnit: 3, certificateFee: 10000 },
  ]

  const courseRecords = []
  for (const c of courses) {
    const course = await db.course.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, lecturerId: lecturer.id, isPublished: true, passMark: 50 },
    })
    courseRecords.push(course)
  }

  // ECO201 modules/lessons
  const eco201 = courseRecords[0]
  const module1 = await db.module.create({ data: { courseId: eco201.id, title: 'Module 1: Introduction to Microeconomics', description: 'Foundations of microeconomic thinking.', position: 0 } })
  const lesson1 = await db.lesson.create({ data: { moduleId: module1.id, title: 'Lesson 1: What is Microeconomics?', description: 'Scope and methods of microeconomics.', content: 'Microeconomics studies how individuals and firms make decisions under scarcity.', videoUrl: 'https://www.youtube.com/embed/UyCDD2UJSWQ', duration: 25, position: 0, isPreview: true } })
  await db.lessonFile.create({ data: { lessonId: lesson1.id, filename: 'intro-microeconomics.pdf', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', fileType: 'document', fileSize: 102400 } })
  await db.lesson.create({ data: { moduleId: module1.id, title: 'Lesson 2: Demand and Supply', description: 'The fundamental model of market equilibrium.', content: 'The law of demand and supply, market clearing price.', videoUrl: 'https://www.youtube.com/embed/UyCDD2UJSWQ', duration: 32, position: 1 } })

  const module2 = await db.module.create({ data: { courseId: eco201.id, title: 'Module 2: Consumer Behaviour', description: 'How consumers make choices.', position: 1 } })
  await db.lesson.create({ data: { moduleId: module2.id, title: 'Lesson 1: Utility Theory', description: 'Cardinal and ordinal utility.', content: 'Total and marginal utility, law of diminishing marginal utility.', videoUrl: 'https://www.youtube.com/embed/UyCDD2UJSWQ', duration: 28, position: 0 } })
  await db.lesson.create({ data: { moduleId: module2.id, title: 'Lesson 2: Indifference Curves', description: 'Indifference curves and budget constraints.', content: 'Properties of indifference curves and consumer equilibrium.', videoUrl: 'https://www.youtube.com/embed/UyCDD2UJSWQ', duration: 35, position: 1 } })

  const quiz1 = await db.quiz.create({ data: { lessonId: lesson1.id, title: 'Intro to Microeconomics Quiz', description: 'Test your understanding of basic concepts.', passMark: 50 } })
  await db.quizQuestion.create({ data: { quizId: quiz1.id, text: 'Microeconomics primarily studies:', options: JSON.stringify(['Aggregate demand', 'Individual decision-making', 'Government policy', 'Money supply']), answer: '1', marks: 1, position: 0 } })
  await db.quizQuestion.create({ data: { quizId: quiz1.id, text: 'The basic economic problem is:', options: JSON.stringify(['Inflation', 'Scarcity', 'Unemployment', 'Recession']), answer: '1', marks: 1, position: 1 } })
  await db.quizQuestion.create({ data: { quizId: quiz1.id, text: 'Opportunity cost refers to:', options: JSON.stringify(['Money spent on opportunity', 'Best alternative forgone', 'Total cost', 'Variable cost']), answer: '1', marks: 1, position: 2 } })

  for (const s of studentRecords) {
    await db.enrollment.create({ data: { courseId: eco201.id, userId: s.id, lecturerApproved: false } })
  }

  await db.lessonProgress.create({ data: { lessonId: lesson1.id, userId: studentRecords[0].id, completed: true, watchedSec: 1500 } })
  await db.lessonProgress.create({ data: { lessonId: lesson1.id, userId: studentRecords[1].id, completed: true, watchedSec: 1200 } })
  await db.lessonProgress.create({ data: { lessonId: lesson1.id, userId: studentRecords[2].id, completed: false, watchedSec: 600 } })

  await db.quizAttempt.create({ data: { quizId: quiz1.id, userId: studentRecords[0].id, score: 3, totalMarks: 3, passed: true, completedAt: new Date(), answers: JSON.stringify({}) } })
  await db.quizAttempt.create({ data: { quizId: quiz1.id, userId: studentRecords[1].id, score: 2, totalMarks: 3, passed: false, completedAt: new Date(), answers: JSON.stringify({}) } })

  await db.announcement.create({
    data: { authorId: lecturer.id, title: 'Welcome to ECO201 — Microeconomic Theory I', body: 'Dear students, welcome to a new semester. Please ensure you review the course outline and complete the introductory quiz by Friday.' }
  })

  // ✅ FIXED: Changed to upsert to avoid P2002 unique constraint error on 'reference'
  await db.payment.upsert({
    where: { reference: 'PSK_DEMO_001' },
    update: {},
    create: {
      userId: studentRecords[0].id,
      courseId: eco201.id,
      amount: 5000,
      provider: 'paystack',
      reference: 'PSK_DEMO_001',
      status: 'success',
      paidAt: new Date()
    }
  })

  console.log('Seed complete!')
  console.log('--- Login credentials ---')
  console.log('Admin:    admin@alhikmah.edu.ng / admin123')
  console.log('Lecturer: dr.yusuf@alhikmah.edu.ng / lecturer123')
  console.log('Student:  aisha@student.alhikmah.edu.ng / student123')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })