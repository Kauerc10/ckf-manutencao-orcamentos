import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency, formatDateTimeBR } from '../../lib/formatters'
import type { TabelaDocument } from '../../lib/tabela-document'
import type { CompanySettings } from '../../types'
import { formatClienteDocumento } from '../../lib/clientes'
const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 46,
    paddingHorizontal: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#12141a',
  },
  header: {
    minHeight: 82,
    backgroundColor: '#0c0c0d',
    padding: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#f5a400',
    color: '#ffffff',
  },
  logo: { width: 160, height: 32, objectFit: 'contain' },
  brand: { fontSize: 18, fontWeight: 700 },
  contact: { fontSize: 8, marginTop: 3, color: '#e6e8ea' },
  heading: { marginTop: 13, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  columns: { flexDirection: 'row', backgroundColor: '#e6e8ea', padding: 7, fontWeight: 700, fontSize: 8 },
  code: { width: '12%' },
  service: { width: '56%', paddingRight: 8 },
  unit: { width: '13%' },
  price: { width: '19%', textAlign: 'right' },
  category: { fontSize: 11, fontWeight: 700, paddingTop: 12, paddingBottom: 6, color: '#674500' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#c2c6cc',
    paddingVertical: 9,
    paddingHorizontal: 7,
  },
  name: { fontWeight: 700, marginBottom: 4 },
  scope: { fontSize: 8, lineHeight: 1.35, color: '#3f4854' },
  serviceContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  serviceText: { flex: 1 },
  image: { width: 100, height: 80, objectFit: 'contain', backgroundColor: '#f5f6f7' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: '#c2c6cc',
    paddingTop: 7,
    fontSize: 8,
    color: '#5a5f66',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
function dividirEscopo(escopo: string): string[] {
  const partes: string[] = []
  let atual = ''
  let linhas = 0
  for (const linha of escopo.split('\n')) {
    let restante = linha
    do {
      const parte = restante.slice(0, 600)
      restante = restante.slice(parte.length)
      if (atual && (atual.length + parte.length > 650 || linhas >= 24)) {
        partes.push(atual)
        atual = ''
        linhas = 0
      }
      atual += (linhas ? '\n' : '') + parte
      linhas++
    } while (restante)
  }
  if (atual) partes.push(atual)
  return partes.length ? partes : ['']
}
export function TabelaPDF({
  document,
  empresa,
  logo,
}: {
  document: TabelaDocument
  empresa: CompanySettings
  logo?: string
}) {
  const categories = [...new Set(document.itens.map((i) => i.categoria))]
  return (
    <Document
      title={document.tipo === 'catalogo' ? document.titulo : `${document.titulo} — ${document.empresa.nome}`}
      author={empresa.nome}
    >
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <Text style={styles.brand}>{empresa.nome}</Text>}
          <Text style={styles.contact}>
            {empresa.email} · {empresa.telefone}
          </Text>
          <Text style={styles.contact}>
            CNPJ {formatClienteDocumento(empresa.cnpj)} · {empresa.regiao}
          </Text>
        </View>
        <View fixed style={styles.heading}>
          <Text style={styles.title}>{document.titulo}</Text>
          <Text>
            {document.tipo === 'catalogo'
              ? 'Preços padrão por unidade de cobrança'
              : `${document.empresa.nome} · ${formatClienteDocumento(document.empresa.documento)}`}
          </Text>
        </View>
        <View fixed style={styles.columns}>
          <Text style={styles.code}>CÓDIGO</Text>
          <Text style={styles.service}>SERVIÇO / ESCOPO</Text>
          <Text style={styles.unit}>UNIDADE</Text>
          <Text style={styles.price}>PREÇO</Text>
        </View>
        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.category} minPresenceAhead={65}>
              {category}
            </Text>
            {document.itens
              .filter((i) => i.categoria === category)
              .flatMap((i) =>
                dividirEscopo(i.escopo).map((parte, index) => (
                  <View key={`${i.codigo}-${index}`} style={styles.row} wrap={false}>
                    <Text style={styles.code}>{i.codigo}</Text>
                    <View style={styles.service}>
                      <View style={styles.serviceContent}>
                        {index === 0 && i.imagem && <Image src={i.imagem} style={styles.image} />}
                        <View style={styles.serviceText}>
                          <Text style={styles.name}>{index ? `${i.nome} (continuação)` : i.nome}</Text>
                          <Text style={styles.scope}>{parte}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.unit}>{i.unidade}</Text>
                    <Text style={styles.price}>{index ? '—' : formatCurrency(i.preco)}</Text>
                  </View>
                )),
              )}
          </View>
        ))}
        <View fixed style={styles.footer}>
          <Text>
            {document.tipo === 'catalogo' ? 'Catálogo de serviços' : `Tabela ${document.versao}`} ·{' '}
            {formatDateTimeBR(document.data)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
