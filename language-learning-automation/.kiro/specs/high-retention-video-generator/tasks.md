# Implementation Plan: High-Retention Video Generator

## Overview

Google Cloud TTS의 SSML Mark 기반 타임포인트 추출과 Remotion 컴포넌트를 활용하여 유튜브 수익 창출 제재를 회피하고 시청 지속 시간을 극대화하는 고품질 어학 영상 자동 생성 시스템을 구현한다.

## Tasks

- [-] 1. SSML Injector 모듈 구현
  - [x] 1.1 Create `src/tts/ssml-injector.ts` with regex-based word tokenization
    - Implement `injectSSMLMarks()` function
    - Handle punctuation attachment to preceding words
    - Generate sequential mark IDs (index_0, index_1, ...)
    - Output valid SSML wrapped in `<speak>` tags
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Write property test for SSML Injection
    - **Property 1: SSML Injection Preserves Words**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.7**
  - [x] 1.3 Add special character normalization for TTS compatibility
    - Handle numbers, symbols, and edge cases
    - _Requirements: 1.6, 1.7_

- [x] 2. Google TTS Timepoint 추출 모듈 구현
  - [x] 2.1 Create `src/tts/google-timepoint.ts` extending existing google.ts
    - Add `enableTimePointing: ['SSML_MARK']` option to API request
    - Parse timepoints array from API response
    - Calculate endInSeconds using next word's startInSeconds
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.2 Implement `buildSyncData()` function
    - Generate ScriptSyncData JSON structure
    - Handle incomplete timepoint data with estimation
    - _Requirements: 2.4, 2.5_
  - [ ]\* 2.3 Write property test for Sync Data Timing
    - **Property 2: Sync Data Timing Consistency**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 2.4 Add pitch adjustment support for speaker differentiation
    - Extend synthesize function with pitch parameter
    - _Requirements: 2.6, 8.5_

- [x] 3. Checkpoint - SSML 및 TTS 모듈 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Karaoke Subtitle 컴포넌트 구현
  - [ ] 4.1 Create `src/components/KaraokeSubtitle.tsx`
    - Use useCurrentFrame() and useVideoConfig() for time calculation
    - Implement word active state logic (start <= time < end)
    - Support two modes: 'karaoke' (highlight words) and 'blank' (show blanks)
    - Apply opacity and color transitions for active words
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]\* 4.2 Write property test for Word Active State
    - **Property 3: Word Active State Calculation**
    - **Validates: Requirements 3.2**
  - [ ] 4.3 Add text wrapping and positioning logic
    - Position subtitles in bottom third
    - Handle long sentences with line breaks
    - _Requirements: 3.6, 3.7_
  - [ ] 4.4 Integrate KaraokeSubtitle into existing Step components
    - Step 1: mode='blank' - 빈칸이 타이밍에 맞춰 순차 등장
    - Step 2: mode='karaoke' - 단어가 말하는 타이밍에 하이라이트
    - Step 3: mode='karaoke' - 단어가 말하는 타이밍에 하이라이트
    - Step 4: mode='blank' - 빈칸이 타이밍에 맞춰 순차 등장
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Ken Burns Background 컴포넌트 구현
  - [ ] 5.1 Create `src/components/KenBurnsBackground.tsx`
    - Implement scale and pan animations
    - Support multiple pattern presets (zoom-in, pan-left, diagonal)
    - Apply easing functions (spring, ease-in-out)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 5.2 Write property test for Ken Burns Pattern Cycling
    - **Property 4: Ken Burns Pattern Cycling**
    - **Validates: Requirements 4.1, 4.2, 4.5**
  - [ ] 5.3 Add pattern cycling and video clip detection
    - Cycle through patterns for visual variety
    - Skip Ken Burns for video/cinemagraph sources
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 6. Dynamic Overlay 컴포넌트 구현
  - [ ] 6.1 Create `src/components/DustParticles.tsx`
    - Implement floating particle animation
    - Support configurable particle count, opacity, speed
    - _Requirements: 5.1_
  - [ ] 6.2 Create `src/components/ProgressBar.tsx`
    - Animated progress bar showing video timeline
    - _Requirements: 5.2_
  - [ ] 6.3 Create `src/components/TextAnimation.tsx`
    - Implement fade-in, slide-in, typewriter effects
    - _Requirements: 5.3_
  - [ ]\* 6.4 Write property test for Z-Index Ordering
    - **Property 5: Z-Index Layer Ordering**
    - **Validates: Requirements 5.5**

- [ ] 7. Checkpoint - 컴포넌트 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Speaker Avatar 컴포넌트 구현
  - [ ] 8.1 Create `src/components/SpeakerAvatar.tsx`
    - Support dialogue mode (left/right positioning)
    - Support narrator mode (centered)
    - Implement scale and brightness transitions
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 9.1_
  - [ ]\* 8.2 Write property test for Speaker State Consistency
    - **Property 9: Speaker State Consistency**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  - [ ] 8.3 Add subtitle alignment based on speaker
    - Left-align for Speaker A, right-align for Speaker B
    - _Requirements: 8.4_

- [ ] 9. Narrator Mode 기능 구현
  - [ ] 9.1 Add keyword popup animation to Visual Composer
    - Detect keywords using regex patterns
    - Display scale-up + glow effect
    - _Requirements: 9.2_
  - [ ] 9.2 Add background image transition logic
    - Automatic transitions at configured intervals
    - Cycle through different transition effects
    - _Requirements: 9.3, 9.7_
  - [ ] 9.3 Add infographic animation for numbers/statistics
    - Detect numbers in script
    - Display counter or bar chart animation
    - _Requirements: 9.4_
  - [ ]\* 9.4 Write property test for Narrator Mode Visual Triggers
    - **Property 10: Narrator Mode Visual Triggers**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.7**

- [ ] 10. Checkpoint - 화자 연출 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Config 확장 및 검증
  - [ ] 11.1 Extend `src/config/types.ts` with new schemas
    - Add karaokeConfigSchema, kenBurnsConfigSchema
    - Add dustConfigSchema, speakerConfigSchema
    - Add highRetentionConfigSchema
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 11.2 Implement config merge logic in `src/config/loader.ts`
    - Merge channel settings with global defaults
    - Support template inheritance
    - _Requirements: 7.5, 7.7_
  - [ ]\* 11.3 Write property test for Config Merge
    - **Property 8: Config Merge Completeness**
    - **Validates: Requirements 7.5, 7.6, 7.7**

- [ ] 12. Main Composition 구현
  - [ ] 12.1 Create `src/compositions/HighRetentionVideo.tsx`
    - Compose all components (KenBurns, Karaoke, Dust, Speaker)
    - Support dialogue and narrator modes
    - Wire sync data to components
    - _Requirements: 6.2_
  - [ ] 12.2 Register composition in `src/Root.tsx`
    - Add HighRetentionVideo to Remotion compositions
    - Configure default props

- [ ] 13. Pipeline 통합
  - [ ] 13.1 Create `src/pipeline/high-retention.ts`
    - Implement pipeline: SSML → TTS → Assets → Render
    - Add input validation
    - _Requirements: 6.1, 6.3_
  - [ ] 13.2 Add batch processing support
    - Process multiple scripts in single run
    - Continue on individual script failures
    - _Requirements: 6.5, 6.6_
  - [ ]\* 13.3 Write property test for Pipeline Error Resilience
    - **Property 6: Pipeline Error Resilience**
    - **Validates: Requirements 6.3, 6.6**
  - [ ] 13.4 Add intro variation logic
    - Vary background music and hook text per video
    - _Requirements: 6.9_
  - [ ]\* 13.5 Write property test for Batch Processing Variety
    - **Property 7: Batch Processing Variety**
    - **Validates: Requirements 6.5, 6.9**
  - [ ] 13.6 Add upload metadata generation
    - Generate title, description, tags, thumbnail
    - _Requirements: 6.7, 6.8_

- [ ] 14. CLI 통합
  - [ ] 14.1 Extend `src/pipeline/cli.ts` with high-retention mode
    - Add --high-retention flag
    - Add --mode dialogue|narrator option
    - _Requirements: 6.1_

- [ ] 15. Final Checkpoint - 전체 시스템 검증
  - Ensure all tests pass, ask the user if questions arise.
  - Run end-to-end test with sample script

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
