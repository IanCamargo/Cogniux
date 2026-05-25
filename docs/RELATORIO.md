# Relatório Técnico — Cogniux

## 1. Introdução

O **Cogniux** é uma plataforma web para professores gerenciarem provas e obterem insights pedagógicos via inteligência artificial. O projeto integra correção automatizada de gabaritos, geração de questões, aplicação online e análise de desempenho da turma.

**Objetivos:**
- Automatizar correção de provas objetivas
- Gerar conteúdo pedagógico com IA generativa
- Oferecer portal simples para alunos realizarem provas online

## 2. Fundamentação

- **IA generativa em educação:** Gemini gera questões, gabaritos e planos pedagógicos contextualizados
- **OMR via visão computacional:** foto do gabarito é interpretada pela IA (alternativa a scanners dedicados)
- **Avaliação formativa:** plano de ação com análise e recomendações baseadas nas notas da turma

## 3. Arquitetura

```
┌─────────────────────────────────────────┐
│           Frontend (React SPA)          │
│  Portal │ Dashboard │ Exam │ Scanner    │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌──────────┐      ┌─────────────┐
│ Firebase │      │ Gemini API  │
│ Auth +   │      │ (client)    │
│ Firestore│      └─────────────┘
└──────────┘
```

**Entidades Firestore:** Exam, Student, Submission, PedagogicalPlan, AccessToken (ver `firebase-blueprint.json`)

## 4. Implementação

### Fluxo Professor
1. Login (Google/Microsoft)
2. Criar prova (manual ou IA) → Firestore
3. Cadastrar alunos → gerar tokens → imprimir gabaritos com QR
4. Escanear provas → IA lê respostas → calcula nota → salva Submission
5. Gerar plano pedagógico → IA analisa estatísticas da turma

### Fluxo Aluno
1. Acessar `/portal` → inserir código
2. Realizar prova online → submissão automática

### Integração Gemini
- Modelo: `gemini-3-flash-preview`
- Saída estruturada (JSON schema) para questões, gabaritos e planos
- Retry com backoff (3 tentativas, timeout 30s)

## 5. Qualidade de Software

| Aspecto | Implementação |
|---------|---------------|
| TypeScript | `strict: true` |
| Lint | ESLint + jsx-a11y |
| Testes | Vitest — 21 testes unitários |
| UI | shadcn/ui (tema neutro padrão) |
| Rotas | React Router com rotas protegidas |
| Resiliência | Error Boundary, toast (Sonner), retry IA |

### Cobertura de testes
Funções puras: `calculateScore`, `calculateExamStats`, `submissionsToCsv`, `normalizeAccessCode`, `parseJsonResponse`, `withRetry`

## 6. Limitações

1. Chave API exposta no frontend (Vite `define`)
2. Regras Firestore permissivas para prototipagem
3. Dependência de conexão para IA e Firebase
4. OMR depende de qualidade da foto e iluminação

## 7. Resultados

- Build de produção funcional (`npm run build`)
- 21/21 testes passando (`npm run test:run`)
- Bugs corrigidos: plano pedagógico, export CSV, delete submission, numQuestions no scanner
- Métricas reais no dashboard (média geral, submissões)

## 8. Conclusão

O Cogniux demonstra viabilidade de integrar IA generativa em fluxos pedagógicos reais. Trabalhos futuros incluem proxy seguro para Gemini, CI/CD, testes E2E e regras Firestore restritivas.
