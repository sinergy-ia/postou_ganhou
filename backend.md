# Arquitetura e Integração do Backend: Postou, Ganhou

Este documento detalha as instruções e o planejamento para o desenvolvimento do backend oficial da plataforma **Postou, Ganhou**.

A stack definida é **NestJS** com **MongoDB** (utilizando Mongoose).

---

## 1. Modelagem de Dados (MongoDB / Mongoose)

Para substituir o arquivo `mockData.ts`, o banco de dados precisará das seguintes coleções (Collections):

### `Establishment` (Estabelecimentos / Restaurantes)

- **\_id**: ObjectId
- **name**: String
- **category**: String
- **avatarUrl**: String
- **coverUrl**: String
- **address**: String
- **location**: GeoJSON Point (para ordenação por distância no app)
- **description**: String
- **instagramHandle**: String (ex: `@yuruzusushi`)
- **facebookPageId**: String (ID da página vinculada)
- **instagramAccountId**: String (ID da conta profissional do IG)
- **user**: ObjectId (Referência ao usuário dono da conta - Auth)
- **accessToken**: String (Token do Facebook Graph API de longa duração)

### `Campaign` (Campanhas / Promoções)

- **\_id**: ObjectId
- **establishmentId**: ObjectId
- **title**: String
- **description**: String
- **type**: Enum (`STORY`, `POST`, `BOTH`)
- **baseReward**: String
- **maxReward**: String
- **badges**: [String]
- **rules**: [String]
- **hashtagRequired**: String (ex: `#PostouGanhouYuruzu`)
- **expiresAt**: Date
- **isActive**: Boolean

### `Participation` (Postagens e Stories)

- **\_id**: ObjectId
- **campaignId**: ObjectId
- **establishmentId**: ObjectId
- **platformMediaId**: String (ID da mídia no Instagram)
- **platformUserId**: String (ID do usuário do Instagram que postou)
- **userHandle**: String (ex: `@cliente123`)
- **mediaUrl**: String (URL da imagem/vídeo)
- **type**: Enum (`STORY`, `POST`)
- **likes**: Number
- **status**: Enum (`PENDING`, `APPROVED`, `REJECTED`, `REDEEMED`)
- **discountEarned**: String
- **createdAt**: Date

### `Coupon`

- **\_id**: ObjectId
- **participationId**: ObjectId
- **campaignId**: ObjectId
- **code**: String (ex: `YURUZU20OFF-ABC12`)
- **benefit**: String
- **validUntil**: Date
- **status**: Enum (`ACTIVE`, `USED`, `EXPIRED`, `CANCELLED`)

### `Client` (Usuário Final / Consumidor)

Para o cliente acompanhar os cupons que ele mesmo ganhou em sua "Carteira", ele precisará de um login no sistema.

- **\_id**: ObjectId
- **name**: String
- **email**: String
- **instagramHandle**: String (Fundamental para cruzar com a postagem validada)
- **instagramUserId**: String (Obtido via Login Social)
- **avatarUrl**: String
- **phone**: String (Opcional, para notificações SMS/WhatsApp)

---

## 2. Integração com Instagram (Meta for Developers)

Para rastrear menções em Stories e Posts no feed automaticamente, dependemos da **Instagram Graph API**.

### Pré-requisitos

1. Criar um aplicativo no [Meta for Developers](https://developers.facebook.com/).
2. Adicionar o produto "Login do Facebook for Business" e "Instagram Graph API".
3. **Login do Restaurante (OAuth)**: O dono do restaurante precisará fazer login com o Facebook no seu painel (Frontend -> Backend) concedendo permissões para acessar sua Página do Facebook e Conta Profissional do Instagram vinculada.
   - **Permissões necessárias**: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `instagram_manage_messages` (se usar automação de DM, opcional).

### Login do Cliente Final (Consumidor)

Embora a descoberta seja pública, para acessar os descontos na "Sua Carteira", o cliente deverá logar.
A melhor estratégia aqui é usar a **Instagram Basic Display API** ou **Login com o Facebook/Google**, de forma que o frontend passe os dados ao NestJS.
Ao logar via Instagram, seu backend tem a garantia do `@username` e do ID daquele cliente, ligando a conta do banco à exata pessoa que o Webhook avisou que fez o Story/Post.

### Captura de Menções (@ e #) através de Webhooks

O Instagram não envia notificações "push" para tudo aleatoriamente, tem regras específicas.

**Para POSTS (Feed / Reels)**:

- A API permite buscar mídias que têm uma hashtag específica usando a [Hashtag Search API](https://developers.facebook.com/docs/instagram-api/guides/hashtag-search). Contudo, isso não dá dados do usuário que postou imediatamente.
- A melhor abordagem é o **Webhook de Menções (`mentions`)**.
- Você deve assinar o campo `mentions` no Webhook do seu App da Meta.
- **Como funciona**: Quando um usuário de conta **Pública** mencionar o `@restaurante` na legenda, comentário ou no Story, a Meta dispara um POST para o seu servidor NestJS.

**Para STORIES**:

- O webhook de `mentions` também envia notificações quando a conta comercial (restaurante) é mencionada em um Story.
- **Payload recebido via Webhook**: Conterá o `media_id` do Story. Seu backend usará esse ID para buscar a mídia (URL) e salvar na coleção de `Participation`.

---

## 3. Endpoints e Módulos NestJS Necessários

### A. Módulo de Autenticação e Integração (Auth / Meta Integration)

- `GET /api/auth/facebook`: Redireciona para o login do Meta.
- `GET /api/auth/facebook/callback`: Recebe o código, troca pelo Access Token de longa duração.
- Ação: Salvar o `instagramAccountId` e `accessToken` no documento do `Establishment`.

### B. Módulo de Webhooks

- `GET /api/webhooks/instagram`: A Meta envia um desafio (challenge) chamado `hub.challenge` para validar a URL. O NestJS deve retornar exatamente esse código.
- `POST /api/webhooks/instagram`: Endpoint crucial. Recebe o payload sempre que houver uma menção.
  - **Fluxo no NestJS**:
    1. Recebe Payload (contém ID do restaurante mencionado e ID da mídia do cliente).
    2. Busca o `Establishment` no MongoDB.
    3. Verifica se há uma `Campaign` ativa.
    4. Usa o Access Token do restaurante para bater na Graph API: `GET /{media_id}?fields=media_url,media_type,owner{username}`.
    5. Salva na coleção `Participation` com status `PENDING` (ou `APPROVED` se auto-aprovar).

### C. Módulo do Painel do Restaurante (Rotas Protegidas - JWT - Lojista)

Esses endpoints vão abastecer todas as telas do seu diretório `src/app/(dashboard)/`.

- **Autenticação (Login e Registro nativos):**
  - `POST /api/auth/establishment/register`: Usado no `/cadastro` para criar um restaurante manualmente (sem rede social).
    - **Body Recebido:** `{ name, establishmentName, email, password }`
    - **Ação:** Fazer hash da senha (bcrypt), criar o usuário e o `Establishment` no MongoDB. Devolver `{ token, establishment }` contendo JWT idêntico ao login.
  - `POST /api/auth/establishment/login`: Usado no `/login` para login por e-mail/senha nativo.
  - `GET /api/establishment/me`: Pega os dados do Lojista logado para renderizar header/sidebar.

- **Dashboard Principal (`/dashboard`):**
  - `GET /api/dashboard/metrics`: Retorna as contagens rápidas (Campanhas Ativas, Postagens, Cupons, etc.).
  - `GET /api/dashboard/charts`: Retorna os dados agregados para o pacote de gráficos de evolução (Posts e Resgates por dia).

- **Campanhas (`/dashboard/campanhas`):**
  - `GET /api/campaigns`: Lista campanhas do usuário (suporta paginação/filtros de Ativa/Agendada).
  - `GET /api/campaigns/:id`: Detalhes de uma campanha.
  - `POST /api/campaigns`: Cria nova campanha (salva tipo da recompensa, data).
  - `PUT /api/campaigns/:id`: Edita os dados/encerra campanha ativa.
- **Moderação de Postagens (`/dashboard/postagens`):**
  - `GET /api/participations`: Lista postagens cruzando com cliente e campanha (filtros `PENDING`, `APPROVED`).
  - `POST /api/participations/:id/approve`: O Lojista bate o olho e clica em Aprovar. Essa rota altera Status para `APPROVED` e **gera o `Coupon` no banco para o cliente**.
  - `POST /api/participations/:id/reject`: Reprova a participação. Pode receber no body `{ reason: "Perfil trancado" }`.

- **Gerenciamento de Cupons (`/dashboard/cupons`):**
  - `GET /api/coupons`: Tabela com todos cupons gerados pelo estabelecimento (pode exportar CSV).
  - `POST /api/coupons/:code/redeem`: Quando o cliente está no restaurante e mostra o celular, o Lojista digita/pesquisa o código e clica para mudar status para `USED` (Resgatado).
  - `POST /api/coupons/:code/cancel`: Cancela por erro/fraude.

- **Resultados e Analytics (`/dashboard/resultados`):**
  - `GET /api/analytics/roi`: Dados avançados de ROI.
  - `GET /api/analytics/conversion`: Taxa de conversão.
  - `GET /api/analytics/insights`: Retorna os cards automáticos gerados pelo back-end (ex: dias em alta).

- **Configurações (`/dashboard/configuracoes`):**
  - `GET /api/settings`: Retorna todos faturamentos, logo, cover e profile da loja.
  - `PUT /api/settings`: Atualiza nome, descrição, instagram handle e etc. (Multipart form data para upload pro S3 caso tenha imagens).

### D. Módulo Público e Descoberta (Sem JWT inicialmente)

Esses endpoints vão abastecer as telas públicas `src/app/(public)/`.

- `GET /api/public/establishments?lat=x&lng=y`: Lista com agregação Geo-espacial (MongoDB `$geoNear`) para página de Mapa.
- `GET /api/public/campaigns`: Busca geral / busca por string / categoria (Aparece na página de Promoções e na Home).
- `GET /api/public/campaigns/:id`: Página de detalhes ricos sobre a promoção escolhida. Retorna rules, badges, estabelecimento.
- `GET /api/public/gallery`: Lista de `participações` públicas de clientes com foto que já ganharam status `APPROVED` (para a page de Galeria Social).

### E. Módulo do Cliente Final (App do Consumidor - Rotas Protegidas JWT)

Para telas logadas do consumidor final que for pegar os brindes.

- **Auth e Perfil**:
  - `GET /api/auth/client/instagram`: Gera URL de Autenticação do Instagram Basic Display API.
  - `GET /api/auth/client/callback`: Valida cliente, salva o `@username` obrigatoriamente e emite o token JWT do Consumidor.
  - `GET /api/client/me`: Pega os dados do consumidor que acabou de logar na sua Landing Page.
- **Carteira de Cupons / Notificações**:
  - `GET /api/client/wallet`: Pega todas as participações do cliente (pendentes e aprovados) e os Cupons Ativos.
  - `GET /api/client/notifications`: Rota Websocket/SSE ou simple Polling. Para pintar bolinha de notificação quando aprovarem o café de graça!
- **Vincular manual (Opcional)**:
  - `POST /api/client/claim-post`: Caso, por algum motivo, o Webhook falhe ou cliente poste e o app demore, o cliente pode colar na web o link do seu próprio Story/Post e o backend valida via Graph API usando o AccessToken de cliente dele.

---

## 4. Substituição do Mock frontend pelo Backend Real

Hoje, o frontend lê listas do `src/lib/mockData.ts`. A transição ocorrerá assim:

1. **Setup de Fetcher no Frontend:** Configurar `axios` ou a `fetch API` base. Recomenda-se usar React Query (ou SWR) no Next.js App Router (nos Client Components) ou fazer fetch Server-Side em Server Components.
2. **Página de Campanhas (Dashboard):**
   ```typescript
   // Sai o mock: const promos = mockPromotions;
   // Entra real:
   const response = await fetch("http://localhost:3000/api/campaigns", {
     headers: { Authorization: `Bearer ${token}` },
   });
   const data = await response.json();
   ```
3. **Página de Moderação (Dashboard):** Esta página ficará "mágica". Conforme os webhooks chegam no NestJS e salvam no banco, o Frontend buscará o endpoint `/api/participations?status=PENDING` e os cards de clientes preencherão o layout automaticamente.

---

## Resumo dos Próximos Passos (Backend)

1. `nest new postou-ganhou-api` (Criar o app NestJS)
2. `npm install @nestjs/mongoose mongoose` (Conectar ao MongoDB)
3. Criar os Schemas Mongoose para `Establishment`, `Campaign`, `Participation` e `Coupon`.
4. Criar conta no [Meta for Developers](https://developers.facebook.com/), configurar o App e cadastrar a URL `/api/webhooks/instagram` lá. (Use o **ngrok** para testar localmente, pois o Facebook exige uma URL pública HTTPS).
5. Escrever o Controller do Webhook no NestJS para processar os payloads JSON recebidos.
6. Construir as rotas REST para o painel de frontend consumir.
