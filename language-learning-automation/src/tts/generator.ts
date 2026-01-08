import { promises as fs } from 'fs';
import path from 'path';
import type { Sentence, Script } from '../script/types';
import type { ChannelConfig } from '../config/types';
import {
  type AudioFile,
  type AudioGenerationResult,
  type SpeedVariant,
  selectVoice,
  generateAudioFilename,
  speedVariants,
} from './types';
import { generateAllSpeedsWithEdge, type EdgeVoice } from './edge';
import { generateAllSpeedsWithGoogle } from './google';

// Maximum retry attempts for TTS generation
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Generate TTS audio for a single sentence with all speed variants
 */
export async function generateSentenceAudio(
  sentence: Sentence,
  config: ChannelConfig,
  outputDir: string
): Promise<AudioGenerationResult[]> {
  const voice = selectVoice(sentence.speaker, config.tts.maleVoice, config.tts.femaleVoice);
  const gender = sentence.speaker === 'M' ? 'MALE' : 'FEMALE';

  // Switch based on provider
  switch (config.tts.provider) {
    case 'google':
      return generateAllSpeedsWithGoogle(
        sentence.target,
        config.tts.targetLanguageCode,
        voice,
        gender as 'MALE' | 'FEMALE',
        outputDir,
        sentence.id,
        sentence.speaker
      );

    case 'edge':
    default:
      // Use Edge TTS (free, high quality)
      return generateAllSpeedsWithEdge(
        sentence.target,
        voice as EdgeVoice,
        outputDir,
        sentence.id,
        sentence.speaker
      );
  }
}

/**
 * Generate TTS audio for all sentences in a script
 */
export async function generateAllAudio(
  script: Script,
  config: ChannelConfig,
  outputDir: string,
  onProgress?: (current: number, total: number) => void
): Promise<AudioFile[]> {
  const audioFiles: AudioFile[] = [];
  const totalSentences = script.sentences.length;

  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];

    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalSentences);
    }

    // Generate with retry logic
    let results: AudioGenerationResult[] = [];
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        results = await generateSentenceAudio(sentence, config, outputDir);

        // Check if all succeeded
        const allSucceeded = results.every((r) => r.success);
        if (allSucceeded) {
          break;
        }

        // Some failed, retry
        attempts++;
        if (attempts < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempts));
        }
      } catch (error) {
        attempts++;
        if (attempts >= MAX_RETRIES) {
          console.error(
            `Failed to generate audio for sentence ${sentence.id} after ${MAX_RETRIES} attempts`
          );
        } else {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempts));
        }
      }
    }

    // Collect successful results
    for (const result of results) {
      if (result.success && result.audioFile) {
        audioFiles.push(result.audioFile);
      }
    }
  }

  return audioFiles;
}

/**
 * Create mock audio files for testing (without actual TTS API calls)
 */
export async function createMockAudioFiles(
  script: Script,
  outputDir: string
): Promise<AudioFile[]> {
  const audioFiles: AudioFile[] = [];

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  for (const sentence of script.sentences) {
    for (const speed of speedVariants) {
      const filename = generateAudioFilename(sentence.id, sentence.speaker, speed);
      const filePath = path.join(outputDir, filename);

      // Create empty placeholder file
      await fs.writeFile(filePath, Buffer.alloc(0));

      audioFiles.push({
        sentenceId: sentence.id,
        speaker: sentence.speaker,
        speed,
        path: filePath,
        duration: 3.0, // Mock duration
      });
    }
  }

  return audioFiles;
}

/**
 * Get audio files for a specific sentence
 */
export function getAudioFilesForSentence(audioFiles: AudioFile[], sentenceId: number): AudioFile[] {
  return audioFiles.filter((af) => af.sentenceId === sentenceId);
}

/**
 * Get audio file for specific sentence and speed
 */
export function getAudioFile(
  audioFiles: AudioFile[],
  sentenceId: number,
  speed: SpeedVariant
): AudioFile | undefined {
  return audioFiles.find((af) => af.sentenceId === sentenceId && af.speed === speed);
}
