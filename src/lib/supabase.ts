import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Fetch every row from a table, bypassing Supabase's 1000-row default cap. */
export async function fetchAll<T>(table: string, columns = '*'): Promise<T[]> {
  const PAGE = 1000
  let all: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) throw error
    all = [...all, ...(data ?? [])]
    if ((data ?? []).length < PAGE) break
    from += PAGE
  }
  return all
}
