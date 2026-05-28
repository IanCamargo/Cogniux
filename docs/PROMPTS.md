# Prompts de IA — Cogniux

Documentação dos prompts enviados ao **Google Gemini** (`gemini-3-flash-preview`).

Implementação: [`src/services/geminiPrompts.ts`](../src/services/geminiPrompts.ts) (prompts) · [`src/services/geminiService.ts`](../src/services/geminiService.ts) (chamadas API)

---

## Configuração global

| Parâmetro | Valor |
|-----------|-------|
| Modelo | `gemini-3-flash-preview` |
| Retry | 3 tentativas, backoff 1s, timeout 30s |
| Idioma de saída | Português (Brasil) |

---

## 1. Geração de questões

**Função:** `generateExamQuestions`  
**Uso:** [`ExamCreator.tsx`](../src/components/ExamCreator.tsx) — modo "Prova Completa"  
**Entrada opcional:** arquivos PDF/imagem como contexto (`FileContext[]`)

### System instruction

```
Você é um assistente de professores que gera questões de alta qualidade academica.
```

### Prompt do usuário

```
Gere {numQuestions} questões de múltipla escolha sobre "{topic}" para a disciplina de "{subject}".
{Se houver arquivos: Utilize o conteúdo dos arquivos anexados como base principal para as questões.}
Nível de dificuldade: {difficulty}.
Cada questão deve ter 5 alternativas (A, B, C, D, E).
Retorne as questões em um formato estruturado adequado para uso pedagógico.
```

### Variáveis

| Variável | Descrição | Valores |
|----------|-----------|---------|
| `{numQuestions}` | Qtd. de questões | 1–100 |
| `{topic}` | Tópico/conteúdo | texto livre |
| `{subject}` | Matéria/UC | texto livre |
| `{difficulty}` | Nível | `beginner`, `intermediate`, `advanced` |

### Schema de resposta (JSON)

```json
[
  {
    "text": "Enunciado da questão",
    "options": ["Alt A", "Alt B", "Alt C", "Alt D", "Alt E"],
    "correctAnswer": "A"
  }
]
```

---

## 2. Geração de gabarito

**Função:** `generateAnswerKey`  
**Uso:** [`ExamCreator.tsx`](../src/components/ExamCreator.tsx) — modo "Apenas Gabarito"  
**Entrada opcional:** arquivos PDF/imagem como contexto

### System instruction

```
Você é um assistente que gera gabaritos precisos. Retorne APENAS um array JSON de strings.
```

### Prompt do usuário

```
Gere apenas o GABARITO (lista de respostas corretas) para uma prova de "{subject}" sobre "{topic}".
A prova possui {numQuestions} questões.
{Se houver arquivos: Utilize o conteúdo dos arquivos anexados para determinar as respostas corretas.}
Retorne um array de letras (A, B, C, D ou E) correspondente a cada questão.
```

### Schema de resposta (JSON)

```json
["A", "C", "B", "D", "E", ...]
```

---

## 3. Plano pedagógico

**Função:** `generatePedagogicalPlan`  
**Uso:** [`ExamDetail.tsx`](../src/components/ExamDetail.tsx) — aba "Plano de Ação"

### System instruction

```
Você é um coordenador pedagógico analítico que ajuda professores a melhorarem o desempenho das turmas.
```

### Prompt do usuário

```
Analise o desempenho da turma na prova de "{subject}".

Dados da Turma:
- Média: {average}
- Maior Nota: {maxScore}
- Menor Nota: {minScore}
- Total de Submissões: {submissionCount}

Por favor, identifique as principais dificuldades da turma e sugira um plano de ação pedagógico (estratégias de ensino, tópicos para revisão, atividades complementares).
Foco em Português (Brasil).
```

### Variáveis

| Variável | Descrição |
|----------|-----------|
| `{subject}` | Matéria da prova |
| `{average}` | Média das notas (0–10) |
| `{maxScore}` | Maior nota |
| `{minScore}` | Menor nota |
| `{submissionCount}` | Total de submissões |

### Schema de resposta (JSON)

```json
{
  "analysis": "Análise profunda do desempenho da turma",
  "recommendations": [
    "Ação prática 1",
    "Ação prática 2"
  ]
}
```

---

## 4. Correção dissertativa (reservado)

**Função:** `gradeAnswer`  
**Status:** implementado no serviço, **não utilizado na UI** (uso futuro)

### System instruction

```
Você é um corretor de provas inteligente e pedagógico. Sua saída deve ser SEMPRE em JSON seguindo estritamente o esquema fornecido.
```

### Prompt do usuário

```
Como um professor especialista, corrija a resposta do aluno para a pergunta abaixo.

Pergunta: "{question}"
{Critérios de Avaliação/Resposta Esperada: "{rubric}" — se informado}
Resposta do Aluno: "{studentAnswer}"

Forneça uma análise pedagógica detalhada. A nota deve ser de 0 a 10.
A análise deve ser construtiva e em Português (Brasil).
```

### Schema de resposta (JSON)

```json
{
  "score": 8.5,
  "analysis": "Resumo pedagógico",
  "feedback": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "improvements": ["..."]
  },
  "corrections": [
    {
      "original": "texto original",
      "suggested": "texto sugerido",
      "explanation": "explicação"
    }
  ]
}
```

---

## Mapa função → tela

| Função | Tela | Ação do usuário |
|--------|------|-----------------|
| `generateExamQuestions` | ExamCreator | "Gerar com IA" (prova completa) |
| `generateAnswerKey` | ExamCreator | "Gerar com IA" (só gabarito) |
| `generatePedagogicalPlan` | ExamDetail | "Gerar Análise" |
| `gradeAnswer` | — | Não exposto |
