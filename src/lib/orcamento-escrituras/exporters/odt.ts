import { saveAs } from 'file-saver';

import { DEFAULT_BANK_TEXT, DEFAULT_PAYMENT_FOOTER } from '../defaults';
import { formatCurrency } from '../formatters';
import { formatTaxForItem } from '../whatsapp-templates';
import type { EscrituraBudgetResult, EscrituraCertificateInput } from '../types';
import { buildOrcamentoEscrituraPdfFilename, type OrcamentoEscrituraExportOptions } from './pdf';

const encoder = new TextEncoder();

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function plain(value?: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function p(text: string, style = 'PBody') {
  return `<text:p text:style-name="${style}">${escapeXml(text)}</text:p>`;
}

function cell(content: string, style = 'TableCell') {
  return `<table:table-cell table:style-name="${style}" office:value-type="string">${content}</table:table-cell>`;
}

function textCell(text: string, cellStyle = 'TableCell', paragraphStyle = 'PTable') {
  return cell(p(text, paragraphStyle), cellStyle);
}

function certificateTypeLabel(type: EscrituraCertificateInput['type']) {
  if (type === 'civil') return 'Estado civil';
  if (type === 'negative') return 'Negativa';
  return 'Outra';
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

function buildItemsTableXml(result: EscrituraBudgetResult) {
  return `<table:table table:name="Itens" table:style-name="BudgetTable">
    <table:table-column table:style-name="ColItem" />
    <table:table-column table:style-name="ColSmall" />
    <table:table-column table:style-name="ColMoney" />
    <table:table-column table:style-name="ColMoney" />
    <table:table-column table:style-name="ColMoney" />
    <table:table-column table:style-name="ColMoney" />
    <table:table-row>
      ${textCell('Item', 'TableHeader', 'PTableHeader')}
      ${textCell('Tipo', 'TableHeader', 'PTableHeader')}
      ${textCell('Valor-base', 'TableHeader', 'PTableHeader')}
      ${textCell('Emolumentos', 'TableHeader', 'PTableHeader')}
      ${textCell('Certidões', 'TableHeader', 'PTableHeader')}
      ${textCell('Total cartório', 'TableHeader', 'PTableHeader')}
    </table:table-row>
    ${result.items
      .map((item) => `<table:table-row>
        ${textCell(item.description)}
        ${textCell(item.assetKind === 'vaga-box' ? 'Vaga/Box' : 'Imóvel')}
        ${textCell(formatCurrency(item.value))}
        ${textCell(formatCurrency(item.emoluments))}
        ${textCell(formatCurrency(item.certificateValue))}
        ${textCell(formatCurrency(item.totalCartorio), 'TableCellStrong', 'PTableStrong')}
      </table:table-row>`)
      .join('\n')}
  </table:table>`;
}

function buildCertificatesTableXml(result: EscrituraBudgetResult) {
  const rows = result.items.flatMap((item) => item.certificates.map((certificate) => ({ item, certificate })));
  if (!rows.length) return '';

  return `<text:p text:style-name="PSectionTitle">Certidões vinculadas</text:p>
  <table:table table:name="Certidoes" table:style-name="BudgetTable">
    <table:table-column table:style-name="ColItem" />
    <table:table-column table:style-name="ColSmall" />
    <table:table-column table:style-name="ColItem" />
    <table:table-column table:style-name="ColTiny" />
    <table:table-column table:style-name="ColMoney" />
    <table:table-row>
      ${textCell('Item', 'TableHeader', 'PTableHeader')}
      ${textCell('Tipo', 'TableHeader', 'PTableHeader')}
      ${textCell('Descrição', 'TableHeader', 'PTableHeader')}
      ${textCell('UF', 'TableHeader', 'PTableHeader')}
      ${textCell('Valor', 'TableHeader', 'PTableHeader')}
    </table:table-row>
    ${rows
      .map(({ item, certificate }) => `<table:table-row>
        ${textCell(item.description)}
        ${textCell(certificateTypeLabel(certificate.type))}
        ${textCell(certificate.label)}
        ${textCell(certificate.state || '-')}
        ${textCell(formatCurrency(certificate.amount), 'TableCellStrong', 'PTableStrong')}
      </table:table-row>`)
      .join('\n')}
  </table:table>`;
}

function buildContentXml(result: EscrituraBudgetResult, _options?: OrcamentoEscrituraExportOptions) {
  const paymentLine = `Favor efetuar depósito na conta do cartório, no valor de ${formatCurrency(result.totals.totalCartorio)}, ref. cartório, FRJ, ISS, negativas e certidões.`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:font-face-decls>
    <style:font-face style:name="Arial" svg:font-family="Arial" />
  </office:font-face-decls>
  <office:automatic-styles>
    <style:style style:name="PHeader" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:line-height="105%" fo:margin-bottom="0cm" /><style:text-properties style:font-name="Arial" fo:font-size="10pt" /></style:style>
    <style:style style:name="PHeaderBold" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:line-height="105%" fo:margin-bottom="0cm" /><style:text-properties style:font-name="Arial" fo:font-size="11pt" fo:font-weight="bold" /></style:style>
    <style:style style:name="PTitle" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-top="0.3cm" fo:margin-bottom="0.1cm" /><style:text-properties style:font-name="Arial" fo:font-size="13pt" fo:font-weight="bold" style:text-underline-style="solid" /></style:style>
    <style:style style:name="PSubtitle" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-bottom="0.45cm" /><style:text-properties style:font-name="Arial" fo:font-size="8.5pt" fo:color="#475569" /></style:style>
    <style:style style:name="PSectionTitle" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.35cm" fo:margin-bottom="0.1cm" /><style:text-properties style:font-name="Arial" fo:font-size="10pt" fo:font-weight="bold" /></style:style>
    <style:style style:name="PBody" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.08cm" /><style:text-properties style:font-name="Arial" fo:font-size="9pt" /></style:style>
    <style:style style:name="PBodyMuted" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.08cm" /><style:text-properties style:font-name="Arial" fo:font-size="8pt" fo:color="#475569" /></style:style>
    <style:style style:name="PTable" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0cm" /><style:text-properties style:font-name="Arial" fo:font-size="8pt" /></style:style>
    <style:style style:name="PTableHeader" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0cm" /><style:text-properties style:font-name="Arial" fo:font-size="8pt" fo:font-weight="bold" fo:color="#ffffff" /></style:style>
    <style:style style:name="PTableStrong" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0cm" /><style:text-properties style:font-name="Arial" fo:font-size="8pt" fo:font-weight="bold" /></style:style>
    <style:style style:name="BudgetTable" style:family="table"><style:table-properties table:border-model="collapsing" /></style:style>
    <style:style style:name="ColItem" style:family="table-column"><style:table-column-properties style:column-width="4.1cm" /></style:style>
    <style:style style:name="ColSmall" style:family="table-column"><style:table-column-properties style:column-width="2.2cm" /></style:style>
    <style:style style:name="ColMoney" style:family="table-column"><style:table-column-properties style:column-width="2.7cm" /></style:style>
    <style:style style:name="ColTiny" style:family="table-column"><style:table-column-properties style:column-width="1.2cm" /></style:style>
    <style:style style:name="TableHeader" style:family="table-cell"><style:table-cell-properties fo:background-color="#0f172a" fo:border="0.02cm solid #0f172a" fo:padding="0.08cm" /></style:style>
    <style:style style:name="TableCell" style:family="table-cell"><style:table-cell-properties fo:border="0.02cm solid #cbd5e1" fo:padding="0.08cm" /></style:style>
    <style:style style:name="TableCellStrong" style:family="table-cell"><style:table-cell-properties fo:border="0.02cm solid #cbd5e1" fo:padding="0.08cm" fo:background-color="#f8fafc" /></style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      ${p('ESTADO DE SANTA CATARINA', 'PHeaderBold')}
      ${p('Comarca de Blumenau - Distrito de Itoupava', 'PHeader')}
      ${p('Tabelionato de Notas e Ofício de Registro Civil de Pessoas Naturais', 'PHeaderBold')}
      ${p('Distrito de Itoupava - Município de Blumenau', 'PHeader')}
      ${p('Lio Ogê Gaya Junior', 'PHeaderBold')}
      ${p('Tabelião de Notas e Registrador', 'PHeader')}
      ${p('ORÇAMENTO DE ESCRITURA - COMPRA E VENDA', 'PTitle')}
      ${p('Tabela I 2026 · FRJ 22,73% · ISS 2%', 'PSubtitle')}
      ${p(`Orçamento: ${plain(result.settings.budgetNumber) || 'Sem número'}`)}
      ${p(`Município: ${plain(result.settings.municipality) || 'Blumenau/SC'}`)}
      ${p(`Gerado em: ${generatedDate()}`)}
      ${p('Itens do orçamento', 'PSectionTitle')}
      ${buildItemsTableXml(result)}
      ${buildCertificatesTableXml(result)}
      ${p('Resumo financeiro', 'PSectionTitle')}
      ${p(`Emolumentos: ${formatCurrency(result.totals.emoluments)}`)}
      ${p(`FRJ: ${formatCurrency(result.totals.frj)}`)}
      ${p(`ISS: ${formatCurrency(result.totals.iss)}`)}
      ${p(`Certidões: ${formatCurrency(result.totals.certificateValue)}`)}
      ${p(`ITBI: ${result.totals.tax > 0 ? formatCurrency(result.totals.tax) : 'não incluído / solicitado pelo cliente'}`)}
      ${result.items.map((item) => p(`${item.description}: ITBI ${formatTaxForItem(item)}.`, 'PBodyMuted')).join('\n')}
      ${p(`TOTAL CARTÓRIO: ${formatCurrency(result.totals.totalCartorio)}`)}
      ${p(`TOTAL COM IMPOSTO: ${formatCurrency(result.totals.totalWithTax)}`)}
      ${p('Observações', 'PSectionTitle')}
      ${p(plain(result.settings.registryNote) || '+ Registro de Imóveis')}
      ${p('Registro de Imóveis não integra o total do cartório neste orçamento.', 'PBodyMuted')}
      ${p('Pagamento', 'PSectionTitle')}
      ${p(paymentLine)}
      ${DEFAULT_BANK_TEXT.split('\n').map((line) => p(line)).join('\n')}
      ${p(DEFAULT_PAYMENT_FOOTER, 'PBodyMuted')}
    </office:text>
  </office:body>
</office:document-content>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text" />
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="A4"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait" fo:margin-top="1.35cm" fo:margin-bottom="1.5cm" fo:margin-left="1.45cm" fo:margin-right="1.45cm" /></style:page-layout>
  </office:automatic-styles>
  <office:master-styles><style:master-page style:name="Standard" style:page-layout-name="A4" /></office:master-styles>
</office:document-styles>`;
}

function buildManifestXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text" />
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml" />
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml" />
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml" />
</manifest:manifest>`;
}

function buildMetaXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta><meta:generator>Atlas Notarial</meta:generator></office:meta>
</office:document-meta>`;
}

type ZipEntry = { name: string; data: Uint8Array };

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function concatArrays(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function createZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    const local = new Uint8Array(30 + nameBytes.length + entry.data.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, 0);
    writeUint16(local, 8, 0);
    writeUint16(local, 10, 0);
    writeUint16(local, 12, 0);
    writeUint32(local, 14, crc);
    writeUint32(local, 18, entry.data.length);
    writeUint32(local, 22, entry.data.length);
    writeUint16(local, 26, nameBytes.length);
    writeUint16(local, 28, 0);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, 0);
    writeUint16(central, 14, 0);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, entry.data.length);
    writeUint32(central, 24, entry.data.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length;
  });

  const centralOffset = offset;
  const central = concatArrays(centralParts);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, central.length);
  writeUint32(end, 16, centralOffset);
  writeUint16(end, 20, 0);

  return concatArrays([...localParts, central, end]);
}

function zipEntry(name: string, content: string): ZipEntry {
  return { name, data: encoder.encode(content) };
}

export async function downloadOrcamentoEscrituraOdt(result: EscrituraBudgetResult, options?: OrcamentoEscrituraExportOptions) {
  const entries = [
    zipEntry('mimetype', 'application/vnd.oasis.opendocument.text'),
    zipEntry('content.xml', buildContentXml(result, options)),
    zipEntry('styles.xml', buildStylesXml()),
    zipEntry('meta.xml', buildMetaXml()),
    zipEntry('META-INF/manifest.xml', buildManifestXml()),
  ];

  const data = createZip(entries);
  const blob = new Blob([data], { type: 'application/vnd.oasis.opendocument.text' });
  saveAs(blob, `${buildOrcamentoEscrituraPdfFilename(result)}.odt`);
}
