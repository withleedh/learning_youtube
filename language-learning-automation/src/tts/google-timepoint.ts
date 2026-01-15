/**
 * Google TTS with Timepoint Extraction Module
 *
 * Extends Google Cloud TTS functionality to extract word-level timepoints
 * using SSML marks and enableTimePointing option.
 */

import { z } from 'zod';
import type { WordMapEntry } from './ssml-injector';

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TimepointTTSRequest {
  ssml: string;
  languageCode: string;
  voiceName: string;
  gender: 'MALE' | 'FEMALE';
  speakingRate: number;
  pitch?: number; // Speaker differentiation (-20.0 ~ 20.0)
}

export interface Timepoint {
  markName: string; // "index_0"
  timeSeconds: number; // 0.52
}

export interface TimepointTTSResponse {
  audioBuffer: Buffer;
  timepoints: Timepoint[];
}

export interface WordSync {
  word: string;
  start: number; // startInSeconds
  end: number; // endInSeconds (next word's start or audio end)
}

export interface ScriptSyncData {
  sentenceId: number;
  text: string;
  audioFile: string;
  speaker?: 'A' | 'B';
  words: WordSync[];
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const timepointSchema = z.object({
  markName: z.string(),
  timeSeconds: z.number().min(0),
});

export const wordSyncSchema = z.object({
  word: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});

export const scriptSyncDataSchema = z.object({
  sentenceId: z.number().int().positive(),
  text: z.string(),
  audioFile: z.string(),
  speaker: z.enum(['A', 'B']).optional(),
  words: z.array(wordSyncSchema),
});

export const syncManifestSchema = z.object({
  sentences: z.array(scriptSyncDataSchema),
  totalDuration: z.number(),
  mode: z.enum(['dialogue', 'narrator']),
});

export type SyncManifest = z.infer<typeof syncManifestSchema>;

// ============================================================================
// Error Types
// ============================================================================

export class TimepointTTSError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'AUTH_ERROR'
      | 'API_ERROR'
      | 'TIMEOUT_ERROR'
      | 'INCOMPLETE_TIMEPOINTS'
      | 'QUOTA_EXCEEDED'
  ) {
    super(message);
    this.name = 'TimepointTTSError';
  }
}

// ============================================================================
// Google API Response Types
// ============================================================================

interface GoogleTTSTimepointResponse {
  audioContent: string; // base64 encoded audio
  timepoints?: Array<{
    markName: string;
    timeSeconds: number;
  }>;
}

interface GoogleTTSRequestBody {
  input: { ssml: string };
  voice: {
    languageCode: string;
    name: string;
    ssmlGender: 'MALE' | 'FEMALE';
  };
  audioConfig: {
    audioEncoding: 'MP3';
    speakingRate: number;
    pitch?: number;
  };
  enableTimePointing: ['SSML_MARK'];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get access token from gcloud CLI (Application Default Credentials)
 */
async function getAccessToken(): Promise<string> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    throw new TimepointTTSError(
      'Failed to get gcloud access token. Make sure you are logged in with: gcloud auth login',
      'AUTH_ERROR'
    );
  }
}

/**
 * Get audio duration from buffer using music-metadata
 */
async function getAudioDuration(audioBuffer: Buffer): Promise<number> {
  try {
    const { parseBuffer } = await import('music-metadata');
    const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    return metadata.format.duration || 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Synthesize speech with SSML marks and extract timepoints.
 *
 * @param request - TTS request with SSML containing marks
 * @returns Audio buffer and extracted timepoints
 * @throws TimepointTTSError on API or authentication errors
 *
 * @example
 * ```typescript
 * const result = await synthesizeWithTimepoints({
 *   ssml: '<speak><mark name="index_0"/>Hello <mark name="index_1"/>world!</speak>',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   gender: 'FEMALE',
 *   speakingRate: 1.0,
 * });
 * // result.timepoints = [
 * //   { markName: 'index_0', timeSeconds: 0.0 },
 * //   { markName: 'index_1', timeSeconds: 0.52 }
 * // ]
 * ```
 */
export async function synthesizeWithTimepoints(
  request: TimepointTTSRequest
): Promise<TimepointTTSResponse> {
  const accessToken = await getAccessToken();

  const requestBody: GoogleTTSRequestBody = {
    input: { ssml: request.ssml },
    voice: {
      languageCode: request.languageCode,
      name: request.voiceName,
      ssmlGender: request.gender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: request.speakingRate,
      ...(request.pitch !== undefined && { pitch: request.pitch }),
    },
    enableTimePointing: ['SSML_MARK'],
  };

  const response = await fetch(GOOGLE_TTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Goog-User-Project': process.env.GOOGLE_CLOUD_PROJECT || 'project-7041221e-8ba7-4667-971',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new TimepointTTSError(`Authentication failed: ${errorText}`, 'AUTH_ERROR');
    }

    if (response.status === 429) {
      throw new TimepointTTSError(`Quota exceeded: ${errorText}`, 'QUOTA_EXCEEDED');
    }

    throw new TimepointTTSError(
      `Google TTS API error: ${response.status} - ${errorText}`,
      'API_ERROR'
    );
  }

  const data = (await response.json()) as GoogleTTSTimepointResponse;
  const audioBuffer = Buffer.from(data.audioContent, 'base64');

  // Parse timepoints from response
  const timepoints: Timepoint[] = (data.timepoints || []).map((tp) => ({
    markName: tp.markName,
    timeSeconds: tp.timeSeconds,
  }));

  return {
    audioBuffer,
    timepoints,
  };
}

/**
 * Build sync data from word map and timepoints.
 *
 * Calculates end times for each word using the next word's start time.
 * Handles incomplete timepoint data by estimating missing timestamps.
 *
 * @param wordMap - Word map from SSML injector
 * @param timepoints - Timepoints from TTS API response
 * @param audioDuration - Total audio duration in seconds
 * @param sentenceId - Sentence identifier
 * @param text - Original sentence text
 * @param audioFile - Path to the audio file
 * @param speaker - Optional speaker identifier for dialogue mode
 * @returns ScriptSyncData with word-level timing information
 *
 * @example
 * ```typescript
 * const syncData = buildSyncData(
 *   [{ markName: 'index_0', word: 'Hello', index: 0 }, { markName: 'index_1', word: 'world!', index: 1 }],
 *   [{ markName: 'index_0', timeSeconds: 0.0 }, { markName: 'index_1', timeSeconds: 0.52 }],
 *   1.2,
 *   1,
 *   'Hello world!',
 *   'audio/sentence_01.mp3'
 * );
 * // syncData.words = [
 * //   { word: 'Hello', start: 0.0, end: 0.52 },
 * //   { word: 'world!', start: 0.52, end: 1.2 }
 * // ]
 * ```
 */
export function buildSyncData(
  wordMap: WordMapEntry[],
  timepoints: Timepoint[],
  audioDuration: number,
  sentenceId: number,
  text: string,
  audioFile: string,
  speaker?: 'A' | 'B'
): ScriptSyncData {
  // Create a map for quick timepoint lookup
  const timepointMap = new Map<string, number>();
  for (const tp of timepoints) {
    timepointMap.set(tp.markName, tp.timeSeconds);
  }

  const words: WordSync[] = [];
  const wordCount = wordMap.length;

  // Check if we have incomplete timepoint data
  const hasIncompleteData = timepoints.length < wordCount;

  if (hasIncompleteData && wordCount > 0) {
    // Estimate timestamps based on audio duration and word count
    const estimatedWordDuration = audioDuration / wordCount;

    for (let i = 0; i < wordCount; i++) {
      const entry = wordMap[i];
      const existingTime = timepointMap.get(entry.markName);

      // Use existing timepoint if available, otherwise estimate
      const start = existingTime !== undefined ? existingTime : i * estimatedWordDuration;

      // Calculate end time
      let end: number;
      if (i < wordCount - 1) {
        const nextEntry = wordMap[i + 1];
        const nextTime = timepointMap.get(nextEntry.markName);
        end = nextTime !== undefined ? nextTime : (i + 1) * estimatedWordDuration;
      } else {
        end = audioDuration;
      }

      words.push({
        word: entry.word,
        start,
        end,
      });
    }
  } else {
    // We have complete timepoint data
    for (let i = 0; i < wordCount; i++) {
      const entry = wordMap[i];
      const start = timepointMap.get(entry.markName) ?? 0;

      // Calculate end time using next word's start or audio duration
      let end: number;
      if (i < wordCount - 1) {
        const nextEntry = wordMap[i + 1];
        end = timepointMap.get(nextEntry.markName) ?? audioDuration;
      } else {
        end = audioDuration;
      }

      words.push({
        word: entry.word,
        start,
        end,
      });
    }
  }

  const syncData: ScriptSyncData = {
    sentenceId,
    text,
    audioFile,
    words,
  };

  if (speaker) {
    syncData.speaker = speaker;
  }

  return syncData;
}

/**
 * Synthesize speech with pitch adjustment for speaker differentiation.
 *
 * @param request - TTS request with optional pitch adjustment
 * @returns Audio buffer and timepoints
 *
 * @example
 * ```typescript
 * // Speaker A with higher pitch
 * const speakerA = await synthesizeWithPitch({
 *   ssml: '<speak>Hello!</speak>',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   gender: 'FEMALE',
 *   speakingRate: 1.0,
 *   pitch: 2.0, // Higher pitch for Speaker A
 * });
 *
 * // Speaker B with lower pitch
 * const speakerB = await synthesizeWithPitch({
 *   ssml: '<speak>Hi there!</speak>',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   gender: 'FEMALE',
 *   speakingRate: 1.0,
 *   pitch: -2.0, // Lower pitch for Speaker B
 * });
 * ```
 */
export async function synthesizeWithPitch(
  request: TimepointTTSRequest
): Promise<TimepointTTSResponse> {
  // Validate pitch range
  if (request.pitch !== undefined && (request.pitch < -20 || request.pitch > 20)) {
    throw new TimepointTTSError(
      `Pitch must be between -20.0 and 20.0, got ${request.pitch}`,
      'API_ERROR'
    );
  }

  return synthesizeWithTimepoints(request);
}

/**
 * Generate sync data for a sentence with full pipeline.
 *
 * Combines SSML injection, TTS synthesis, and sync data building.
 *
 * @param text - Original sentence text
 * @param sentenceId - Sentence identifier
 * @param audioFile - Output audio file path
 * @param options - TTS options
 * @returns Audio buffer and sync data
 */
export async function generateSyncDataForSentence(
  text: string,
  sentenceId: number,
  audioFile: string,
  options: {
    languageCode: string;
    voiceName: string;
    gender: 'MALE' | 'FEMALE';
    speakingRate?: number;
    pitch?: number;
    speaker?: 'A' | 'B';
  }
): Promise<{
  audioBuffer: Buffer;
  syncData: ScriptSyncData;
}> {
  // Import SSML injector
  const { injectSSMLMarks } = await import('./ssml-injector');

  // Inject SSML marks
  const { ssml, wordMap } = injectSSMLMarks({ text, sentenceId });

  // Synthesize with timepoints
  const { audioBuffer, timepoints } = await synthesizeWithTimepoints({
    ssml,
    languageCode: options.languageCode,
    voiceName: options.voiceName,
    gender: options.gender,
    speakingRate: options.speakingRate ?? 1.0,
    pitch: options.pitch,
  });

  // Get audio duration
  const audioDuration = await getAudioDuration(audioBuffer);

  // Build sync data
  const syncData = buildSyncData(
    wordMap,
    timepoints,
    audioDuration,
    sentenceId,
    text,
    audioFile,
    options.speaker
  );

  return {
    audioBuffer,
    syncData,
  };
}
