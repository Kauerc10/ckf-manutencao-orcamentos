// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { beforeAll, afterAll, expect, it } from 'vitest'

let db: PGlite
const admin = '00000000-0000-0000-0000-000000000001'
const user = '00000000-0000-0000-0000-000000000002'
const empresa = '00000000-0000-0000-0000-000000000003'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated,anon;`)
  for (const name of readdirSync('supabase/migrations').filter((n) => n.endsWith('.sql')))
    await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'))
  await db.exec(`insert into auth.users values('${admin}','admin@test.local','{"nome":"Admin"}'),('${user}','user@test.local','{"nome":"Operador"}'); update public.profiles set role='admin' where id='${admin}';
    select set_config('request.jwt.claim.sub','${admin}',false);
    insert into public.clientes(id,tipo,nome,documento,telefone_principal,criado_por,cep,logradouro,numero,bairro,cidade,uf) values('${empresa}','cnpj','Empresa teste','12345678000195','47999990000','${admin}','','','','','','SC');`)
}, 60000)
afterAll(async () => {
  await db?.close()
})
async function asUser(id: string, role = 'authenticated') {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`)
}
it('salva tabelas atomicamente, preserva histórico e impede escrita de operador no banco', async () => {
  await asUser(admin)
  const s = await db.query<{ result: { id: string; versao: number; codigo: string } }>(
    `select public.save_catalogo_servico($1::jsonb) result`,
    [
      JSON.stringify({
        codigo: 'DB-001',
        nome: 'Solda',
        categoria: 'Soldagem',
        escopo: 'Uma peça',
        unidade: 'unidade',
        precoPadrao: 100,
        imagem: '',
        ativo: true,
      }),
    ],
  )
  const sid = s.rows[0].result.id
  expect(s.rows[0].result.codigo).toBe('CKF-00001')
  const draft = { empresaId: empresa, titulo: 'Tabela', versao: 0, itens: [{ servicoId: sid, preco: 90 }] }
  await db.query(`select public.save_tabela_comercial($1::jsonb)`, [JSON.stringify(draft)])
  await db.query(`select public.save_catalogo_servico($1::jsonb)`, [
    JSON.stringify({
      id: sid,
      versao: 1,
      codigo: 'DB-001',
      nome: 'Solda nova',
      categoria: 'Soldagem',
      escopo: 'Outra peça',
      unidade: 'unidade',
      precoPadrao: 110,
      imagem: '',
      ativo: true,
    }),
  ])
  const serviceAfterEdit = (
    await db.query<{ dados: { criadorNome: string; criadoEm: string; autorNome: string } }>(
      'select dados from public.catalogo_servicos',
    )
  ).rows[0].dados
  expect(serviceAfterEdit.criadorNome).toBe('Admin')
  expect(serviceAfterEdit.criadoEm).toBeDefined()
  expect(serviceAfterEdit.autorNome).toBe('Admin')
  expect((await db.query<{ codigo: string }>('select codigo from public.catalogo_servicos')).rows[0].codigo).toBe(
    'CKF-00001',
  )
  const next = await db.query<{ result: { codigo: string } }>('select public.save_catalogo_servico($1::jsonb) result', [
    JSON.stringify({ nome: 'Corte', categoria: 'Usinagem', escopo: 'Corte de uma peça', unidade: 'unidade', precoPadrao: 50 }),
  ])
  expect(next.rows[0].result.codigo).toBe('CKF-00002')
  await db.query(`select public.save_tabela_comercial($1::jsonb)`, [
    JSON.stringify({ ...draft, versao: 1, itens: [{ servicoId: sid, preco: 120 }] }),
  ])
  const rows = await db.query<{
    dados: { versao: number; historico: { itens: { preco: number; nome: string }[]; autorNome: string }[] }
  }>('select dados from public.tabelas_comerciais')
  expect(rows.rows[0].dados.versao).toBe(2)
  expect(rows.rows[0].dados.historico[0].itens[0]).toMatchObject({ preco: 90, nome: 'Solda' })
  expect(rows.rows[0].dados.historico[0].autorNome).toBe('Admin')
  await db.query(`select public.save_tabela_comercial($1::jsonb)`, [
    JSON.stringify({ ...draft, versao: 2, itens: [{ servicoId: sid, preco: 120 }] }),
  ])
  expect((await db.query<{ versao: number }>('select versao from public.tabelas_comerciais')).rows[0].versao).toBe(2)
  expect(
    (await db.query<{ result: string }>('select public.remove_catalogo_servico($1) result', [sid])).rows[0].result,
  ).toBe('archived')
  expect(
    (await db.query<{ dados: { ativo: boolean } }>('select dados from public.catalogo_servicos where id = $1', [sid]))
      .rows[0].dados.ativo,
  ).toBe(false)
  await expect(
    db.query(`select public.save_tabela_comercial($1::jsonb)`, [JSON.stringify({ ...draft, versao: 1 })]),
  ).rejects.toThrow('alterada')
  await asUser(user)
  expect((await db.query('select * from public.tabelas_comerciais')).rows).toHaveLength(1)
  await expect(
    db.query(`select public.save_tabela_comercial($1::jsonb)`, [JSON.stringify({ ...draft, versao: 2 })]),
  ).rejects.toThrow('administradores')
  await expect(db.exec('delete from public.tabelas_comerciais')).rejects.toThrow('permission denied')
  await asUser('', 'anon')
  await expect(db.exec('select * from public.tabelas_comerciais')).rejects.toThrow('permission denied')
})
it('protege as imagens do catálogo e preserva arquivos usados no histórico', async () => {
  await asUser(admin)
  await db.exec(
    "insert into storage.objects(bucket_id,name) values('catalogo','servicos/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png')",
  )
  await expect(db.exec("delete from storage.objects where bucket_id='catalogo'")).resolves.toBeDefined()
  expect((await db.query("select * from storage.objects where bucket_id='catalogo'")).rows).toHaveLength(1)
  await asUser(user)
  expect((await db.query("select * from storage.objects where bucket_id='catalogo'")).rows).toHaveLength(1)
  await expect(
    db.exec("insert into storage.objects(bucket_id,name) values('catalogo','servicos/outro.png')"),
  ).rejects.toThrow('row-level security')
  await asUser('', 'anon')
  expect((await db.query("select * from storage.objects where bucket_id='catalogo'")).rows).toHaveLength(0)
})
it('converte uma solicitação uma única vez e mantém rollback de orçamento inválido', async () => {
  await db.exec(
    `reset role; insert into public.site_tickets(public_id,service_category,service_slug,service_name,contact_name,phone,description,urgency,idempotency_key) values('TEST01','industrial_welding','solda-industrial','Solda industrial','Contato teste','5547999990000','Avaliar soldagem na garagem','Nesta semana','teste-idempotencia-0001');`,
  )
  await asUser(user)
  const ticket = (await db.query<{ id: string }>('select id from public.site_tickets')).rows[0].id
  await db.query('select public.update_site_ticket($1,0,$2,$3,$4)', [ticket, 'contacted', user, 'Entramos em contato.'])
  const updated = (
    await db.query<{ versao: number; status: string }>('select versao,status from public.site_tickets where id=$1', [
      ticket,
    ])
  ).rows[0]
  expect(updated).toEqual({ versao: 1, status: 'contacted' })
  await expect(
    db.query('select public.update_site_ticket($1,0,$2,null,$3)', [ticket, 'lost', 'Conflito']),
  ).rejects.toThrow('alterada')
  await asUser(admin)
  const draft = {
    clienteId: empresa,
    servicoCliente: 'Empresa teste',
    dataOrcamento: '2026-09-29',
    validadeDias: 10,
    observacoes: 'Contexto do lead',
    itens: [{ descricao: 'Solda', quantidade: 2, valorUnitario: 120, valorTotal: 999 }],
  }
  await expect(
    db.query('select public.convert_site_ticket($1,$2::jsonb)', [
      ticket,
      JSON.stringify({ ...draft, itens: [{ descricao: '', quantidade: 1, valorUnitario: 120 }] }),
    ]),
  ).rejects.toThrow('Descreva')
  expect((await db.query('select id from public.orcamentos')).rows).toHaveLength(0)
  const first = (
    await db.query<{ result: { id: string } }>('select public.convert_site_ticket($1,$2::jsonb) result', [
      ticket,
      JSON.stringify(draft),
    ])
  ).rows[0].result
  const second = (
    await db.query<{ result: { id: string } }>('select public.convert_site_ticket($1,$2::jsonb) result', [
      ticket,
      JSON.stringify(draft),
    ])
  ).rows[0].result
  expect(first.id).toBe(second.id)
  expect((await db.query<{ total: number }>('select total from public.orcamentos')).rows).toEqual([{ total: '240.00' }])
  expect((await db.query('select id from public.orcamento_itens')).rows).toHaveLength(1)
  expect((await db.query('select details from public.site_ticket_events')).rows).toHaveLength(2)
  await db.exec(`reset role; update public.profiles set ativo=false where id='${user}'`)
  await asUser(user)
  expect((await db.query('select id from public.site_tickets')).rows).toHaveLength(0)
  await expect(
    db.query('select public.convert_site_ticket($1,$2::jsonb)', [ticket, JSON.stringify(draft)]),
  ).rejects.toThrow('ativo')
})
it('desfaz o orçamento e os itens quando a etapa final falha', async () => {
  await db.exec(`reset role;
    insert into public.site_tickets(public_id,service_category,service_slug,service_name,contact_name,phone,description,urgency,idempotency_key)
    values('TEST02','industrial_welding','solda-industrial','Solda industrial','Outro contato','5547999991111','Avaliar soldagem','Nesta semana','teste-rollback-0002');
    create function public.falha_evento_teste() returns trigger language plpgsql as $$begin raise exception 'Falha simulada no evento'; end$$;
    create trigger falha_evento_teste before insert on public.site_ticket_events for each row execute function public.falha_evento_teste();`)
  await asUser(admin)
  const ticket = (await db.query<{ id: string }>("select id from public.site_tickets where public_id='TEST02'")).rows[0]
    .id
  const draft = {
    clienteId: empresa,
    servicoCliente: 'Empresa teste',
    dataOrcamento: '2026-09-29',
    validadeDias: 10,
    itens: [{ descricao: 'Solda', quantidade: 1, valorUnitario: 80 }],
  }
  const previous = (await db.query('select id from public.orcamentos')).rows.length
  await expect(
    db.query('select public.convert_site_ticket($1,$2::jsonb)', [ticket, JSON.stringify(draft)]),
  ).rejects.toThrow('Falha simulada')
  expect((await db.query('select id from public.orcamentos')).rows).toHaveLength(previous)
  expect(
    (
      await db.query<{ converted_orcamento_id: string | null }>(
        'select converted_orcamento_id from public.site_tickets where id=$1',
        [ticket],
      )
    ).rows[0].converted_orcamento_id,
  ).toBeNull()
  await db.exec(
    'reset role; drop trigger falha_evento_teste on public.site_ticket_events; drop function public.falha_evento_teste();',
  )
})
