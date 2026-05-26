import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const key = env.match(/VITE_FIREBASE_API_KEY=(.+)/)?.[1]?.trim();
const proj = env.match(/VITE_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim() ?? "projeto-c1883";
const url = `https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/exams?pageSize=1&key=${key}`;

try {
  const res = await fetch(url);
  const text = await res.text();
  console.log("STATUS", res.status);
  console.log("BODY", text.slice(0, 600));
} catch (e) {
  console.log("ERR", e.message);
}
