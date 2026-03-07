let cachedQuotaProject: string | null = null;

async function runGcloudCommand(args: string[]): Promise<string> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync('gcloud', args);
    return stdout.trim();
  } catch {
    const command = ['gcloud', ...args].join(' ');
    throw new Error(
      `Failed to run "${command}". Make sure gcloud is installed and authenticated.`
    );
  }
}

export async function getGoogleAccessToken(): Promise<string> {
  const account = process.env.GOOGLE_CLOUD_ACCOUNT?.trim();
  const args = ['auth', 'print-access-token'];

  if (account) {
    args.push(account);
  }

  try {
    return await runGcloudCommand(args);
  } catch {
    const suffix = account ? ` for account ${account}` : '';
    throw new Error(
      `Failed to get gcloud access token${suffix}. Make sure you are logged in with: gcloud auth login`
    );
  }
}

export async function getGoogleQuotaProject(): Promise<string> {
  if (cachedQuotaProject) {
    return cachedQuotaProject;
  }

  const envProject = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (envProject) {
    cachedQuotaProject = envProject;
    return envProject;
  }

  const activeProject = await runGcloudCommand(['config', 'get-value', 'project']);
  if (!activeProject || activeProject === '(unset)') {
    throw new Error(
      'Google Cloud project is not configured. Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project <project-id>'
    );
  }

  cachedQuotaProject = activeProject;
  return activeProject;
}
