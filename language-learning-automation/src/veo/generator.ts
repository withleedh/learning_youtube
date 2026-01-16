import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI, type GenerateVideosOperation } from '@google/genai';
import { getVeoApiKey, getVeoApiKeyManager } from '../config/gemini';
import type { VeoConfig, VeoRequest, VeoResult, VeoOperationStatus, ReferenceImage } from './types';
import { veoConfigSchema } from './types';

// Veo 3.1 모델
const VEO_MODEL = 'veo-3.1-generate-preview';

// 재시도 설정
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const POLLING_INTERVAL_MS = 10000; // 10초
const MAX_POLLING_TIME_MS = 600000; // 10분

// Reference image를 위한 타입
interface LoadedReferenceImage {
  imageBytes: string;
  mimeType: string;
  referenceType: 'asset' | 'style';
}

/**
 * Veo 3.1 영상 생성기
 * @google/genai SDK를 사용하여 reference images 지원
 * API 키 로테이션 지원
 */
export class VeoGenerator {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: getVeoApiKey() });
  }

  /**
   * 새 API 키로 클라이언트 재생성
   */
  private refreshClient(): void {
    this.client = new GoogleGenAI({ apiKey: getVeoApiKey() });
  }

  /**
   * 영상 생성 요청 제출
   */
  async generateVideo(request: VeoRequest): Promise<VeoResult> {
    const config = veoConfigSchema.parse(request.config || {});

    console.log(`🎬 Starting Veo video generation...`);
    console.log(`   Prompt: ${request.prompt.substring(0, 100)}...`);
    console.log(
      `   Config: ${config.aspectRatio}, ${config.durationSeconds}s, ${config.resolution}`
    );

    // Reference images 로드
    const referenceImages = await this.loadReferenceImages(request.referenceImages || []);
    if (referenceImages.length > 0) {
      console.log(`   Reference images: ${referenceImages.length}`);
    }

    // 영상 생성 요청 (재시도 로직 포함)
    const operation = await this.submitGenerationRequest(
      request.prompt,
      referenceImages,
      config,
      request.negativePrompt
    );

    const operationId = operation.name || 'unknown';
    console.log(`   Operation ID: ${operationId}`);

    // 완료까지 폴링
    const result = await this.pollUntilComplete(operation);

    return {
      ...result,
      operationId,
    };
  }

  /**
   * Reference 이미지 로드 및 base64 변환
   */
  private async loadReferenceImages(images: ReferenceImage[]): Promise<LoadedReferenceImage[]> {
    const loaded: LoadedReferenceImage[] = [];

    for (const img of images) {
      const imagePath = img.imagePath;

      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ Reference image not found: ${imagePath}`);
        continue;
      }

      const buffer = fs.readFileSync(imagePath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

      loaded.push({
        imageBytes: base64,
        mimeType,
        referenceType: img.referenceType || 'asset',
      });
    }

    return loaded;
  }

  /**
   * 영상 생성 요청 제출 (재시도 로직 포함)
   */
  private async submitGenerationRequest(
    prompt: string,
    referenceImages: LoadedReferenceImage[],
    config: VeoConfig,
    negativePrompt?: string
  ): Promise<GenerateVideosOperation> {
    // Reference images가 있으면 8초 필수, 16:9만 지원
    const duration = referenceImages.length > 0 ? 8 : parseInt(config.durationSeconds);
    const aspectRatio = referenceImages.length > 0 ? '16:9' : config.aspectRatio;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // SDK 요청 구성
        const requestConfig: Record<string, unknown> = {
          aspectRatio: aspectRatio,
          durationSeconds: duration,
          personGeneration: config.personGeneration,
        };

        // Negative prompt 추가
        if (negativePrompt) {
          requestConfig.negativePrompt = negativePrompt;
        }

        // Reference images 추가
        if (referenceImages.length > 0) {
          requestConfig.referenceImages = referenceImages.map((img) => ({
            image: {
              imageBytes: img.imageBytes,
              mimeType: img.mimeType,
            },
            referenceType: img.referenceType,
          }));
        }

        // generateVideos 호출
        const operation = await this.client.models.generateVideos({
          model: VEO_MODEL,
          prompt: prompt,
          config: requestConfig,
        });

        return operation;
      } catch (error) {
        lastError = error as Error;
        const errorMsg = lastError.message;

        // 할당량 초과 에러면 다음 키로 전환
        if (
          errorMsg.includes('429') ||
          errorMsg.includes('RESOURCE_EXHAUSTED') ||
          errorMsg.includes('quota')
        ) {
          const hasMoreKeys = getVeoApiKeyManager().markCurrentKeyExhausted();
          if (hasMoreKeys) {
            this.refreshClient();
            // 키 전환 후 즉시 재시도 (attempt 카운트 리셋하지 않음)
            continue;
          }
          // 모든 키 소진됨
          throw new Error('All API keys exhausted. Please wait for quota reset.');
        }

        console.warn(`⚠️ Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${errorMsg}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`   Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * 작업 상태 확인
   */
  async checkOperationStatus(operationId: string): Promise<VeoOperationStatus> {
    try {
      // REST API로 상태 확인
      const apiKey = getVeoApiKey();
      const url = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        return 'failed';
      }

      const data = (await response.json()) as { done?: boolean; error?: unknown };

      if (data.error) {
        return 'failed';
      }

      if (data.done) {
        return 'completed';
      }

      return 'running';
    } catch {
      return 'failed';
    }
  }

  /**
   * 완료까지 폴링
   */
  private async pollUntilComplete(initialOperation: GenerateVideosOperation): Promise<VeoResult> {
    const startTime = Date.now();
    let currentOp = initialOperation;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    console.log(`⏳ Polling for completion...`);

    while (Date.now() - startTime < MAX_POLLING_TIME_MS) {
      if (currentOp.done) {
        console.log(`✅ Video generation completed!`);
        return this.extractResult(currentOp);
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   Status: running (${elapsed}s elapsed)`);

      await this.sleep(POLLING_INTERVAL_MS);

      // 상태 갱신 - 네트워크 에러 재시도
      try {
        currentOp = await this.client.operations.getVideosOperation({
          operation: currentOp,
        });
        consecutiveErrors = 0; // 성공하면 리셋

        if (currentOp.error) {
          throw new Error(`Video generation failed: ${currentOp.error.message || 'Unknown error'}`);
        }
      } catch (error) {
        const err = error as Error;
        // 네트워크 에러면 재시도
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          consecutiveErrors++;
          console.warn(
            `   ⚠️ Network error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${err.message}`
          );

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            throw new Error(`Too many consecutive network errors: ${err.message}`);
          }
          // 재시도 전 잠시 대기
          await this.sleep(5000);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Video generation timed out after ${MAX_POLLING_TIME_MS / 1000}s`);
  }

  /**
   * 결과에서 비디오 정보 추출
   */
  private extractResult(operation: GenerateVideosOperation): VeoResult {
    const response = operation.response;
    const generatedVideo = response?.generatedVideos?.[0];
    const videoUri = generatedVideo?.video?.uri;

    if (!videoUri) {
      console.log('Operation response:', JSON.stringify(operation, null, 2));
      throw new Error('No video URI in operation result');
    }

    return {
      videoPath: videoUri,
      duration: 8,
      hasAudio: true,
      operationId: operation.name || '',
      // 연장용으로 video 객체 저장
      _videoObject: generatedVideo?.video,
    };
  }

  /**
   * 영상 연장 (7초씩 추가, 최대 20회)
   * Veo 3.1에서만 지원, 720p로 자동 변환됨
   */
  async extendVideo(
    previousResult: VeoResult,
    prompt: string,
    options?: {
      negativePrompt?: string;
    }
  ): Promise<VeoResult> {
    if (!previousResult._videoObject) {
      throw new Error('Previous result does not contain video object for extension');
    }

    console.log(`🎬 Extending video by 7 seconds...`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const requestConfig: Record<string, unknown> = {
          // 연장 시 720p, 8초 고정
          durationSeconds: 8,
          personGeneration: 'allow_all',
        };

        if (options?.negativePrompt) {
          requestConfig.negativePrompt = options.negativePrompt;
        }

        // 영상 연장 요청
        const operation = await this.client.models.generateVideos({
          model: VEO_MODEL,
          prompt: prompt,
          video: previousResult._videoObject,
          config: requestConfig,
        });

        const operationId = operation.name || 'unknown';
        console.log(`   Operation ID: ${operationId}`);

        // 완료까지 폴링
        const result = await this.pollUntilComplete(operation);

        return {
          ...result,
          duration: previousResult.duration + 7, // 7초 추가
          operationId,
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError.message}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`   Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * 영상 생성 후 원하는 길이까지 연장
   * @param request 초기 영상 생성 요청
   * @param targetDuration 목표 길이 (초)
   * @param extensionPrompt 연장 시 사용할 프롬프트 (없으면 원본 프롬프트 사용)
   */
  async generateAndExtend(
    request: VeoRequest,
    targetDuration: number,
    extensionPrompt?: string
  ): Promise<VeoResult> {
    // 초기 영상 생성 (8초)
    let result = await this.generateVideo(request);
    let currentDuration = 8;

    const extPrompt = extensionPrompt || request.prompt;

    // 목표 길이까지 연장 (7초씩)
    while (currentDuration < targetDuration && currentDuration < 141) {
      console.log(`\n📈 Current: ${currentDuration}s, Target: ${targetDuration}s`);

      result = await this.extendVideo(result, extPrompt, {
        negativePrompt: request.negativePrompt,
      });

      currentDuration += 7;
    }

    console.log(`\n✅ Final video duration: ~${currentDuration}s`);
    return result;
  }

  /**
   * 영상 다운로드
   */
  async downloadVideo(videoUri: string, outputPath: string): Promise<string> {
    console.log(`📥 Downloading video to: ${outputPath}`);

    // 출력 디렉토리 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // API 키를 URL에 추가
    const apiKey = getVeoApiKey();
    const downloadUrl = videoUri.includes('?')
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`;

    // 비디오 다운로드
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Video saved: ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

    return outputPath;
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
export const veoGenerator = new VeoGenerator();
