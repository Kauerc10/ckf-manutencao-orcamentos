import { BRAND_ASSETS } from '../lib/constants'
import { formatCurrency, formatDateTimeBR } from '../lib/formatters'
import type { TabelaDocument } from '../lib/tabela-document'
import type { SystemSettings } from '../types'
import { ServicoImagem } from './ServicoImagem'
export function TabelaPreview({ document, settings }: { document: TabelaDocument; settings: SystemSettings }) {
  return (
    <div className="commercial-document">
      <header>
        {settings.mostrarLogoDocumentos ? (
          <img src={BRAND_ASSETS.logoHorizontalWhiteAmberPng} alt={settings.empresa.nome} />
        ) : (
          <h2>{settings.empresa.nome}</h2>
        )}
        <p>
          {settings.empresa.email} · {settings.empresa.telefone}
        </p>
        <p>
          CNPJ {settings.empresa.cnpj} · {settings.empresa.regiao}
        </p>
      </header>
      <div className="commercial-document-body">
        <h3>{document.titulo}</h3>
        <p>
          {document.tipo === 'catalogo'
            ? 'Preços padrão por unidade de cobrança'
            : `${document.empresa.nome} · ${document.empresa.documento}`}
        </p>
        {[...new Set(document.itens.map((i) => i.categoria))].map((c) => (
          <section key={c}>
            <h4>{c}</h4>
            <div className="commercial-table-wrap">
              <table className="commercial-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Serviço / escopo</th>
                    <th>Unidade</th>
                    <th>Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {document.itens
                    .filter((i) => i.categoria === c)
                    .map((i) => (
                      <tr key={i.codigo}>
                        <td>{i.codigo}</td>
                        <td>
                          <strong>{i.nome}</strong>
                          <p className="service-scope">{i.escopo}</p>
                          {i.imagem && <ServicoImagem path={i.imagem} nome={i.nome} />}
                        </td>
                        <td>{i.unidade}</td>
                        <td className="money-cell">{formatCurrency(i.preco)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <footer>
          {document.tipo === 'catalogo' ? 'Catálogo de serviços' : `Tabela ${document.versao}`} ·{' '}
          {formatDateTimeBR(document.data)}
        </footer>
      </div>
    </div>
  )
}
