import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY é obrigatória. Configure em .env.local"),
  VITE_FIREBASE_API_KEY: z.string().min(1, "VITE_FIREBASE_API_KEY é obrigatória"),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1, "VITE_FIREBASE_AUTH_DOMAIN é obrigatória"),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1, "VITE_FIREBASE_PROJECT_ID é obrigatória"),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1, "VITE_FIREBASE_STORAGE_BUCKET é obrigatória"),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "VITE_FIREBASE_MESSAGING_SENDER_ID é obrigatória"),
  VITE_FIREBASE_APP_ID: z.string().min(1, "VITE_FIREBASE_APP_ID é obrigatória"),
  VITE_FIREBASE_FIRESTORE_DATABASE_ID: z.string().min(1, "VITE_FIREBASE_FIRESTORE_DATABASE_ID é obrigatória"),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId: string;
};

function readEnv() {
  return {
    GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
    VITE_FIREBASE_FIRESTORE_DATABASE_ID: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ?? "",
    VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
  };
}

export function validateEnv(): AppEnv {
  return envSchema.parse(readEnv());
}

export function getGeminiApiKey(): string {
  return validateEnv().GEMINI_API_KEY;
}

export function getFirebaseConfig(): FirebaseClientConfig {
  const env = validateEnv();
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
    firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  };
}
