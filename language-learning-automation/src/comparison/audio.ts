import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { ComparisonScript, ComparisonSegment } from './types';
import { synthesizeWithGoogle } from '../tts/google';
import type { EdgeVoice } from '../tts/edge';

// TTS Provider type for comparison audio
export type ComparisonTTSProvider = 'google' | 'edge';

// Voice configuration for comparison content
export interface ComparisonVoiceConfig {
  provider: ComparisonTTSProvider;
  // Korean voices (for situation and explanation)
  koreanVoice: string;
  koreanLanguageCode: string; // e.g., 'ko-KR'
  // English voices (for Korean expression and native expression)
  englishVoice: string;
  englishLanguageCode: string; // e.g., 'en-US'
}

// Audio file metadata for comparison segments
export const comparisonAudioFileSchema = z.object({
  segmentId: z.number().int().positive(),
  phase: z.enum(['situation', 'korean', 'native', 'explanation']),
  path: z.string().min(1),
  duration: z.number().min(0),
  text: z.string().min(1),
});

export type ComparisonAudioFile = z.infer<typeof comparisonAudioFileSchema>;

// Audio generation result for comparison
export interface ComparisonAudioResult {
  success: boolean;
  audioFile?: ComparisonAudioFile;
  error?: string;
}

// Full audio set for a segment
export interface SegmentAudioSet {
  segmentId: number;
  situation?: ComparisonAudioFile;
  korean?: ComparisonAudioFile;
  native?: ComparisonAudioFile;
  explanation?: ComparisonAudioFile;
}

// Audio manifest for a comparison script
export interface ComparisonAudioManifest {
  scriptDate: string;
  channelId: string;
  segments: SegmentAudioSet[];
  totalDuration: number;
}

// Default voice configurations
export const DEFAULT_VOICE_CONFIG: ComparisonVoiceConfig = {
  provider: 'google',
  koreanVoice: 'ko-KR-Chirp3-HD-Achird',
  koreanLanguageCode: 'ko-KR',
  englishVoice: 'en-US-Neural2-D',
  englishLanguageCode: 'en-US',
};

// Maximum retry attempts
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Generate audio filename for comparison segment phase
 */
export function generateComparisonAudioFilename(
  segmentId: number,
  phase: ComparisonAudioFile['phase']
): string {
  return `segment_${segmentId.toString().padStart(2, '0')}_${phase}.mp3`;
}

/**
 * Generate TTS audio for a single text using Google TTS
 */
async function generateWithGoogleTTS(
  text: string,
  languageCode: string,
  voiceName: string,
  outputPath: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  try {
    const audioBuffer = await synthesizeWithGoogle(
      text,
      languageCode,
      voiceName,
      'MALE', // Default gender
      1.0 // Normal speed
    );

    await fs.writeFile(outputPath, audioBuffer);

    // Get actual audio duration
    let duration = 3.0; // fallback
    try {
      const { parseBuffer } = await import('music-metadata');
      const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
      duration = metadata.format.duration || 3.0;
    } catch {
      // Fallback: estimate based on character count
      const charCount = text.length;
      duration = charCount * 0.1; // ~0.1 seconds per character
    }

    return { success: true, duration };
  } catch (error) {
    return {
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate TTS audio for a single text using Edge TTS
 */
async function generateWithEdgeTTS(
  text: string,
  voice: EdgeVoice,
  outputPath: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  try {
    const { EdgeTTS } = await import('@andresaya/edge-tts');

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, { rate: '+0%' });

    const audioBuffer = await tts.toBuffer();
    await fs.writeFile(outputPath, audioBuffer);

    // Estimate duration based on text length
    const wordCount = text.split(/\s+/).length;
    const duration = Math.max((wordCount / 150) * 60, 1.5);

    return { success: true, duration };
  } catch (error) {
    return {
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate audio for a single phase of a comparison segment
 */
export async function generatePhaseAudio(
  segmentId: number,
  phase: ComparisonAudioFile['phase'],
  text: string,
  voiceConfig: ComparisonVoiceConfig,
  outputDir: string
): Promise<ComparisonAudioResult> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const filename = generateComparisonAudioFilename(segmentId, phase);
  const outputPath = path.join(outputDir, filename);

  // Determine language based on phase
  // situation and explanation are in Korean
  // korean and native expressions are in English
  const isKorean = phase === 'situation' || phase === 'explanation';
  const languageCode = isKorean ? voiceConfig.koreanLanguageCode : voiceConfig.englishLanguageCode;
  const voice = isKorean ? voiceConfig.koreanVoice : voiceConfig.englishVoice;

  let result: { success: boolean; duration: number; error?: string };

  if (voiceConfig.provider === 'google') {
    result = await generateWithGoogleTTS(text, languageCode, voice, outputPath);
  } else {
    result = await generateWithEdgeTTS(text, voice as EdgeVoice, outputPath);
  }

  if (result.success) {
    return {
      success: true,
      audioFile: {
        segmentId,
        phase,
        path: outputPath,
        duration: result.duration,
        text,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Generate all audio files for a single comparison segment
 */
export async function generateSegmentAudio(
  segment: ComparisonSegment,
  voiceConfig: ComparisonVoiceConfig,
  outputDir: string,
  onProgress?: (phase: string) => void
): Promise<SegmentAudioSet> {
  const result: SegmentAudioSet = { segmentId: segment.id };

  const phases: Array<{
    phase: ComparisonAudioFile['phase'];
    text: string;
  }> = [
    { phase: 'situation', text: segment.situation },
    { phase: 'korean', text: segment.koreanExpression.text },
    { phase: 'native', text: segment.nativeExpression.text },
    { phase: 'explanation', text: segment.explanation },
  ];

  for (const { phase, text } of phases) {
    if (onProgress) {
      onProgress(phase);
    }

    let attempts = 0;
    let audioResult: ComparisonAudioResult | null = null;

    while (attempts < MAX_RETRIES) {
      audioResult = await generatePhaseAudio(segment.id, phase, text, voiceConfig, outputDir);

      if (audioResult.success) {
        break;
      }

      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempts));
      }
    }

    if (audioResult?.success && audioResult.audioFile) {
      result[phase] = audioResult.audioFile;
    } else {
      console.error(
        `Failed to generate ${phase} audio for segment ${segment.id}: ${audioResult?.error}`
      );
    }

    // Small delay between phases to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return result;
}

/**
 * Generate all audio files for a comparison script
 */
export async function generateAllComparisonAudio(
  script: ComparisonScript,
  voiceConfig: ComparisonVoiceConfig,
  outputDir: string,
  onProgress?: (current: number, total: number, phase: string) => void
): Promise<ComparisonAudioManifest> {
  const segments: SegmentAudioSet[] = [];
  let totalDuration = 0;

  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];

    const segmentAudio = await generateSegmentAudio(segment, voiceConfig, outputDir, (phase) => {
      if (onProgress) {
        onProgress(i + 1, script.segments.length, phase);
      }
    });

    segments.push(segmentAudio);

    // Calculate segment duration
    const segmentDuration =
      (segmentAudio.situation?.duration || 0) +
      (segmentAudio.korean?.duration || 0) +
      (segmentAudio.native?.duration || 0) +
      (segmentAudio.explanation?.duration || 0);

    totalDuration += segmentDuration;
  }

  return {
    scriptDate: script.date,
    channelId: script.channelId,
    segments,
    totalDuration,
  };
}

/**
 * Save audio manifest to JSON file
 */
export async function saveAudioManifest(
  manifest: ComparisonAudioManifest,
  outputDir: string
): Promise<string> {
  const manifestPath = path.join(outputDir, 'audio_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

/**
 * Load audio manifest from JSON file
 */
export async function loadAudioManifest(manifestPath: string): Promise<ComparisonAudioManifest> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as ComparisonAudioManifest;
}

/**
 * Get total audio duration for a segment
 */
export function getSegmentDuration(segmentAudio: SegmentAudioSet): number {
  return (
    (segmentAudio.situation?.duration || 0) +
    (segmentAudio.korean?.duration || 0) +
    (segmentAudio.native?.duration || 0) +
    (segmentAudio.explanation?.duration || 0)
  );
}

/**
 * Create voice config from channel config TTS settings
 */
export function createVoiceConfigFromChannel(
  channelTTS: {
    provider: string;
    maleVoice: string;
    femaleVoice: string;
    targetLanguageCode: string;
  },
  koreanVoice?: string,
  koreanLanguageCode?: string
): ComparisonVoiceConfig {
  return {
    provider: channelTTS.provider as ComparisonTTSProvider,
    koreanVoice: koreanVoice || 'ko-KR-Chirp3-HD-Achird',
    koreanLanguageCode: koreanLanguageCode || 'ko-KR',
    englishVoice: channelTTS.maleVoice,
    englishLanguageCode: channelTTS.targetLanguageCode,
  };
}
