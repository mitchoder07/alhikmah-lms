// Seed a demo final exam for ECO201
import { db } from '../src/lib/db'

async function main() {
  const eco201 = await db.course.findUnique({ where: { code: 'ECO201' } })
  if (!eco201) { console.error('ECO201 not found'); process.exit(1) }

  // Delete existing final exam if any
  await db.finalExam.deleteMany({ where: { courseId: eco201.id } })

  const exam = await db.finalExam.create({
    data: {
      courseId: eco201.id,
      title: 'ECO201 Final Exam',
      description: 'Comprehensive exam covering all modules. You must score 50% or above to qualify for your certificate.',
      passMark: 50,
      timeLimit: 60,
      maxAttempts: 3,
      questions: {
        create: [
          {
            text: 'Which of the following is NOT a determinant of demand?',
            options: JSON.stringify(['Price of the good', 'Consumer income', 'Cost of production', 'Consumer preferences']),
            answer: '2',
            marks: 2,
            position: 0,
          },
          {
            text: 'The law of diminishing marginal utility states that:',
            options: JSON.stringify([
              'Total utility increases at an increasing rate',
              'Total utility increases at a decreasing rate',
              'Marginal utility increases as consumption increases',
              'Total utility remains constant'
            ]),
            answer: '1',
            marks: 2,
            position: 1,
          },
          {
            text: 'If the price elasticity of demand is greater than 1, demand is said to be:',
            options: JSON.stringify(['Inelastic', 'Unit elastic', 'Elastic', 'Perfectly inelastic']),
            answer: '2',
            marks: 2,
            position: 2,
          },
          {
            text: 'Which market structure has the most sellers and identical products?',
            options: JSON.stringify(['Monopoly', 'Oligopoly', 'Monopolistic competition', 'Perfect competition']),
            answer: '3',
            marks: 2,
            position: 3,
          },
          {
            text: 'Opportunity cost is best defined as:',
            options: JSON.stringify([
              'The monetary cost of a choice',
              'The best alternative forgone when making a choice',
              'The total cost of production',
              'The difference between price and cost'
            ]),
            answer: '1',
            marks: 2,
            position: 4,
          },
        ]
      }
    }
  })

  console.log(`Created final exam: ${exam.id} with 5 questions`)
  console.log('Pass mark: 50%, Time limit: 60 min, Max attempts: 3')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
