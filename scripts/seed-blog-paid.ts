// Seed demo blog posts and a demo paid course
import { db } from '../src/lib/db'

async function main() {
  const lecturer = await db.user.findUnique({ where: { email: 'dr.yusuf@alhikmah.edu.ng' } })
  if (!lecturer) { console.error('Lecturer not found'); process.exit(1) }

  // Create a demo blog post
  await db.blogPost.deleteMany({})
  await db.blogPost.create({
    data: {
      title: '5 Study Tips for Economics Students',
      excerpt: 'Practical strategies to help you master microeconomics, macroeconomics, and econometrics.',
      content: `Economics is a challenging but rewarding subject. Here are 5 proven study tips:

1. Master the fundamentals first. Before diving into complex theories, make sure you understand basic concepts like supply and demand, opportunity cost, and marginal analysis. These are the building blocks of everything else.

2. Practice with real-world examples. Don't just memorize formulas. Try to apply economic concepts to real situations. Why does the price of garri go up during harvest season? How does the CBN's monetary policy affect your daily expenses?

3. Draw diagrams. Economics is visual. Practice drawing supply and demand curves, production possibility frontiers, and IS-LM models. Being able to sketch these quickly will help you in exams.

4. Form study groups. Discuss concepts with your classmates. Teaching others is one of the best ways to solidify your own understanding.

5. Use the AI Study Buddy. Our LMS has a built-in AI tutor that can answer your questions 24/7. Don't hesitate to ask it to explain concepts you find difficult.

Remember, economics is about understanding how the world works. Stay curious!`,
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b42?w=800',
      authorId: lecturer.id,
      isPublished: true,
    }
  })

  await db.blogPost.create({
    data: {
      title: 'Understanding Nigeria\'s Inflation: A Student\'s Guide',
      excerpt: 'Why is inflation rising in Nigeria? What can the CBN do about it? A beginner-friendly explainer.',
      content: `Nigeria's inflation rate has been a hot topic in recent years. Let's break it down.

WHAT IS INFLATION?

Inflation is the general increase in prices across an economy over time. When inflation is high, each naira buys fewer goods and services.

WHY IS INFLATION RISING IN NIGERIA?

Several factors contribute:
1. Currency devaluation. The naira has lost value against the dollar, making imports more expensive.
2. Fuel subsidy removal. Increased fuel costs ripple through the entire economy.
3. Food insecurity. Insecurity in farming regions has reduced food supply.
4. Money supply. When the CBN prints more money, each naira is worth less.

WHAT CAN THE CBN DO?

The Central Bank of Nigeria has several tools:
1. Interest rates. Raising rates makes borrowing more expensive, reducing spending.
2. Cash reserve ratios. Requiring banks to hold more reserves reduces lending.
3. Open market operations. Selling government bonds absorbs excess money.

HOW DOES THIS AFFECT YOU?

As a student, inflation means your pocket money buys less. Understanding these concepts will help you make better financial decisions.`,
      imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      authorId: lecturer.id,
      isPublished: true,
    }
  })

  console.log('Created 2 blog posts')

  // Make ECO302 a paid course
  const eco302 = await db.course.findUnique({ where: { code: 'ECO302' } })
  if (eco302) {
    await db.course.update({
      where: { id: eco302.id },
      data: {
        isPaid: true,
        courseFee: 2000,
        accessDurationMonths: 6,
        allowDownload: false,
        watermarkMaterials: true,
      }
    })
    console.log('ECO302 is now a paid course (₦2,000 for 6 months access)')
  }

  console.log('Done!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
