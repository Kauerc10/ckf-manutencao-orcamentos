import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { EMPRESA } from '../../lib/constants'
import { formatCurrency, formatDateBR } from '../../lib/formatters'
import { normalizeItemsForDocument } from '../../lib/orcamento'
import type { Orcamento } from '../../types'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
  },
  header: {
    backgroundColor: '#111111',
    color: '#ffffff',
    textAlign: 'center',
    paddingTop: 18,
    paddingBottom: 18,
  },
  brand: {
    fontSize: 23,
    fontWeight: 700,
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  headerLine: {
    fontSize: 10,
    marginTop: 3,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderColor: '#111111',
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
    backgroundColor: '#f0f0f0',
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
}

export function OrcamentoPDF({ orcamento }: Props) {
  const rows = normalizeItemsForDocument(orcamento.itens)

  return (
    <Document title={`Orçamento ${orcamento.numero}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{EMPRESA.nome}</Text>
          <Text style={styles.headerLine}>Email: {EMPRESA.email}</Text>
          <Text style={styles.headerLine}>CNPJ: {EMPRESA.cnpj}</Text>
          <Text style={styles.headerLine}>Telefone: {EMPRESA.telefone}</Text>
          <Text style={styles.headerLine}>{EMPRESA.regiao}</Text>
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
            <Text>{orcamento.numero}</Text>
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
