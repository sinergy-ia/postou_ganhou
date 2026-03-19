# Backend - Adaptacao da flag `marketplaceAutoActivation`

Guia tecnico para o backend suportar a flag de campanha `marketplaceAutoActivation`, usada para controlar se participacoes autoaprovadas devem tentar sincronizar cupom externo em marketplace.

---

## Objetivo

Permitir que cada campanha defina, alem de `autoApproveParticipations`, se a aprovacao automatica tambem deve acionar sync externo:

- `autoApproveParticipations = true`
- `marketplaceAutoActivation = true`

Quando ambas estiverem ativas, o backend deve:

1. autoaprovar participacao elegivel;
2. gerar/recalcular cupom local;
3. tentar sincronizar no marketplace externo (quando houver plataforma/configuracao valida).

---

## Contrato esperado (API)

### Create campaign

`POST /api/campaigns`

Aceitar no payload:

```json
{
  "autoApproveParticipations": true,
  "marketplaceAutoActivation": true
}
```

### Update campaign

`PUT /api/campaigns/:id`

Aceitar no payload:

```json
{
  "marketplaceAutoActivation": false
}
```

### Responses

Retornar `marketplaceAutoActivation` em:

- `GET /api/campaigns`
- `GET /api/campaigns/:id`
- response de `POST /api/campaigns`
- response de `PUT /api/campaigns/:id`

---

## Modelagem e persistencia

## Campo novo

- Nome canônico: `marketplaceAutoActivation`
- Tipo: `boolean`
- Default: `false`

## Banco

Adicionar no schema/model de campanha com default `false`.

Se existir migracao, aplicar backfill:

- campanhas antigas sem campo -> `false`

---

## Validacao de negocio

Regras recomendadas:

1. `marketplaceAutoActivation` so faz efeito quando `autoApproveParticipations=true`.
2. Se vier `marketplaceAutoActivation=true` e `autoApproveParticipations=false`, opcoes:
   - **opcao A (recomendada):** aceitar e persistir, mas nao executar ate autoapprove estar ativo;
   - **opcao B:** normalizar para `false`.
3. Nao bloquear criacao/edicao de campanha por falta de integracao marketplace.
   - O bloqueio operacional deve ocorrer no momento da tentativa de sync externo.

---

## Fluxo de autoaprovacao (ponto principal)

No ponto em que a participacao e aprovada automaticamente:

1. resolver campanha;
2. checar:
   - `campaign.autoApproveParticipations === true`
   - `campaign.marketplaceAutoActivation === true`
3. se verdadeiro, executar sync externo no mesmo fluxo de aprovacao manual, equivalente a:

```json
{
  "syncExternalCoupon": true,
  "externalPlatform": "<plataforma-resolvida>"
}
```

### Resolucao de plataforma

Definir estrategia unica (documentar no codigo):

- prioridade sugerida:
  1. plataforma default da campanha (se existir campo futuro)
  2. plataforma default do estabelecimento (se existir)
  3. plataforma conectada unica (se apenas uma habilitada)
  4. sem plataforma -> marcar sync como `SKIPPED` com motivo

### Quando nao sincronizar

Marcar status externo do cupom com motivo claro:

- `SKIPPED` se nao houver plataforma definida/conectada;
- `UNSUPPORTED` se plataforma nao suportar acao no contexto;
- `FAILED` com erro tecnico (timeout, auth, validacao externa).

---

## Observabilidade e logs

Adicionar logs estruturados no autoapprove:

- `campaignId`
- `participationId`
- `couponCode`
- `marketplaceAutoActivation`
- `externalPlatform`
- `externalSyncStatus`
- `externalSyncError` (quando houver)

Importante para diagnosticar diferenca entre:

- autoaprovar sem sync;
- autoaprovar com sync falhando;
- autoaprovar com sync ignorado.

---

## Compatibilidade retroativa

Frontend ja envia `marketplaceAutoActivation`.

Para nao quebrar:

- backend deve ignorar campos desconhecidos em ambientes antigos (temporario);
- apos deploy da adaptacao, o campo passa a ser persistido/retornado oficialmente.

---

## Checklist de implementacao

- [ ] Adicionar `marketplaceAutoActivation` ao schema/model de campanha
- [ ] Incluir no DTO/validator de create campaign
- [ ] Incluir no DTO/validator de update campaign
- [ ] Garantir serializacao no normalize/mapper de campanha
- [ ] Integrar a flag no fluxo de autoaprovacao
- [ ] Reusar pipeline existente de sync externo de aprovacao manual
- [ ] Adicionar logs estruturados
- [ ] Criar testes unitarios e integracao

---

## Plano de testes (minimo)

## 1) Persistencia da flag

- criar campanha com `marketplaceAutoActivation=true`
- buscar campanha e confirmar `true`
- editar para `false` e confirmar retorno

## 2) Autoapprove sem marketplace

- `autoApproveParticipations=true`
- `marketplaceAutoActivation=false`
- validar que aprova automatico sem sync externo

## 3) Autoapprove com marketplace ativo

- `autoApproveParticipations=true`
- `marketplaceAutoActivation=true`
- integracao marketplace valida
- validar tentativa de sync externo no cupom (`SYNCED` ou equivalente)

## 4) Falha controlada de sync

- forcar erro externo (token invalido, 401)
- garantir:
  - participacao segue aprovada localmente
  - cupom local segue fluxo local
  - status externo fica `FAILED` com mensagem

## 5) Sem plataforma resolvida

- `marketplaceAutoActivation=true`, sem plataforma/integracao valida
- garantir `SKIPPED` (ou regra definida) sem quebrar autoaprovacao local

---

## Notas de produto

- Fonte da verdade continua sendo estado local do cupom.
- Falha de sync externo nao pode invalidar a aprovacao local.
- Esse campo habilita comportamento automatico; nao substitui acao manual de retry em cupons.

