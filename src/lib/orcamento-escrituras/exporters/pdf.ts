import { DEFAULT_BANK_TEXT, DEFAULT_PAYMENT_FOOTER } from '../defaults';
import { formatCurrency } from '../formatters';
import { formatTaxForItem } from '../whatsapp-templates';
import type { EscrituraBudgetLineResult, EscrituraBudgetResult, EscrituraCertificateInput } from '../types';

type PdfMakeDocument = {
  download: (filename?: string) => void;
  print: () => void;
  open: () => void;
};

type PdfFontMap = Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;

type PdfMakeInstance = {
  vfs?: Record<string, string>;
  fonts?: PdfFontMap;
  createPdf: (definition: Record<string, any>, tableLayouts?: Record<string, any>, fonts?: PdfFontMap, vfs?: Record<string, string>) => PdfMakeDocument;
};

export type OrcamentoEscrituraExportOptions = {
  summaryText?: string;
  paymentText?: string;
};

const CM_TO_PT = 28.3464566929;
const PAGE_WIDTH = cm(21);
const CONTENT_WIDTH = cm(18.2);

let pdfMakePromise: Promise<PdfMakeInstance> | null = null;
const imageCache = new Map<string, Promise<string | null>>();

function cm(value: number) {
  return Number((value * CM_TO_PT).toFixed(2));
}

function normalizeText(value?: string) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVfs(moduleValue: any): Record<string, string> | undefined {
  const candidates = [
    moduleValue?.pdfMake?.vfs,
    moduleValue?.default?.pdfMake?.vfs,
    moduleValue?.vfs,
    moduleValue?.default?.vfs,
    moduleValue?.default,
    moduleValue,
  ];

  return candidates.find(
    (candidate) => candidate && typeof candidate === 'object' && Object.keys(candidate).some((key) => /\.ttf$/i.test(key)),
  );
}

function aliasFont(vfs: Record<string, string>, target: string, sources: string[]) {
  if (vfs[target]) return;
  const source = sources.find((candidate) => vfs[candidate]);
  if (source) vfs[target] = vfs[source];
}

function configurePdfMakeFonts(pdfMake: PdfMakeInstance, pdfFontsModule: any) {
  const bundledVfs = extractVfs(pdfFontsModule) || {};
  const mergedVfs = { ...(pdfMake.vfs || {}), ...bundledVfs };

  aliasFont(mergedVfs, 'Roboto-Regular.ttf', ['Roboto-Regular.ttf', 'Roboto-Medium.ttf', 'Roboto-Bold.ttf']);
  aliasFont(mergedVfs, 'Roboto-Medium.ttf', ['Roboto-Medium.ttf', 'Roboto-Bold.ttf', 'Roboto-Regular.ttf']);
  aliasFont(mergedVfs, 'Roboto-Italic.ttf', ['Roboto-Italic.ttf', 'Roboto-Regular.ttf']);
  aliasFont(mergedVfs, 'Roboto-MediumItalic.ttf', ['Roboto-MediumItalic.ttf', 'Roboto-BoldItalic.ttf', 'Roboto-Italic.ttf', 'Roboto-Regular.ttf']);

  const regularFile = mergedVfs['Roboto-Regular.ttf'] ? 'Roboto-Regular.ttf' : 'Roboto-Medium.ttf';
  const boldFile = mergedVfs['Roboto-Medium.ttf'] ? 'Roboto-Medium.ttf' : regularFile;
  const italicFile = mergedVfs['Roboto-Italic.ttf'] ? 'Roboto-Italic.ttf' : regularFile;
  const boldItalicFile = mergedVfs['Roboto-MediumItalic.ttf'] ? 'Roboto-MediumItalic.ttf' : italicFile;

  pdfMake.vfs = mergedVfs;
  pdfMake.fonts = {
    ...(pdfMake.fonts || {}),
    Roboto: {
      normal: regularFile,
      bold: boldFile,
      italics: italicFile,
      bolditalics: boldItalicFile,
    },
  };
}

async function loadPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(
      ([pdfMakeModule, pdfFontsModule]) => {
        const pdfMake = ((pdfMakeModule as any).default || pdfMakeModule) as PdfMakeInstance;
        configurePdfMakeFonts(pdfMake, pdfFontsModule);
        return pdfMake;
      },
    );
  }

  return pdfMakePromise;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function resolveAssetUrl(src: string) {
  if (src.startsWith('data:')) return src;
  if (typeof window === 'undefined') return src;
  return new URL(src, window.location.origin).toString();
}

async function loadImageDataUrl(src?: string) {
  if (!src || typeof window === 'undefined') return null;
  if (src.startsWith('data:')) return src;

  const resolvedSrc = resolveAssetUrl(src);
  if (!imageCache.has(resolvedSrc)) {
    imageCache.set(
      resolvedSrc,
      fetch(resolvedSrc, { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Não foi possível carregar imagem: ${resolvedSrc}`);
          return response.blob();
        })
        .then(blobToDataUrl)
        .catch(() => null),
    );
  }

  return imageCache.get(resolvedSrc) || null;
}

function generatedDate() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function filenameBase(result: EscrituraBudgetResult) {
  const number = result.settings.budgetNumber || 'sem-numero';
  return `orcamento-escritura-${number}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function lineSeparator(marginTop = cm(0.16), marginBottom = cm(0.42)) {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 1, lineColor: '#0f172a' }],
    margin: [0, marginTop, 0, marginBottom],
  };
}

function buildHeader(logoDataUrl: string | null) {
  return {
    stack: [
      {
        columns: [
          {
            width: cm(2.8),
            stack: logoDataUrl ? [{ image: logoDataUrl, width: cm(1.95), alignment: 'center', margin: [0, cm(0.08), 0, 0] }] : [{ text: '' }],
          },
          {
            width: '*',
            stack: [
              { text: 'ESTADO DE SANTA CATARINA', bold: true, fontSize: 18, alignment: 'center', lineHeight: 1.02 },
              { text: 'Comarca de Blumenau - Distrito de Itoupava', fontSize: 12, alignment: 'center', lineHeight: 1.02 },
              { text: 'Tabelionato de Notas e Ofício de Registro Civil de Pessoas Naturais', bold: true, fontSize: 10.5, alignment: 'center', lineHeight: 1.02 },
              { text: 'Distrito de Itoupava - Município de Blumenau', fontSize: 11, alignment: 'center', lineHeight: 1.02 },
              { text: 'Lio Ogê Gaya Junior', bold: true, fontSize: 11, alignment: 'center', lineHeight: 1.02 },
              { text: 'Tabelião de Notas e Registrador', fontSize: 9.5, alignment: 'center', lineHeight: 1.02 },
            ],
          },
          { width: cm(2.8), text: '' },
        ],
      },
      lineSeparator(cm(0.18), cm(0.58)),
    ],
  };
}

function footer() {
  return () => ({
    margin: [cm(1.4), 0, cm(1.4), cm(0.3)],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_WIDTH - cm(2.8), y2: 0, lineWidth: 0.8, lineColor: '#475569' }] },
      {
        text: 'Rua Dr. Pedro Zimmermann, 5511 - Itoupava Central - Blumenau/SC - CEP: 89.068-003 - Tel. (47) 3222-5200',
        alignment: 'center',
        fontSize: 7.4,
        color: '#475569',
        margin: [0, 2, 0, 0],
      },
      { text: 'cartoriogaya@gmail.com', alignment: 'center', fontSize: 7.4, color: '#475569' },
    ],
  });
}

function metaCard(label: string, value: string, options?: { strong?: boolean }) {
  return {
    stack: [
      { text: label.toUpperCase(), style: 'metaLabel' },
      { text: normalizeText(value) || '-', style: options?.strong ? 'metaValueStrong' : 'metaValue' },
    ],
    fillColor: '#f8fafc',
    margin: [0, 0, 0, 0],
  };
}

function buildMetaTable(result: EscrituraBudgetResult) {
  return {
    table: {
      widths: ['*', '*', '*', '*'],
      body: [[
        metaCard('Orçamento', result.settings.budgetNumber || 'Sem número'),
        metaCard('Município', result.settings.municipality || 'Blumenau/SC'),
        metaCard('Regra', result.rule.label),
        metaCard('Gerado em', generatedDate()),
      ]],
    },
    layout: tableLayout('#cbd5e1'),
    margin: [0, 0, 0, cm(0.34)],
  };
}

function buildItemsTable(result: EscrituraBudgetResult) {
  const body = [
    [
      tableHeader('Item'),
      tableHeader('Tipo'),
      tableHeader('Valor-base', 'right'),
      tableHeader('Emolumentos', 'right'),
      tableHeader('FRJ', 'right'),
      tableHeader('ISS', 'right'),
      tableHeader('Certidões', 'right'),
      tableHeader('Total cartório', 'right'),
    ],
    ...result.items.map((item) => [
      tableText(item.description),
      tableText(item.assetKind === 'vaga-box' ? 'Vaga/Box' : 'Imóvel'),
      tableText(formatCurrency(item.value), 'right'),
      tableText(formatCurrency(item.emoluments), 'right'),
      tableText(formatCurrency(item.frj), 'right'),
      tableText(formatCurrency(item.iss), 'right'),
      tableText(formatCurrency(item.certificateValue), 'right'),
      tableText(formatCurrency(item.totalCartorio), 'right', true),
    ]),
  ];

  return sectionBlock('Itens do orçamento', {
    table: {
      headerRows: 1,
      widths: ['*', cm(1.8), cm(2.2), cm(2.2), cm(1.8), cm(1.6), cm(2), cm(2.4)],
      body,
    },
    layout: tableLayout('#dbe3ee'),
  });
}

function buildCertificatesTable(result: EscrituraBudgetResult) {
  const rows = result.items.flatMap((item) => item.certificates.map((certificate) => ({ item, certificate })));
  if (!rows.length) return null;

  return sectionBlock('Certidões vinculadas', {
    table: {
      headerRows: 1,
      widths: [cm(3.2), cm(2.4), '*', cm(1.55), cm(2)],
      body: [
        [tableHeader('Item'), tableHeader('Tipo'), tableHeader('Descrição'), tableHeader('UF'), tableHeader('Valor', 'right')],
        ...rows.map(({ item, certificate }) => [
          tableText(item.description),
          tableText(certificateTypeLabel(certificate.type)),
          tableText(certificate.label),
          tableText(certificate.state || '-'),
          tableText(formatCurrency(certificate.amount), 'right', true),
        ]),
      ],
    },
    layout: tableLayout('#dbe3ee'),
  });
}

function buildTotals(result: EscrituraBudgetResult) {
  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Observações', style: 'sectionTitle', margin: [0, 0, 0, 4] },
          {
            text: normalizeText(result.settings.registryNote || '+ Registro de Imóveis'),
            style: 'noteText',
            margin: [0, 0, 0, 4],
          },
          {
            text: 'Registro de Imóveis não integra o total do cartório neste orçamento.',
            style: 'mutedText',
          },
        ],
      },
      {
        width: cm(6.6),
        table: {
          widths: ['*', cm(2.8)],
          body: [
            totalRow('Emolumentos', formatCurrency(result.totals.emoluments)),
            totalRow('FRJ', formatCurrency(result.totals.frj)),
            totalRow('ISS', formatCurrency(result.totals.iss)),
            totalRow('Certidões', formatCurrency(result.totals.certificateValue)),
            totalRow('ITBI', result.totals.tax > 0 ? formatCurrency(result.totals.tax) : 'Não incluído'),
            totalRow('Total cartório', formatCurrency(result.totals.totalCartorio), true),
          ],
        },
        layout: tableLayout('#cbd5e1'),
      },
    ],
    columnGap: cm(0.5),
    margin: [0, cm(0.28), 0, cm(0.42)],
  };
}

function buildPaymentSection(result: EscrituraBudgetResult) {
  const paymentLine = `Favor efetuar depósito na conta do cartório, no valor de ${formatCurrency(result.totals.totalCartorio)}, ref. cartório, FRJ, ISS, negativas e certidões.`;
  return sectionBlock('Pagamento', {
    stack: [
      { text: paymentLine, style: 'paymentText', margin: [0, 0, 0, 5] },
      ...DEFAULT_BANK_TEXT.split('\n').map((line) => ({ text: normalizeText(line), style: line.trim() ? 'paymentText' : 'paymentSpacer' })),
      { text: DEFAULT_PAYMENT_FOOTER, style: 'mutedText', margin: [0, 6, 0, 0] },
    ],
    fillColor: '#f8fafc',
    margin: [0, 0, 0, 0],
  });
}

function buildTaxNotes(result: EscrituraBudgetResult) {
  return {
    stack: result.items.map((item) => ({
      text: `${item.description}: ITBI ${formatTaxForItem(item)}.`,
      style: 'mutedText',
      margin: [0, 0, 0, 1],
    })),
    margin: [0, 0, 0, cm(0.28)],
  };
}

async function buildDocDefinition(result: EscrituraBudgetResult) {
  const logoDataUrl = await loadImageDataUrl('/brand/sc-emblem.png');

  return {
    info: {
      title: 'Orçamento de Escritura - Compra e Venda',
      subject: 'Orçamento de Escritura gerado pelo Atlas Notarial',
      author: 'Atlas Notarial',
      creator: 'Atlas Notarial',
      producer: 'Atlas Notarial',
    },
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [cm(1.4), cm(1.2), cm(1.4), cm(1.45)],
    footer: footer(),
    defaultStyle: { font: 'Roboto', fontSize: 9.2, color: '#0f172a', lineHeight: 1.22 },
    content: [
      buildHeader(logoDataUrl),
      { text: 'ORÇAMENTO DE ESCRITURA - COMPRA E VENDA', style: 'title', margin: [0, 0, 0, cm(0.16)] },
      { text: 'Documento de conferência para orçamento de cartório, FRJ, ISS, certidões e imposto informado.', style: 'subtitle', margin: [0, 0, 0, cm(0.32)] },
      buildMetaTable(result),
      buildItemsTable(result),
      buildCertificatesTable(result),
      buildTaxNotes(result),
      buildTotals(result),
      buildPaymentSection(result),
    ].filter(Boolean),
    styles: {
      title: { alignment: 'center', bold: true, fontSize: 13.5, decoration: 'underline' },
      subtitle: { alignment: 'center', fontSize: 8.8, color: '#475569' },
      sectionTitle: { bold: true, fontSize: 9.5, color: '#0f172a', characterSpacing: 0.2 },
      metaLabel: { fontSize: 6.6, bold: true, color: '#64748b', characterSpacing: 0.7, margin: [4, 4, 4, 1] },
      metaValue: { fontSize: 8.8, color: '#0f172a', margin: [4, 0, 4, 4] },
      metaValueStrong: { fontSize: 9.2, bold: true, color: '#0f172a', margin: [4, 0, 4, 4] },
      tableHeader: { bold: true, fontSize: 7.5, color: '#ffffff' },
      tableText: { fontSize: 7.7, color: '#0f172a' },
      tableTextBold: { fontSize: 7.7, bold: true, color: '#0f172a' },
      noteText: { fontSize: 8.4, color: '#0f172a' },
      mutedText: { fontSize: 7.8, color: '#475569' },
      paymentText: { fontSize: 8, color: '#0f172a' },
      paymentSpacer: { fontSize: 3, color: '#ffffff' },
      totalLabel: { fontSize: 8, color: '#334155' },
      totalValue: { fontSize: 8, color: '#0f172a', alignment: 'right' },
      totalStrong: { fontSize: 8.7, bold: true, color: '#0f172a', alignment: 'right' },
    },
  };
}

function sectionBlock(title: string, content: Record<string, any>) {
  return {
    stack: [
      { text: title, style: 'sectionTitle', margin: [0, 0, 0, 5] },
      content,
    ],
    margin: [0, 0, 0, cm(0.34)],
  };
}

function tableHeader(text: string, alignment: 'left' | 'right' = 'left') {
  return { text, style: 'tableHeader', alignment, fillColor: '#0f172a', margin: [4, 4, 4, 4] };
}

function tableText(text: string, alignment: 'left' | 'right' = 'left', bold = false) {
  return { text: normalizeText(text), style: bold ? 'tableTextBold' : 'tableText', alignment, margin: [4, 3, 4, 3] };
}

function totalRow(label: string, value: string, strong = false) {
  return [
    { text: label, style: 'totalLabel', fillColor: strong ? '#e2e8f0' : '#f8fafc', margin: [4, 3, 4, 3] },
    { text: value, style: strong ? 'totalStrong' : 'totalValue', fillColor: strong ? '#e2e8f0' : '#f8fafc', margin: [4, 3, 4, 3] },
  ];
}

function tableLayout(lineColor: string) {
  return {
    hLineColor: () => lineColor,
    vLineColor: () => lineColor,
    hLineWidth: () => 0.45,
    vLineWidth: () => 0.45,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
}

function certificateTypeLabel(type: EscrituraCertificateInput['type']) {
  if (type === 'civil') return 'Estado civil';
  if (type === 'negative') return 'Negativa';
  return 'Outra';
}

export async function downloadOrcamentoEscrituraPdf(result: EscrituraBudgetResult, _options?: OrcamentoEscrituraExportOptions) {
  const pdfMake = await loadPdfMake();
  const definition = await buildDocDefinition(result);
  pdfMake.createPdf(definition, undefined, pdfMake.fonts, pdfMake.vfs).download(`${filenameBase(result)}.pdf`);
}

export async function printOrcamentoEscrituraPdf(result: EscrituraBudgetResult, _options?: OrcamentoEscrituraExportOptions) {
  const pdfMake = await loadPdfMake();
  const definition = await buildDocDefinition(result);
  pdfMake.createPdf(definition, undefined, pdfMake.fonts, pdfMake.vfs).print();
}

export function buildOrcamentoEscrituraPdfFilename(result: EscrituraBudgetResult) {
  return filenameBase(result);
}
