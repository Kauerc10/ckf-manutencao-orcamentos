import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { BRAND_ASSETS, DEFAULT_SYSTEM_SETTINGS } from '../../lib/constants'
import { formatCurrency, formatDateBR, formatOrcamentoNumero } from '../../lib/formatters'
import { normalizeItemsForDocument } from '../../lib/orcamento'
import type { Orcamento, SystemSettings } from '../../types'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0C0C0D',
  },
  header: {
    backgroundColor: '#0C0C0D',
    color: '#E6E8EA',
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderBottomColor: '#F5A400',
    borderBottomWidth: 3,
  },
  logo: {
    width: 210,
    height: 58,
    objectFit: 'contain',
    marginHorizontal: 'auto',
    marginBottom: 6,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 7,
    letterSpacing: 1.5,
    color: '#E6E8EA',
  },
  headerLine: {
    fontSize: 10,
    marginTop: 3,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderColor: '#0C0C0D',
    borderWidth: 1,
    minHeight: 20,
    padding: 4,
    justifyContent: 'center',
  },
  label: {
    fontWeight: 700,
  },
  tableHead: {
    fontWeight: 700,
    textAlign: 'center',
    backgroundColor: '#E6E8EA',
  },
  qty: {
    width: '12%',
    textAlign: 'center',
  },
  desc: {
    width: '54%',
  },
  money: {
    width: '17%',
    textAlign: 'right',
  },
  totalLabel: {
    width: '83%',
    textAlign: 'right',
    fontWeight: 700,
  },
  totalValue: {
    width: '17%',
    textAlign: 'right',
    fontWeight: 700,
  },
  observations: {
    minHeight: 42,
  },
  validity: {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 14,
    paddingTop: 18,
  },
})

type Props = {
  orcamento: Orcamento
  settings?: SystemSettings
}

export function OrcamentoPDF({ orcamento, settings = DEFAULT_SYSTEM_SETTINGS }: Props) {
  const rows = normalizeItemsForDocument(orcamento.itens)

  return (
    <Document title={`Orçamento ${formatOrcamentoNumero(orcamento.numero)}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {settings.mostrarLogoDocumentos ? (
            <Image src={BRAND_ASSETS.logoHorizontalWhiteAmberPng} style={styles.logo} />
          ) : (
            <Text style={styles.brand}>{settings.empresa.nome}</Text>
          )}
          <Text style={styles.headerLine}>Email: {settings.empresa.email}</Text>
          <Text style={styles.headerLine}>CNPJ: {settings.empresa.cnpj}</Text>
          <Text style={styles.headerLine}>Telefone: {settings.empresa.telefone}</Text>
          <Text style={styles.headerLine}>{settings.empresa.regiao}</Text>
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={[styles.cell, { width: '18%' }]}>
            <Text style={styles.label}>Data:</Text>
          </View>
          <View style={[styles.cell, { width: '38%' }]}>
            <Text>{formatDateBR(orcamento.dataOrcamento)}</Text>
          </View>
          <View style={[styles.cell, { width: '27%' }]}>
            <Text style={styles.label}>Orçamento n°</Text>
          </View>
          <View style={[styles.cell, { width: '17%' }]}>
            <Text>{formatOrcamentoNumero(orcamento.numero)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.cell, { width: '18%' }]}>
            <Text style={styles.label}>Serviço:</Text>
          </View>
          <View style={[styles.cell, { width: '82%' }]}>
            <Text>{orcamento.servicoCliente}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.cell, styles.tableHead, styles.qty]}>
            <Text>QTD</Text>
          </View>
          <View style={[styles.cell, styles.tableHead, styles.desc]}>
            <Text>DESCRIÇÃO</Text>
          </View>
          <View style={[styles.cell, styles.tableHead, styles.money]}>
            <Text>VLR UNIT</Text>
          </View>
          <View style={[styles.cell, styles.tableHead, styles.money]}>
            <Text>VLR TOTAL</Text>
          </View>
        </View>

        {rows.map((item, index) => (
          <View style={styles.row} key={`${item.id ?? index}-${index}`}>
            <View style={[styles.cell, styles.qty]}>
              <Text>{item.quantidade ?? ''}</Text>
            </View>
            <View style={[styles.cell, styles.desc]}>
              <Text>{item.descricao}</Text>
            </View>
            <View style={[styles.cell, styles.money]}>
              <Text>{item.valorUnitario ? formatCurrency(item.valorUnitario) : ''}</Text>
            </View>
            <View style={[styles.cell, styles.money]}>
              <Text>{item.descricao ? formatCurrency(item.valorTotal) : 'R$ -'}</Text>
            </View>
          </View>
        ))}

        <View style={styles.row}>
          <View style={[styles.cell, styles.totalLabel]}>
            <Text>Total</Text>
          </View>
          <View style={[styles.cell, styles.totalValue]}>
            <Text>{formatCurrency(orcamento.total)}</Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={[styles.cell, { width: '16%' }, styles.observations]}>
            <Text style={styles.label}>Obs:</Text>
          </View>
          <View style={[styles.cell, { width: '84%' }, styles.observations]}>
            <Text>{orcamento.observacoes}</Text>
          </View>
        </View>

        <Text style={styles.validity}>VALIDADE DA PROPOSTA {orcamento.validadeDias} DIAS</Text>
      </Page>
    </Document>
  )
}
