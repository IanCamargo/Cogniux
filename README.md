# Cogniux

Plataforma web de gestão de provas com inteligência artificial (Google Gemini), desenvolvida como projeto acadêmico.

## Funcionalidades

- **Professor:** criar/editar provas, gerar questões e gabaritos via IA, plano pedagógico automático, tokens de acesso online, exportação CSV de notas
- **Aluno:** portal com código de acesso, prova online com navegação por questões

## Stack

- React 19 + TypeScript + Vite
- Firebase (Auth + Firestore)
- Google Gemini (`@google/genai`)
- shadcn/ui + Tailwind CSS v4
- Vitest (testes unitários)
- React Router

## Setup

1. Clone o repositório e instale dependências:

```bash
npm install
```

2. Copie `.env.example` para `.env.local` e configure:

```env
GEMINI_API_KEY=sua_chave_aqui

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_FIRESTORE_DATABASE_ID=
```

3. Execute em desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint + TypeScript |
| `npm run format` | Prettier |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Testes unitários (CI) |
| `npm run test:coverage` | Cobertura em `src/lib` e `src/services` |

## Rotas

| Rota | Descrição |
|------|-----------|
| `/portal` | Portal do aluno / login professor |
| `/dashboard` | Painel do professor |
| `/exam/create` | Criar prova |
| `/exam/:id` | Detalhe da prova |
| `/exam/:id/edit` | Editar prova |
| `/online/:examId?token=` | Prova online |

## Estrutura

```
src/
├── components/     # UI e páginas
├── components/ui/    # shadcn/ui
├── hooks/            # useAuth, useExams, useTheme
├── lib/              # Funções puras (grading, export, retry...)
├── routes/           # React Router
├── services/         # Integração Gemini
└── types/            # Tipos TypeScript
```

## Testes

Testes unitários cobrem lógica de negócio em `src/lib/` e serviços mockados em `src/services/`:

```bash
npm run test:run
```

## Limitações conhecidas

- **API Key Gemini no client-side:** a chave é injetada no bundle via Vite. Adequado para demo acadêmica; em produção use Cloud Functions como proxy.
- **Firestore rules permissivas:** revisar [`firestore.rules`](firestore.rules) antes de deploy público.

## Documentação

| Doc | Descrição |
|-----|-----------|
| [`docs/README.md`](docs/README.md) | Índice da documentação |
| [`docs/OVERVIEW.md`](docs/OVERVIEW.md) | Overview do sistema e fluxos |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, pastas, padrões técnicos |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Guia para agentes de IA |
| [`docs/PROMPTS.md`](docs/PROMPTS.md) | Prompts Gemini |
| [`docs/RELATORIO.md`](docs/RELATORIO.md) | Relatório acadêmico |

## Roadmap futuro

- Firebase Cloud Functions para proxy Gemini
- GitHub Actions CI
- Testes E2E (Playwright)
