import '../config/load-env';
import { WorkbenchWorker } from './worker';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  const worker = new WorkbenchWorker();
  const pollMs = Number.parseInt(process.env.WORKBENCH_POLL_MS ?? '2000', 10);
  const runOnce = process.argv.includes('--once') || process.env.WORKBENCH_RUN_ONCE === '1';

  if (runOnce) {
    const processed = await worker.runUntilEmpty();
    console.log(`Processed ${processed} workbench job(s).`);
    return;
  }

  let stopping = false;
  const stop = (signal: NodeJS.Signals) => {
    console.log(`\nStopping workbench worker (${signal})...`);
    stopping = true;
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  console.log(`Workbench worker polling every ${pollMs}ms`);

  while (!stopping) {
    const processed = await worker.runUntilEmpty();
    if (processed > 0) {
      console.log(`Processed ${processed} workbench job(s).`);
    }

    if (stopping) {
      break;
    }

    await sleep(pollMs);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
