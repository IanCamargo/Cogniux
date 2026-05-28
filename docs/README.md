# Documentação Cogniux

Índice para humanos e **agentes de IA** que precisam entender ou modificar o projeto.

| Documento | Conteúdo |
|-----------|----------|
| [OVERVIEW.md](./OVERVIEW.md) | O que é o sistema, personas, fluxos principais |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, pastas, camadas, Firestore, TanStack Query |
| [AGENTS.md](./AGENTS.md) | Guia de convenções e armadilhas para agentes de IA |
| [PROMPTS.md](./PROMPTS.md) | Prompts Gemini usados no código |
| [RELATORIO.md](./RELATORIO.md) | Relatório acadêmico do projeto |

## Leitura recomendada (agentes)

1. **OVERVIEW.md** — contexto de negócio em 5 minutos  
2. **ARCHITECTURE.md** — onde cada coisa vive no código  
3. **AGENTS.md** — regras antes de editar  

## Comandos úteis

```bash
npm run dev          # http://localhost:3000
npm run lint         # ESLint + tsc
npm run test:run     # Vitest (20 testes em src/lib e src/services)
npm run build        # build produção
```

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias: `GEMINI_API_KEY` + todas `VITE_FIREBASE_*`.
