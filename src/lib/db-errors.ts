type DbFailure = { code?: string; meta?: { columnName?: string; tableName?: string } }

/**
 * Turn a Prisma failure into a sentence a person can act on.
 *
 * This repo applies schema changes with `prisma db push`, and nothing in the deploy runs
 * it, so the usual failure is a database that is behind the schema. Saying "please try
 * again" there sends people back to retry something that can never succeed, so name the
 * table or column and the command that fixes it.
 */
export function describeDbError(e: unknown, fallback: string): { error: string; code?: string } {
  const err = e as DbFailure
  const code = typeof err?.code === 'string' ? err.code : undefined

  if (e instanceof TypeError) {
    return {
      error: `The server's Prisma client was built from an older schema. Redeploy so "prisma generate" runs against the current schema.`,
    }
  }
  if (code === 'P2021') {
    const table = err?.meta?.tableName ? ` "${err.meta.tableName}"` : ''
    return {
      code,
      error: `A database table${table} does not exist yet. Run "npm run db:push" against the database the app uses, then reload. (P2021)`,
    }
  }
  if (code === 'P2022') {
    const column = err?.meta?.columnName ? ` "${err.meta.columnName}"` : ''
    return {
      code,
      error: `A database column${column} does not exist yet. Run "npm run db:push" against the database the app uses, then reload. (P2022)`,
    }
  }
  if (code === 'P2003') {
    return { code, error: 'A related record is missing, so that could not be saved. Reload the page and try again. (P2003)' }
  }
  if (code === 'P1001' || code === 'P1017' || code === 'P2024') {
    return { code, error: `The app could not reach the database. Check DATABASE_URL and the connection pool, then try again. (${code})` }
  }
  return { code, error: code ? `${fallback} (${code})` : fallback }
}
