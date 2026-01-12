# Implementation Plan: AI Character Dialogue Shorts

## Overview

AI 캐릭터 대화 쇼츠 기능을 단계별로 구현한다. 캐릭터 관리 → 대화 스크립트 생성 → Veo 영상 생성 → Remotion 합성 → 파이프라인 통합 순서로 진행한다.

## Tasks

- [ ] 1. 캐릭터 타입 및 스키마 정의
  - [x] 1.1 Create `src/character/types.ts` with CharacterDefinition and CharacterPair schemas using Zod
    - Define characterDefinitionSchema with id, name, nameKorean, age, gender, relationship, appearance, personality, referenceImagePath
    - Define characterPairSchema with channelId, characters array (1-3), defaultSceneStyle
    - Export TypeScript types inferred from schemas
    - _Requirements: 1.1, 1.3, 6.1_
  - [x] 1.2 Write property test for character schema validation
    - **Property 2: Character Count Constraint**
    - **Validates: Requirements 1.3**
  - [x] 1.3 Write property test for character round-trip
    - **Property 1: Character Data Round-Trip**
    - **Validates: Requirements 1.1, 1.5**

- [x] 2. 캐릭터 매니저 구현
  - [x] 2.1 Create `src/character/manager.ts` with CharacterManager class
    - Implement loadCharacters(channelId) to load from channel config
    - Implement saveCharacters(pair) to persist to channel config
    - Implement getReferenceImagePath(characterId)
    - _Requirements: 1.4, 1.5_
  - [x] 2.2 Create `src/character/image-generator.ts` for reference image generation
    - Implement generateReferenceImage(character) using Gemini Image API
    - Build prompt from character appearance description
    - Save generated image to assets directory
    - _Requirements: 1.2_
  - [x] 2.3 Write property test for character loading completeness
    - **Property 3: Character Loading Completeness**
    - **Validates: Requirements 1.4**

- [ ] 3. Checkpoint - 캐릭터 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 대화 스크립트 타입 정의
  - [x] 4.1 Create `src/dialogue/types.ts` with DialogueLine and DialogueScript schemas
    - Define dialogueLineSchema with speakerId, speakerName, english, korean, pronunciation, isTargetExpression
    - Define dialogueScriptSchema with id, targetExpression, targetMeaning, sceneContext, lines, veoPrompt
    - Export TypeScript types
    - _Requirements: 2.2, 2.5_
  - [ ]\* 4.2 Write property test for script schema validation
    - **Property 5: Script Schema Validation**
    - **Validates: Requirements 2.2, 2.5**

- [x] 5. 대화 스크립트 생성기 구현
  - [x] 5.1 Create `src/dialogue/generator.ts` with DialogueGenerator class
    - Implement generate(config) using Gemini API
    - Build prompt with target expression, characters, scene preference
    - Parse and validate response against dialogueScriptSchema
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 5.2 Create `src/dialogue/prompts.ts` with prompt templates
    - Define system prompt for dialogue generation
    - Include character personality and relationship context
    - Ensure target expression appears naturally
    - _Requirements: 2.1, 2.3_
  - [x] 5.3 Implement buildVeoPrompt(script, characters) in generator
    - Combine character appearances, scene context, and dialogue into Veo prompt
    - Include dialogue with speaker attribution
    - _Requirements: 2.5, 3.2, 3.6_
  - [ ]\* 5.4 Write property test for script contains target expression
    - **Property 4: Script Contains Target Expression**
    - **Validates: Requirements 2.1, 2.3**
  - [ ]\* 5.5 Write property test for script includes translations
    - **Property 6: Script Includes Translations**
    - **Validates: Requirements 2.4**

- [ ] 6. Checkpoint - 대화 스크립트 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Veo 타입 및 설정 정의
  - [x] 7.1 Create `src/veo/types.ts` with VeoConfig, VeoRequest, VeoResult schemas
    - Define veoConfigSchema with model, aspectRatio, resolution, durationSeconds
    - Define veoRequestSchema with prompt, referenceImages, negativePrompt, config
    - Define veoResultSchema with videoPath, duration, hasAudio, operationId
    - _Requirements: 3.1, 3.5_
  - [ ]\* 7.2 Write property test for Veo request configuration
    - **Property 9: Veo Request Configuration**
    - **Validates: Requirements 3.5**

- [x] 8. Veo 생성기 구현
  - [x] 8.1 Create `src/veo/generator.ts` with VeoGenerator class
    - Implement generateVideo(request) with Gemini API client
    - Handle async operation polling
    - Implement retry logic with exponential backoff
    - _Requirements: 3.1, 3.3, 3.4_
  - [x] 8.2 Implement reference image handling
    - Load reference images from character paths
    - Convert to base64 for API request
    - Support up to 3 reference images
    - _Requirements: 3.2_
  - [x] 8.3 Implement downloadVideo(operationId, outputPath)
    - Poll operation status until complete
    - Download video file to specified path
    - _Requirements: 3.3_
  - [ ]\* 8.4 Write property test for Veo prompt includes character descriptions
    - **Property 7: Veo Prompt Includes Character Descriptions**
    - **Validates: Requirements 3.2**
  - [ ]\* 8.5 Write property test for Veo prompt includes scene context
    - **Property 10: Veo Prompt Includes Scene Context**
    - **Validates: Requirements 3.6**
  - [ ]\* 8.6 Write property test for Veo retry logic
    - **Property 8: Veo Retry Logic**
    - **Validates: Requirements 3.4**

- [ ] 9. Checkpoint - Veo 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. 쇼츠 합성 타입 정의
  - [ ] 10.1 Create `src/shorts/dialogue-types.ts` with ShortsComposition and ShortsOutput schemas
    - Define shortsCompositionSchema with veoVideoPath, dialogueScript, channelConfig, outputPath
    - Define shortsOutputSchema with videoPath, thumbnailPath, duration, uploadInfo
    - _Requirements: 4.1, 4.5_

- [ ] 11. Remotion 대화 쇼츠 컴포지션 구현
  - [ ] 11.1 Create `src/compositions/DialogueShort.tsx` Remotion component
    - Accept Veo video as background
    - Overlay target expression at top
    - Display Korean translation and pronunciation
    - Add channel branding
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 11.2 Implement speaker highlighting
    - Visual indicator for current speaker
    - Sync with dialogue timing
    - _Requirements: 4.3_
  - [ ]\* 11.3 Write property test for composition includes branding
    - **Property 12: Composition Includes Branding**
    - **Validates: Requirements 4.4**
  - [ ]\* 11.4 Write property test for composition duration constraint
    - **Property 13: Composition Duration Constraint**
    - **Validates: Requirements 4.6**

- [ ] 12. 쇼츠 컴포저 구현
  - [ ] 12.1 Create `src/shorts/dialogue-composer.ts` with ShortsComposer class
    - Implement compose(composition) using Remotion render
    - Generate upload metadata
    - _Requirements: 4.5, 4.6_
  - [ ] 12.2 Create `scripts/render-dialogue-short.ts` CLI script
    - Accept input parameters (veo video, script, channel)
    - Call Remotion render
    - Output final MP4
    - _Requirements: 4.5_
  - [ ]\* 12.3 Write property test for composition includes translations with timing
    - **Property 11: Composition Includes Translations with Timing**
    - **Validates: Requirements 4.2**

- [ ] 13. Checkpoint - 쇼츠 합성 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. 파이프라인 구현
  - [ ] 14.1 Create `src/pipeline/dialogue-shorts.ts` with DialogueShortsPipeline class
    - Implement run(config) orchestrating all steps
    - Implement processExpression(expression, meaning)
    - Handle progress callbacks
    - _Requirements: 5.1, 5.2, 5.4_
  - [ ] 14.2 Implement error handling and resilience
    - Log errors and continue with next expression
    - Track successful and failed outputs
    - _Requirements: 5.3_
  - [ ] 14.3 Implement output directory structure
    - Create scripts/, veo-videos/, final/, thumbnails/ subdirectories
    - Save assets to appropriate locations
    - _Requirements: 5.5_
  - [ ] 14.4 Implement upload metadata generation
    - Generate title, description, tags for each video
    - Save to upload_info.json
    - _Requirements: 5.6_
  - [ ]\* 14.5 Write property test for pipeline expression count
    - **Property 14: Pipeline Expression Count**
    - **Validates: Requirements 5.2**
  - [ ]\* 14.6 Write property test for pipeline error resilience
    - **Property 15: Pipeline Error Resilience**
    - **Validates: Requirements 5.3**
  - [ ]\* 14.7 Write property test for pipeline output structure
    - **Property 16: Pipeline Output Structure**
    - **Validates: Requirements 5.5**
  - [ ]\* 14.8 Write property test for pipeline upload metadata
    - **Property 17: Pipeline Upload Metadata**
    - **Validates: Requirements 5.6**

- [ ] 15. Checkpoint - 파이프라인 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. 채널 설정 확장
  - [ ] 16.1 Update `src/config/types.ts` to include dialogueShorts section
    - Add dialogueShortsConfigSchema with enabled, characters, veoConfig, scenePreferences
    - Extend channelConfigSchema
    - _Requirements: 6.1, 6.3, 6.4_
  - [ ] 16.2 Update `src/config/loader.ts` to validate dialogueShorts config
    - Validate character definitions against schema
    - Validate Veo config
    - _Requirements: 6.2_
  - [ ]\* 16.3 Write property test for channel config validation
    - **Property 18: Channel Config Validation**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 17. CLI 스크립트 생성
  - [ ] 17.1 Create `scripts/generate-dialogue-shorts.ts` main CLI
    - Accept channel ID and expressions list
    - Run full pipeline
    - Output progress and results
    - _Requirements: 5.1, 5.4_
  - [ ] 17.2 Create `scripts/generate-character-images.ts` for character setup
    - Generate reference images for channel characters
    - Save to assets directory
    - _Requirements: 1.2_

- [ ] 18. 샘플 채널 설정 생성
  - [ ] 18.1 Create `channels/english_grandpa.json` sample channel config
    - Define grandfather and granddaughter characters
    - Configure Veo settings for 9:16 shorts
    - Set scene preferences
    - _Requirements: 6.1, 6.3, 6.4_

- [ ] 19. Final Checkpoint - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.
  - Run end-to-end test with sample expressions

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use fast-check library with minimum 100 iterations
- Veo API calls are rate-limited; integration tests should be run sparingly
- Reference images should be generated once and reused across videos
