'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Building2, Calculator, Copy, Download, FileText, Link2, Plus, Printer, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateEscrituraBudget } from '@/lib/orcamento-escrituras/calculator';
import {
  CIVIL_CERTIFICATE_VALUES_BY_STATE,
  getCivilCertificateStateLabel,
  getCivilCertificateValueByState,
} from '@/lib/orcamento-escrituras/certificate-values';
import { COMPRA_VENDA_SC_2026_RULE, DEFAULT_REGISTRY_NOTE } from '@/lib/orcamento-escrituras/defaults';
import { downloadOrcamentoEscrituraOdt } from '@/lib/orcamento-escrituras/exporters/odt';
import { downloadOrcamentoEscrituraPdf, printOrcamentoEscrituraPdf } from '@/lib/orcamento-escrituras/exporters/pdf';
import { formatCurrency, formatCurrencyInput, formatCurrencyOnBlur, parseCurrencyInput } from '@/lib/orcamento-escrituras/formatters';
import {
  buildBudgetSummaryText,
  buildDetailedBudgetText,
  buildPaymentText,
  formatTaxForItem,
} from '@/lib/orcamento-escrituras/whatsapp-templates';
import type {
  EscrituraAssetKind,
  EscrituraBudgetInput,
  EscrituraBudgetLineResult,
  EscrituraBudgetResult,
  EscrituraCertificateType,
  EscrituraTaxMode,
} from '@/lib/orcamento-escrituras/types';
import { cn } from '@/lib/utils';

type CertificateDraft = {
  id: string;
  itemId: string;
  type: EscrituraCertificateType;
  label: string;
  state?: string;
  amount: string;
  notes: string;
};

type BudgetItemDraft = {
  id: string;
  description: string;
  assetKind: EscrituraAssetKind;
  value: string;
  taxMode: EscrituraTaxMode;
  taxRate: string;
  manualTaxValue: string;
  notes: string;
};

type SettingsDraft = {
  budgetNumber: string;
  municipality: string;
  defaultNegativeValue: string;
  defaultCivilCertificateState: string;
  defaultItbiRate: string;
  registryNote: string;
};

type BudgetDraft = {
  items: BudgetItemDraft[];
  certificates: CertificateDraft[];
};

type ExportState = 'pdf' | 'print' | 'odt' | null;

const initialSettings: SettingsDraft = {
  budgetNumber: '',
  municipality: 'Blumenau/SC',
  defaultNegativeValue: 'R$ 34,37',
  defaultCivilCertificateState: 'SC',
  defaultItbiRate: '2',
  registryNote: DEFAULT_REGISTRY_NOTE,
};

function createCertificate(
  type: EscrituraCertificateType,
  itemId: string,
  settings: SettingsDraft,
  overrides: Partial<CertificateDraft> = {},
): CertificateDraft {
  if (type === 'civil') {
    const state = settings.defaultCivilCertificateState || 'SC';
    return {
      id: createId(),
      itemId,
      type,
      label: `Certidão de estado civil - ${getCivilCertificateStateLabel(state)}`,
      state,
      amount: formatCurrencyInput(getCivilCertificateValueByState(state)),
      notes: '',
      ...overrides,
    };
  }

  if (type === 'negative') {
    return {
      id: createId(),
      itemId,
      type,
      label: 'Certidão negativa',
      amount: settings.defaultNegativeValue,
      notes: '',
      ...overrides,
    };
  }

  return {
    id: createId(),
    itemId,
    type,
    label: 'Outra certidão',
    amount: '',
    notes: '',
    ...overrides,
  };
}

function createItem(settings: SettingsDraft, overrides: Partial<BudgetItemDraft> = {}): BudgetItemDraft {
  return {
    id: createId(),
    description: 'Imóvel',
    assetKind: 'imovel',
    value: '',
    taxMode: 'client',
    taxRate: settings.defaultItbiRate,
    manualTaxValue: '',
    notes: '',
    ...overrides,
  };
}

function createInitialBudgetDraft(): BudgetDraft {
  const firstItem = createItem(initialSettings, { description: 'Imóvel' });
  return {
    items: [firstItem],
    certificates: [createCertificate('negative', firstItem.id, initialSettings)],
  };
}

export function OrcamentoEscriturasTool() {
  const [settings, setSettings] = useState<SettingsDraft>(initialSettings);
  const [draft, setDraft] = useState<BudgetDraft>(() => createInitialBudgetDraft());
  const [certificateTargetItemId, setCertificateTargetItemId] = useState<string>(() => draft.items[0]?.id || '');
  const [copied, setCopied] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportState>(null);

  const activeCertificateTargetId = draft.items.some((item) => item.id === certificateTargetItemId)
    ? certificateTargetItemId
    : draft.items[0]?.id || '';

  const budgetInput = useMemo<EscrituraBudgetInput>(() => ({
    settings: {
      budgetNumber: settings.budgetNumber.trim(),
      budgetType: 'compra-venda',
      municipality: settings.municipality.trim(),
      defaultNegativeValue: parseCurrencyInput(settings.defaultNegativeValue),
      defaultCivilCertificateState: settings.defaultCivilCertificateState,
      defaultItbiRate: parseCurrencyInput(settings.defaultItbiRate),
      registryNote: settings.registryNote,
    },
    items: draft.items.map((item) => ({
      id: item.id,
      description: item.description.trim() || 'Imóvel',
      assetKind: item.assetKind,
      value: parseCurrencyInput(item.value),
      taxMode: item.taxMode,
      taxRate: parseCurrencyInput(item.taxRate || settings.defaultItbiRate),
      manualTaxValue: parseCurrencyInput(item.manualTaxValue),
      certificates: draft.certificates
        .filter((certificate) => certificate.itemId === item.id)
        .map((certificate) => ({
          id: certificate.id,
          type: certificate.type,
          label: certificate.label.trim() || getCertificateDefaultLabel(certificate),
          state: certificate.state,
          amount: parseCurrencyInput(certificate.amount),
          notes: certificate.notes,
        })),
      notes: item.notes,
    })),
  }), [draft, settings]);

  const result = useMemo(() => calculateEscrituraBudget(budgetInput, COMPRA_VENDA_SC_2026_RULE), [budgetInput]);
  const summaryText = useMemo(() => buildBudgetSummaryText(result), [result]);
  const paymentText = useMemo(() => buildPaymentText(result), [result]);
  const detailedText = useMemo(() => buildDetailedBudgetText(result), [result]);

  const updateSettings = (patch: Partial<SettingsDraft>) => setSettings((current) => ({ ...current, ...patch }));

  const updateDefaultNegativeValue = (value: string, syncExisting = false) => {
    updateSettings({ defaultNegativeValue: value });
    if (!syncExisting) return;

    setDraft((current) => ({
      ...current,
      certificates: current.certificates.map((certificate) => (
        certificate.type === 'negative' ? { ...certificate, amount: value } : certificate
      )),
    }));
  };

  const updateItem = (id: string, patch: Partial<BudgetItemDraft>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = (assetKind: EscrituraAssetKind) => {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        createItem(settings, {
          description: assetKind === 'vaga-box' ? `Vaga/Box ${current.items.length + 1}` : `Imóvel ${current.items.length + 1}`,
          assetKind,
        }),
      ],
    }));
  };

  const removeItem = (id: string) => {
    setDraft((current) => {
      if (current.items.length === 1) return current;
      const nextItems = current.items.filter((item) => item.id !== id);
      const validItemIds = new Set(nextItems.map((item) => item.id));
      return {
        items: nextItems,
        certificates: current.certificates.filter((certificate) => validItemIds.has(certificate.itemId)),
      };
    });
  };

  const addCertificate = (type: EscrituraCertificateType) => {
    const itemId = activeCertificateTargetId || draft.items[0]?.id;
    if (!itemId) return;

    setDraft((current) => ({
      ...current,
      certificates: [...current.certificates, createCertificate(type, itemId, settings)],
    }));
  };

  const updateCertificate = (certificateId: string, patch: Partial<CertificateDraft>) => {
    setDraft((current) => ({
      ...current,
      certificates: current.certificates.map((certificate) => {
        if (certificate.id !== certificateId) return certificate;
        return normalizeCertificatePatch({ ...certificate, ...patch }, certificate, patch, settings);
      }),
    }));
  };

  const removeCertificate = (certificateId: string) => {
    setDraft((current) => ({
      ...current,
      certificates: current.certificates.filter((certificate) => certificate.id !== certificateId),
    }));
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      window.alert('Não foi possível copiar o texto. O navegador bloqueou a área de transferência.');
    }
  };

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      await downloadOrcamentoEscrituraPdf(result, { summaryText, paymentText });
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível gerar o PDF do orçamento.');
    } finally {
      setExporting(null);
    }
  };

  const printPdf = async () => {
    setExporting('print');
    try {
      await printOrcamentoEscrituraPdf(result, { summaryText, paymentText });
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível preparar o PDF para impressão.');
    } finally {
      setExporting(null);
    }
  };

  const exportOdt = async () => {
    setExporting('odt');
    try {
      await downloadOrcamentoEscrituraOdt(result, { summaryText, paymentText });
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível gerar o ODT do orçamento.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <section className="space-y-5">
          <WorkspaceIntro result={result} />

          <Panel
            eyebrow="Dados-base"
            title="Identificação do orçamento"
            description="Campos globais que alimentam os cálculos, mensagens e o documento A4."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Nº do orçamento / processo">
                <Input
                  value={settings.budgetNumber}
                  onChange={(event) => updateSettings({ budgetNumber: event.target.value })}
                  placeholder="Ex.: 477/2026"
                />
              </Field>
              <Field label="Município">
                <Input
                  value={settings.municipality}
                  onChange={(event) => updateSettings({ municipality: event.target.value })}
                  placeholder="Ex.: Blumenau/SC"
                />
              </Field>
              <Field label="ITBI padrão (%)">
                <Input
                  inputMode="decimal"
                  value={settings.defaultItbiRate}
                  onChange={(event) => updateSettings({ defaultItbiRate: event.target.value })}
                  placeholder="2"
                />
              </Field>
              <Field label="Negativa padrão">
                <CurrencyInput
                  value={settings.defaultNegativeValue}
                  onChange={(value) => updateDefaultNegativeValue(value)}
                  onBlurValue={(value) => updateDefaultNegativeValue(value, true)}
                  placeholder="R$ 34,37"
                />
              </Field>
              <Field label="UF padrão da certidão civil">
                <StateSelect
                  value={settings.defaultCivilCertificateState}
                  onChange={(value) => updateSettings({ defaultCivilCertificateState: value })}
                />
              </Field>
              <Field label="Observação final">
                <Input
                  value={settings.registryNote}
                  onChange={(event) => updateSettings({ registryNote: event.target.value })}
                  placeholder="+ Registro de Imóveis"
                />
              </Field>
            </div>
          </Panel>

          <Panel
            eyebrow="Base econômica"
            title="Imóveis e valores aprovados"
            description="Cada imóvel entra como uma linha de cálculo. Vaga/box aplica a redução de 2/3 nos emolumentos antes de FRJ e ISS."
            actions={(
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addItem('imovel')} className="gap-2">
                  <Plus className="h-4 w-4" /> Imóvel
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addItem('vaga-box')} className="gap-2">
                  <Plus className="h-4 w-4" /> Vaga/Box
                </Button>
              </div>
            )}
          >
            <div className="space-y-4">
              {draft.items.map((item, index) => {
                const itemResult = result.items.find((line) => line.id === item.id);
                return (
                  <BudgetItemCard
                    key={item.id}
                    item={item}
                    itemResult={itemResult}
                    index={index}
                    canRemove={draft.items.length > 1}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)}
                  />
                );
              })}
            </div>
          </Panel>

          <Panel
            eyebrow="Vínculos"
            title="Central de certidões"
            description="As certidões ficam separadas da ficha do imóvel e são vinculadas pelo seletor. Isso deixa o atendimento mais claro quando houver vários itens."
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activeCertificateTargetId}
                  onChange={(event) => setCertificateTargetItemId(event.target.value)}
                  className="h-9 min-w-[190px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {draft.items.map((item, index) => (
                    <option key={item.id} value={item.id}>{index + 1}. {item.description || 'Imóvel'}</option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="outline" onClick={() => addCertificate('civil')}>+ Estado civil</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addCertificate('negative')}>+ Negativa</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addCertificate('other')}>+ Outra</Button>
              </div>
            )}
          >
            <CertificatesDesk
              certificates={draft.certificates}
              items={draft.items}
              result={result}
              onChange={updateCertificate}
              onRemove={removeCertificate}
            />
          </Panel>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Panel
            eyebrow="Conferência"
            title="Resumo financeiro"
            description="Total do cartório separado do imposto. Registro de Imóveis permanece apenas como observação."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Kpi label="Total cartório" value={formatCurrency(result.totals.totalCartorio)} strong />
              <Kpi label="Total com imposto" value={formatCurrency(result.totals.totalWithTax)} />
              <Kpi label="Emolumentos" value={formatCurrency(result.totals.emoluments)} />
              <Kpi label="Certidões" value={formatCurrency(result.totals.certificateValue)} />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border/50">
              <BudgetTable result={result} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button type="button" size="sm" onClick={() => copyText('summary', summaryText)} className="gap-2">
                <Copy className="h-4 w-4" /> {copied === 'summary' ? 'Resumo copiado' : 'Copiar resumo'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copyText('payment', paymentText)} className="gap-2">
                <Copy className="h-4 w-4" /> {copied === 'payment' ? 'Pagamento copiado' : 'Copiar pagamento'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportPdf} disabled={exporting === 'pdf'} className="gap-2">
                <Download className="h-4 w-4" /> {exporting === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportOdt} disabled={exporting === 'odt'} className="gap-2">
                <FileText className="h-4 w-4" /> {exporting === 'odt' ? 'Gerando...' : 'Baixar ODT'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => copyText('details', detailedText)} className="gap-2">
                <FileText className="h-4 w-4" /> Detalhado
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={printPdf} disabled={exporting === 'print'} className="gap-2">
                <Printer className="h-4 w-4" /> {exporting === 'print' ? 'Preparando...' : 'Imprimir PDF'}
              </Button>
            </div>
          </Panel>

          <Panel eyebrow="A4" title="Prévia do documento" description="Espelho textual do PDF/ODT para conferência antes de baixar ou enviar no WhatsApp.">
            <BudgetDocumentPreview result={result} />
          </Panel>

          <Panel eyebrow="WhatsApp" title="Mensagem pronta" description="Resumo + pagamento continuam copiáveis para envio rápido.">
            <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border border-border/50 bg-background/70 p-4 text-xs leading-relaxed text-muted-foreground">
              {summaryText}{'\n\n'}{paymentText}
            </pre>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function WorkspaceIntro({ result }: { result: EscrituraBudgetResult }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_35%),linear-gradient(135deg,hsl(var(--card)/0.94),hsl(var(--background)/0.82))] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Calculator className="h-3.5 w-3.5" /> Escrituras / Compra e Venda
          </div>
          <h2 className="text-xl font-semibold text-foreground">Mesa de orçamento</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Área redesenhada para separar base econômica, certidões vinculadas e documento final. Menos planilha espremida, mais fluxo de conferência.
          </p>
        </div>
        <div className="grid min-w-[280px] grid-cols-2 gap-3">
          <Kpi label="Valor-base" value={formatCurrency(result.totals.value)} />
          <Kpi label="Total cartório" value={formatCurrency(result.totals.totalCartorio)} strong />
        </div>
      </div>
    </section>
  );
}

function BudgetItemCard({
  item,
  itemResult,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  item: BudgetItemDraft;
  itemResult?: EscrituraBudgetLineResult;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<BudgetItemDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border/55 bg-background/35 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-bold text-primary">
            {index + 1}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{item.description || 'Imóvel'}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.assetKind === 'vaga-box' ? 'Vaga/box com redução de 2/3' : 'Imóvel normal sem redução'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={item.assetKind}
            onChange={(event) => onChange({ assetKind: event.target.value as EscrituraAssetKind })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="imovel">Imóvel normal</option>
            <option value="vaga-box">Vaga/Box com redução</option>
          </select>
          <Button type="button" size="icon" variant="ghost" disabled={!canRemove} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.75fr)_minmax(180px,0.75fr)]">
        <Field label="Descrição do item">
          <Input value={item.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Ex.: Apartamento, vaga, box" />
        </Field>
        <Field label="Valor aprovado/base">
          <CurrencyInput value={item.value} onChange={(value) => onChange({ value })} placeholder="R$ 347.000,00" />
        </Field>
        <Field label="ITBI">
          <select
            value={item.taxMode}
            onChange={(event) => onChange({ taxMode: event.target.value as EscrituraTaxMode })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="client">Solicitado pelo cliente</option>
            <option value="calculate">Calcular percentual</option>
            <option value="manual">Informar valor manual</option>
            <option value="none">Não incluir</option>
          </select>
        </Field>
        {item.taxMode === 'calculate' && (
          <Field label="Alíquota ITBI (%)">
            <Input inputMode="decimal" value={item.taxRate} onChange={(event) => onChange({ taxRate: event.target.value })} />
          </Field>
        )}
        {item.taxMode === 'manual' && (
          <Field label="Valor ITBI manual">
            <CurrencyInput value={item.manualTaxValue} onChange={(value) => onChange({ manualTaxValue: value })} />
          </Field>
        )}
      </div>

      {itemResult && (
        <div className="mt-4 grid gap-2 rounded-xl border border-border/45 bg-card/35 p-3 text-xs sm:grid-cols-4">
          <MiniMetric label="Emolumentos" value={formatCurrency(itemResult.emoluments)} />
          <MiniMetric label="FRJ" value={formatCurrency(itemResult.frj)} />
          <MiniMetric label="ISS" value={formatCurrency(itemResult.iss)} />
          <MiniMetric label="Total item" value={formatCurrency(itemResult.totalCartorio)} strong />
        </div>
      )}
    </article>
  );
}

function CertificatesDesk({
  certificates,
  items,
  result,
  onChange,
  onRemove,
}: {
  certificates: CertificateDraft[];
  items: BudgetItemDraft[];
  result: EscrituraBudgetResult;
  onChange: (certificateId: string, patch: Partial<CertificateDraft>) => void;
  onRemove: (certificateId: string) => void;
}) {
  if (certificates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-background/35 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma certidão adicionada. Escolha o imóvel no seletor acima e adicione a certidão correspondente.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {result.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border/45 bg-background/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.description}</p>
            <p className="mt-1 text-base font-bold text-foreground">{formatCurrency(item.certificateValue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Certidões vinculadas ao item</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {certificates.map((certificate) => (
          <CertificateRow
            key={certificate.id}
            certificate={certificate}
            items={items}
            onChange={(patch) => onChange(certificate.id, patch)}
            onRemove={() => onRemove(certificate.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CertificateRow({
  certificate,
  items,
  onChange,
  onRemove,
}: {
  certificate: CertificateDraft;
  items: BudgetItemDraft[];
  onChange: (patch: Partial<CertificateDraft>) => void;
  onRemove: () => void;
}) {
  const isCivil = certificate.type === 'civil';
  const isOther = certificate.type === 'other';

  return (
    <article className="rounded-2xl border border-border/50 bg-card/35 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Link2 className="h-3.5 w-3.5 text-primary" /> Certidão vinculada
      </div>
      <div className="grid gap-3 lg:grid-cols-[190px_170px_minmax(180px,1fr)_170px_150px_38px] lg:items-end">
        <Field label="Imóvel vinculado">
          <select
            value={certificate.itemId}
            onChange={(event) => onChange({ itemId: event.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {items.map((item, index) => (
              <option key={item.id} value={item.id}>{index + 1}. {item.description || 'Imóvel'}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select
            value={certificate.type}
            onChange={(event) => onChange({ type: event.target.value as EscrituraCertificateType })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="civil">Estado civil</option>
            <option value="negative">Negativa</option>
            <option value="other">Outra</option>
          </select>
        </Field>
        <Field label="Nome / descrição">
          <Input
            value={certificate.label}
            disabled={isCivil}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder={isOther ? 'Ex.: Certidão atualizada da matrícula' : 'Certidão'}
          />
        </Field>
        <Field label="UF da certidão">
          {isCivil ? <StateSelect value={certificate.state || 'SC'} onChange={(state) => onChange({ state })} /> : <Input value="-" disabled />}
        </Field>
        <Field label="Valor">
          <CurrencyInput value={certificate.amount} onChange={(amount) => onChange({ amount })} placeholder="R$ 0,00" />
        </Field>
        <Button type="button" size="icon" variant="ghost" onClick={onRemove} className="lg:mb-0.5">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function BudgetTable({ result }: { result: EscrituraBudgetResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/35">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item</th>
            {result.items.map((item) => <th key={item.id} className="min-w-[150px] px-3 py-2 text-right font-semibold text-foreground">{item.description}</th>)}
            <th className="px-3 py-2 text-right font-semibold text-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          <BudgetRow label="Valor" values={result.items.map((item) => formatCurrency(item.value))} total={formatCurrency(result.totals.value)} />
          <BudgetRow label="ITBI" values={result.items.map(formatTaxForItem)} total={result.totals.tax > 0 ? formatCurrency(result.totals.tax) : '-'} />
          <BudgetRow label="Emolumentos" values={result.items.map((item) => formatCurrency(item.emoluments))} total={formatCurrency(result.totals.emoluments)} />
          <BudgetRow label="FRJ" values={result.items.map((item) => formatCurrency(item.frj))} total={formatCurrency(result.totals.frj)} />
          <BudgetRow label="ISS" values={result.items.map((item) => formatCurrency(item.iss))} total={formatCurrency(result.totals.iss)} />
          <BudgetRow label="Estado civil" values={result.items.map((item) => formatCurrency(item.civilCertificateValue))} total={formatCurrency(result.totals.civilCertificateValue)} />
          <BudgetRow label="Negativas" values={result.items.map((item) => formatCurrency(item.negativeValue))} total={formatCurrency(result.totals.negativeValue)} />
          <BudgetRow label="Outras certidões" values={result.items.map((item) => formatCurrency(item.otherCertificateValue))} total={formatCurrency(result.totals.otherCertificateValue)} />
          <BudgetRow label="Total cartório" values={result.items.map((item) => formatCurrency(item.totalCartorio))} total={formatCurrency(result.totals.totalCartorio)} strong />
        </tbody>
      </table>
    </div>
  );
}

function BudgetDocumentPreview({ result }: { result: EscrituraBudgetResult }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-200/70 p-3">
      <div className="mx-auto min-h-[560px] max-w-[360px] rounded-sm bg-white p-5 text-slate-950 shadow-xl shadow-black/20">
        <div className="grid grid-cols-[52px_1fr_52px] items-start gap-2 border-b border-slate-900 pb-3">
          <div className="flex justify-center">
            <img src="/brand/sc-emblem.png" alt="Brasão de Santa Catarina" className="h-11 w-auto object-contain" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-[11px] font-bold">ESTADO DE SANTA CATARINA</p>
            <p className="text-[8px]">Comarca de Blumenau - Distrito de Itoupava</p>
            <p className="text-[7.5px] font-bold">Tabelionato de Notas e Ofício de Registro Civil de Pessoas Naturais</p>
            <p className="text-[8px]">Distrito de Itoupava - Município de Blumenau</p>
            <p className="text-[8px] font-bold">Lio Ogê Gaya Junior</p>
            <p className="text-[7px]">Tabelião de Notas e Registrador</p>
          </div>
          <div />
        </div>

        <div className="py-4 text-center">
          <p className="text-[11px] font-bold uppercase underline">Orçamento de Escritura - Compra e Venda</p>
          <p className="mt-1 text-[8px] text-slate-500">Tabela I 2026 · FRJ 22,73% · ISS 2%</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[8px]">
          <DocInfo label="Orçamento" value={result.settings.budgetNumber || 'Sem número'} />
          <DocInfo label="Município" value={result.settings.municipality || 'Blumenau/SC'} />
          <DocInfo label="Total cartório" value={formatCurrency(result.totals.totalCartorio)} strong />
          <DocInfo label="Total com imposto" value={formatCurrency(result.totals.totalWithTax)} />
        </div>

        <div className="mt-4 overflow-hidden rounded border border-slate-300 text-[7.5px]">
          <div className="grid grid-cols-[1.3fr_0.95fr_0.95fr] bg-slate-900 text-white">
            <span className="px-2 py-1 font-bold">Item</span>
            <span className="px-2 py-1 text-right font-bold">Valor</span>
            <span className="px-2 py-1 text-right font-bold">Total</span>
          </div>
          {result.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1.3fr_0.95fr_0.95fr] border-t border-slate-200">
              <span className="px-2 py-1">{item.description}</span>
              <span className="px-2 py-1 text-right">{formatCurrency(item.value)}</span>
              <span className="px-2 py-1 text-right font-semibold">{formatCurrency(item.totalCartorio)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-1.5 text-[8px]">
          <PreviewLine label="Emolumentos" value={formatCurrency(result.totals.emoluments)} />
          <PreviewLine label="FRJ" value={formatCurrency(result.totals.frj)} />
          <PreviewLine label="ISS" value={formatCurrency(result.totals.iss)} />
          <PreviewLine label="Certidões" value={formatCurrency(result.totals.certificateValue)} />
          <PreviewLine label="ITBI" value={result.totals.tax > 0 ? formatCurrency(result.totals.tax) : 'Solicitado / não incluído'} />
        </div>

        <div className="mt-4 rounded border border-slate-300 bg-slate-50 p-2 text-[7.5px] leading-relaxed">
          <p className="font-bold uppercase">Observações</p>
          <p>{result.settings.registryNote || '+ Registro de Imóveis'}</p>
          <p className="mt-1">Documento gerado para conferência do orçamento antes do envio ao cliente.</p>
        </div>
      </div>
    </div>
  );
}

function BudgetRow({ label, values, total, strong = false }: { label: string; values: string[]; total: string; strong?: boolean }) {
  return (
    <tr className={cn('border-b border-border/35 last:border-b-0', strong && 'bg-primary/5 font-semibold')}>
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      {values.map((value, index) => <td key={`${label}-${index}`} className="px-3 py-2 text-right text-foreground">{value}</td>)}
      <td className="px-3 py-2 text-right text-foreground">{total}</td>
    </tr>
  );
}

function CurrencyInput({ value, onChange, onBlurValue, placeholder }: { value: string; onChange: (value: string) => void; onBlurValue?: (value: string) => void; placeholder?: string }) {
  const handleBlur = () => {
    const formatted = formatCurrencyOnBlur(value);
    onChange(formatted);
    onBlurValue?.(formatted);
  };

  return <Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} onBlur={handleBlur} placeholder={placeholder} />;
}

function StateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
      {CIVIL_CERTIFICATE_VALUES_BY_STATE.map((state) => <option key={state.uf} value={state.uf}>{state.uf} - {state.label} ({formatCurrency(state.amount)})</option>)}
    </select>
  );
}

function Panel({ eyebrow, title, description, actions, children }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><Building2 className="h-4 w-4 text-primary" />{title}</h2>
          {description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

function Kpi({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-border/50 bg-background/55 p-3', strong && 'border-primary/35 bg-primary/10')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-semibold text-foreground', strong && 'text-primary')}>{value}</p>
    </div>
  );
}

function DocInfo({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded border border-slate-300 p-1.5">
      <p className="text-[6.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-[8px]', strong && 'font-bold')}>{value}</p>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200 pb-1 last:border-b-0">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-bold text-slate-950">{value}</span>
    </div>
  );
}

function normalizeCertificatePatch(
  next: CertificateDraft,
  previous: CertificateDraft,
  patch: Partial<CertificateDraft>,
  settings: SettingsDraft,
): CertificateDraft {
  if (patch.type && patch.type !== previous.type) {
    if (patch.type === 'civil') {
      const state = previous.state || settings.defaultCivilCertificateState || 'SC';
      return {
        ...next,
        type: 'civil',
        state,
        label: `Certidão de estado civil - ${getCivilCertificateStateLabel(state)}`,
        amount: formatCurrencyInput(getCivilCertificateValueByState(state)),
      };
    }

    if (patch.type === 'negative') {
      return {
        ...next,
        type: 'negative',
        state: undefined,
        label: 'Certidão negativa',
        amount: settings.defaultNegativeValue,
      };
    }

    return {
      ...next,
      type: 'other',
      state: undefined,
      label: 'Outra certidão',
      amount: '',
    };
  }

  if (next.type === 'civil' && patch.state) {
    return {
      ...next,
      label: `Certidão de estado civil - ${getCivilCertificateStateLabel(patch.state)}`,
      amount: formatCurrencyInput(getCivilCertificateValueByState(patch.state)),
    };
  }

  return next;
}

function getCertificateDefaultLabel(certificate: CertificateDraft): string {
  if (certificate.type === 'civil') return `Certidão de estado civil - ${getCivilCertificateStateLabel(certificate.state || 'SC')}`;
  if (certificate.type === 'negative') return 'Certidão negativa';
  return 'Outra certidão';
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
