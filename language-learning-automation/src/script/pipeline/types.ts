import { z } from 'zod';
import type { Category, Script, Sentence, ScenePrompt, Character } from '../types';
import type { ChannelConfig } from '../../config/types';

// ============================================================================
// Screenplay Format Types (Creative Phase Output)
// ============================================================================

/**
 * A character in the screenplay format
 */
export interface ScreenplayCharacter {
  id: 'M' | 'F';
  name: string;
  description: string;
}

/**
 * A single line of dialogue in the screenplay
 */
export interface ScreenplayLine {
  speaker: 'M' | 'F' | 'NARRATOR';
  line: string;
  emotion?: string;
  action?: string;
}

/**
 * A scene in the screenplay format
 */
export interface ScreenplayScene {
  sceneNumber: number;
  setting: string;
  dialogue: ScreenplayLine[];
}

/**
 * Output from the Creative Generator phase
 * Human-readable screenplay format without JSON constraints
 */
export interface ScreenplayOutput {
  title: string;
  characters: ScreenplayCharacter[];
  scenes: ScreenplayScene[];
  rawText: string;
}

// ============================================================================
// Structural Phase Types
// ============================================================================

/**
 * Input for the Creative Generator phase
 */
export interface CreativeGeneratorInput {
  topic: string;
  category: Category;
  config: ChannelConfig;
  sentenceCount: number;
}

/**
 * Input for the Structural Converter phase
 */
export interface StructuralConverterInput {
  screenplay: ScreenplayOutput;
  config: ChannelConfig;
  targetLanguage: string;
  nativeLanguage: string;
}

/**
 * Output from the Structural Converter phase
 * Contains structured sentences ready for educational use
 */
export interface StructuredSentences {
  metadata: {
    topic: string;
    style: string;
    title: { target: string; native: string };
    characters: Character[];
  };
  sentences: Sentence[];
}

// ============================================================================
// Visual Phase Types
// ============================================================================

/**
 * Input for the Visual Generator phase
 */
export interface VisualGeneratorInput {
  structuredScript: StructuredSentences;
  config: ChannelConfig;
}

/**
 * Output from the Visual Generator phase
 */
export interface VisualOutput {
  characters: Character[];
  scenePrompts: ScenePrompt[];
}

// ============================================================================
// Pipeline Configuration and Result Types
// ============================================================================

/**
 * Configuration options for the pipeline
 *
 * **Validates: Requirements 4.5, 5.3**
 */
export interface PipelineConfig {
  /**
   * Enable the entire pipeline (default: true)
   * When false, falls back to legacy single-shot generation
   *
   * **Validates: Requirement 5.3**
   */
  pipelineEnabled: boolean;
  /** Enable the creative phase (default: true) */
  enableCreativePhase: boolean;
  /** Enable the structural phase (default: true) */
  enableStructuralPhase: boolean;
  /** Enable the visual phase (default: true) */
  enableVisualPhase: boolean;
  /** Maximum retries per phase */
  maxRetries: {
    creative: number;
    structural: number;
    visual: number;
  };
  /** Number of candidate scripts to generate (for future use) */
  candidateCount: number;
}

/**
 * Default pipeline configuration
 *
 * **Validates: Requirements 4.5, 5.3**
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  pipelineEnabled: true,
  enableCreativePhase: true,
  enableStructuralPhase: true,
  enableVisualPhase: true,
  maxRetries: {
    creative: 2,
    structural: 3,
    visual: 2,
  },
  candidateCount: 1,
};

/**
 * Timing and retry information for a single phase
 */
export interface PhaseMetrics {
  duration: number;
  retries: number;
}

/**
 * Result from a successful pipeline execution
 */
export interface PipelineResult {
  script: Script;
  phases: {
    creative: PhaseMetrics;
    structural: PhaseMetrics;
    visual: PhaseMetrics;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Detailed validation error for a specific field
 */
export interface ValidationError {
  field: string;
  expected: string;
  actual: string;
  sentenceId?: number;
}

/**
 * Error information for a specific phase
 */
export interface PhaseError {
  phase: 'creative' | 'structural' | 'visual';
  message: string;
  cause?: Error;
  retryCount: number;
  validationErrors?: ValidationError[];
  input?: unknown;
}

/**
 * Pipeline error with phase information and partial results
 */
export class PipelineError extends Error {
  constructor(
    public readonly phaseError: PhaseError,
    public readonly partialResult?: Partial<Script>
  ) {
    super(`Pipeline failed at ${phaseError.phase} phase: ${phaseError.message}`);
    this.name = 'PipelineError';
  }
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Zod schema for ScreenplayCharacter
 */
export const screenplayCharacterSchema = z.object({
  id: z.enum(['M', 'F']),
  name: z.string().min(1),
  description: z.string(),
});

/**
 * Zod schema for ScreenplayLine
 */
export const screenplayLineSchema = z.object({
  speaker: z.enum(['M', 'F', 'NARRATOR']),
  line: z.string().min(1),
  emotion: z.string().optional(),
  action: z.string().optional(),
});

/**
 * Zod schema for ScreenplayScene
 */
export const screenplaySceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  setting: z.string().min(1),
  dialogue: z.array(screenplayLineSchema).min(1),
});

/**
 * Zod schema for ScreenplayOutput
 */
export const screenplayOutputSchema = z.object({
  title: z.string().min(1),
  characters: z.array(screenplayCharacterSchema).min(1).max(2),
  scenes: z.array(screenplaySceneSchema).min(1),
  rawText: z.string(),
});

// Type exports for Zod inferred types
export type ScreenplayCharacterZod = z.infer<typeof screenplayCharacterSchema>;
export type ScreenplayLineZod = z.infer<typeof screenplayLineSchema>;
export type ScreenplaySceneZod = z.infer<typeof screenplaySceneSchema>;
export type ScreenplayOutputZod = z.infer<typeof screenplayOutputSchema>;
