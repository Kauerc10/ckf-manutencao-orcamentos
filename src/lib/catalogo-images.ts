import { supabase } from './supabase'
import type { Profile } from '../types'
export async function uploadCatalogoImage(file: File, profile: Profile): Promise<string> {
  if (!profile.ativo || profile.role !== 'admin') throw new Error('Apenas administradores podem enviar imagens.')
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type]
  if (!ext || file.size > 5 * 1024 * 1024) throw new Error('Use PNG, JPEG ou WebP de até 5 MB.')
  if (!supabase)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  const path = `servicos/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('catalogo')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}
export async function catalogoImageUrl(path: string): Promise<string> {
  if (!path) return ''
  if (!supabase) return /^data:image\/(png|jpeg|webp);base64,/.test(path) ? path : ''
  if (!/^servicos\/[0-9a-f-]+\.(png|jpg|webp)$/.test(path)) return ''
  const { data, error } = await supabase.storage.from('catalogo').createSignedUrl(path, 3600)
  if (error) return ''
  return data.signedUrl
}
