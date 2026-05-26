# Firebase / Firestore — setup obrigatório

Se ao salvar aparecer erro de Firestore inacessível, o projeto **não tem a API do Firestore ativa** ou **não tem banco criado**.

## 1. Ativar Cloud Firestore API (Google Cloud)

Substitua `SEU_PROJECT_ID` pelo valor de `VITE_FIREBASE_PROJECT_ID` (ex.: `projeto-c1883`):

https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=SEU_PROJECT_ID

Clique em **Ativar** / **Enable**.

## 2. Criar banco Firestore (Firebase Console)

https://console.firebase.google.com/project/SEU_PROJECT_ID/firestore

- **Criar banco** → modo **Native** (não Datastore)
- Região: escolha a mais próxima (ex. `southamerica-east1`)
- Database ID: `(default)` — use o mesmo valor em `VITE_FIREBASE_FIRESTORE_DATABASE_ID`

## 3. Publicar regras de segurança (comando)

**Uma vez**, autentique no Firebase (abre o navegador):

```bash
npx firebase login
```

**Publicar** as regras do repositório (lê `VITE_FIREBASE_PROJECT_ID` do `.env`):

```bash
npm run deploy:firestore-rules
```

Arquivo publicado: [`firestore.rules`](../firestore.rules).

**Alternativa sem navegador** (CI / token no `.env`):

```bash
npx firebase login:ci
# Cole o token em .env: FIREBASE_TOKEN=...
npm run deploy:firestore-rules
```

## 4. Índices compostos (dashboard após F5)

A listagem de provas usa `professorId` + `createdAt`. Publique os índices:

```bash
npm run deploy:firestore-indexes
```

Ou crie manualmente no Console quando o erro indicar o link. Arquivo: [`firestore.indexes.json`](../firestore.indexes.json).

## 5. Verificar localmente

```bash
npm run check:firestore
```

Deve retornar `STATUS 200` (lista vazia é normal).

## 6. `.env`

Copie de [`.env.example`](../.env.example). Todas as `VITE_FIREBASE_*` devem ser do **mesmo app Web** no Console Firebase.

`VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)` para o banco padrão.

Após ativar a API, aguarde **2–5 minutos** antes de testar de novo no app.
