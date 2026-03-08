import '../config/load-env';
import { createWorkbenchServer } from './server';

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.WORKBENCH_PORT ?? '4310', 10);
  const server = await createWorkbenchServer();

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`\nStopping workbench server (${signal})...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  server.listen(port, () => {
    console.log(`Workbench control plane listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
