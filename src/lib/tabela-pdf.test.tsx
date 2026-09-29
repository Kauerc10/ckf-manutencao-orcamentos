// @vitest-environment node
import { expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TabelaPDF } from '../components/pdf/TabelaPDF'
import { toCatalogoDocument, toTabelaDocument } from './tabela-document'
import { EMPRESA } from './constants'
import type { Servico, TabelaRevisao } from '../types/comercial'

it('gera o PDF do catálogo sem destinatário nem diferenças internas', async () => {
  const servico: Servico = {
    id: 's1',
    codigo: 'CKF-00001',
    nome: 'Soldagem de estrutura',
    categoria: 'Soldagem',
    escopo: 'Solda de uma peça com preparação e acabamento.',
    unidade: 'unidade',
    precoPadrao: 250,
    imagem: '',
    ativo: true,
    versao: 1,
    criadorNome: 'Interno',
    criadoEm: '2026-09-29',
    autorNome: 'Interno',
    atualizadoEm: '2026-09-29',
  }
  const doc = toCatalogoDocument([servico])
  expect(doc.tipo).toBe('catalogo')
  expect(toCatalogoDocument([{ ...servico, ativo: false }]).itens).toHaveLength(0)
  const buffer = await renderToBuffer(<TabelaPDF document={doc} empresa={EMPRESA} />)
  const task = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
    useSystemFonts: false,
  })
  const parsed = await task.promise
  const text = (await (await parsed.getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ')
  expect(text).toContain('Catálogo de serviços CKF')
  expect(text).toContain('CKF-00001')
  expect(text).toContain('R$ 250,00')
  expect(text).toContain('unidade')
  expect(text).not.toContain('Interno')
  expect(text).not.toContain('Tabela 0')
  await task.destroy()
}, 30000)
it('exporta múltiplas páginas sem expor padrão, ajuste ou autoria interna', async () => {
  const tabela: TabelaRevisao = {
    titulo: 'Tabela de serviços CKF',
    empresa: {
      id: 'teste',
      nome: 'Empresa de exemplo',
      documento: '12.345.678/0001-95',
    },
    versao: 2,
    autorNome: 'AUTOR-INTERNO-SECRETO',
    criadoEm: '2026-09-29T12:00:00Z',
    itens: Array.from({ length: 30 }, (_, i) => ({
      servicoId: `s${i}`,
      codigo: `S-${String(i).padStart(3, '0')}`,
      nome: `Serviço ${i}`,
      categoria: i < 15 ? 'Manutenção' : 'Soldagem',
      escopo: 'Preparação, mão de obra e conferência técnica. '.repeat(8),
      unidade: 'hora',
      preco: 90,
      precoReferencia: 12345.67,
      imagem: '',
    })),
  }
  const doc = toTabelaDocument(tabela)
  const buffer = await renderToBuffer(<TabelaPDF document={doc} empresa={EMPRESA} />)
  const task = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
    useSystemFonts: false,
  })
  const parsed = await task.promise
  expect(parsed.numPages).toBeGreaterThan(1)
  let text = ''
  for (let p = 1; p <= parsed.numPages; p++) {
    const page = await parsed.getPage(p)
    const content = await page.getTextContent()
    const pageText = content.items.map((i) => ('str' in i ? i.str : '')).join(' ')
    expect(pageText).toContain('CÓDIGO')
    expect(pageText).toContain('CKF MANUTENÇÃO')
    text += pageText + ' '
  }
  expect(text).toContain('Serviço 29')
  expect(text).toContain('R$ 90,00')
  expect(text).not.toContain('12.345,67')
  expect(text).not.toContain('AUTOR-INTERNO-SECRETO')
  expect(text).not.toContain('Diferença')
  if (process.env.CKF_QA_DIR) {
    const dir = process.env.CKF_QA_DIR
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/tabela-multipagina.pdf`, buffer)
    const { createCanvas } = await import('@napi-rs/canvas')
    for (const pageNumber of [1, parsed.numPages]) {
      const page = await parsed.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.4 })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise
      writeFileSync(`${dir}/tabela-pagina-${pageNumber}.png`, canvas.toBuffer('image/png'))
    }
    const logo = `data:image/png;base64,${readFileSync('public/brand/ckf-logo-horizontal-white-amber-trimmed.png').toString('base64')}`
    const sample = { ...doc, itens: doc.itens.slice(0, 3) }
    const branded = await renderToBuffer(<TabelaPDF document={sample} empresa={EMPRESA} logo={logo} />)
    writeFileSync(`${dir}/tabela-exemplo.pdf`, branded)
    const brandedTask = getDocument({
      data: new Uint8Array(branded),
      standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
      useSystemFonts: false,
    })
    const brandedDoc = await brandedTask.promise
    const page = await brandedDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1.4 })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise
    writeFileSync(`${dir}/tabela-exemplo.png`, canvas.toBuffer('image/png'))
    await brandedTask.destroy()
  }
  await task.destroy()
}, 30000)

it('mantém todo o escopo de um serviço quando o texto atravessa páginas', async () => {
  const tabela: TabelaRevisao = {
    titulo: 'Tabela de serviços CKF',
    empresa: {
      id: 'teste',
      nome: 'Empresa de exemplo',
      documento: '12.345.678/0001-95',
    },
    versao: 1,
    autorNome: 'Admin',
    criadoEm: '2026-09-29T12:00:00Z',
    itens: [
      {
        servicoId: 'longo',
        codigo: 'LONGO',
        nome: 'Serviço extenso',
        categoria: 'Manutenção',
        escopo: 'Linha técnica\n'.repeat(130) + 'MARCADOR-FINAL-ESCOPO',
        unidade: 'hora',
        preco: 200,
        precoReferencia: 100,
        imagem: '',
      },
    ],
  }
  const buffer = await renderToBuffer(<TabelaPDF document={toTabelaDocument(tabela)} empresa={EMPRESA} />)
  const task = getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
    useSystemFonts: false,
  })
  const parsed = await task.promise
  expect(parsed.numPages).toBeGreaterThan(1)
  let text = ''
  for (let p = 1; p <= parsed.numPages; p++)
    text += (await (await parsed.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ')
  expect(text).toContain('MARCADOR-FINAL-ESCOPO')
  const ultimaPagina = (await (await parsed.getPage(parsed.numPages)).getTextContent()).items
    .map((i) => ('str' in i ? i.str : ''))
    .join(' ')
  expect(ultimaPagina).toContain('LONGO')
  expect(ultimaPagina).toContain('continuação')
  if (process.env.CKF_QA_DIR) {
    const dir = process.env.CKF_QA_DIR
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/tabela-escopo-longo.pdf`, buffer)
    const { createCanvas } = await import('@napi-rs/canvas')
    const page = await parsed.getPage(parsed.numPages)
    const viewport = page.getViewport({ scale: 1.4 })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise
    writeFileSync(`${dir}/tabela-escopo-longo-ultima-pagina.png`, canvas.toBuffer('image/png'))
  }
  await task.destroy()
}, 30000)
