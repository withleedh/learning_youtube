# Implementation Plan: Language Learning Automation

## Overview

TypeScript/Node.js 기반의 다채널 언어 학습 영상 자동화 시스템을 구현합니다. Remotion을 사용하여 React 컴포넌트로 영상을 렌더링하고, Gemini API로 대본을 생성하며, OpenAI/Google TTS로 음성을 생성합니다. TDD 방식으로 테스트를 먼저 작성하고 구현합니다.

## Tasks

- [x] 1. 프로젝트 초기 설정

  - [x] 1.1 Remotion 프로젝트 생성 및 TypeScript 설정
    - `npx create-video@latest` 실행
    - tsconfig.json 설정
    - ESLint, Prettier 설정
    - _Requirements: 4.1_
  - [x] 1.2 필수 의존성 설치
    - @google/generative-ai (Gemini API)
    - openai (OpenAI TTS)
    - @google-cloud/text-to-speech (Google TTS)
    - zod (스키마 검증)
    - fast-check (property-based testing)
    - vitest (테스트 프레임워크)
    - @testing-library/react (React 테스트)
    - _Requirements: 2.1, 3.1_
  - [x] 1.3 폴더 구조 생성
    - core/src/{config, script, tts, compositions, components, pipeline}
    - channels/, assets/, output/ 디렉토리
    - _Requirements: 7.1_

- [x] 2. Config Loader 구현 (TDD)

  - [x] 2.1 타입 정의 및 스키마 작성
    - ChannelConfig 인터페이스 정의
    - Zod 스키마로 검증 로직 구현
    - _Requirements: 1.1, 1.4_
  - [x] 2.2 Property test: Config JSON Round-Trip
    - **Property 1: Config JSON Round-Trip Consistency**
    - **Validates: Requirements 1.1**
  - [x] 2.3 Property test: Config Validation
    - **Property 2: Config Validation Rejects Invalid Configs**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 2.4 Config Loader 함수 구현
    - load(channelId) 함수
    - validate(config) 함수
    - listChannels() 함수
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.5 영어 채널 설정 파일 생성
    - channels/english.json 작성
    - _Requirements: 1.2_

- [x] 3. Checkpoint - Config Loader 완료

  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Script Generator 구현 (TDD)

  - [x] 4.1 Script 타입 정의
    - Sentence, Script 인터페이스 정의
    - Zod 스키마로 검증 로직 구현
    - _Requirements: 2.2, 2.3, 2.4, 2.6_
  - [x] 4.2 Property test: Script Structure Integrity
    - **Property 3: Script Structure Integrity**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.7**
  - [x] 4.3 Gemini API 프롬프트 작성
    - 요일별 카테고리 프롬프트
    - 빈칸 퀴즈 데이터 생성 프롬프트
    - 단어별 뜻 생성 프롬프트
    - _Requirements: 2.1, 2.6, 2.7_
  - [x] 4.4 Script Generator 함수 구현
    - generate(config, category) 함수
    - save(script, outputPath) 함수
    - load(scriptPath) 함수
    - _Requirements: 2.1, 2.5_

- [x] 5. Checkpoint - Script Generator 완료

  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. TTS Generator 구현 (TDD)

  - [x] 6.1 TTS 타입 정의
    - TTSOptions, AudioFile 인터페이스 정의
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 Property test: TTS Provider Selection
    - **Property 4: TTS Provider Selection**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 6.3 Property test: Audio File Generation Completeness
    - **Property 5: Audio File Generation Completeness**
    - **Validates: Requirements 3.3, 3.5**
  - [x] 6.4 OpenAI TTS 구현
    - generateWithOpenAI(sentence, config) 함수
    - 3가지 속도 버전 생성 (0.8x, 1.0x, 1.2x)
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 6.5 Google TTS 구현 (선택적)
    - generateWithGoogle(sentence, config) 함수
    - _Requirements: 3.1_
  - [x] 6.6 TTS Generator 통합
    - generate(sentence, config) 함수 - provider 선택
    - generateAll(script, config) 함수 - 전체 스크립트 처리
    - 재시도 로직 구현
    - _Requirements: 3.3, 3.4_

- [x] 7. Checkpoint - TTS Generator 완료

  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Remotion Compositions 구현 (TDD)

  - [x] 8.1 공통 컴포넌트 테스트 및 구현
    - Subtitle.tsx - 자막 표시 컴포넌트
    - WordMeaning.tsx - 단어별 뜻 표시 컴포넌트
    - Logo.tsx - 로고 표시 컴포넌트
    - StepIndicator.tsx - 단계 표시 컴포넌트
    - _Requirements: 4.2, 4.5, 4.6, 4.7_
  - [x] 8.2 Intro 컴포지션 구현
    - 0~2초: 로고 + 효과음
    - 2~30초: 4개 학습 단계 순차 표시
    - _Requirements: 4.1, 4.2_
  - [x] 8.3 Step1 컴포지션 구현 (자막 없이 듣기)
    - 배경 이미지 + 전체 대화 재생
    - _Requirements: 4.3_
  - [x] 8.4 Step2 컴포지션 구현 (문장별 듣기)
    - 배경 이미지 어둡게 + 문장별 자막
    - _Requirements: 4.4_
  - [x] 8.5 Step3 컴포지션 구현 (10번씩 반복)
    - 상단 이미지 + 하단 검은 배경
    - 영어/한글/단어뜻 표시
    - 남자=파란색, 여자=핑크색
    - _Requirements: 4.5, 4.6, 4.7_
  - [x] 8.6 Property test: Interval Training Sequence
    - **Property 6: Interval Training Sequence**
    - **Validates: Requirements 5.1, 5.5**
  - [x] 8.7 Step3 인터벌 트레이닝 구현
    - 느린(0.8x) → 정상(1.0x, 빈칸) → 빠른(1.2x) 순서
    - repeatCount 만큼 반복
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 8.8 Step4 컴포지션 구현 (다시 자막 없이 듣기)
    - Step1과 동일한 구조
    - _Requirements: 4.8_
  - [x] 8.9 Main 컴포지션 통합
    - Intro → Step1 → Step2 → Step3 → Step4 연결
    - _Requirements: 4.1_

- [x] 9. Checkpoint - Remotion Compositions 완료

  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Pipeline CLI 구현

  - [x] 10.1 Pipeline 함수 구현
    - runPipeline(channelId) 함수
    - 대본 생성 → TTS 생성 → 영상 렌더링 순차 실행
    - 진행 상황 콘솔 출력
    - _Requirements: 6.1, 6.3_
  - [x] 10.2 CLI 인터페이스 구현
    - `npm run pipeline -- --channel {channelId}` 명령어
    - `npm run pipeline:all` 명령어
    - 에러 처리 및 로깅
    - _Requirements: 6.1, 6.2, 6.4_
  - [x] 10.3 package.json 스크립트 설정
    - pipeline, pipeline:all 스크립트 추가
    - _Requirements: 6.1, 6.2_

- [x] 11. 에셋 및 샘플 데이터 준비

  - [x] 11.1 영어 채널 에셋 준비
    - assets/english/logo.png (플레이스홀더)
    - assets/english/intro.mp3 (플레이스홀더)
    - _Requirements: 7.1, 7.2_
  - [x] 11.2 샘플 스크립트 생성
    - 테스트용 샘플 대본 JSON 생성
    - _Requirements: 2.5_

- [x] 12. Final Checkpoint - 전체 시스템 통합 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - 영어 채널로 전체 파이프라인 실행 테스트

## Notes

- TDD 방식: Red → Green → Refactor 사이클 준수
- 테스트 먼저 작성 후 구현 (React Testing Library 사용)
- 구조적 변경과 동작 변경을 분리하여 커밋
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (fast-check)
- Unit tests validate specific examples and edge cases (vitest)
