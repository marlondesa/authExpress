# Relatório de Auditoria de Segurança — OWASP

**Projeto:** autenticats (API Express + React/Vite + Prisma/PostgreSQL)
**Data:** 2026-08-21
**Escopo:** backend (`backend/src`), frontend (`frontend/src`), configuração e dependências
**Referências:** OWASP Top 10 (2021), OWASP ASVS 4.0 (Níveis 1–2), NIST SP 800-63B
**Método:** análise estática manual do código-fonte e revisão de configuração

---

## 1. Resumo Executivo

A aplicação possui uma base de autenticação **bem estruturada**: hashing com Argon2id, refresh tokens armazenados como hash no banco, rotação de tokens com consumo atômico, resposta genérica em "forgot password", validação com Zod, Helmet, rate limiting granular e cookies `httpOnly`/`sameSite=strict`. Isso a coloca próxima do **ASVS Nível 1** no módulo de autenticação.

Os principais riscos identificados são: **segredos fracos com fallback em código**, **sessão em memória inadequada para produção**, **captcha matemático trivialmente quebrável**, **ausência total de middleware de autenticação/autorização** nas rotas e **dados pessoais expostos no arquivo `.env`**.

**Contagem de achados:** 4 críticos/altos, 10 médios, 8 baixos/observações.

---

## 1.1 Progresso de Remediação — atualizado em 21/08/2026

**9 achados resolvidos** desde a auditoria inicial (✅ marcados inline na seção 2):

| Item | Correção aplicada |
|------|-------------------|
| ✅ **A02-1** | `SESSION_SECRET` sem fallback — o app **falha no boot** se ausente ou com menos de 32 chars; secret forte gerada no `.env` local (não versionado) |
| ✅ **A02-2** | `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` regenerados — distintos, 96 hex chars cada; legado `JWT_SECRET` removido do `.env` |
| ✅ **A01-1** | Middleware `requireAuth` criado (`src/middleware/requireAuth.ts`): valida `Bearer`, exige `type: "access"`, injeta `req.userId`, 401 uniforme. Rota modelo `GET /api/auth/me` protegida |
| ✅ **A04-1** | Captcha reescrito: **PNG rasterizado via node-canvas** com rotação por caractere, curvas bezier, linhas sobre o texto e pontos de ruído. A expressão não existe mais em texto no payload (o usuário optou por manter captcha próprio — agora com implementação real) |
| ✅ **A04-4** | Login em tempo constante: `argon2.verify` sempre executado (hash dummy quando o e-mail não existe) |
| ✅ **A04-5** | **Reuse detection**: refresh token já revogado reapresentado → revoga toda a família do usuário + log `warn` de segurança |
| ✅ **A05-3** | Cookie de refresh com `path: "/api/auth"` (login, refresh e logout/clear) |
| ✅ **F-1** | Frontend envia `password` (era `newPassword`) — reset de senha funcional |
| ✅ **F-2** | `AppError` com status HTTP: 401 login inválido, 409 e-mail duplicado, 400 token inválido; 500 só para erros desconhecidos |

**Permanecem abertos:** A01-2 (roles/AdminPanel), A04-2 (token reset na query string), A04-3 (enumeração no registro), A05-1/A05-2 (sessão/rate-limit em memória + `trust proxy` — dependem do deploy), A07-1..4, A08-1, A09-1/2, A05-5/6, H-1.

**Risco aceito pelo usuário:** A02-3 (dados pessoais no `.env` local, não versionado).

**H-2 resolvido:** criado `backend/.env.example` com placeholders (sem dados pessoais).

---

## 2. Achados Classificados pelo OWASP Top 10

### A01 — Broken Access Control

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A01-1 | ✅ **RESOLVIDO** | **Não existia middleware de autenticação no backend.** Corrigido: `requireAuth` (`src/middleware/requireAuth.ts`) valida o `accessToken` Bearer e injeta `req.userId`; `GET /api/auth/me` criada como rota modelo protegida. **Atenção ao implementar `PUT/DELETE /auth/users/:id`** (`frontend/src/service/Auth.ts:55-64` já os chama): exigem `requireAuth` + checagem `req.userId === :id` (ownership), senão será IDOR. | `backend/src/auth/auth.routes.ts` |
| A01-2 | 🟡 Médio | `AdminPanel` e `UserPanel` existem no frontend sem guarda de rota funcional (arquivos vazios), e não há conceito de **papel/role** no modelo `User` do Prisma. Autorização administrativa hoje é impossível de impor. | `frontend/src/pages/AdminPanel/`, `backend/prisma/schema.prisma:9` |

### A02 — Cryptographic Failures

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A02-1 | ✅ **RESOLVIDO** | **Fallback de segredo de sessão hardcoded e fraco** (`"troca-por-um-segredo-forte"`). Corrigido: o app **falha no boot** se `SESSION_SECRET` estiver ausente ou com menos de 32 caracteres. Secret forte (96 hex) gerada no `backend/.env` local, que permanece fora do git. | `backend/src/app/app.ts:19-27` |
| A02-2 | ✅ **RESOLVIDO** | **Segredos de desenvolvimento triviais e reutilizados**: corrigido — `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` agora são **distintos e de alta entropia** (96 hex chars, gerados com `crypto.randomBytes(48)` em 21/08/2026) no `backend/.env` local. O legado `JWT_SECRET` (não usado pelo código) foi removido. Manter o mesmo padrão de geração nos ambientes de produção. | `backend/.env` |
| A02-3 | 🟡 **Risco aceito** | **Dados pessoais no `backend/.env`**: nome e telefone do desenvolvedor. O usuário optou por **manter** — o `.env` é local e não versionado (confirmado via `git ls-files`), então a exposição é limitada à máquina dele. Criado `backend/.env.example` com placeholders (sem dados pessoais) para setup seguro. **Regra que se mantém:** nunca commitar o `.env` e rotacionar qualquer segredo real que um dia vaze. | `backend/.env`, `backend/.env.example` |
| A02-4 | 🟢 Baixo | Pontos positivos: Argon2id para senhas, SHA-256 para tokens em repouso, `crypto.randomBytes(48)` para tokens de reset. Sem SQL/raw queries — Prisma parametrizado (sem Injection, A03). | `backend/src/auth/auth.service.ts` |

### A04 — Insecure Design

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A04-1 | ✅ **RESOLVIDO** | **O captcha matemático era segurança ilusória** — SVG base64 com a expressão **em claro** no elemento `<text>`. Corrigido mantendo o captcha próprio (decisão do usuário): agora renderiza **PNG rasterizado via node-canvas** — rotação ±23° por caractere, fontes/tamanhos/posições aleatórios, 3 curvas bezier + 4 linhas cruzando o texto, 120 pontos de ruído, operandos via `crypto.randomInt`. A resposta só existe na sessão do servidor. | `backend/src/app/mathCaptcha.ts` |
| A04-2 | 🟡 Médio | **Token de reset de senha trafega como query string** (`/reset-password?token=...`). Query strings ficam em histórico do navegador, logs de proxy/CDN e cabeçalho `Referer`. Preferir envio do token no fragmento (`#`) ou em página que o extrai e posta imediatamente. | `backend/src/auth/auth.service.ts:116-119` |
| A04-3 | 🟡 Médio | **Enumeração de usuários no registro**: resposta "Email já cadastrado" revela existência de conta. Conforme ASVS 2.2.1/2.3, o fluxo deveria retornar resposta uniforme e depender de verificação de e-mail (a conta só é ativada por link). | `backend/src/auth/auth.service.ts:166-168` |
| A04-4 | ✅ **RESOLVIDO** | **Timing attack no login**: corrigido — `argon2.verify` executa sempre, contra o hash real ou um hash Argon2id dummy pré-computado. Tempo de resposta não revela mais se o e-mail existe. | `backend/src/auth/auth.service.ts:245-254` |
| A04-5 | ✅ **RESOLVIDO** | **Detecção de reuso de refresh token implementada**: token válido mas já revogado no banco → `revokeRefreshTokensByUserId(userId)` revoga toda a família + `logger.warn` de segurança. | `backend/src/auth/auth.service.ts:299-321` |

### A05 — Security Misconfiguration

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A05-1 | 🟡 Médio | **Sessão com MemoryStore** (default do `express-session`). O próprio comentário admite: é vazamento de memória em produção e perde captchas em restart/replica. Usar Redis/connect-pg-simple em produção. | `backend/src/app/app.ts:19-31` |
| A05-2 | 🟡 Médio | **`trust proxy` não configurado.** Os rate limiters usam `req.ip`; se a API rodar atrás de proxy reverso (Nginx, Cloudflare, Railway etc.) sem `app.set('trust proxy', 1)`, todos os clientes compartilham o IP do proxy — o rate limit de 5 logins/15min vira **negação de serviço global**. Configurar explicitamente conforme o deploy. | `backend/src/app/app.ts`, `backend/src/middleware/rate.limite.ts` |
| A05-3 | ✅ **RESOLVIDO** | **Cookie de refresh token com `path: "/"`**: corrigido para `path: "/api/auth"` nos três pontos (login, refresh, logout/clearCookie). O cookie não trafega mais em rotas fora de autenticação. | `backend/src/auth/auth.controller.ts` |
| A05-4 | 🟡 Médio | **CORS com fallback para localhost em produção**: se `FRONTEND_URL` não estiver definida no deploy, a API aceitará `http://localhost:5173` — cenário convidativo a esquecimento de configuração. Falhar no boot se ausente em `NODE_ENV=production`. | `backend/src/app/app.ts:40` |
| A05-5 | 🟢 Baixo | Pacotes instalados e **não utilizados**: `hpp`, `csrf-csrf`, `pino`, `canvas`, `uuid`, `@types/hpp`. Superfície de dependência desnecessária; `hpp` e `csrf-csrf` sugerem proteções planejadas e não aplicadas. | `backend/package.json` |
| A05-6 | 🟢 Baixo | Nome de cookie de sessão default (`connect.sid`) facilita fingerprint da stack; Helmet sem CSP customizada (ok para API, mas o frontend Vite buildado não define CSP em `index.html`). | `backend/src/app/app.ts`, `frontend/index.html` |

### A07 — Identification & Authentication Failures

Além de A04-3 e A04-4 acima::

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A07-1 | 🟡 Médio | **Política de senha restritiva e desalinhada do NIST 800-63B**: máximo de 50 caracteres e composição forçada (maiúscula/minúscula/número/especial). O NIST recomenda mínimo 8, máximo ≥64, **sem** regras de composição, e sim checagem contra listas de senhas comprometidas (ex.: HaveIBeenPwned k-anonymity). Regras atuais incentivam senhas previsíveis (`Senha1!`). | `backend/src/auth/authSchema.ts:20-27` |
| A07-2 | 🟢 Baixo | **Schema de login exige complexidade de senha** — se algum dia existir conta legada com senha fora da regra, o usuário nunca conseguirá logar (a rejeição ocorre na validação, antes do bcrypt/argon). Login deve validar apenas presença/formato. | `backend/src/auth/authSchema.ts:45-52` |
| A07-3 | 🟢 Baixo | Sessão **não é regenerada** após login (session fixation). Impacto baixo aqui porque a sessão só guarda o captcha, mas se passar a guardar estado autenticado, regenerar o ID é obrigatório. | `backend/src/auth/auth.controller.ts:4-32` |
| A07-4 | 🟢 Observação | Rate limiting usa MemoryStore do `express-rate-limit` — não sobrevive a restart nem escala entre réplicas. Aceitável em dev; Redis store em produção. | `backend/src/middleware/rate.limite.ts` |

### A08 — Software & Data Integrity

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A08-1 | 🟡 Médio | **Sem verificação de dependências no ciclo de desenvolvimento**: não há evidência de `npm audit`/CI. Rodar `npm audit` em backend e frontend e integrar ao pipeline. Versões atuais são modernas (Express 5, Zod 4, Argon2 0.45), mas isso precisa ser contínuo. | — |

### A09 — Security Logging & Monitoring

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A09-1 | 🟡 Médio | **Eventos de autenticação não são auditados**: o logger registra requisições HTTP genéricas, mas não há log estruturado de login bem-sucedido/falho, refresh, reset de senha, bloqueio por rate limit — essenciais para detecção de credential stuffing e forense (ASVS V7). Nunca logar senhas/tokens/jwt (atualmente OK). | `backend/src/middleware/logger.ts`, `backend/src/auth/auth.service.ts` |
| A09-2 | 🟢 Baixo | Logs apenas em Console; o transporte de arquivo está comentado. Persistir logs com rotação e enviar a um destino central em produção. | `backend/src/middleware/logger.ts:13-14` |

### Divergências funcionais com impacto em segurança

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| F-1 | ✅ **RESOLVIDO** | **Frontend e backend divergiam no reset de senha** (`newPassword` vs `password`). Corrigido: frontend envia `{ token, password }`, conforme `authSchema.ts`. | `frontend/src/service/Auth.ts:48-52` |
| F-2 | ✅ **RESOLVIDO** | **Erros de negócio retornavam 500**: corrigido com `AppError` (`src/errors/AppError.ts`) — login inválido → **401**, e-mail duplicado → **409**, token de reset inválido → **400**, refresh inválido → **401**. O handler global converte `AppError` em 4xx sem stack trace; erros desconhecidos seguem 500 + log. | `backend/src/errors/AppError.ts`, `backend/src/app/app.ts` |

### Higiene do repositório

| # | Severidade | Achado |
|---|-----------|--------|
| H-1 | 🟢 Baixo | Arquivo `botnet.md` vazio na raiz do repositório — nome incomum, sem propósito aparente. Remover ou documentar. |
| H-2 | 🟢 Positivo | `.env` **não está versionado** (confirmado: apenas `.gitignore` e `frontend/.gitignore` rastreados). Criar `.env.example` com placeholders para facilitar setup seguro. |

---

## 3. Pontos Fortes (manter)

- ✅ Argon2id para senhas; tokens (refresh/reset) armazenados **somente como hash SHA-256**
- ✅ **Rotação de refresh token com consumo atômico** via `updateMany` condicional — protege contra race condition
- ✅ Reset de senha: token único, expiração 15 min, invalida tokens anteriores, **revoga sessões em transação** ao trocar a senha
- ✅ Resposta genérica em "forgot password" (anti-enumeração no reset)
- ✅ Cookies `httpOnly`, `sameSite: "strict"`, `secure` em produção; `accessToken` não vai para `localStorage` (verificado no frontend)
- ✅ `express.json({ limit: "10kb" })`, Helmet, compressão
- ✅ Rate limiting granular por endpoint (login 5/15min, forgot 3/15min)
- ✅ Validação de entrada com Zod em todas as rotas mutantes
- ✅ Captcha de uso único (resposta removida da sessão após verificação)
- ✅ Sem queries SQL manuais (Prisma parametrizado — sem SQLi identificado)

---

## 4. Plano de Remediação Priorizado

### 🔴 Imediato (antes de qualquer deploy)
1. ~~**Remover o fallback de `SESSION_SECRET'`**~~ — ✅ **feito** (falha no boot se ausente/fraca).
2. ~~**Dados pessoais no `backend/.env` + `.env.example`**~~ — ✅ **fechado**: `.env.example` criado com placeholders; dados pessoais mantidos por decisão do usuário (risco aceito — arquivo local e não versionado).
3. ~~**Captcha quebrável**~~ — ✅ **feito** (PNG rasterizado via node-canvas; decisão do usuário de manter captcha próprio, agora com implementação resistente a leitura direta).
4. ~~**Criar middleware `requireAuth'`**~~ — ✅ **feito** (criado + rota modelo `/api/auth/me`). **Pendente derivado:** ao implementar `PUT/DELETE /auth/users/:id`, aplicar `requireAuth` + ownership (`req.userId === :id`), e adicionar `role` no modelo `User` para o AdminPanel.

### 🟡 Curto prazo (1–2 semanas)
5. Configurar `trust proxy` conforme o deploy; validar rate limit com o IP real.
6. ~~Cookie de refresh com `path: "/api/auth"`~~ — ✅ **feito**.
7. Session store persistente (Redis/PG) em produção.
8. ~~**refresh-token reuse detection**~~ — ✅ **feito** (revoga família + log `warn`).
9. ~~Login com tempo constante~~ — ✅ **feito** (hash dummy Argon2id).
10. Resposta uniforme no registro + verificação de e-mail antes de ativar conta.
11. ~~Divergência `newPassword`/`password` e erros 4xx~~ — ✅ **feito** (`AppError` + fix no frontend).

### 🟢 Contínuo
13. `npm audit` + Dependabot/Renovate no CI; remover pacotes não utilizados.
14. Logs estruturados de eventos de autenticação com destino persistente.
15. Política de senha alinhada ao NIST: min 8, max 64+, sem composição forçada, com blocklist de senhas vazadas.
16. CSP no frontend servido; considerar `hpp` (já instalado) se houver query params complexos.

---

## 5. Veredito

| Área | Estado (original) | Estado (21/08/2026) |
|------|--------|--------|
| Armazenamento de credenciais | ✅ Forte (Argon2id) | ✅ Forte |
| Gestão de tokens (rotação/consumo atômico/hash em repouso) | ✅ Forte | ✅ Forte + **reuse detection** |
| Autorização / controle de acesso | 🔴 **Inexistente** | 🟡 **Infra pronta** (`requireAuth` + `/me`); falta ownership nas rotas `users/:id` e roles |
| Proteção anti-automação (captcha) | 🔴 Ineficaz | 🟡 **Resistente a leitura direta** (PNG com ruído real); captcha caseiro nunca equivale a um serviço dedicado, rate limit segue como segunda linha |
| Gestão de segredos e config | 🔴 Fraca (fallbacks, dados pessoais) | 🟡 Falha-no-boot implementada; faltam secrets fortes no deploy e limpeza do `.env` |
| Hardening HTTP (Helmet/CORS/rate limit) | 🟡 Bom, com ressalvas de deploy | 🟡 Bom + cookie path restrito; `trust proxy` pendente |
| Respostas de erro | 🔴 500 genérico | ✅ **4xx semânticos** via `AppError` |
| Logging/auditoria de segurança | 🟡 Parcial | 🟡 Parcial (ganhou log de reuso de token) |

**Conclusão (atualizada):** os 4 achados altos foram endereçados em 21/08/2026 — controle de acesso possui infraestrutura pronta, captcha endurecido, segredos sem fallback inseguro e erros HTTP semânticos. O projeto se aproxima do **ASVS Nível 2 em autenticação**; para fechar o nível faltam: limpeza do `.env`, resposta uniforme no registro, `trust proxy`/stores persistentes no deploy e auditoria de eventos de auth.
