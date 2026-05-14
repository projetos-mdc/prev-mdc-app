-- ═══════════════════════════════════════════════════════════
-- BANCO DE DADOS — PROGRAMA PREV MDC
-- Execute no painel Supabase: SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════

-- TABELA: parceiros
create table if not exists parceiros (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  email           text not null unique,
  senha           text not null,
  whatsapp        text,
  tipo            text not null check (tipo in ('profissional','empresa')),
  especialidade   text,
  segmento        text not null check (segmento in ('s1','s2','s3','s4')),
  status          text not null default 'ativo' check (status in ('ativo','pendente','inativo')),
  data_cadastro   timestamptz default now()
);

-- TABELA: indicacoes
create table if not exists indicacoes (
  id                  uuid primary key default gen_random_uuid(),
  parceiro_id         uuid not null references parceiros(id),
  paciente_nome       text not null,
  paciente_telefone   text,
  observacoes         text,
  status              text not null default 'aguardando'
                        check (status in ('aguardando','agendado','avaliado','tratamento','finalizado')),
  data_indicacao      timestamptz default now(),
  data_avaliacao      timestamptz,
  valor_repasse       numeric(8,2),
  repasse_pago        boolean default false,
  pdf_url             text
);

-- ÍNDICES para performance
create index if not exists idx_indicacoes_parceiro on indicacoes(parceiro_id);
create index if not exists idx_indicacoes_status   on indicacoes(status);
create index if not exists idx_parceiros_email     on parceiros(email);

-- PERMISSÕES (Row Level Security)
alter table parceiros  enable row level security;
alter table indicacoes enable row level security;

-- Política: parceiros podem ler apenas seus próprios dados
-- (ajuste conforme seu fluxo de auth)
create policy "parceiros_leitura_propria" on parceiros
  for select using (true);   -- liberado para anon (auth via campo senha)

create policy "parceiros_insercao" on parceiros
  for insert with check (true);

create policy "indicacoes_leitura_propria" on indicacoes
  for select using (true);

create policy "indicacoes_insercao" on indicacoes
  for insert with check (true);

-- ═══════════════════════════════════════════════════════════
-- DADOS DE TESTE (opcional — delete depois)
-- ═══════════════════════════════════════════════════════════
insert into parceiros (nome, email, senha, whatsapp, tipo, especialidade, segmento)
values ('Beatriz Santos', 'beatriz@teste.com', '123456', '(61) 99999-8888', 'profissional', 'fono', 's2');

-- Pegue o id do parceiro acima e use abaixo:
-- insert into indicacoes (parceiro_id, paciente_nome, paciente_telefone, status)
-- values ('UUID_AQUI', 'João Carlos Silva', '(61) 98888-7777', 'avaliado');
