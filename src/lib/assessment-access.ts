import { db } from '@/lib/db'
import type { LoadedAttempt } from '@/lib/grading'

/** Admins review anything; a lecturer only reviews attempts in their own courses. */
export async function canReviewAttempt(
  user: { id: string; role: string },
  loaded: Pick<LoadedAttempt, 'course'>
): Promise<boolean> {
  if (user.role === 'ADMIN') return true
  const count = await db.course.count({ where: { id: loaded.course.id, lecturerId: user.id } })
  return count > 0
}
