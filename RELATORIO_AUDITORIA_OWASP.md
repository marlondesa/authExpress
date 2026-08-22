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

## 2. Achados Classificados pelo OWASP Top 10

### A01 — Broken Access Control

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A01-1 | 🔴 **Alto** | **Não existe middleware de autenticação no backend.** Nenhuma rota valida o `accessToken`. O frontend já chama `PUT/DELETE /auth/users/:id` (`frontend/src/service/Auth.ts:55-64`), que ainda não existem — quando forem criadas **sem verificação de identidade e ownership**, será IDOR direto (qualquer usuário altera/apaga qualquer conta). | `backend/src/auth/auth.routes.ts` |
| A01-2 | 🟡 Médio | `AdminPanel` e `UserPanel` existem no frontend sem guarda de rota funcional (arquivos vazios), e não há conceito de **papel/role** no modelo `User` do Prisma. Autorização administrativa hoje é impossível de impor. | `frontend/src/pages/AdminPanel/`, `backend/prisma/schema.prisma:9` |

### A02 — Cryptographic Failures

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A02-1 | 🔴 **Alto** | **Fallback de segredo de sessão hardcoded e fraco** (`"troca-por-um-segredo-forte"`). Se `SESSION_SECRET` não estiver definida, o app sobe com segredo público conhecido, permitindo forjar cookies assinados. Deve falhar no boot, como já é feito com `getRequiredEnv` nos JWT. | `backend/src/app/app.ts:21` |
| A02-2 | 🟡 Médio | **Segredos de desenvolvimento triviais e reutilizados**: `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` idênticos (`dev-access-secret`) no `.env` local. Segredos de acesso/refresh devem ser distintos e de alta entropia (≥32 bytes aleatórios) em todos os ambientes. | `backend/.env`, `.env` (raiz) |
| A02-3 | 🔴 **Alto (higiene)** | **Dados pessoais no `backend/.env`**: `RESEND_API_KEY= "Marlon de Sá"` e comentário com **número de telefone celular**. Embora o `.env` esteja fora do git (verificado via `git ls-files`), dados pessoais não devem residir em arquivos de configuração. Remover e criar `.env.example` com placeholders. | `backend/.env` |
| A02-4 | 🟢 Baixo | Pontos positivos: Argon2id para senhas, SHA-256 para tokens em repouso, `crypto.randomBytes(48)` para tokens de reset. Sem SQL/raw queries — Prisma parametrizado (sem Injection, A03). | `backend/src/auth/auth.service.ts` |

### A04 — Insecure Design

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A04-1 | 🔴 **Alto** | **O captcha matemático é segurança ilusória.** A "imagem" é um SVG em base64 que contém o texto da operação **em claro** no elemento `<text>` (ex.: `3 + 5 = ?`). Qualquer bot decodifica o base64 e lê a expressão — nem OCR é necessário. Além disso, o espaço de respostas é minúsculo (0–81). Recomenda-se hCaptcha/Turnstile/reCAPTCHA, ou no mínimo renderização raster com ruído real. | `backend/src/app/mathCaptcha.ts:81-91` |
| A04-2 | 🟡 Médio | **Token de reset de senha trafega como query string** (`/reset-password?token=...`). Query strings ficam em histórico do navegador, logs de proxy/CDN e cabeçalho `Referer`. Preferir envio do token no fragmento (`#`) ou em página que o extrai e posta imediatamente. | `backend/src/auth/auth.service.ts:116-119` |
| A04-3 | 🟡 Médio | **Enumeração de usuários no registro**: resposta "Email já cadastrado" revela existência de conta. Conforme ASVS 2.2.1/2.3, o fluxo deveria retornar resposta uniforme e depender de verificação de e-mail (a conta só é ativada por link). | `backend/src/auth/auth.service.ts:166-168` |
| A04-4 | 🟡 Médio | **Timing attack no login**: quando o e-mail não existe, o fluxo retorna antes do `argon2.verify`, criando diferença de tempo mensurável que revela contas válidas. Verificar sempre contra um hash dummy quando o usuário não existir. | `backend/src/auth/auth.service.ts:209-213` |
| A04-5 | 🟡 Médio | **Sem detecção de reuso de refresh token**: a rotação existe e o consumo é atômico (excelente), mas se um token já consumido for reapresentado, nada acontece. OWASP recomenda revogar **toda a família de tokens do usuário** nesse cenário (indicador forte de roubo). | `backend/src/repositories/auth.ts:129` |

### A05 — Security Misconfiguration

| # | Severidade | Achado | Local |
|---|-----------|--------|-------|
| A05-1 | 🟡 Médio | **Sessão com MemoryStore** (default do `express-session`). O próprio comentário admite: é vazamento de memória em produção e perde captchas em restart/replica. Usar Redis/connect-pg-simple em produção. | `backend/src/app/app.ts:19-31` |
| A05-2 | 🟡 Médio | **`trust proxy` não configurado.** Os rate limiters usam `req.ip`; se a API rodar atrás de proxy reverso (Nginx, Cloudflare, Railway etc.) sem `app.set('trust proxy', 1)`, todos os clientes compartilham o IP do proxy — o rate limit de 5 logins/15min vira **negação de serviço global**. Configurar explicitamente conforme o deploy. | `backend/src/app/app.ts`, `backend/src/middleware/rate.limite.ts` |
| A05-3 | 🟡 Médio | **Cookie de refresh token com `path: "/"`**: é enviado em toda requisição ao domínio, ampliando a superfície de exposição. Restringir a `path: "/api/auth/refresh-token"` (e ao logout, se necessário). | `backend/src/auth/auth.controller.ts:22` |
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
| F-1 | 🟡 Médio | **Frontend e backend divergem no reset de senha**: o frontend envia `{ token, newPassword }` e o backend espera `password` → reset sempre falha, e o erro cai no handler genérico como **500** em vez de 4xx. | `frontend/src/service/Auth.ts:50` vs `backend/src/auth/authSchema.ts:58` |
| F-2 | 🟢 Baixo | **Erros de negócio retornam 500**: o service lança `Error("Email ou senha inválidos.")` e o controller repassa a `next(error)`, que cai no handler final → "Erro interno do servidor" com status 500. Credenciais inválidas devem ser **401**, registro duplicado **409/400**, token inválido **400**. Hoje o cliente não consegue distinguir falha de auth de crash — e um mapa de erros adequado também evita vazamento de detalhes. | `backend/src/auth/auth.controller.ts`, `backend/src/app/app.ts:87-100` |

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
1. **Remover o fallback de `SESSION_SECRET`** — falhar no boot se ausente (`app.ts:21`).
2. **Remover dados pessoais do `backend/.env`** (nome, telefone); criar `.env.example`.
3. **Substituir o captcha caseiro** por serviço real (Cloudflare Turnstile é gratuito) — o atual é quebrável com 2 linhas de código.
4. **Criar middleware `requireAuth`** (valida `Authorization: Bearer <accessToken>`, injeta `req.userId`) e aplicá-lo a **toda** rota autenticada antes de implementar `PUT/DELETE /auth/users/:id` — com checagem de `req.userId === :id` (ownership).

### 🟡 Curto prazo (1–2 semanas)
5. Configurar `trust proxy` conforme o deploy; validar rate limit com o IP real.
6. Cookie de refresh com `path: "/api/auth"`.
7. Session store persistente (Redis/PG) em produção.
8. Implementar **refresh-token reuse detection**: se token já consumido for reapresentado → `revokeRefreshTokensByUserId(userId)`.
9. Login com tempo constante (hash dummy quando usuário inexistente).
10. Resposta uniforme no registro + verificação de e-mail antes de ativar conta.
11. Corrigir divergência `newPassword`/`password` e mapear erros de negócio para status 4xx corretos.
12. Adicionar `role` ao modelo `User` se o `AdminPanel` for para produção.

### 🟢 Contínuo
13. `npm audit` + Dependabot/Renovate no CI; remover pacotes não utilizados.
14. Logs estruturados de eventos de autenticação com destino persistente.
15. Política de senha alinhada ao NIST: min 8, max 64+, sem composição forçada, com blocklist de senhas vazadas.
16. CSP no frontend servido; considerar `hpp` (já instalado) se houver query params complexos.

---

## 5. Veredito

| Área | Estado |
|------|--------|
| Armazenamento de credenciais | ✅ Forte (Argon2id) |
| Gestão de tokens (rotação/consumo atômico/hash em repouso) | ✅ Forte |
| Autorização / controle de acesso | 🔴 **Inexistente** |
| Proteção anti-automação (captcha) | 🔴 Ineficaz |
| Gestão de segredos e config | 🔴 Fraca (fallbacks, dados pessoais) |
| Hardening HTTP (Helmet/CORS/rate limit) | 🟡 Bom, com ressalvas de deploy |
| Logging/auditoria de segurança | 🟡 Parcial |

**Conclusão:** engenharia de autenticação acima da média para um projeto em construção, mas **não apto para produção** até corrigir os 4 achados altos — em especial a ausência de controle de acesso no backend e os segredos/configuração.
