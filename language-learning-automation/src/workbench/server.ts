import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { ZodError, z } from 'zod';
import { WorkbenchService } from './service';
import { episodeStageSchema, reviewStatusSchema, stageGenerationPayloadSchema } from './types';
import {
  ensureWorkbenchUiBuilt,
  getWorkbenchUiBuildDir,
  getWorkbenchUiSourceDir,
} from './ui-build';

const createEpisodeBodySchema = z.object({
  channelId: z.string().min(1),
  title: z.string().min(1).optional(),
});

const createTopicCandidateBatchBodySchema = z.object({
  channelId: z.string().min(1),
  count: z.number().int().positive().max(200),
  category: z.string().min(1).optional(),
});

const createScriptCandidateBatchBodySchema = z.object({
  count: z.number().int().positive().max(50),
  category: z.string().min(1).optional(),
  usePipeline: z.boolean().optional(),
});

const createStageVersionBodySchema = z.object({
  reviewStatus: reviewStatusSchema.optional(),
  sourceVersionIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateStageReviewStatusBodySchema = z.object({
  version: z.number().int().positive(),
  reviewStatus: reviewStatusSchema,
  approvedTopic: z.string().min(1).optional(),
});

const stageActionBodySchema = z.object({
  version: z.number().int().positive(),
  approvedTopic: z.string().min(1).optional(),
});

const createJobBodySchema = z.object({
  version: z.number().int().positive(),
});

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const workbenchUiRoutes = new Map<
  string,
  { file: string; contentType: string; source: 'source' | 'build' }
>([
  ['/workbench', { file: 'index.html', contentType: 'text/html; charset=utf-8', source: 'source' }],
  ['/workbench/', { file: 'index.html', contentType: 'text/html; charset=utf-8', source: 'source' }],
  ['/workbench/app.js', { file: 'app.js', contentType: 'text/javascript; charset=utf-8', source: 'build' }],
  ['/workbench/app.css', { file: 'app.css', contentType: 'text/css; charset=utf-8', source: 'build' }],
  ['/workbench/styles.css', { file: 'app.css', contentType: 'text/css; charset=utf-8', source: 'build' }],
]);
const workbenchUiSourceDir = getWorkbenchUiSourceDir();
const workbenchUiBuildDir = getWorkbenchUiBuildDir();

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  return raw ? (JSON.parse(raw) as unknown) : {};
}

function sendJson(res: http.ServerResponse, statusCode: number, body: JsonValue): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body, null, 2));
}

function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

function sendText(res: http.ServerResponse, statusCode: number, body: string, contentType: string): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

export async function createWorkbenchServer(
  service: WorkbenchService = new WorkbenchService()
): Promise<http.Server> {
  return http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendError(res, 400, 'Invalid request');
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    try {
      const uiRoute = workbenchUiRoutes.get(pathname);
      if (req.method === 'GET' && uiRoute) {
        await ensureWorkbenchUiBuilt();
        const content =
          uiRoute.source === 'source'
            ? await readWorkbenchUiFile(workbenchUiSourceDir, uiRoute.file)
            : await readWorkbenchUiFile(workbenchUiBuildDir, uiRoute.file);
        sendText(res, 200, content, uiRoute.contentType);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/health') {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/channels') {
        const channels = await service.listChannelOptions();
        sendJson(res, 200, { channels } as unknown as JsonValue);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/file') {
        const rawPath = url.searchParams.get('path');
        if (!rawPath) {
          sendError(res, 400, 'Missing path query parameter');
          return;
        }

        const safePath = resolveAllowedFilePath(rawPath, service);
        await streamFile(res, safePath, req.headers.range);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/episodes') {
        const episodes = await service.listEpisodes();
        sendJson(res, 200, { episodes });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/candidates') {
        const candidates = await service.listCandidates();
        sendJson(res, 200, { candidates });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/workbench/episodes') {
        const body = createEpisodeBodySchema.parse(await readJsonBody(req));
        const episode = await service.createEpisode(body);
        sendJson(res, 201, { episode });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/workbench/candidates/topic-batch') {
        const body = createTopicCandidateBatchBodySchema.parse(await readJsonBody(req));
        const result = await service.createTopicCandidateBatch({
          channelId: body.channelId,
          count: body.count,
          category: body.category as Parameters<WorkbenchService['createTopicCandidateBatch']>[0]['category'],
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      const scriptBatchMatch = pathname.match(
        /^\/api\/workbench\/candidates\/([^/]+)\/([^/]+)\/script-batch$/
      );
      if (req.method === 'POST' && scriptBatchMatch) {
        const [, channelId, candidateId] = scriptBatchMatch;
        const body = createScriptCandidateBatchBodySchema.parse(await readJsonBody(req));
        const result = await service.createScriptCandidateBatch({
          channelId,
          sourceCandidateId: candidateId,
          count: body.count,
          category: body.category as Parameters<WorkbenchService['createScriptCandidateBatch']>[0]['category'],
          usePipeline: body.usePipeline,
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      const promoteCandidateMatch = pathname.match(
        /^\/api\/workbench\/candidates\/([^/]+)\/([^/]+)\/promote$/
      );
      if (req.method === 'POST' && promoteCandidateMatch) {
        const [, channelId, candidateId] = promoteCandidateMatch;
        const result = await service.promoteCandidateToEpisode({
          channelId,
          candidateId,
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      const workflowMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/workflow$/
      );
      if (req.method === 'GET' && workflowMatch) {
        const [, channelId, episodeId] = workflowMatch;
        const workflow = await service.getEpisodeWorkflow(channelId, episodeId);
        sendJson(res, 200, workflow as unknown as JsonValue);
        return;
      }

      const episodeMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)$/
      );
      if (req.method === 'GET' && episodeMatch) {
        const [, channelId, episodeId] = episodeMatch;
        const episode = await service.getEpisode(channelId, episodeId);
        sendJson(res, 200, { episode });
        return;
      }

      const stageVersionMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/versions$/
      );
      if (req.method === 'GET' && stageVersionMatch) {
        const [, channelId, episodeId, rawStage] = stageVersionMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const versions = await service.listStageVersions(channelId, episodeId, stage);
        sendJson(res, 200, { stage, versions } as unknown as JsonValue);
        return;
      }

      if (req.method === 'POST' && stageVersionMatch) {
        const [, channelId, episodeId, rawStage] = stageVersionMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const body = createStageVersionBodySchema.parse(await readJsonBody(req));
        const version = await service.createStageVersion({
          channelId,
          episodeId,
          stage,
          reviewStatus: body.reviewStatus,
          sourceVersionIds: body.sourceVersionIds,
          notes: body.notes,
        });
        sendJson(res, 201, { version });
        return;
      }

      const stageVersionArtifactMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/versions\/(\d+)\/artifact$/
      );
      if (req.method === 'GET' && stageVersionArtifactMatch) {
        const [, channelId, episodeId, rawStage, rawVersion] = stageVersionArtifactMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const version = Number.parseInt(rawVersion, 10);
        const artifact = await service.getStageVersionArtifact(channelId, episodeId, stage, version);
        sendJson(res, 200, { stage, version, artifact } as unknown as JsonValue);
        return;
      }

      const generateMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/generate$/
      );
      if (req.method === 'POST' && generateMatch) {
        const [, channelId, episodeId, rawStage] = generateMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const body = stageGenerationPayloadSchema.parse(await readJsonBody(req));
        const result = await service.enqueueStageGeneration({
          channelId,
          episodeId,
          stage,
          payload: body,
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      const currentArtifactMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/current-artifact$/
      );
      if (req.method === 'GET' && currentArtifactMatch) {
        const [, channelId, episodeId, rawStage] = currentArtifactMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const artifact = await service.getCurrentStageArtifact(channelId, episodeId, stage);
        sendJson(res, 200, { stage, artifact } as unknown as JsonValue);
        return;
      }

      if (req.method === 'PUT' && currentArtifactMatch) {
        const [, channelId, episodeId, rawStage] = currentArtifactMatch;
        const stage = episodeStageSchema.parse(rawStage);

        if (stage !== 'script') {
          sendError(res, 400, `Manual draft updates are only supported for the script stage`);
          return;
        }

        const result = await service.saveScriptDraft({
          channelId,
          episodeId,
          script: await readJsonBody(req),
        });
        sendJson(res, 200, result as unknown as JsonValue);
        return;
      }

      const approvedArtifactMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/approved-artifact$/
      );
      if (req.method === 'GET' && approvedArtifactMatch) {
        const [, channelId, episodeId, rawStage] = approvedArtifactMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const artifact = await service.getApprovedStageArtifact(channelId, episodeId, stage);
        sendJson(res, 200, { stage, artifact } as unknown as JsonValue);
        return;
      }

      const approveMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/review-status$/
      );
      if (req.method === 'POST' && approveMatch) {
        const [, channelId, episodeId, rawStage] = approveMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const body = updateStageReviewStatusBodySchema.parse(await readJsonBody(req));
        const result = await service.updateStageReviewStatus({
          channelId,
          episodeId,
          stage,
          version: body.version,
          reviewStatus: body.reviewStatus,
          approvedTopic: body.approvedTopic,
        });
        sendJson(res, 200, result as unknown as JsonValue);
        return;
      }

      const approveActionMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/approve$/
      );
      if (req.method === 'POST' && approveActionMatch) {
        const [, channelId, episodeId, rawStage] = approveActionMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const body = stageActionBodySchema.parse(await readJsonBody(req));
        const result = await service.updateStageReviewStatus({
          channelId,
          episodeId,
          stage,
          version: body.version,
          reviewStatus: 'approved',
          approvedTopic: body.approvedTopic,
        });
        sendJson(res, 200, result as unknown as JsonValue);
        return;
      }

      const requestChangesActionMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/request-changes$/
      );
      if (req.method === 'POST' && requestChangesActionMatch) {
        const [, channelId, episodeId, rawStage] = requestChangesActionMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const body = stageActionBodySchema.parse(await readJsonBody(req));
        const result = await service.updateStageReviewStatus({
          channelId,
          episodeId,
          stage,
          version: body.version,
          reviewStatus: 'changes_requested',
        });
        sendJson(res, 200, result as unknown as JsonValue);
        return;
      }

      const jobsMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/jobs$/
      );
      if (jobsMatch) {
        const [, channelId, episodeId] = jobsMatch;

        if (req.method === 'GET') {
          const jobs = await service.listJobs(channelId, episodeId);
          sendJson(res, 200, { jobs });
          return;
        }

        if (req.method === 'POST') {
          const rawBody = createJobBodySchema.parse(await readJsonBody(req));
          const stageParam = url.searchParams.get('stage');
          if (!stageParam) {
            sendError(res, 400, 'Missing stage query parameter');
            return;
          }

          const stage = episodeStageSchema.parse(stageParam);
          const job = await service.createJob({
            channelId,
            episodeId,
            stage,
            version: rawBody.version,
          });
          sendJson(res, 201, { job });
          return;
        }
      }

      sendError(res, 404, `Route not found: ${req.method} ${pathname}`);
    } catch (error) {
      if (error instanceof ZodError) {
        sendJson(res, 400, {
          error: 'Validation failed',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const statusCode = message.includes('ENOENT') ? 404 : 500;
      sendError(res, statusCode, message);
    }
  });
}

async function readWorkbenchUiFile(directory: string, filename: string): Promise<string> {
  return readFile(path.join(directory, filename), 'utf-8');
}

function resolveAllowedFilePath(rawPath: string, service: WorkbenchService): string {
  const resolvedPath = path.resolve(rawPath);
  const allowedRoots = [path.resolve(process.cwd()), path.resolve(service.getDataRoot())];
  const isAllowed = allowedRoots.some((allowedRoot) => {
    const relative = path.relative(allowedRoot, resolvedPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });

  if (!isAllowed) {
    throw new Error(`File path is outside allowed roots: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function streamFile(
  res: http.ServerResponse,
  filePath: string,
  rangeHeader?: string
): Promise<void> {
  const fileStats = await stat(filePath);
  const contentType = getContentType(filePath);
  const totalSize = fileStats.size;

  if (rangeHeader) {
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2] ? Number.parseInt(rangeMatch[2], 10) : totalSize - 1;

      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
      });

      await pipeStream(createReadStream(filePath, { start, end }), res);
      return;
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': totalSize,
    'Accept-Ranges': 'bytes',
  });

  await pipeStream(createReadStream(filePath), res);
}

function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.mp4':
      return 'video/mp4';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function pipeStream(
  stream: NodeJS.ReadableStream,
  res: http.ServerResponse
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.on('error', reject);
    res.on('error', reject);
    res.on('finish', resolve);
    stream.pipe(res);
  });
}

async function main(): Promise<void> {
  const port = Number.parseInt(process.env.WORKBENCH_PORT ?? '4310', 10);
  const server = await createWorkbenchServer();

  server.listen(port, () => {
    console.log(`Workbench control plane listening on http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
