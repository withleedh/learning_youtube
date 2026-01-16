import { promises as fs } from 'fs';
import path from 'path';
import type { Sentence, Script } from '../script/types';
import type { ChannelConfig } from '../config/types';
import {
  type AudioFile,
  type AudioGenerationResult,
  type SpeedVariant,
  generateAudioFilename,
  speedVariants,
} from './types';
import { generateAllSpeedsWithEdge, type EdgeVoice } from './edge';
import { generateAllSpeedsWithGoogle, selectRandomVoice, getPitchForGender } from './google';

// Maximum retry attempts for TTS generation
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Episode voice selection (fixed for entire episode)
export interface EpisodeVoices {
  maleVoice: string;
  femaleVoice: string;
  malePitch: number;
  femalePitch: number;
}

/**
 * Select random voices for an episode (Google TTS)
 * Call this once at the start of episode generation
 */
export function selectEpisodeVoices(): EpisodeVoices {
  return {
    maleVoice: selectRandomVoice('MALE'),
    femaleVoice: selectRandomVoice('FEMALE'),
    malePitch: getPitchForGender('MALE'),
    femalePitch: getPitchForGender('FEMALE'),
  };
}

/**
 * Generate TTS audio for a single sentence with all speed variants
 */
export async function generateSentenceAudio(
  sentence: Sentence,
  config: ChannelConfig,
  outputDir: string,
  episodeVoices?: EpisodeVoices
): Promise<AudioGenerationResult[]> {
  const gender = sentence.speaker === 'M' ? 'MALE' : 'FEMALE';

  // Switch based on provider
  switch (config.tts.provider) {
    case 'google': {
      // Use episode voices if provided (random selection), otherwise use config
      const voice = episodeVoices
        ? sentence.speaker === 'M'
          ? episodeVoices.maleVoice
          : episodeVoices.femaleVoice
        : sentence.speaker === 'M'
          ? config.tts.maleVoice
          : config.tts.femaleVoice;
      const pitch = episodeVoices
        ? sentence.speaker === 'M'
          ? episodeVoices.malePitch
          : episodeVoices.femalePitch
        : undefined;

      return generateAllSpeedsWithGoogle(
        sentence.target,
        config.tts.targetLanguageCode,
        voice,
        gender as 'MALE' | 'FEMALE',
        outputDir,
        sentence.id,
        sentence.speaker,
        pitch
      );
    }

    case 'edge':
    default: {
      // Use config voices for Edge TTS
      const voice = sentence.speaker === 'M' ? config.tts.maleVoice : config.tts.femaleVoice;
      return generateAllSpeedsWithEdge(
        sentence.target,
        voice as EdgeVoice,
        outputDir,
        sentence.id,
        sentence.speaker
      );
    }
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

  // Select random voices for this episode (Google TTS only)
  let episodeVoices: EpisodeVoices | undefined;
  if (config.tts.provider === 'google') {
    episodeVoices = selectEpisodeVoices();
    console.log(`   🎤 Selected voices for episode:`);
    console.log(`      Male: ${episodeVoices.maleVoice} (pitch: ${episodeVoices.malePitch})`);
    console.log(`      Female: ${episodeVoices.femaleVoice} (pitch: ${episodeVoices.femalePitch})`);
  }

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
        results = await generateSentenceAudio(sentence, config, outputDir, episodeVoices);

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
