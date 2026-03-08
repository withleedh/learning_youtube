import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ManagedProcess {
  name: string;
  child: ChildProcess;
}

const workbenchDir = path.dirname(fileURLToPath(import.meta.url));

function spawnWorkbenchProcess(name: string, entryFile: string): ManagedProcess {
  const child = spawn(process.execPath, ['--import', 'tsx', path.join(workbenchDir, entryFile)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  return { name, child };
}

async function main(): Promise<void> {
  const managed = [
    spawnWorkbenchProcess('server', 'run-server.ts'),
    spawnWorkbenchProcess('worker', 'run-worker.ts'),
  ];

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`\nStopping workbench runtime (${signal})...`);

    for (const processRef of managed) {
      if (!processRef.child.killed) {
        processRef.child.kill('SIGTERM');
      }
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await new Promise<void>((resolve, reject) => {
    let exitedChildren = 0;

    for (const processRef of managed) {
      processRef.child.once('error', reject);
      processRef.child.once('exit', (code, signal) => {
        exitedChildren += 1;

        if (!shuttingDown && (code !== 0 || signal !== null)) {
          shutdown('SIGTERM');
          reject(
            new Error(
              `Workbench ${processRef.name} exited unexpectedly (${signal ?? `code ${code ?? 0}`})`
            )
          );
          return;
        }

        if (exitedChildren === managed.length) {
          resolve();
        }
      });
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
