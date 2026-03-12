# Checklist de Seguranca do Backend

Checklist para validar se o backend esta seguro para multi-tenant, com isolamento entre clientes, controle de permissao por usuario e vinculacao correta de contas Instagram/Meta.

Uso recomendado:
- [ ] Marcar cada item apenas apos validar em codigo, teste automatizado ou evidencias de runtime.
- [ ] Considerar um item "nao conforme" se a regra existir so no frontend.
- [ ] Tratar qualquer filtro por `establishmentId`, `clientId`, `teamUserId` ou `userId` vindo do request como dado nao confiavel.

## 1. Modelo de isolamento multi-tenant

- [ ] Existe uma regra unica e clara de tenant no backend.
- [ ] O tenant efetivo e derivado da sessao/JWT, nunca apenas de parametros enviados pelo frontend.
- [ ] Todo recurso sensivel pertence explicitamente a um tenant no banco.
- [ ] Toda query sensivel usa filtro por tenant.
- [ ] Todo update sensivel usa filtro por tenant.
- [ ] Todo delete sensivel usa filtro por tenant.
- [ ] Nao existe endpoint que retorne dados de varios tenants para usuarios comuns.
- [ ] O backend falha com `403` ou `404` quando o recurso existe, mas pertence a outro tenant.

## 2. Autenticacao e sessao

- [ ] O JWT contem os claims minimos necessarios: `sub`, `role`, `tenantId` ou equivalente.
- [ ] O backend valida assinatura, expiracao, issuer e audience do JWT.
- [ ] O backend nao confia em role, tenant ou ids enviados no body/query se eles divergirem do token.
- [ ] Sessao de cliente final e sessao de estabelecimento usam escopos distintos no backend.
- [ ] O backend impede mistura de contexto entre rotas de cliente e rotas de estabelecimento.
- [ ] Tokens antigos podem ser invalidados quando necessario.
- [ ] Existe rotacao/expiracao adequada para tokens sensiveis.

## 3. Autorizacao por papel

- [ ] As permissoes sao validadas no backend, nao apenas escondidas na UI.
- [ ] Existe middleware/guard/policy para RBAC.
- [ ] `owner`, `manager`, `viewer` possuem permissoes diferentes aplicadas no servidor.
- [ ] `superAdmin` e tratado separadamente, sem herdar acesso indevido a dados globais por engano.
- [ ] Toda mutacao critica verifica role antes de executar.
- [ ] Toda consulta administrativa verifica role antes de responder.

## 4. Regras gerais por endpoint

Para cada endpoint protegido, validar:

- [ ] O tenant e obtido da sessao.
- [ ] O recurso buscado pertence ao tenant autenticado.
- [ ] O role do usuario permite a acao.
- [ ] O endpoint nao aceita ids arbitrarios sem revalidar ownership.
- [ ] A resposta nao inclui campos sensiveis desnecessarios.
- [ ] Logs de erro nao vazam tokens, segredos ou dados de outro tenant.

## 5. Endpoints prioritarios para auditoria

### 5.1 Auth de estabelecimento

- [ ] `POST /api/auth/establishment/login` retorna apenas memberships permitidas para o usuario autenticado.
- [ ] `POST /api/auth/establishment/select-membership` valida se o `teamUserId` pertence ao `selectionToken`.
- [ ] O token final apos selecao carrega o tenant correto.
- [ ] Nao e possivel selecionar membership de outro usuario por IDOR.

### 5.2 Auth de cliente final / Instagram

- [ ] `GET /api/auth/client/instagram` gera `state` unico, imprevisivel e com expiracao curta.
- [ ] `GET /api/auth/client/callback` exige e valida `state`.
- [ ] O `code` do OAuth nao pode ser reutilizado.
- [ ] A conta Instagram autenticada e vinculada ao cliente correto.
- [ ] O callback falha se houver divergencia de sessao, tenant ou estado OAuth.
- [ ] Existe protecao contra login CSRF e account mix-up.

### 5.3 Auth Facebook / Instagram profissional

- [ ] `GET /api/auth/facebook` nao confia apenas em `establishmentId` vindo da request.
- [ ] O `establishmentId` usado no fluxo OAuth e validado contra a sessao do usuario.
- [ ] O `state` do OAuth inclui contexto suficiente para revalidar tenant e usuario.
- [ ] `GET /api/auth/facebook/callback` valida `state`, tenant, usuario e ownership antes de vincular conta.
- [ ] Nao e possivel conectar uma conta Meta em outro estabelecimento por manipulacao de parametros.
- [ ] O mesmo `instagramAccountId` nao pode ficar vinculado a mais de um estabelecimento sem regra explicita.

### 5.4 Settings do estabelecimento

- [ ] `GET /api/settings` retorna apenas dados do tenant autenticado.
- [ ] `GET /api/settings` nao retorna `accessToken`, refresh token, segredo OAuth ou credencial sensivel.
- [ ] `PUT /api/settings` aplica allowlist de campos editaveis.
- [ ] `PUT /api/settings` ignora ou rejeita campos sensiveis como `accessToken`, `facebookPageId`, `instagramAccountId`, `superAdmin`, `planAccess`.
- [ ] Apenas `owner` pode alterar configuracoes criticas, se essa for a regra de negocio.

### 5.5 Team users

- [ ] `GET /api/team-users` lista apenas usuarios do tenant autenticado.
- [ ] `POST /api/team-users` exige permissao adequada.
- [ ] `PUT /api/team-users/:id` valida se o usuario alvo pertence ao tenant autenticado.
- [ ] Nao e possivel promover papel ou alterar senha de usuarios de outro tenant.
- [ ] Regras especiais de ownership sao aplicadas no backend.

### 5.6 Campanhas, participacoes e cupons

- [ ] `GET /api/campaigns` retorna apenas campanhas do tenant autenticado.
- [ ] `GET /api/campaigns/:id` valida ownership da campanha.
- [ ] `POST /api/participations/:id/approve` valida tenant e role.
- [ ] `POST /api/participations/:id/reject` valida tenant e role.
- [ ] `POST /api/coupons/:code/redeem` valida tenant da campanha/cupom antes de resgatar.
- [ ] `POST /api/coupons/:code/cancel` valida tenant e role.
- [ ] Nao existe IDOR por `id` ou `code`.

### 5.7 AI posts / publicacao social

- [ ] `GET /api/ai-posts/:id` valida ownership do post.
- [ ] `POST /api/ai-posts/:id/publish-now` valida ownership e permissao.
- [ ] `POST /api/ai-posts/:id/schedule` valida ownership e permissao.
- [ ] `POST /api/ai-posts/:id/cancel` valida ownership e permissao.
- [ ] O backend garante que a publicacao usa a conta social vinculada ao tenant correto.

### 5.8 Sponsored highlights

- [ ] `GET /api/sponsored-highlights/lookups` nao expoe lista global de estabelecimentos para usuarios comuns.
- [ ] `GET /api/sponsored-highlights/campaigns` retorna apenas dados autorizados para o tenant/role.
- [ ] Qualquer visao agregada multi-tenant e restrita a `superAdmin`.
- [ ] O backend nao depende de filtro no frontend para esconder campanhas de outros estabelecimentos.

### 5.9 Pricing / administracao global

- [ ] Endpoints de pricing sao restritos a `superAdmin`.
- [ ] `PUT /api/pricing/establishments/:establishmentId/plan` valida privilegio administrativo real.
- [ ] `PUT /api/pricing/establishments/:establishmentId/super-admin` valida privilegio maximo e audita a acao.
- [ ] Nao existe escalacao horizontal de privilegio via troca de `establishmentId`.

### 5.10 Cliente final: carteira, notificacoes e claim-post

- [ ] `GET /api/client/me` retorna apenas o cliente autenticado.
- [ ] `GET /api/client/wallet` retorna apenas participacoes e cupons do proprio cliente.
- [ ] `GET /api/client/notifications` retorna apenas notificacoes do proprio cliente.
- [ ] `POST /api/client/claim-post` valida que o post pertence ao Instagram autenticado do cliente.
- [ ] `POST /api/client/claim-post` valida que `campaignId` ou `establishmentId` sao compativeis com o post recebido.
- [ ] Nao e possivel reivindicar post de outro cliente.

## 6. Banco de dados e integridade

- [ ] Existe indice unico para chaves externas sensiveis quando aplicavel.
- [ ] `instagramAccountId` possui unicidade adequada.
- [ ] `facebookPageId` possui unicidade adequada.
- [ ] `instagramUserId` do cliente possui unicidade adequada.
- [ ] Toda colecao sensivel possui referencia explicita ao tenant.
- [ ] Nao ha registros "globais" sendo reutilizados sem controle de acesso.
- [ ] Operacoes de update usam filtro composto com `tenantId` sempre que aplicavel.

## 7. Dados sensiveis e resposta da API

- [ ] A API nunca devolve `accessToken` de provedores ao frontend.
- [ ] A API nunca devolve segredos internos, hashes, chaves privadas ou refresh tokens.
- [ ] Campos internos sao removidos por serializer/DTO explicito.
- [ ] Existe allowlist do que pode sair em cada resposta.
- [ ] Nao ha `return entity` bruto vindo do banco em endpoints sensiveis.

## 8. Webhooks e integracoes externas

- [ ] `POST /api/webhooks/instagram` valida assinatura/origem do provedor.
- [ ] O webhook resolve o tenant de forma deterministica e segura.
- [ ] O webhook nao cria participacao em tenant errado quando houver dados duplicados ou inconsistentes.
- [ ] Eventos repetidos sao tratados com idempotencia.
- [ ] Falhas de integracao nao deixam dados parciais vinculados ao tenant errado.

## 9. Protecoes complementares

- [ ] Rate limiting em login, callbacks OAuth e endpoints sensiveis.
- [ ] Auditoria de acoes administrativas.
- [ ] Alertas para tentativa de acesso cruzado entre tenants.
- [ ] Sanitizacao de entradas para evitar injection e mass assignment.
- [ ] Validacao por schema no request body/query/params.
- [ ] CORS restrito aos frontends esperados.
- [ ] Segredos guardados fora do codigo e fora da resposta da API.

## 10. Testes obrigatorios

### 10.1 Testes automatizados

- [ ] Teste: usuario A nao acessa `GET /api/settings` do tenant B.
- [ ] Teste: usuario A nao altera `PUT /api/settings` do tenant B.
- [ ] Teste: manager/viewer nao executa acao exclusiva de owner.
- [ ] Teste: cliente A nao acessa carteira/notificacoes do cliente B.
- [ ] Teste: callback OAuth sem `state` valido falha.
- [ ] Teste: callback OAuth com `state` de outra sessao falha.
- [ ] Teste: `claim-post` rejeita post que nao pertence ao cliente autenticado.
- [ ] Teste: endpoints por `:id` rejeitam recurso de outro tenant.
- [ ] Teste: endpoints por `:code` rejeitam cupom de outro tenant.
- [ ] Teste: sponsored endpoints para usuario comum nao retornam dados globais.

### 10.2 Testes manuais

- [ ] Logar com dois tenants diferentes e repetir requests trocando IDs manualmente.
- [ ] Reexecutar requests administrativas com token de `viewer`.
- [ ] Tentar conectar Instagram profissional com `establishmentId` alterado.
- [ ] Tentar concluir callback do cliente com `code`/`state` de outra sessao.
- [ ] Conferir payload real de `GET /api/settings` e confirmar ausencia de segredos.

## 11. Criterio de aprovacao

So considerar o backend pronto para multi-tenant quando:

- [ ] Nenhum endpoint protegido depender de filtro no frontend.
- [ ] Toda autorizacao estiver implementada no backend.
- [ ] Todo acesso por ID validar tenant + ownership + role.
- [ ] Fluxos OAuth validarem `state` e vincularem a conta correta.
- [ ] Respostas nao vazarem dados ou tokens sensiveis.
- [ ] Houver testes automatizados cobrindo acesso cruzado entre tenants.

## 12. Evidencias a anexar na auditoria

- [ ] Trechos de guard/policy/middleware de autenticacao.
- [ ] Trechos de query com filtro por tenant.
- [ ] DTOs/serializers que removem campos sensiveis.
- [ ] Testes automatizados de acesso cruzado.
- [ ] Logs ou capturas de requests negadas com `403`/`404`.

