import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";

const envPath = ".env";
const env = readFileSync(envPath, "utf8");
const projectId = env.match(/VITE_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim();
const firebaseToken = env.match(/^FIREBASE_TOKEN=(.+)/m)?.[1]?.trim();

if (!projectId) {
  console.error("Defina VITE_FIREBASE_PROJECT_ID no .env");
  process.exit(1);
}

writeFileSync(".firebaserc", JSON.stringify({ projects: { default: projectId } }, null, 2) + "\n");

const deployTarget = process.argv[2] === "indexes" ? "firestore:indexes" : "firestore:rules";
console.log(`Publicando ${deployTarget} no projeto: ${projectId}`);

const deployEnv = { ...process.env };
if (firebaseToken) {
  deployEnv.FIREBASE_TOKEN = firebaseToken;
  console.log("Usando FIREBASE_TOKEN do .env");
} else {
  console.log("Dica: rode uma vez `npx firebase login` ou adicione FIREBASE_TOKEN no .env (firebase login:ci)");
}
const result = spawnSync("npx", ["firebase-tools", "deploy", "--only", deployTarget, "--project", projectId], {
  stdio: "inherit",
  shell: true,
  env: deployEnv,
});

if ((result.status ?? 1) !== 0) {
  console.error("\nFalha no deploy. Autentique com: npx firebase login");
  console.error("Depois: npm run deploy:firestore-rules");
}

process.exit(result.status ?? 1);
