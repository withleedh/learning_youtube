import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChannelConfig } from '../config/types';
import type { Script, Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import { generatePackageManifest } from './package-generator';
import { getCategoryForDay } from '../script/prompts';
import { WorkbenchService } from './service';
import { WorkbenchStore } from './store';
import {
  packageManifestSchema,
  stageGenerationPayloadSchema,
  type ApprovedTopicArtifact,
  type ImageStageManifest,
  type PackageManifest,
  type RenderStageManifest,
  type ShortsStageManifest,
  type TtsStageManifest,
  type WorkbenchEpisodeVoices,
  type WorkbenchJob,
} from './types';

export interface TopicStageResult {
  category: string;
  candidates: string[];
  recommendedTopic: string;
}

export interface TopicJobProgress {
  requestedCount: number;
  generatedCount: number;
  batchNumber: number;
  totalBatches: number;
  lastBatchCandidates: string[];
  phase: 'generating' | 'ranking';
}

export interface ScriptPoolStageResult {
  category: string;
  topic: string;
  candidates: Script[];
  recommendedCandidateIndex: number;
}

export interface WorkbenchWorkerAdapters {
  generateTopicBundle(input: {
    channelId: string;
    category: ReturnType<typeof getCategoryForDay>;
    candidateCount: number;
    onProgress?: (progress: TopicJobProgress) => void | Promise<void>;
  }): Promise<TopicStageResult>;
  generateScript(input: {
    channelId: string;
    category: ReturnType<typeof getCategoryForDay>;
    topic: string;
    usePipeline: boolean;
  }): Promise<unknown>;
  generateScriptPool(input: {
    channelId: string;
    category: ReturnType<typeof getCategoryForDay>;
    topic: string;
    usePipeline: boolean;
    candidateCount: number;
  }): Promise<ScriptPoolStageResult>;
  generateImages(input: {
    channelId: string;
    script: unknown;
    outputDir: string;
    styleId?: string;
    sceneIndices?: number[];
    existingManifest?: ImageStageManifest | null;
  }): Promise<ImageStageManifest>;
  generateTts(input: {
    channelId: string;
    script: unknown;
    outputDir: string;
    sentenceIds?: number[];
    existingManifest?: TtsStageManifest | null;
  }): Promise<TtsStageManifest>;
  generateRender(input: {
    channelId: string;
    script: unknown;
    imageManifest: ImageStageManifest;
    ttsManifest: TtsStageManifest;
    outputDir: string;
  }): Promise<RenderStageManifest>;
  generateShorts(input: {
    channelId: string;
    script: unknown;
    imageManifest: ImageStageManifest;
    ttsManifest: TtsStageManifest;
    renderManifest: RenderStageManifest;
    outputDir: string;
  }): Promise<ShortsStageManifest>;
  generatePackage(input: {
    channelId: string;
    script: unknown;
    imageManifest: ImageStageManifest;
    ttsManifest: TtsStageManifest;
    renderManifest: RenderStageManifest;
    shortsManifest?: ShortsStageManifest | null;
    outputDir: string;
  }): Promise<PackageManifest>;
}

function createDefaultAdapters(): WorkbenchWorkerAdapters {
  return {
    async generateTopicBundle(input) {
      const { loadConfig } = await import('../config/loader');
      const { generateTopicWorkbenchBundle } = await import('../script/topic-selector');
      const config = await loadConfig(input.channelId);
      return generateTopicWorkbenchBundle(
        input.category,
        config.meta.targetLanguage,
        config.meta.nativeLanguage,
        input.candidateCount,
        { onProgress: input.onProgress }
      );
    },
    async generateScript(input) {
      const { loadConfig } = await import('../config/loader');
      const { generateCliStyleScript } = await import('../script/generator');
      const config = await loadConfig(input.channelId);
      if (input.usePipeline) {
        return generateCliStyleScript(config, input.category, input.topic);
      }

      const { generateScript } = await import('../script/generator');
      return generateScript(config, input.category, input.topic, {
        usePipeline: false,
        candidateCount: 1,
      });
    },
    async generateScriptPool(input) {
      const { loadConfig } = await import('../config/loader');
      const { generateCliStyleScriptPool, generateScriptPool } = await import('../script/generator');
      const config = await loadConfig(input.channelId);
      const result = input.usePipeline
        ? await generateCliStyleScriptPool(config, input.category, input.topic, input.candidateCount)
        : await generateScriptPool(config, input.category, input.topic, {
            count: input.candidateCount,
            usePipeline: false,
          });

      return {
        category: input.category,
        topic: input.topic,
        candidates: result.candidates,
        recommendedCandidateIndex: result.recommendedIndex,
      };
    },
    async generateImages(input) {
      const { loadConfig } = await import('../config/loader');
      const {
        generateBackgroundImage,
        generateSceneImages,
        regenerateInconsistentScenes,
      } = await import('../image/generator');
      const { scriptSchema } = await import('../script/types');
      const script = scriptSchema.parse(input.script);
      const config = await loadConfig(input.channelId);
      const styleId = input.styleId ?? config.theme.preferredArtStyle;

      if (input.sceneIndices && input.sceneIndices.length > 0) {
        if (!input.existingManifest || input.existingManifest.mode !== 'scene') {
          throw new Error('Scene regeneration requires an existing scene image manifest.');
        }

        const referenceImagePath =
          input.existingManifest.sceneImagePaths[0] ?? input.existingManifest.backgroundImagePath;
        if (!referenceImagePath) {
          throw new Error('Scene regeneration requires a reference image from the current manifest.');
        }

        if (!script.metadata.scenePrompts || script.metadata.scenePrompts.length === 0) {
          throw new Error('Scene regeneration requires scene prompts in the approved script.');
        }

        await regenerateInconsistentScenes(
          script,
          input.outputDir,
          normalizePositiveIntegers(input.sceneIndices),
          referenceImagePath,
          styleId
        );

        const sceneImagePaths = [...input.existingManifest.sceneImagePaths];
        for (const sceneIndex of normalizePositiveIntegers(input.sceneIndices)) {
          sceneImagePaths[sceneIndex - 1] = path.join(input.outputDir, `scene_${sceneIndex}.png`);
        }

        return {
          generatedAt: nowIso(),
          mode: 'scene',
          backgroundImagePath: sceneImagePaths[0],
          sceneImagePaths,
          styleId,
        };
      }

      if (script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0) {
        const sceneImagePaths = await generateSceneImages(script, input.outputDir, styleId);
        return {
          generatedAt: nowIso(),
          mode: 'scene',
          backgroundImagePath: sceneImagePaths[0],
          sceneImagePaths,
          styleId,
        };
      }

      const backgroundImagePath = await generateBackgroundImage(
        script.metadata.topic,
        script.metadata.title.target,
        input.outputDir,
        script.metadata.imagePrompt,
        styleId
      );

      return {
        generatedAt: nowIso(),
        mode: 'background',
        backgroundImagePath,
        sceneImagePaths: [],
        styleId,
      };
    },
    async generateTts(input) {
      const { loadConfig } = await import('../config/loader');
      const { scriptSchema } = await import('../script/types');
      const { generateSentenceAudio, selectEpisodeVoices } = await import('../tts/generator');
      const script = scriptSchema.parse(input.script);
      const config = await loadConfig(input.channelId);
      const sentenceIds = normalizePositiveIntegers(input.sentenceIds ?? []);
      const isPartialRegeneration = sentenceIds.length > 0;

      if (isPartialRegeneration && !input.existingManifest) {
        throw new Error('Sentence regeneration requires an existing TTS manifest.');
      }

      const episodeVoices: WorkbenchEpisodeVoices | undefined =
        config.tts.provider === 'google'
          ? input.existingManifest?.episodeVoices ?? selectEpisodeVoices(script.metadata.characters)
          : undefined;

      const targetSentences = isPartialRegeneration
        ? script.sentences.filter((sentence) => sentenceIds.includes(sentence.id))
        : script.sentences;

      if (targetSentences.length === 0) {
        throw new Error('No matching script sentences were found for the requested TTS regeneration.');
      }

      const generatedAudioFiles = await generateAudioFilesForSentences({
        sentences: targetSentences,
        config,
        outputDir: input.outputDir,
        episodeVoices,
        generateSentenceAudio,
      });

      const audioFiles = isPartialRegeneration
        ? mergeAudioFiles(input.existingManifest!.audioFiles, generatedAudioFiles, sentenceIds)
        : generatedAudioFiles;

      return {
        generatedAt: nowIso(),
        outputDir: input.outputDir,
        audioFiles,
        episodeVoices,
      };
    },
    async generateRender(input) {
      const { bundle } = await import('@remotion/bundler');
      const { renderMedia, selectComposition } = await import('@remotion/renderer');
      const { loadConfig } = await import('../config/loader');
      const { scriptSchema } = await import('../script/types');
      const { calculateExpectedAudioCount } = await import('../tts/types');
      const script = scriptSchema.parse(input.script);
      const config = await loadConfig(input.channelId);
      const expectedAudioCount = calculateExpectedAudioCount(script.sentences.length);

      if (input.ttsManifest.audioFiles.length < expectedAudioCount) {
        throw new Error(
          `Audio manifest incomplete: expected ${expectedAudioCount} audio files, got ${input.ttsManifest.audioFiles.length}`
        );
      }

      const prepared = await prepareRenderPublicDir({
        channelId: input.channelId,
        config,
        script,
        imageManifest: input.imageManifest,
        ttsManifest: input.ttsManifest,
      });

      const inputProps = createMainInputProps({
        config,
        script,
        audioFiles: prepared.audioFiles,
        backgroundImage: prepared.backgroundImage,
        sceneImages: prepared.sceneImages,
      });

      const bundleLocation = await bundle({
        entryPoint: path.join(process.cwd(), 'src/index.ts'),
        webpackOverride: (webpackConfig) => webpackConfig,
        publicDir: prepared.publicDir,
      });

      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'Main',
        inputProps,
      });

      const videoPath = path.join(input.outputDir, 'video.mp4');
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: videoPath,
        inputProps,
      });

      return {
        generatedAt: nowIso(),
        compositionId: composition.id,
        videoPath,
        durationInFrames: composition.durationInFrames,
        audioFileCount: prepared.audioFiles.length,
        imageMode: input.imageManifest.mode,
      };
    },
    async generateShorts(input) {
      const { bundle } = await import('@remotion/bundler');
      const { renderMedia, selectComposition } = await import('@remotion/renderer');
      const { loadConfig } = await import('../config/loader');
      const { scriptSchema } = await import('../script/types');
      const { generateQuizChoices } = await import('../compositions/ListeningQuizShort');
      const script = scriptSchema.parse(input.script);
      const config = await loadConfig(input.channelId);
      const prepared = await prepareRenderPublicDir({
        channelId: input.channelId,
        config,
        script,
        imageManifest: input.imageManifest,
        ttsManifest: input.ttsManifest,
      });

      const bundleLocation = await bundle({
        entryPoint: path.join(process.cwd(), 'src/index.ts'),
        webpackOverride: (webpackConfig) => webpackConfig,
        publicDir: prepared.publicDir,
      });

      const shortsDir = path.join(input.outputDir, 'quiz-shorts');
      await fs.mkdir(shortsDir, { recursive: true });

      const outputs: ShortsStageManifest['outputs'] = [];

      for (let i = 0; i < script.sentences.length; i++) {
        const sentence = script.sentences[i];
        const audioFile = prepared.audioFiles.find(
          (candidate) => candidate.sentenceId === sentence.id && candidate.speed === '1.0x'
        );
        const slowAudioFile = prepared.audioFiles.find(
          (candidate) => candidate.sentenceId === sentence.id && candidate.speed === '0.8x'
        );

        if (!audioFile) {
          throw new Error(`Missing 1.0x audio for sentence ${sentence.id}`);
        }

        const backgroundImage = getShortsBackgroundImage({
          sentenceId: sentence.id,
          scenePrompts: script.metadata.scenePrompts,
          sceneImages: prepared.sceneImages,
          fallbackBackgroundImage: prepared.backgroundImage,
        });

        const inputProps = {
          sentence: {
            ...sentence,
            choices: generateQuizChoices(sentence),
          },
          audioFile,
          slowAudioFile,
          config,
          backgroundImage,
          sentenceIndex: i + 1,
          episodeTitle: script.metadata.title.native,
          audioDuration: audioFile.duration,
          slowAudioDuration: slowAudioFile?.duration,
        };

        const composition = await selectComposition({
          serveUrl: bundleLocation,
          id: 'ListeningQuizShort',
          inputProps,
        });

        const outputPath = path.join(shortsDir, `quiz_${String(i + 1).padStart(2, '0')}.mp4`);
        await renderMedia({
          composition,
          serveUrl: bundleLocation,
          codec: 'h264',
          outputLocation: outputPath,
          inputProps,
        });

        outputs.push({
          sentenceId: sentence.id,
          compositionId: composition.id,
          outputPath,
          backgroundImage,
        });
      }

      return {
        generatedAt: nowIso(),
        compositionId: 'ListeningQuizShort',
        outputDir: shortsDir,
        sourceRenderVideoPath: input.renderManifest.videoPath,
        outputs,
      };
    },
    async generatePackage(input) {
      const { loadConfig } = await import('../config/loader');
      const { scriptSchema } = await import('../script/types');
      const script = scriptSchema.parse(input.script);
      const config = await loadConfig(input.channelId);
      return generatePackageManifest({
        channelId: input.channelId,
        outputDir: input.outputDir,
        config,
        script,
        imageManifest: input.imageManifest,
        ttsManifest: input.ttsManifest,
        renderManifest: input.renderManifest,
        shortsManifest: input.shortsManifest,
      });
    },
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

const speedPriority: Record<AudioFile['speed'], number> = {
  '0.8x': 0,
  '1.0x': 1,
  '1.2x': 2,
};

function normalizePositiveIntegers(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))].sort(
    (left, right) => left - right
  );
}

async function generateAudioFilesForSentences(input: {
  sentences: Sentence[];
  config: ChannelConfig;
  outputDir: string;
  episodeVoices?: WorkbenchEpisodeVoices;
  generateSentenceAudio: (
    sentence: Sentence,
    config: ChannelConfig,
    outputDir: string,
    episodeVoices?: WorkbenchEpisodeVoices
  ) => Promise<
    Array<{
      success: boolean;
      audioFile?: AudioFile;
      error?: string;
    }>
  >;
}): Promise<AudioFile[]> {
  await fs.mkdir(input.outputDir, { recursive: true });
  const audioFiles: AudioFile[] = [];

  for (const sentence of input.sentences) {
    let lastError = '';
    let generated = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const results = await input.generateSentenceAudio(
        sentence,
        input.config,
        input.outputDir,
        input.episodeVoices
      );
      const failures = results.filter((result) => !result.success);

      if (failures.length === 0) {
        for (const result of results) {
          if (result.audioFile) {
            audioFiles.push(result.audioFile);
          }
        }
        generated = true;
        break;
      }

      lastError = failures.map((result) => result.error ?? 'unknown error').join(' | ');
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    if (!generated) {
      throw new Error(`TTS generation failed for sentence ${sentence.id}: ${lastError}`);
    }
  }

  return sortAudioFiles(audioFiles);
}

function mergeAudioFiles(
  existingAudioFiles: AudioFile[],
  regeneratedAudioFiles: AudioFile[],
  sentenceIds: number[]
): AudioFile[] {
  const targetSentenceIds = new Set(sentenceIds);
  return sortAudioFiles([
    ...existingAudioFiles.filter((audioFile) => !targetSentenceIds.has(audioFile.sentenceId)),
    ...regeneratedAudioFiles,
  ]);
}

function sortAudioFiles(audioFiles: AudioFile[]): AudioFile[] {
  return [...audioFiles].sort((left, right) => {
    if (left.sentenceId !== right.sentenceId) {
      return left.sentenceId - right.sentenceId;
    }

    if (left.speaker !== right.speaker) {
      return left.speaker.localeCompare(right.speaker);
    }

    return speedPriority[left.speed] - speedPriority[right.speed];
  });
}

export class WorkbenchWorker {
  constructor(
    private readonly service: WorkbenchService = new WorkbenchService(),
    private readonly store: WorkbenchStore = new WorkbenchStore(),
    private readonly adapters: WorkbenchWorkerAdapters = createDefaultAdapters()
  ) {}

  public async runUntilEmpty(): Promise<number> {
    let processed = 0;
    let job: WorkbenchJob | null;

    do {
      job = await this.processNextJob();
      if (!job) {
        break;
      }
      processed++;

    } while (job);

    return processed;
  }

  public async processNextJob(): Promise<WorkbenchJob | null> {
    const queuedJobs = await this.service.listQueuedJobs();
    const nextJob = queuedJobs[0];
    if (!nextJob) {
      return null;
    }

    nextJob.status = 'running';
    nextJob.startedAt = nowIso();
    nextJob.updatedAt = nextJob.startedAt;
    await this.service.updateJob(nextJob);

    try {
      switch (nextJob.stage) {
        case 'topic':
          await this.processTopicJob(nextJob);
          break;
        case 'script':
          await this.processScriptJob(nextJob);
          break;
        case 'image':
          await this.processImageJob(nextJob);
          break;
        case 'tts':
          await this.processTtsJob(nextJob);
          break;
        case 'render':
          await this.processRenderJob(nextJob);
          break;
        case 'shorts':
          await this.processShortsJob(nextJob);
          break;
        case 'package':
          await this.processPackageJob(nextJob);
          break;
        default:
          throw new Error(`Unsupported generation stage: ${nextJob.stage}`);
      }

      nextJob.status = 'completed';
      nextJob.completedAt = nowIso();
      nextJob.updatedAt = nextJob.completedAt;
      nextJob.error = undefined;
      await this.service.updateJob(nextJob);
      return nextJob;
    } catch (error) {
      nextJob.status = 'failed';
      nextJob.error = error instanceof Error ? error.message : String(error);
      nextJob.completedAt = nowIso();
      nextJob.updatedAt = nextJob.completedAt;
      await this.service.updateJob(nextJob);
      return nextJob;
    }
  }

  private async processTopicJob(job: WorkbenchJob): Promise<void> {
    const payload = stageGenerationPayloadSchema.parse(job.payload ?? {});
    const category = payload.category ?? getCategoryForDay(new Date());
    const candidateCount = payload.candidateCount ?? 3;

    const topicBundle = await this.adapters.generateTopicBundle({
      channelId: job.channelId,
      category,
      candidateCount,
      onProgress: async (progress) => {
        job.progress = {
          current: progress.generatedCount,
          total: progress.requestedCount,
          phase: progress.phase,
          label:
            progress.phase === 'ranking'
              ? `Ranking ${progress.generatedCount} topic candidates`
              : `Generated ${progress.generatedCount}/${progress.requestedCount} topic candidates`,
        };
        job.updatedAt = nowIso();
        await this.service.updateJob(job);
      },
    });

    await this.store.saveStageArtifactJson(job.channelId, job.episodeId, 'topic', job.version, 'candidates.json', {
      generatedAt: nowIso(),
      category,
      candidates: topicBundle.candidates,
      recommendedTopic: topicBundle.recommendedTopic,
    });

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'topic',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processScriptJob(job: WorkbenchJob): Promise<void> {
    const payload = stageGenerationPayloadSchema.parse(job.payload ?? {});
    const record = await this.service.getEpisode(job.channelId, job.episodeId);
    const approvedTopic = payload.topic
      ? null
      : await this.tryGetApprovedTopic(job.channelId, job.episodeId);
    const category = payload.category ?? approvedTopic?.category ?? getCategoryForDay(new Date());
    const topic = payload.topic ?? approvedTopic?.approvedTopic;

    if (!topic) {
      throw new Error(`Script generation requires payload.topic or an approved topic for episode ${job.episodeId}`);
    }

    if (isScriptPoolRecord(record)) {
      const candidateCount = Math.max(1, Math.min(50, payload.candidateCount ?? 5));
      const scriptPool = await this.adapters.generateScriptPool({
        channelId: job.channelId,
        category,
        topic,
        usePipeline: payload.usePipeline ?? true,
        candidateCount,
      });
      const currentDraft =
        scriptPool.candidates[scriptPool.recommendedCandidateIndex] ?? scriptPool.candidates[0];

      await this.store.saveStageArtifactJson(
        job.channelId,
        job.episodeId,
        'script',
        job.version,
        'generated-script.json',
        {
          generatedAt: nowIso(),
          category,
          topic,
          recommendedCandidateIndex: scriptPool.recommendedCandidateIndex,
          selectedCandidateIndex: scriptPool.recommendedCandidateIndex,
          candidates: scriptPool.candidates,
          currentDraft,
        }
      );

      await this.service.syncEpisodeTitleFromScript(job.channelId, job.episodeId, currentDraft);

      await this.service.updateStageReviewStatus({
        channelId: job.channelId,
        episodeId: job.episodeId,
        stage: 'script',
        version: job.version,
        reviewStatus: 'pending_review',
      });
      return;
    }

    const script = await this.adapters.generateScript({
      channelId: job.channelId,
      category,
      topic,
      usePipeline: payload.usePipeline ?? true,
    });

    await this.store.saveStageArtifactJson(
      job.channelId,
      job.episodeId,
      'script',
      job.version,
      'generated-script.json',
      script
    );

    await this.service.syncEpisodeTitleFromScript(job.channelId, job.episodeId, script);

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'script',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processImageJob(job: WorkbenchJob): Promise<void> {
    const payload = stageGenerationPayloadSchema.parse(job.payload ?? {});
    const approvedScript = await this.service.getApprovedScript(job.channelId, job.episodeId);
    const outputDir = this.store.getStageVersionRoot(job.channelId, job.episodeId, 'image', job.version);
    const existingManifest = await this.tryReadStageManifest<ImageStageManifest>(
      job.channelId,
      job.episodeId,
      'image',
      job.version,
      'manifest.json'
    );

    const manifest = await this.adapters.generateImages({
      channelId: job.channelId,
      script: approvedScript,
      outputDir,
      styleId: payload.styleId,
      sceneIndices: payload.sceneIndices,
      existingManifest,
    });

    await this.store.saveStageArtifactJson(
      job.channelId,
      job.episodeId,
      'image',
      job.version,
      'manifest.json',
      manifest
    );

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'image',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processTtsJob(job: WorkbenchJob): Promise<void> {
    const payload = stageGenerationPayloadSchema.parse(job.payload ?? {});
    const approvedScript = await this.service.getApprovedScript(job.channelId, job.episodeId);
    const stageRoot = this.store.getStageVersionRoot(job.channelId, job.episodeId, 'tts', job.version);
    const outputDir = path.join(stageRoot, 'audio');
    const existingManifest = await this.tryReadStageManifest<TtsStageManifest>(
      job.channelId,
      job.episodeId,
      'tts',
      job.version,
      'manifest.json'
    );

    const manifest = await this.adapters.generateTts({
      channelId: job.channelId,
      script: approvedScript,
      outputDir,
      sentenceIds: payload.sentenceIds,
      existingManifest,
    });

    await this.store.saveStageArtifactJson(job.channelId, job.episodeId, 'tts', job.version, 'manifest.json', manifest);

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'tts',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processRenderJob(job: WorkbenchJob): Promise<void> {
    const approvedScript = await this.service.getApprovedScript(job.channelId, job.episodeId);
    const approvedImageManifest = await this.service.getApprovedImageManifest(
      job.channelId,
      job.episodeId
    );
    const approvedTtsManifest = await this.service.getApprovedTtsManifest(
      job.channelId,
      job.episodeId
    );
    const outputDir = this.store.getStageVersionRoot(job.channelId, job.episodeId, 'render', job.version);

    const manifest = await this.adapters.generateRender({
      channelId: job.channelId,
      script: approvedScript,
      imageManifest: approvedImageManifest,
      ttsManifest: approvedTtsManifest,
      outputDir,
    });

    await this.store.saveStageArtifactJson(
      job.channelId,
      job.episodeId,
      'render',
      job.version,
      'manifest.json',
      manifest
    );

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'render',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processShortsJob(job: WorkbenchJob): Promise<void> {
    const approvedScript = await this.service.getApprovedScript(job.channelId, job.episodeId);
    const approvedImageManifest = await this.service.getApprovedImageManifest(
      job.channelId,
      job.episodeId
    );
    const approvedTtsManifest = await this.service.getApprovedTtsManifest(
      job.channelId,
      job.episodeId
    );
    const approvedRenderManifest = await this.service.getApprovedRenderManifest(
      job.channelId,
      job.episodeId
    );
    const outputDir = this.store.getStageVersionRoot(job.channelId, job.episodeId, 'shorts', job.version);

    const manifest = await this.adapters.generateShorts({
      channelId: job.channelId,
      script: approvedScript,
      imageManifest: approvedImageManifest,
      ttsManifest: approvedTtsManifest,
      renderManifest: approvedRenderManifest,
      outputDir,
    });

    await this.store.saveStageArtifactJson(
      job.channelId,
      job.episodeId,
      'shorts',
      job.version,
      'manifest.json',
      manifest
    );

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'shorts',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async processPackageJob(job: WorkbenchJob): Promise<void> {
    const approvedScript = await this.service.getApprovedScript(job.channelId, job.episodeId);
    const approvedImageManifest = await this.service.getApprovedImageManifest(
      job.channelId,
      job.episodeId
    );
    const approvedTtsManifest = await this.service.getApprovedTtsManifest(
      job.channelId,
      job.episodeId
    );
    const approvedRenderManifest = await this.service.getApprovedRenderManifest(
      job.channelId,
      job.episodeId
    );
    const approvedShortsManifest = await this.tryReadApprovedShorts(job.channelId, job.episodeId);
    const outputDir = this.store.getStageVersionRoot(job.channelId, job.episodeId, 'package', job.version);

    const manifest = packageManifestSchema.parse(
      await this.adapters.generatePackage({
        channelId: job.channelId,
        script: approvedScript,
        imageManifest: approvedImageManifest,
        ttsManifest: approvedTtsManifest,
        renderManifest: approvedRenderManifest,
        shortsManifest: approvedShortsManifest,
        outputDir,
      })
    );

    await this.store.saveStageArtifactJson(
      job.channelId,
      job.episodeId,
      'package',
      job.version,
      'manifest.json',
      manifest
    );

    await this.service.updateStageReviewStatus({
      channelId: job.channelId,
      episodeId: job.episodeId,
      stage: 'package',
      version: job.version,
      reviewStatus: 'pending_review',
    });
  }

  private async tryGetApprovedTopic(
    channelId: string,
    episodeId: string
  ): Promise<ApprovedTopicArtifact | null> {
    try {
      return await this.service.getApprovedTopic(channelId, episodeId);
    } catch {
      return null;
    }
  }

  private async tryReadStageManifest<T>(
    channelId: string,
    episodeId: string,
    stage: WorkbenchJob['stage'],
    version: number,
    filename: string
  ): Promise<T | null> {
    try {
      return await this.store.readStageArtifactJson<T>(channelId, episodeId, stage, version, filename);
    } catch {
      return null;
    }
  }

  private async tryReadApprovedShorts(
    channelId: string,
    episodeId: string
  ): Promise<ShortsStageManifest | null> {
    try {
      return await this.service.getApprovedShortsManifest(channelId, episodeId);
    } catch {
      return null;
    }
  }
}

async function main(): Promise<void> {
  const worker = new WorkbenchWorker();
  const processed = await worker.runUntilEmpty();
  console.log(`Processed ${processed} workbench job(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

function getProjectPublicDir(): string {
  return path.join(process.cwd(), 'public');
}

async function prepareRenderPublicDir(input: {
  channelId: string;
  config: ChannelConfig;
  script: Script;
  imageManifest: ImageStageManifest;
  ttsManifest: TtsStageManifest;
}): Promise<{
  publicDir: string;
  audioFiles: AudioFile[];
  backgroundImage?: string;
  sceneImages?: string[];
}> {
  const publicDir = getProjectPublicDir();
  const publicAudioDir = path.join(publicDir, 'audio');
  const sharedAssetsDir = path.join(process.cwd(), 'output', input.channelId, 'assets');

  await fs.rm(publicDir, { recursive: true, force: true });
  await fs.mkdir(publicAudioDir, { recursive: true });

  try {
    await copyDir(sharedAssetsDir, path.join(publicDir, 'assets'));
  } catch {
    throw new Error(`Shared render assets not found: ${sharedAssetsDir}`);
  }

  await fs.writeFile(path.join(publicDir, 'script.json'), JSON.stringify(input.script, null, 2), 'utf-8');
  await fs.writeFile(path.join(publicDir, 'config.json'), JSON.stringify(input.config, null, 2), 'utf-8');
  await fs.writeFile(
    path.join(publicAudioDir, 'manifest.json'),
    JSON.stringify(input.ttsManifest.audioFiles, null, 2),
    'utf-8'
  );

  const audioFiles = await Promise.all(
    input.ttsManifest.audioFiles.map(async (audioFile) => {
      const filename = path.basename(audioFile.path);
      await fs.copyFile(audioFile.path, path.join(publicAudioDir, filename));
      return {
        ...audioFile,
        path: `audio/${filename}`,
      };
    })
  );

  const copiedBackgroundImage = input.imageManifest.backgroundImagePath
    ? await copyRenderAsset(input.imageManifest.backgroundImagePath, publicDir)
    : undefined;
  const sceneImages =
    input.imageManifest.sceneImagePaths.length > 0
      ? await Promise.all(
          input.imageManifest.sceneImagePaths.map((sceneImagePath) =>
            copyRenderAsset(sceneImagePath, publicDir)
          )
        )
      : undefined;

  return {
    publicDir,
    audioFiles,
    backgroundImage: copiedBackgroundImage ?? sceneImages?.[0],
    sceneImages,
  };
}

function createMainInputProps(input: {
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
  backgroundImage?: string;
  sceneImages?: string[];
}) {
  return {
    config: input.config,
    script: input.script,
    audioFiles: input.audioFiles,
    backgroundImage: input.backgroundImage,
    sceneImages: input.sceneImages,
    thumbnailPath: 'assets/thumbnail.png',
    viralNarrationPath: 'assets/intro-viral.mp3',
    viralNarrationDuration: 5.256,
    guideNarrationPath: 'assets/intro-narration.mp3',
    guideNarrationDuration: 3.936,
    stepNarrationPaths: [
      'assets/intro-step1.mp3',
      'assets/intro-step2.mp3',
      'assets/intro-step3.mp3',
      'assets/intro-step4.mp3',
    ],
    stepNarrationDurations: [8.52, 8.904, 9.72, 7.464],
    closingNarrationPath: 'assets/intro-closing.mp3',
    closingNarrationDuration: 2.952,
    stepTransitionTtsPaths: [
      'assets/step-transition-1.mp3',
      'assets/step-transition-2.mp3',
      'assets/step-transition-3.mp3',
      'assets/step-transition-4.mp3',
    ],
    stepTransitionBellPath: 'assets/bell.wav',
    endingBackgroundPath: 'assets/intro/background.png',
  };
}

function getShortsBackgroundImage(input: {
  sentenceId: number;
  scenePrompts?: Array<{ sentenceRange: [number, number] }>;
  sceneImages?: string[];
  fallbackBackgroundImage?: string;
}): string | undefined {
  if (input.scenePrompts && input.sceneImages && input.sceneImages.length > 0) {
    for (let i = 0; i < input.scenePrompts.length; i++) {
      const [start, end] = input.scenePrompts[i].sentenceRange;
      if (input.sentenceId >= start && input.sentenceId <= end) {
        return input.sceneImages[i] ?? input.sceneImages[0];
      }
    }
  }

  return input.fallbackBackgroundImage ?? input.sceneImages?.[0];
}

function isScriptPoolRecord(record: {
  kind?: string;
  parentRecordId?: string;
  currentStage: string;
  stageStates: {
    script: {
      currentVersion: number;
      approvedVersion: number | null;
    };
  };
}): boolean {
  return (
    record.kind === 'script_pool' ||
    (record.kind === 'candidate' &&
      Boolean(
        record.parentRecordId ||
          record.currentStage === 'script' ||
          record.stageStates.script.currentVersion > 0 ||
          record.stageStates.script.approvedVersion !== null
      ))
  );
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
      continue;
    }

    await fs.copyFile(srcPath, destPath);
  }
}

async function copyRenderAsset(sourcePath: string, publicDir: string): Promise<string> {
  const filename = path.basename(sourcePath);
  await fs.copyFile(sourcePath, path.join(publicDir, filename));
  return filename;
}
