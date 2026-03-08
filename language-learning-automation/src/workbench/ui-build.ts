import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workbenchDir = path.dirname(fileURLToPath(import.meta.url));
const workbenchUiSourceDir = path.join(workbenchDir, 'ui');
const workbenchUiBuildDir = path.join(process.cwd(), 'node_modules', '.cache', 'workbench-ui');
const workbenchUiBuildFiles = ['app.js', 'app.css'] as const;
const uiSourceExtensions = new Set(['.tsx', '.ts', '.css', '.html']);

let buildPromise: Promise<void> | null = null;

export function getWorkbenchUiSourceDir(): string {
  return workbenchUiSourceDir;
}

export function getWorkbenchUiBuildDir(): string {
  return workbenchUiBuildDir;
}

export async function ensureWorkbenchUiBuilt(): Promise<void> {
  if (!(await shouldRebuildWorkbenchUi())) {
    return;
  }

  if (!buildPromise) {
    buildPromise = buildWorkbenchUi().finally(() => {
      buildPromise = null;
    });
  }

  await buildPromise;
}

export async function buildWorkbenchUi(): Promise<void> {
  const { build } = await import('esbuild');
  await fs.mkdir(workbenchUiBuildDir, { recursive: true });

  await build({
    entryPoints: [path.join(workbenchUiSourceDir, 'main.tsx')],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    outfile: path.join(workbenchUiBuildDir, 'app.js'),
    platform: 'browser',
    target: 'es2022',
    sourcemap: false,
    legalComments: 'none',
    loader: {
      '.css': 'css',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
  });
}

async function shouldRebuildWorkbenchUi(): Promise<boolean> {
  const sourceFiles = await listWorkbenchUiSourceFiles(workbenchUiSourceDir);
  const sourceStats = await Promise.all(sourceFiles.map(async (file) => fs.stat(file)));
  const latestSourceMtimeMs = sourceStats.reduce(
    (latest, stat) => Math.max(latest, stat.mtimeMs),
    0
  );

  const builtStats = await Promise.all(
    workbenchUiBuildFiles.map(async (file) => {
      try {
        return await fs.stat(path.join(workbenchUiBuildDir, file));
      } catch {
        return null;
      }
    })
  );

  if (builtStats.some((stat) => stat === null)) {
    return true;
  }

  const latestBuiltMtimeMs = builtStats.reduce(
    (latest, stat) => Math.min(latest, stat?.mtimeMs ?? latest),
    Number.POSITIVE_INFINITY
  );

  return latestSourceMtimeMs > latestBuiltMtimeMs;
}

async function listWorkbenchUiSourceFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listWorkbenchUiSourceFiles(fullPath)));
      continue;
    }

    if (uiSourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildWorkbenchUi().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
