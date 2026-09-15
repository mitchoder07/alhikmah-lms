import { db } from '@/lib/db'

/**
 * Which AI documents a staff member may see and use. Admins see everything; a
 * lecturer sees their own uploads, the department-wide ones (no course) and any
 * attached to a course they teach.
 */
export async function visibleDocsWhere(user: { id: string; role: string }) {
  if (user.role === 'ADMIN') return {}
  const taught = await db.course.findMany({ where: { lecturerId: user.id }, select: { id: true } })
  const courseIds = taught.map((c) => c.id)
  return {
    OR: [{ ownerId: user.id }, { courseId: null }, ...(courseIds.length ? [{ courseId: { in: courseIds } }] : [])],
  }
}
