import { BRAND_ASSETS } from './constants'
import { catalogoImageUrl } from './catalogo-images'
import { toTabelaDocument } from './tabela-document'
import type { TabelaRevisao } from '../types/comercial'
import type { SystemSettings } from '../types'
async function imagemParaPDF(path: string): Promise<string> {
  if (!path) return ''
  const url = await catalogoImageUrl(path)
  if (!url || url.startsWith('data:')) return url
  try {
    const response = await fetch(url)
    if (!response.ok) return ''
    const blob = await response.blob()
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) return ''
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}
export async function createTabelaPDF(
  tabela: TabelaRevisao,
  settings: SystemSettings,
  imagens: boolean,
): Promise<Blob> {
  const [{ pdf }, { TabelaPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/pdf/TabelaPDF'),
  ])
  const document = toTabelaDocument(tabela, imagens)
  await Promise.all(
    document.itens.map(async (item) => {
      item.imagem = await imagemParaPDF(item.imagem)
    }),
  )
  return pdf(
    <TabelaPDF
      document={document}
      empresa={settings.empresa}
      logo={
        settings.mostrarLogoDocumentos ? `${location.origin}${BRAND_ASSETS.logoHorizontalWhiteAmberPng}` : undefined
      }
    />,
  ).toBlob()
}
