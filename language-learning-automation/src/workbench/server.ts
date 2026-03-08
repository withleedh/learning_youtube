import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
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
import { getWorkbenchApiLogPath } from './paths';

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

const bulkCandidateReviewBodySchema = z.object({
  items: z
    .array(
      z.object({
        channelId: z.string().min(1),
        candidateId: z.string().min(1),
      })
    )
    .min(1)
    .max(500),
  reviewStatus: z.enum(['approved', 'changes_requested']),
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

const createCommentBodySchema = z.object({
  stage: episodeStageSchema,
  version: z.number().int().positive().optional(),
  text: z.string().min(1),
  kind: z.enum(['issue', 'note', 'decision']).optional(),
  status: z.enum(['open', 'resolved']).optional(),
  anchor: z
    .object({
      kind: z.enum(['sentence', 'scene', 'timestamp', 'thumbnail', 'title', 'stage']),
      label: z.string().optional(),
      sentenceId: z.number().int().positive().optional(),
      sceneIndex: z.number().int().positive().optional(),
      timestampMs: z.number().int().nonnegative().optional(),
      target: z.string().optional(),
    })
    .optional(),
});

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface ApiRequestLogEntry {
  timestamp: string;
  method: string;
  pathname: string;
  query: Record<string, string>;
  statusCode: number;
  durationMs: number;
  requestBody?: JsonValue;
}

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

function isWorkbenchNotFoundMessage(message: string): boolean {
  return (
    message.includes('ENOENT') ||
    message.startsWith('No approved ') ||
    message.startsWith('No current artifact found') ||
    message.startsWith('No current package draft found')
  );
}

export async function createWorkbenchServer(
  service: WorkbenchService = new WorkbenchService()
): Promise<http.Server> {
  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    let requestBodySummary: JsonValue | undefined;

    const parseBody = async (): Promise<unknown> => {
      const body = await readJsonBody(req);
      requestBodySummary = summarizeJsonForLog(body);
      return body;
    };

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

      if (req.method === 'GET' && pathname === '/api/workbench/live-status') {
        const status = await service.getLiveStatus();
        sendJson(res, 200, { status } as unknown as JsonValue);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/logs/api') {
        const rawLimit = url.searchParams.get('limit');
        const limit = Math.max(
          1,
          Math.min(200, rawLimit ? Number.parseInt(rawLimit, 10) || 50 : 50)
        );
        const entries = await readWorkbenchApiLogs(service, limit);
        sendJson(res, 200, { entries } as unknown as JsonValue);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/workbench/review-queue') {
        const items = await service.listReviewQueue();
        sendJson(res, 200, { items } as unknown as JsonValue);
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

      const threadMatch = pathname.match(/^\/api\/workbench\/threads\/([^/]+)$/);
      if (req.method === 'GET' && threadMatch) {
        const [, threadId] = threadMatch;
        const thread = await service.getThreadSummary(threadId);
        sendJson(res, 200, { thread } as unknown as JsonValue);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/workbench/episodes') {
        const body = createEpisodeBodySchema.parse(await parseBody());
        const episode = await service.createEpisode(body);
        sendJson(res, 201, { episode });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/workbench/candidates/topic-batch') {
        const body = createTopicCandidateBatchBodySchema.parse(await parseBody());
        const result = await service.createTopicCandidateBatch({
          channelId: body.channelId,
          count: body.count,
          category: body.category as Parameters<WorkbenchService['createTopicCandidateBatch']>[0]['category'],
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/workbench/candidates/bulk-review') {
        const body = bulkCandidateReviewBodySchema.parse(await parseBody());
        const result = await service.bulkReviewCandidates(body);
        sendJson(res, 200, result as unknown as JsonValue);
        return;
      }

      const scriptBatchMatch = pathname.match(
        /^\/api\/workbench\/candidates\/([^/]+)\/([^/]+)\/script-batch$/
      );
      if (req.method === 'POST' && scriptBatchMatch) {
        const [, channelId, candidateId] = scriptBatchMatch;
        const body = createScriptCandidateBatchBodySchema.parse(await parseBody());
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

      const reviewContextMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/([^/]+)\/review-context$/
      );
      if (req.method === 'GET' && reviewContextMatch) {
        const [, channelId, episodeId, rawStage] = reviewContextMatch;
        const stage = episodeStageSchema.parse(rawStage);
        const context = await service.getStageReviewContext(channelId, episodeId, stage);
        sendJson(res, 200, { context } as unknown as JsonValue);
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
        const body = createStageVersionBodySchema.parse(await parseBody());
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
        const body = stageGenerationPayloadSchema.parse(await parseBody());
        const result = await service.enqueueStageGeneration({
          channelId,
          episodeId,
          stage,
          payload: body,
        });
        sendJson(res, 201, result as unknown as JsonValue);
        return;
      }

      const packageGenerateMatch = pathname.match(
        /^\/api\/workbench\/episodes\/([^/]+)\/([^/]+)\/stages\/package\/generate$/
      );
      if (req.method === 'POST' && packageGenerateMatch) {
        const [, channelId, episodeId] = packageGenerateMatch;
        const body = stageGenerationPayloadSchema.parse(await parseBody());
        const result = await service.enqueueStageGeneration({
          channelId,
          episodeId,
          stage: 'package',
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

        if (stage !== 'script' && stage !== 'package') {
          sendError(res, 400, `Manual draft updates are only supported for the script or package stage`);
          return;
        }

        if (stage === 'script') {
          const body = await parseBody();
          const result = await service.saveScriptDraft({
            channelId,
            episodeId,
            script: body,
          });
          sendJson(res, 200, result as unknown as JsonValue);
          return;
        }

        const body = await parseBody();
        const result = await service.savePackageDraft({
          channelId,
          episodeId,
          manifest: body,
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
        const body = updateStageReviewStatusBodySchema.parse(await parseBody());
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
        const body = stageActionBodySchema.parse(await parseBody());
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
        const body = stageActionBodySchema.parse(await parseBody());
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
          const rawBody = createJobBodySchema.parse(await parseBody());
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

      const commentsMatch = pathname.match(
        /^\/api\/workbench\/records\/([^/]+)\/([^/]+)\/comments$/
      );
      if (commentsMatch) {
        const [, channelId, recordId] = commentsMatch;

        if (req.method === 'GET') {
          const comments = await service.listComments(channelId, recordId);
          sendJson(res, 200, { comments } as unknown as JsonValue);
          return;
        }

        if (req.method === 'POST') {
          const body = createCommentBodySchema.parse(await parseBody());
          const comment = await service.createComment({
            channelId,
            recordId,
            stage: body.stage,
            version: body.version,
            text: body.text,
            kind: body.kind,
            status: body.status,
            anchor: body.anchor,
          });
          sendJson(res, 201, { comment } as unknown as JsonValue);
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
      const statusCode = isWorkbenchNotFoundMessage(message) ? 404 : 500;
      sendError(res, statusCode, message);
    } finally {
      if (shouldLogWorkbenchRequest(req.method, pathname, res.statusCode)) {
        try {
          await appendWorkbenchApiLog(service, {
            timestamp: new Date().toISOString(),
            method: req.method,
            pathname,
            query: Object.fromEntries(url.searchParams.entries()),
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            requestBody: requestBodySummary,
          });
        } catch (logError) {
          console.error(
            'Failed to append workbench API log:',
            logError instanceof Error ? logError.message : String(logError)
          );
        }
      }
    }
  });
}

function shouldLogWorkbenchRequest(method: string, pathname: string, statusCode: number): boolean {
  if (!pathname.startsWith('/api/workbench/')) {
    return false;
  }

  const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  return isMutation || statusCode >= 400;
}

async function appendWorkbenchApiLog(
  service: WorkbenchService,
  entry: ApiRequestLogEntry
): Promise<void> {
  const logPath = getWorkbenchApiLogPath(service.getDataRoot());
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

async function readWorkbenchApiLogs(
  service: WorkbenchService,
  limit: number
): Promise<ApiRequestLogEntry[]> {
  const logPath = getWorkbenchApiLogPath(service.getDataRoot());

  try {
    const raw = await readFile(logPath, 'utf-8');
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ApiRequestLogEntry)
      .slice(-limit)
      .reverse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT')) {
      return [];
    }
    throw error;
  }
}

function summarizeJsonForLog(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 200 ? `${value.slice(0, 200)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => summarizeJsonForLog(item) ?? null);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const summary: Record<string, JsonValue> = {};

    for (const [key, entryValue] of entries.slice(0, 20)) {
      if (Array.isArray(entryValue)) {
        summary[key] = {
          count: entryValue.length,
          preview: entryValue.slice(0, 5).map((item) => summarizeJsonForLog(item) ?? null),
        };
        continue;
      }

      if (entryValue && typeof entryValue === 'object') {
        summary[key] = summarizeJsonObject(entryValue as Record<string, unknown>);
        continue;
      }

      summary[key] = summarizeJsonForLog(entryValue) ?? null;
    }

    if (entries.length > 20) {
      summary.__truncatedKeys = entries.length - 20;
    }

    return summary;
  }

  return String(value);
}

function summarizeJsonObject(value: Record<string, unknown>): JsonValue {
  const entries = Object.entries(value);
  const summary: Record<string, JsonValue> = {};

  for (const [key, entryValue] of entries.slice(0, 10)) {
    if (Array.isArray(entryValue)) {
      summary[key] = {
        count: entryValue.length,
      };
      continue;
    }

    if (entryValue && typeof entryValue === 'object') {
      summary[key] = {
        keys: Object.keys(entryValue).slice(0, 10),
      };
      continue;
    }

    summary[key] = summarizeJsonForLog(entryValue) ?? null;
  }

  if (entries.length > 10) {
    summary.__truncatedKeys = entries.length - 10;
  }

  return summary;
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
