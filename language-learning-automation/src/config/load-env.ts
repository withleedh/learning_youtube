import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

let loaded = false;

export function loadEnv(): void {
  if (loaded) {
    return;
  }

  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true });
    }
  }

  loaded = true;
}

loadEnv();
