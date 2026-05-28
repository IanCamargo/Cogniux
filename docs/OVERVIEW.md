# Overview — Cogniux

## O que é

**Cogniux** é uma SPA (Single Page Application) para professores gerenciarem provas de múltipla escolha e alunos realizarem avaliações online. Usa **Google Gemini** para gerar questões, gabaritos e planos pedagógicos.

Projeto acadêmico. UI em **português (Brasil)**.

## Personas

| Persona | Acesso | O que faz |
|---------|--------|-----------|
| **Professor** | Login OAuth (Google ou Microsoft) via Firebase Auth | CRUD de provas, alunos, tokens, notas, export CSV, plano pedagógico IA |
| **Aluno** | Código de acesso (sem login) | Entra no portal, digita código ou token, faz prova online |

## Fluxos principais

### Professor — criar prova

```
/portal → login OAuth → /dashboard → /exam/create
  → Passo 1: metadados (matéria, qtd questões, online?)
  → (opcional) IA gera questões ou só gabarito
  → Passo 2: conferir gabarito → salvar Firestore
  → redirect /exam/:id
```

### Professor — gerenciar prova

```
/exam/:id
  → Abas: Resumo | Alunos | Notas | Plano de Ação | Acesso Online | Imprimir
  → Impressão: gabaritos com QR Code (qrcode.react)
  → Tokens: 6 chars alfanuméricos em access_tokens/{token}
```

### Aluno — prova online

```
/portal → código → /online/:examId?token=XXXXXX
  → Valida token (se houver) e se prova isOnline
  → Identificação → questões → submit
  → Nota calculada client-side (calculateScore) → Submission no Firestore
  → Token marcado isUsed
```

## Rotas

| Rota | Auth | Componente |
|------|------|------------|
| `/` | — | redirect → `/portal` |
| `/portal` | — | `StudentPortal` |
| `/online/:examId` | — | `OnlineExam` |
| `/dashboard` | professor | `Dashboard` |
| `/exam/create` | professor | `ExamCreator` |
| `/exam/:id/edit` | professor | `ExamCreator` |
| `/exam/:id` | professor | `ExamDetail` |

Rotas protegidas: `ProtectedRoute` → `ProfessorLayout` (Header + outlet).

## Funcionalidades removidas (não reimplementar sem pedido)

- **Scanner / Correção via IA (OMR):** foto de gabarito via webcam — removido
- **firebase-applet-config.json:** config Firebase agora só via `.env`

## Funcionalidades IA ativas

| Feature | Onde | Função |
|---------|------|--------|
| Gerar prova completa | ExamCreator | `generateExamQuestions` |
| Gerar só gabarito | ExamCreator | `generateAnswerKey` |
| Plano pedagógico | ExamDetail | `generatePedagogicalPlan` |
| Correção dissertativa | — | `gradeAnswer` existe no serviço, **não exposta na UI** |

Detalhes dos prompts: [PROMPTS.md](./PROMPTS.md).

## Modelo de dados (Firestore)

Schema de referência: `firebase-blueprint.json` na raiz do repo.

```
/exams/{examId}                    → Exam
/exams/{examId}/students/{id}      → Student
/exams/{examId}/submissions/{id}   → Submission
/exams/{examId}/plans/{id}         → PedagogicalPlan
/access_tokens/{token}             → AccessToken (doc ID = token string)
```

Tipos TypeScript: `src/types/index.ts`.

## Notas de negócio

- Nota: `(acertos / total) * 10` — ver `src/lib/grading.ts`
- Código de acesso: normalizado com `normalizeAccessCode` (trim + uppercase)
- Prova online exige `exam.isOnline === true`
- Delete de prova em cascata manual no cliente (submissions, students, plans, tokens)
