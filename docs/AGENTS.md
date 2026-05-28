# Guia para agentes de IA

Documento para **Cursor / Copilot / outros LLMs** que editam este repositório.

## Antes de codar

1. Ler [OVERVIEW.md](./OVERVIEW.md) e [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Rodar `npm run lint && npm run test:run` após mudanças
3. **Não commitar** a menos que o usuário peça
4. **Não criar** markdown extra além do pedido

## Convenções do projeto

| Tópico | Regra |
|--------|-------|
| Idioma UI | Português (BR) — labels, toasts, erros |
| Idioma código | Inglês — nomes de variáveis, funções, tipos |
| Imports | Alias `@/` (ex: `@/lib/grading`) |
| Componentes UI | Preferir shadcn em `@/components/ui/` |
| Tipos de domínio | `src/types/index.ts` — não duplicar |
| Query keys | `src/lib/queryKeys.ts` |
| Funções puras | `src/lib/` + testes Vitest |
| IA / Gemini | Só `src/services/geminiService.ts` |
| Env | Só `src/lib/env.ts` + `.env.example` |

## O que NÃO fazer

- Editar `src/components/ui/*` gerados pelo shadcn sem motivo
- Reintroduzir Scanner/OMR ou `firebase-applet-config.json`
- Colocar secrets no código — usar env
- `useEffect` nos componentes para fetch — usar hooks TanStack Query existentes
- Over-engineering: helpers de 1 linha, abstrações prematuras
- Comentários JSDoc óbvios que repetem o nome da função
- Dependências novas sem necessidade clara

## Onde implementar cada tipo de mudança

| Tarefa | Onde |
|--------|------|
| Nova rota | `src/routes/AppRouter.tsx` + componente em `components/` |
| Nova query Firestore | Hook em `hooks/` usando `useFirestore*Query` + `queryKeys` |
| Nova função Gemini | `geminiPrompts.ts` (prompt) + `geminiService.ts` (API) + doc em `PROMPTS.md` + testes |
| Cálculo / export / validação | `src/lib/` + `*.test.ts` |
| Auth | `useAuth.ts`, `queryClient.ts` |
| Tema | `useTheme.ts`, `lib/theme.ts` |

## Hooks existentes (reutilizar)

```typescript
useAuth()              // { user, loading, login, logout }
useExams(professorId)  // { exams, loading }
useExamDetail(examId)  // exam, submissions, students, tokens, pedagogicalPlan, loading
useSubmissionScores(examIds) // { scores, ready }
useOnlineExamSession(examId, token?) // { session, loading }
useTheme()             // { isDark, setIsDark, toggle }
```

## Firestore — collections usadas no código

| Path | Operações comuns |
|------|------------------|
| `exams` | list by professorId, create, update, delete |
| `exams/{id}/submissions` | onSnapshot, addDoc (online), deleteDoc |
| `exams/{id}/students` | CRUD |
| `exams/{id}/plans` | addDoc (IA), onSnapshot latest |
| `access_tokens/{token}` | setDoc, getDoc, update isUsed |

Delete cascata de prova: ver `Dashboard.handleDelete` e `ExamDetail.handleDeleteExam`.

## Gemini

- Modelo fixo: `gemini-3-flash-preview`
- Retry: `withRetry` (3 tentativas, 30s timeout)
- Parse JSON: `parseJsonResponse` (suporta markdown fence)
- Erros: `GeminiServiceError`

## Testes

Ao alterar `src/lib/*` ou `geminiService.ts`, atualizar/criar testes em `*.test.ts` adjacente.

Mock padrão Gemini:

```typescript
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  Type: { STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY", OBJECT: "OBJECT" },
}));
```

## Checklist pós-edição

- [ ] `npm run lint` passa
- [ ] `npm run test:run` passa
- [ ] Sem imports mortos
- [ ] Tipos em `src/types` se novo domínio
- [ ] `.env.example` atualizado se nova env var
- [ ] Docs em `docs/` se mudança arquitetural relevante

## Arquivos sensíveis

| Arquivo | Nota |
|---------|------|
| `.env.local` | Nunca commitar |
| `firestore.rules` | Regras de segurança — revisar impacto |
| `vite.config.ts` | `define` para GEMINI_API_KEY |

## Limitações conhecidas (não “consertar” silenciosamente)

- Gemini API key no bundle client-side (aceito para demo acadêmica)
- Mutations Firestore espalhadas nos componentes (padrão atual)
- `gradeAnswer` não usado na UI
- Bundle > 500 kB (sem code-splitting ainda)
