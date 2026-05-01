// Saved Analyses — save/list/get/delete hasil analisis statistik via Supabase.
import { supabase } from './supabase'

/**
 * Simpan hasil analisis ke akun user yang login.
 * @param {object} params
 * @param {string} params.title - judul yang user pilih
 * @param {string} params.tool - tool key (descriptive, ttest, dll)
 * @param {string} params.toolName - display name
 * @param {object} params.result - full result object
 * @param {string} [params.aiInterpretation] - AI interpretation jika ada
 * @param {string} [params.notes] - catatan personal
 */
export async function saveAnalysis({ title, tool, toolName, result, aiInterpretation, notes }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Belum login' }

  const sampleSize = inferSampleSize(result)

  const { data, error } = await supabase
    .from('saved_analyses')
    .insert({
      user_id: user.id,
      title: title?.trim() || `${toolName} — ${new Date().toLocaleString('id-ID')}`,
      tool,
      tool_name: toolName,
      result_type: result.type,
      sample_size: sampleSize,
      result,
      ai_interpretation: aiInterpretation || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, analysis: data }
}

/**
 * List semua analysis milik user (paginasi sederhana).
 */
export async function listAnalyses({ limit = 100, search = '' } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Belum login', items: [] }

  let query = supabase
    .from('saved_analyses')
    .select('id, title, tool, tool_name, result_type, sample_size, ai_interpretation, notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search?.trim()) {
    query = query.ilike('title', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) return { ok: false, error: error.message, items: [] }
  return { ok: true, items: data || [] }
}

/**
 * Ambil detail satu analysis (full result jsonb).
 */
export async function getAnalysis(id) {
  const { data, error } = await supabase
    .from('saved_analyses')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Tidak ditemukan' }
  return { ok: true, analysis: data }
}

/**
 * Update title/notes/AI interpretation.
 */
export async function updateAnalysis(id, patch) {
  const allowed = {}
  if ('title' in patch) allowed.title = patch.title?.trim() || null
  if ('notes' in patch) allowed.notes = patch.notes?.trim() || null
  if ('aiInterpretation' in patch) allowed.ai_interpretation = patch.aiInterpretation || null

  const { data, error } = await supabase
    .from('saved_analyses')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, analysis: data }
}

/**
 * Hapus analysis.
 */
export async function deleteAnalysis(id) {
  const { error } = await supabase
    .from('saved_analyses')
    .delete()
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Hitung jumlah saved analyses milik user (untuk badge/counter).
 */
export async function countAnalyses() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('saved_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  return count || 0
}

// =====================================================================
// Helpers
// =====================================================================
function inferSampleSize(result) {
  if (!result) return null
  if (result.sampleSize) return result.sampleSize
  if (result.n) return result.n
  if (result.N) return result.N
  if (result.stats?.[0]?.n) return result.stats[0].n
  if (result.results?.[0]?.n) return result.results[0].n
  if (result.reliability?.n) return result.reliability.n
  if (result.group1?.n && result.group2?.n) return result.group1.n + result.group2.n
  if (result.groupStats?.length) {
    return result.groupStats.reduce((s, g) => s + (g.n || 0), 0) || null
  }
  return null
}
