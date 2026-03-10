# Frontend - Integracao com os endpoints de Marque & Ganhe

Este arquivo documenta como o frontend deve consumir os endpoints criados em `src/marque_e_ganhe`.

## Objetivo

O frontend deve substituir dados mockados por chamadas reais para o backend NestJS, separando o consumo em 3 contextos:

- area publica
- area do lojista
- area do cliente final

## Base URL

No ambiente local atual, o backend sobe em:

```txt
http://localhost:3001
```

Prefixos principais:

- publico: `http://localhost:3001/api/public`
- autenticacao e areas protegidas: `http://localhost:3001/api`

Sugestao de env no frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Autenticacao

Existem 2 tipos de token JWT:

- token de lojista: usado nas rotas do dashboard
- token de cliente: usado nas rotas de carteira e notificacoes

Nao reutilize o token do lojista nas rotas do cliente, nem o token do cliente nas rotas do lojista.

Header padrao para rotas protegidas:

```http
Authorization: Bearer <token>
```

## Setup recomendado no frontend

Sugestao com `axios`:

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}
```

Sugestao de separacao dos clients:

- `services/public-api.ts`
- `services/establishment-api.ts`
- `services/client-api.ts`

## Fluxo de login do lojista

### 1. Login nativo por e-mail e senha

Endpoint:

```txt
POST /api/auth/establishment/login
```

Body:

```json
{
  "email": "restaurante@email.com",
  "password": "123456"
}
```

Resposta esperada:

```json
{
  "token": "jwt",
  "establishment": {
    "_id": "id",
    "name": "Yuruzu Sushi",
    "email": "restaurante@email.com",
    "instagramHandle": "@yuruzusushi",
    "metaConnected": true
  }
}
```

1. enviar form de login
2. salvar `token`
3. chamar `GET /api/establishment/me`
4. redirecionar para o dashboard

### 1.1 Registro nativo por e-mail e senha

Endpoint:

```txt
POST /api/auth/establishment/register
```

Body:

```json
{
  "name": "João Silva",
  "establishmentName": "Yuruzu Sushi",
  "email": "restaurante@email.com",
  "password": "senha_segura123"
}
```

Resposta esperada (A mesma do Login):

```json
{
  "token": "jwt",
  "establishment": {
    "_id": "id",
    "name": "Yuruzu Sushi",
    "email": "restaurante@email.com",
    "metaConnected": false
  }
}
```

Uso no frontend (já implementado, aguardando endpoint ativado):

1. Submit do form na página `/cadastro`
2. backend cria o registro e já devolve o `token`
3. frontend loga e joga pro `/dashboard`

### 2. Login via Meta / Facebook

Endpoint para montar a URL de autenticacao:

```txt
GET /api/auth/facebook?redirect=false&establishmentId=<id-opcional>
```

Resposta esperada:

```json
{
  "url": "https://www.facebook.com/...",
  "establishmentId": "..."
}
```

Fluxo recomendado:

1. o frontend chama `GET /api/auth/facebook?redirect=false`
2. recebe a `url`
3. faz `window.location.href = url`
4. a Meta redireciona para a URL configurada em `MARQUE_E_GANHE_META_REDIRECT_URI`
5. a pagina de callback do frontend le `code` e `state` da query string
6. a pagina de callback chama `GET /api/auth/facebook/callback?code=...&state=...`
7. o backend responde com `token` e `establishment`
8. o frontend salva o token e segue para o dashboard

Observacao importante:

- o uso com `redirect=false` e o fluxo mais facil para apps React/Next
- o endpoint `GET /api/auth/facebook` sem `redirect=false` tambem pode ser usado, mas o frontend perde controle da navegacao

## Fluxo de login do cliente final

Endpoint para montar a URL de autenticacao do Instagram:

```txt
GET /api/auth/client/instagram?redirect=false
```

Fluxo recomendado:

1. o frontend chama `GET /api/auth/client/instagram?redirect=false`
2. recebe a `url`
3. redireciona o navegador
4. a pagina de callback do frontend recebe `code`
5. a pagina de callback chama `GET /api/auth/client/callback?code=...`
6. o backend responde com `token` e `client`
7. o frontend salva o token do cliente
8. o frontend redireciona para a carteira

## Rotas publicas

Estas rotas nao exigem JWT.

### Mapa e descoberta de estabelecimentos

```txt
GET /api/public/establishments?lat=-23.55&lng=-46.63&limit=20&search=sushi&category=japones
```

Uso no frontend:

- pagina home com cards de estabelecimentos
- pagina mapa com ordenacao por proximidade
- filtros de busca e categoria

### Listagem de promocoes

```txt
GET /api/public/campaigns?page=1&limit=12&search=sushi&category=japones&establishmentId=<id>&activeOnly=true
```

Uso no frontend:

- home publica
- pagina de promocoes
- pagina de busca

### Detalhe de campanha

```txt
GET /api/public/campaigns/:id
```

Uso no frontend:

- pagina de detalhes da promocao
- exibir `rules`, `badges`, dados do estabelecimento e total de participacoes aprovadas

### Galeria social

```txt
GET /api/public/gallery?page=1&limit=12&establishmentId=<id>&campaignId=<id>
```

Uso no frontend:

- pagina de galeria social
- vitrine de clientes aprovados

## Rotas do lojista

Todas exigem token de lojista.

### Dados do usuario logado

```txt
GET /api/establishment/me
```

Uso no frontend:

- header
- sidebar
- nome, avatar, handle e status da integracao Meta

### Dashboard principal

```txt
GET /api/dashboard/metrics
GET /api/dashboard/charts?startDate=2026-03-01&endDate=2026-03-31
```

Uso no frontend:

- cards de resumo
- graficos de posts, cupons e resgates por periodo

### Campanhas

Listagem:

```txt
GET /api/campaigns?page=1&limit=10&status=ACTIVE&search=sushi
```

Detalhe:

```txt
GET /api/campaigns/:id
```

Criacao:

```txt
POST /api/campaigns
```

Body:

```json
{
  "title": "Poste e ganhe 20% OFF",
  "description": "Publique um story marcando o restaurante.",
  "type": "STORY",
  "baseReward": "20% OFF",
  "maxReward": "30% OFF",
  "badges": ["mais popular", "fim de semana"],
  "rules": ["Perfil publico", "Marcar o restaurante"],
  "hashtagRequired": "#MarqueEGanheYuruzu",
  "expiresAt": "2026-04-30T23:59:59.000Z",
  "isActive": true
}
```

Edicao:

```txt
PUT /api/campaigns/:id
```

Uso no frontend:

- pagina `/dashboard/campanhas`
- criacao, listagem, detalhe e edicao

### Moderacao de postagens

Listagem:

```txt
GET /api/participations?page=1&limit=20&status=PENDING&campaignId=<id>&type=STORY&userHandle=@cliente
```

Aprovar:

```txt
POST /api/participations/:id/approve
```

Rejeitar:

```txt
POST /api/participations/:id/reject
```

Body de rejeicao:

```json
{
  "reason": "Perfil trancado"
}
```

Uso no frontend:

- pagina `/dashboard/postagens`
- cards ou tabela com preview da midia
- acao de aprovar ou reprovar
- ao aprovar, o backend ja tenta gerar o cupom

### Cupons

Listagem:

```txt
GET /api/coupons?page=1&limit=20&status=ACTIVE&campaignId=<id>&search=YURUZU
```

Resgatar:

```txt
POST /api/coupons/:code/redeem
```

Cancelar:

```txt
POST /api/coupons/:code/cancel
```

Uso no frontend:

- pagina `/dashboard/cupons`
- busca por codigo
- tabela de cupons ativos, usados, cancelados e expirados

### Analytics

```txt
GET /api/analytics/roi
GET /api/analytics/conversion
GET /api/analytics/insights
```

Uso no frontend:

- pagina `/dashboard/resultados`
- cards, funil e textos gerados pelo backend

### Configuracoes do estabelecimento

Buscar:

```txt
GET /api/settings
```

Atualizar:

```txt
PUT /api/settings
```

Body:

```json
{
  "name": "Yuruzu Sushi",
  "category": "Japones",
  "email": "contato@yuruzu.com",
  "avatarUrl": "https://...",
  "coverUrl": "https://...",
  "address": "Rua Exemplo, 100",
  "description": "Sushi premium",
  "instagramHandle": "@yuruzusushi",
  "facebookPageId": "123",
  "instagramAccountId": "456",
  "lat": -23.55,
  "lng": -46.63
}
```

Uso no frontend:

- pagina `/dashboard/configuracoes`
- formulario de perfil da loja

Observacao importante:

- no estado atual, a atualizacao e via JSON
- upload de arquivo para imagem ainda nao esta implementado nesta camada

## Rotas do cliente final

Todas exigem token de cliente.

### Perfil do cliente

```txt
GET /api/client/me
```

Uso no frontend:

- header da area logada do cliente
- pagina de perfil

### Carteira

```txt
GET /api/client/wallet
```

Uso no frontend:

- pagina "Minha carteira"
- mostrar participacoes `PENDING`, `APPROVED`, `REJECTED` e `REDEEMED`
- mostrar cupons `ACTIVE`, `USED`, `CANCELLED` e `EXPIRED`

### Notificacoes

```txt
GET /api/client/notifications?limit=20
```

Uso no frontend:

- badge de notificacao
- lista de eventos recentes
- polling simples a cada 30s ou 60s

### Vinculo manual de postagem

```txt
POST /api/client/claim-post
```

Body:

```json
{
  "campaignId": "campanha-id",
  "platformMediaId": "midia-id-opcional",
  "mediaUrl": "https://...",
  "type": "POST",
  "caption": "Marquei o restaurante e postei"
}
```

Tambem e possivel enviar `establishmentId` quando o frontend nao tiver `campaignId`.

Uso no frontend:

- pagina ou modal "Nao encontrou minha postagem"
- fluxo de suporte ou reenvio manual

## Webhook do Instagram

Endpoints:

```txt
GET /api/webhooks/instagram
POST /api/webhooks/instagram
```

Estas rotas nao sao chamadas pelo frontend.

O efeito esperado no frontend e indireto:

1. a Meta chama o webhook
2. o backend cria ou atualiza `participations`
3. o dashboard do lojista passa a listar os novos itens
4. quando o lojista aprova, o cliente passa a ver cupom na carteira

## Enums usados no frontend

### Campanha

```txt
STORY
POST
BOTH
```

### Participacao

```txt
PENDING
APPROVED
REJECTED
REDEEMED
```

### Cupom

```txt
ACTIVE
USED
EXPIRED
CANCELLED
```

## Mapeamento sugerido por tela

### Area publica

- home: `GET /api/public/establishments`, `GET /api/public/campaigns`
- mapa: `GET /api/public/establishments?lat=...&lng=...`
- promocoes: `GET /api/public/campaigns`
- detalhe da promocao: `GET /api/public/campaigns/:id`
- galeria: `GET /api/public/gallery`

### Dashboard do lojista

- login: `POST /api/auth/establishment/login`
- callback Meta: `GET /api/auth/facebook/callback`
- cabecalho: `GET /api/establishment/me`
- dashboard: `GET /api/dashboard/metrics`, `GET /api/dashboard/charts`
- campanhas: `GET /api/campaigns`, `POST /api/campaigns`, `PUT /api/campaigns/:id`
- postagens: `GET /api/participations`, `POST /api/participations/:id/approve`, `POST /api/participations/:id/reject`
- cupons: `GET /api/coupons`, `POST /api/coupons/:code/redeem`, `POST /api/coupons/:code/cancel`
- resultados: `GET /api/analytics/roi`, `GET /api/analytics/conversion`, `GET /api/analytics/insights`
- configuracoes: `GET /api/settings`, `PUT /api/settings`

### Area do cliente

- login social: `GET /api/auth/client/instagram`, `GET /api/auth/client/callback`
- perfil: `GET /api/client/me`
- carteira: `GET /api/client/wallet`
- notificacoes: `GET /api/client/notifications`
- vinculo manual: `POST /api/client/claim-post`

## Exemplo rapido com React Query

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data } = await api.get("/api/dashboard/metrics");
      return data;
    },
  });
}
```

## Regras praticas para o frontend

- rotas `public` nao precisam de token
- rotas do dashboard precisam de token de lojista
- rotas `client/*` precisam de token de cliente
- a pagina de callback deve capturar `code` e chamar o backend
- a moderacao deve sempre recarregar a lista apos aprovar ou rejeitar
- a carteira do cliente deve atualizar apos aprovacoes, via polling simples ou refresh manual
- `settings` atualmente recebe JSON comum

## Proxima etapa recomendada

Depois desta documentacao, o frontend pode criar:

- um `api client`
- hooks por dominio
- paginas de callback para lojista e cliente
- troca definitiva do `mockData` pelos endpoints reais
