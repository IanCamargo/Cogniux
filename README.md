# Cogniux

Plataforma web para professores criarem e gerenciarem provas com correção automática, portal online para alunos responderem e análise de desempenho por IA.

---

## Stack

- **React 19** + TypeScript + Vite
- **Firebase** — Auth (Google) e Firestore
- **Google Gemini** — geração de questões, gabaritos e planos pedagógicos
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** — cache e sincronização de dados
- **react-to-print** — impressão de gabaritos e folhas de resposta
- **recharts** — gráficos do dashboard

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- Projeto no [Firebase Console](https://console.firebase.google.com) com **Authentication** (provedor Google) e **Firestore** habilitados
- Chave de API do [Google AI Studio](https://aistudio.google.com)

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/cogniux.git
cd cogniux
npm install
```

### 2. Variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Firebase — encontre em: Firebase Console > Configurações do projeto > Seus apps
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=         # opcional
VITE_FIREBASE_FIRESTORE_DATABASE_ID=  # use (default) se não criou um banco nomeado

# Gemini — encontre em: aistudio.google.com > Get API Key
GEMINI_API_KEY=
```

> `VITE_` prefixed vars são expostas ao browser. `GEMINI_API_KEY` é lida tanto pelo Vite quanto pelo Node (scripts de seed).

Se qualquer variável obrigatória estiver ausente, a aplicação lança erro na inicialização informando o nome da variável faltante.

### 3. Regras do Firestore

Aplique as regras de segurança no seu projeto via Firebase CLI:

```bash
npx firebase login
npx firebase use --add   # selecione seu projeto
npm run deploy:firestore-rules
```

Ou copie manualmente o conteúdo de `firestore.rules` no console do Firebase em **Firestore > Regras**.

### 4. Inicie o servidor

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Estrutura de dados (Firestore)

```
exams/{examId}
  subject, course, className, unit, semester
  numQuestions, alternativesPerQuestion
  answerKey: string[]
  questions?: { text, options[], correctAnswer }[]
  isOnline: boolean
  professorId: string
  createdAt, updatedAt

  /submissions/{subId}
    studentName, answers[], score, gradedAt, isOnline, accessToken

  /students/{studentId}
    name, registrationId, createdAt

  /plans/{planId}
    analysis, recommendations[], createdAt

access_tokens/{token}
  examId, studentName, isUsed, createdAt, usedAt
```

---

## Fluxo do professor

1. Acessa `/portal` e clica em **Entrar com Google**.
2. É redirecionado ao **Dashboard** com gráficos de distribuição de notas, aprovados/reprovados, participação geral, média por curso e evolução mensal.
3. **Nova Prova** — preenche matéria, curso, turma, unidade, semestre, quantidade de questões e tipo (online/presencial). Pode:
   - Inserir o gabarito manualmente letra por letra
   - Usar IA para gerar as questões e o gabarito a partir de um tema (aceita upload de PDF ou imagem como contexto)
4. Na página de detalhes da prova há quatro abas:
   - **Resumo** — informações gerais, QR code e link de acesso direto, botões de impressão (folha em branco ou gabarito por aluno), gabarito oficial com toggle de visibilidade
   - **Alunos** — cadastro manual da lista de alunos; geração de tokens de acesso individuais (um por aluno)
   - **Respostas** — tabela de submissions com nota por aluno, filtro por tipo de entrega, exportação CSV, impressão individual
   - **Plano Pedagógico** — análise da turma gerada pela IA com base nas notas, com recomendações práticas para o professor
5. **Perfil** (`/profile`) — edição do nome de exibição da conta Google.

---

## Fluxo do aluno

1. Acessa `/portal` sem precisar de login.
2. Insere o código de acesso fornecido pelo professor. Pode ser:
   - O **ID da prova** diretamente — qualquer pessoa com o ID pode responder
   - Um **token individual** gerado pelo professor para um aluno específico — uso único, marcado como usado ao finalizar
3. Informa o nome completo e inicia a prova.
4. Responde as questões uma por uma. Navegação por botões ou teclado (`←` `→`). Barra de progresso mostra o andamento.
5. Ao clicar em **Finalizar**, as respostas são salvas no Firestore e a nota calculada automaticamente.
6. Tela de confirmação e retorno ao portal.

---

## IA (Google Gemini)

Todas as chamadas usam `gemini-2.0-flash` com schema JSON estruturado e retry automático (3 tentativas, backoff de 1 s, timeout de 30 s).

| Função | Onde é usada | Entrada | Saída |
|---|---|---|---|
| Gerar questões | ExamCreator | matéria, tópico, qtd, dificuldade, arquivos opcionais | `{ text, options[], correctAnswer }[]` |
| Gerar gabarito | ExamCreator | matéria, tópico, qtd, arquivos opcionais | `string[]` |
| Plano pedagógico | ExamDetail > aba Plano | matéria + estatísticas da turma | `{ analysis, recommendations[] }` |
| Corrigir resposta | ExamDetail | questão, resposta do aluno, rubrica | `{ score, analysis, feedback, corrections }` |

---

## Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/portal` | público | Portal do aluno e login do professor |
| `/online/:examId` | público | Prova online |
| `/dashboard` | professor | Painel com visão geral |
| `/exam/create` | professor | Criação de prova |
| `/exam/:id/edit` | professor | Edição de prova |
| `/exam/:id/:tab` | professor | Detalhes da prova (resumo, alunos, respostas, plano) |
| `/profile` | professor | Edição de perfil |
| `/seed` | professor | Popular banco com dados de exemplo |

---

## Scripts

```bash
npm run dev            # servidor de desenvolvimento (porta 3000)
npm run build          # type-check + build de produção
npm run test           # testes unitários em modo watch
npm run test:run       # testes unitários (CI)
npm run test:coverage  # cobertura de código
npm run lint           # eslint + tsc
npm run format         # prettier
npm run check:firestore          # verifica conexão com Firestore
npm run deploy:firestore-rules   # publica as regras de segurança
```

---

## Observações

- A chave do Gemini é injetada no bundle via Vite. Para produção pública, mova as chamadas para um backend ou Cloud Function.
- As regras do Firestore estão em `firestore.rules`. Revise antes de qualquer deploy público.
- Para dados de exemplo durante desenvolvimento, acesse `/seed` autenticado como professor — a página limpa e reinserere um conjunto de provas, alunos e notas fictícias.
