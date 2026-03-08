# Implementation Plan: Multi-Step Script Pipeline

## Overview

This implementation plan breaks down the multi-step script pipeline into discrete coding tasks. The pipeline separates AI script generation into three phases (Creative → Structural → Visual) to improve quality by reducing cognitive overload.

## Tasks

- [x] 1. Set up pipeline infrastructure and types
  - [x] 1.1 Create pipeline types and interfaces
    - Create `src/script/pipeline/types.ts` with ScreenplayOutput, ScreenplayCharacter, ScreenplayScene, ScreenplayLine interfaces
    - Create PipelineConfig, PipelineResult, PhaseError, PipelineError types
    - Create ValidationError interface for detailed error reporting
    - _Requirements: 4.1, 4.2, 4.6_
  - [x] 1.2 Create validation utility functions
    - Create `src/script/pipeline/validators.ts`
    - Implement validateBlankWord() to check blankAnswer is not article/pronoun/basic verb
    - Implement validateWrongChoices() to check single words
    - Implement validateBlankInTarget() to check blankAnswer appears in target
    - Implement validateWordCount() to check 4-15 words per sentence
    - Implement validateSceneCoverage() to check 3-6 scenes with no gaps/overlaps
    - _Requirements: 2.3, 2.4, 2.7, 3.5, 6.2, 6.3_
  - [x] 1.3 Write property tests for validators
    - **Property 4: Blank Words Are Learnable**
    - **Property 5: Wrong Choices Are Single Words**
    - **Property 7: Sentences Within Word Count**
    - **Property 8: Scene Prompts Cover All Sentences**
    - **Property 11: BlankAnswer Appears in Target**
    - **Validates: Requirements 2.3, 2.4, 2.7, 3.5, 6.2, 6.3**

- [x] 2. Implement Creative Generator phase
  - [x] 2.1 Create creative generator module
    - Create `src/script/pipeline/creative-generator.ts`
    - Implement generateCreativeScript() function
    - Create screenplay-focused prompt without JSON constraints
    - Role: "You are a Netflix screenwriter"
    - Output: Human-readable screenplay format
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 2.2 Create screenplay parser
    - Create `src/script/pipeline/screenplay-parser.ts`
    - Implement parseScreenplay() to extract title, characters, scenes from raw text
    - Handle speaker labels (M:, F:, NARRATOR:)
    - Extract emotion and action annotations
    - _Requirements: 1.5, 2.1_
  - [x] 2.3 Write property tests for creative generator
    - **Property 1: Screenplay Format Output**
    - **Property 2: Dialogue Contains Natural Patterns**
    - **Validates: Requirements 1.1, 1.3, 1.5**

- [x] 3. Checkpoint - Ensure creative phase tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Structural Converter phase
  - [x] 4.1 Create structural converter module
    - Create `src/script/pipeline/structural-converter.ts`
    - Implement convertToStructuredFormat() function
    - Create education-focused prompt for CEFR analysis, blank selection, wrong choices
    - Role: "You are a language education expert"
    - Input: Screenplay from creative phase
    - Output: Structured JSON matching Sentence schema
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 4.2 Implement blank word selection logic
    - Create helper function to suggest good blank word candidates
    - Filter out articles, pronouns, basic verbs
    - Prioritize learnable vocabulary (nouns, adjectives, meaningful verbs)
    - _Requirements: 2.3_
  - [x] 4.3 Implement wrong choice generation
    - Create helper function to generate phonetically similar words
    - Ensure single words only (no phrases)
    - Ensure different from blankAnswer
    - _Requirements: 2.4, 6.3_
  - [x] 4.4 Write property tests for structural converter
    - **Property 3: Screenplay Parses to Sentences**
    - **Property 6: Schema Validation Round-Trip**
    - **Validates: Requirements 2.1, 2.6, 4.4, 5.1, 6.1**

- [x] 5. Checkpoint - Ensure structural phase tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Visual Generator phase
  - [x] 6.1 Create visual generator module
    - Create `src/script/pipeline/visual-generator.ts`
    - Implement generateVisualPrompts() function
    - Create cinematography-focused prompt for scene boundaries, camera directions
    - Role: "You are a cinematographer"
    - Input: Structured JSON from structural phase
    - Output: ScenePrompt array with character appearances
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 6.2 Implement scene boundary detection
    - Create helper function to suggest scene boundaries based on content
    - Ensure 3-6 scenes covering all sentences
    - Identify emotional beats and transitions
    - _Requirements: 3.1, 3.5_
  - [x] 6.3 Write property tests for visual generator
    - **Property 9: Character Appearance Consistency**
    - **Property 10: Camera Directions Vary**
    - **Validates: Requirements 3.3, 3.4**

- [x] 7. Checkpoint - Ensure visual phase tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Pipeline Orchestrator
  - [x] 8.1 Create pipeline orchestrator module
    - Create `src/script/pipeline/orchestrator.ts`
    - Implement runScriptPipeline() function
    - Execute phases in sequence: Creative → Structural → Visual
    - Pass output of each phase as input to next phase
    - Track timing and retry counts for each phase
    - _Requirements: 4.1, 4.3, 4.6_
  - [x] 8.2 Implement retry logic with error feedback
    - Create retry wrapper for each phase
    - Include validation errors in retry prompts
    - Max retries: Creative=2, Structural=3, Visual=2
    - _Requirements: 4.2, 6.4_
  - [x] 8.3 Implement phase configuration
    - Support enabling/disabling individual phases
    - Implement fallback to legacy generation when pipeline disabled
    - _Requirements: 4.5, 5.3_
  - [x] 8.4 Write property tests for orchestrator
    - **Property 12: Sentence Count Matches Config**
    - **Property 13: All Categories Supported**
    - **Property 14: Error Messages Identify Phase**
    - **Property 15: Retry on Validation Failure**
    - **Validates: Requirements 4.2, 5.4, 6.4, 6.5**

- [x] 9. Integrate with existing system
  - [x] 9.1 Create pipeline entry point
    - Create `src/script/pipeline/index.ts` to export public API
    - Export runScriptPipeline as main entry point
    - Export individual phase functions for testing
    - _Requirements: 5.2_
  - [x] 9.2 Update existing generator to use pipeline
    - Modify `src/script/generator.ts` to optionally use pipeline
    - Add usePipeline flag to generateScript() function
    - Maintain backward compatibility with existing callers
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 9.3 Write integration tests
    - Test full pipeline end-to-end
    - Test backward compatibility with existing code
    - Test all 7 categories produce valid output
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100+ iterations each)
- Unit tests validate specific examples and edge cases
- The pipeline is designed to be a drop-in replacement for existing generation
