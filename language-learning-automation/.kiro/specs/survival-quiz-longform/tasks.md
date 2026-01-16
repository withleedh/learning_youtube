# Implementation Plan: Survival Quiz Longform

## Overview

"Cat vs Dog 50라운드 서바이벌" 게임쇼 형식의 롱폼 영어 학습 콘텐츠 자동 생성 시스템 구현. 기존 비교형 콘텐츠 인프라(`src/comparison/`)를 확장하여 게임쇼 메카닉을 추가한다.

## Tasks

- [x] 1. 서바이벌 타입 및 스키마 정의
  - [x] 1.1 `src/survival/types.ts` 생성 - SurvivalRound, HPState, SurvivalScript Zod 스키마
    - SurvivalCharacter enum (cat, dog)
    - CHARACTER_INFO 상수 (emoji, name, color)
    - survivalRoundSchema (situation, answers, winner, explanation)
    - survivalScriptSchema (intro, rounds, ending)
    - _Requirements: 1.1, 1.2, 2.1_
  - [x] 1.2 Property test: Round structure completeness
    - **Property 2: Round Structure Completeness**
    - **Validates: Requirements 1.2, 4.4**
  - [x] 1.3 Property test: Character enum validity
    - **Property 5: Character Enum Validity**
    - **Validates: Requirements 2.1**

- [x] 2. HP 시스템 구현
  - [x] 2.1 `src/survival/hp-system.ts` 생성 - HP 추적 및 계산
    - HPSystem 클래스 (초기화, 상태 관리)
    - calculateHPDecrease() - 라운드별 HP 감소량 계산
    - applyRoundResult() - 라운드 결과 적용
    - getHPState() - 현재 HP 상태 조회
    - getFinalResults() - 최종 결과 계산
    - _Requirements: 3.1, 3.2, 3.4, 3.6_
  - [x] 2.2 Property test: HP initialization
    - **Property 6: HP Initialization**
    - **Validates: Requirements 3.1**
  - [x] 2.3 Property test: HP decrease on loss
    - **Property 7: HP Decrease on Loss**
    - **Validates: Requirements 3.2, 3.4**
  - [x] 2.4 Property test: HP non-negative invariant
    - **Property 8: HP Non-Negative Invariant**
    - **Validates: Requirements 3.6**

- [x] 3. 승자 결정 로직 구현
  - [x] 3.1 `src/survival/winner-logic.ts` 생성 - 랜덤 승자 결정
    - generateRoundWinners() - 50라운드 승자 사전 결정
    - assignExpressionsToCharacters() - 캐릭터별 답변 할당
    - determineFinalWinner() - 최종 승자 결정
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [x] 3.2 Property test: Winner randomization distribution
    - **Property 9: Winner Randomization Distribution**
    - **Validates: Requirements 4.1**
  - [x] 3.3 Property test: Answer assignment correctness
    - **Property 10: Answer Assignment Correctness**
    - **Validates: Requirements 4.2**
  - [x] 3.4 Property test: Win tracking sum
    - **Property 11: Win Tracking Sum**
    - **Validates: Requirements 4.3**
  - [x] 3.5 Property test: Final winner determination
    - **Property 12: Final Winner Determination**
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - 게임 메카닉 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - HP 시스템 동작 확인
  - 승자 결정 로직 확인

- [x] 5. 타이밍 시스템 구현
  - [x] 5.1 `src/survival/timing.ts` 생성 - 라운드 타이밍 프로필
    - SurvivalTimingConfig 인터페이스
    - DEFAULT_SURVIVAL_TIMING 상수 (8.3초/라운드)
    - calculateRoundDuration() - 라운드 길이 계산
    - calculateTotalVideoDuration() - 전체 영상 길이 계산
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 7.4, 8.5_
  - [x] 5.2 Property test: Round duration bounds
    - **Property 3: Round Duration Bounds**
    - **Validates: Requirements 1.3, 6.1**
  - [x] 5.3 Property test: Video duration bounds
    - **Property 13: Video Duration Bounds**
    - **Validates: Requirements 6.3, 6.4**
  - [x] 5.4 Property test: Intro duration bounds
    - **Property 14: Intro Duration Bounds**
    - **Validates: Requirements 7.4**
  - [x] 5.5 Property test: Ending duration bounds
    - **Property 15: Ending Duration Bounds**
    - **Validates: Requirements 8.5**

- [x] 6. 서바이벌 라운드 생성기 구현
  - [x] 6.1 `src/survival/generator.ts` 생성 - Gemini 기반 라운드 생성
    - SurvivalGenerator 클래스
    - generateScript() - 전체 스크립트 생성
    - generateExpressionPairs() - 표현 쌍 생성 (Gemini)
    - 빠른 템포용 프롬프트 (짧은 situation, explanation)
    - _Requirements: 1.1, 1.4, 1.6, 10.2_
  - [x] 6.2 Property test: Round count exactness
    - **Property 1: Round Count Exactness**
    - **Validates: Requirements 1.1**
  - [x] 6.3 Property test: Category distribution
    - **Property 4: Category Distribution**
    - **Validates: Requirements 1.4, 12.3**
  - [x] 6.4 Property test: Explanation length
    - **Property 17: Explanation Length**
    - **Validates: Requirements 10.2**

- [x] 7. 표현 데이터베이스 연동
  - [x] 7.1 `src/survival/expression-db.ts` 생성 - 기존 expression-db 확장
    - 기존 `src/comparison/expression-db.ts` 재사용/확장
    - 서바이벌용 표현 저장/조회
    - 블랙리스트 지원
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  - [x] 7.2 Property test: Expression uniqueness in batch
    - **Property 18: Expression Uniqueness in Batch**
    - **Validates: Requirements 12.5**
  - [x] 7.3 Property test: Expression recency exclusion
    - **Property 19: Expression Recency Exclusion**
    - **Validates: Requirements 12.2**
  - [x] 7.4 Property test: Expression blacklist exclusion
    - **Property 20: Expression Blacklist Exclusion**
    - **Validates: Requirements 12.4**

- [x] 8. Linguistic Validator 연동
  - [x] 8.1 `src/survival/validator.ts` 생성 - 기존 validator 래퍼
    - 기존 `src/comparison/linguistic-validator.ts` 재사용
    - 서바이벌용 검증 함수
    - _Requirements: 13.1, 13.2, 13.4_
  - [x] 8.2 Property test: Forbidden pattern detection
    - **Property 21: Forbidden Pattern Detection**
    - **Validates: Requirements 13.1, 13.2**
  - [x] 8.3 Property test: Confidence score presence
    - **Property 22: Confidence Score Presence**
    - **Validates: Requirements 13.4**

- [x] 9. Checkpoint - 콘텐츠 생성 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - 50라운드 스크립트 생성 확인
  - 표현 다양성 확인

- [x] 10. TTS 오디오 생성
  - [x] 10.1 `src/survival/audio.ts` 생성 - 기존 TTS 시스템 래퍼
    - 기존 `src/tts/generator.ts` 활용
    - 캐릭터별 음성 설정 (cat/dog 다른 voice)
    - 라운드별 오디오 생성 (situation, answers, explanation)
    - 효과음 경로 설정 (floor drop, HP decrease)
    - _Requirements: 11.1, 11.2, 11.6_

- [x] 11. Remotion 컴포넌트 구현
  - [x] 11.1 `src/compositions/HPBar.tsx` 생성 - HP 바 컴포넌트
    - HP 바 렌더링 (캐릭터 색상별)
    - HP 감소 애니메이션
    - 데미지 플래시 효과
    - _Requirements: 3.3, 3.5_
  - [x] 11.2 `src/compositions/FloorDrop.tsx` 생성 - 바닥 함락 애니메이션
    - 바닥 열림 애니메이션
    - 캐릭터 낙하 애니메이션
    - 바닥 닫힘 애니메이션
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 11.3 `src/compositions/RoundCounter.tsx` 생성 - 라운드 카운터
    - "Round N/50" 표시
    - 라운드 변경 애니메이션
    - 파이널 스트레치 강조 (45-50)
    - _Requirements: 9.1, 9.2, 9.3, 9.5_
  - [x] 11.4 Property test: Round counter format
    - **Property 16: Round Counter Format**
    - **Validates: Requirements 9.2**
  - [x] 11.5 `src/compositions/SurvivalRoundView.tsx` 생성 - 단일 라운드 렌더링
    - Phase별 렌더링 (situation → answers → floor drop → explanation)
    - HP 바 통합
    - 라운드 카운터 통합
    - _Requirements: 6.1, 10.1, 10.4_
  - [x] 11.6 `src/compositions/SurvivalIntro.tsx` 생성 - 인트로 컴포넌트
    - 게임 타이틀 애니메이션
    - 캐릭터 소개 (HP 100)
    - 규칙 설명
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [x] 11.7 `src/compositions/SurvivalEnding.tsx` 생성 - 엔딩 컴포넌트
    - 승자 발표 애니메이션
    - 최종 HP/점수 표시
    - CTA 질문
    - 구독 유도
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_
  - [x] 11.8 `src/compositions/SurvivalLongform.tsx` 생성 - 메인 컴포지션
    - Intro → Rounds → Ending 구조
    - 타이밍 프로필 적용
    - 오디오 통합
    - _Requirements: 6.1, 6.5_

- [x] 12. Checkpoint - 컴포넌트 렌더링 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - Remotion Studio에서 컴포넌트 확인
  - 애니메이션 타이밍 확인

- [x] 13. 타임스탬프 및 SEO 생성
  - [x] 13.1 `src/survival/timestamps.ts` 생성 - 타임스탬프 생성
    - generateTimestamps() - YouTube 챕터 형식
    - 인트로, 10라운드마다, 엔딩 마커
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x] 13.2 Property test: Timestamp completeness
    - **Property 23: Timestamp Completeness**
    - **Validates: Requirements 14.1, 14.2, 14.3**
  - [x] 13.3 Property test: Timestamp format
    - **Property 24: Timestamp Format**
    - **Validates: Requirements 14.4**
  - [x] 13.4 `src/survival/seo-generator.ts` 생성 - SEO 메타데이터 생성
    - 타이틀 변형 생성
    - 설명 생성 (타임스탬프 포함)
    - 태그 생성
    - 고정 댓글 제안
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 14. 파이프라인 통합
  - [x] 14.1 `src/survival/pipeline.ts` 생성 - 전체 파이프라인
    - 스크립트 생성 → 검증 → TTS → 렌더링 통합
    - 타임스탬프/SEO 생성
    - _Requirements: 1.1, 6.3, 6.4_
  - [x] 14.2 `scripts/generate-survival.ts` 생성 - CLI 스크립트
    - 채널 ID 옵션
    - --seed 옵션 (재현 가능한 결과)
    - --render 옵션 (자동 렌더링)
  - [x] 14.3 `src/survival/index.ts` 생성 - 모듈 export
    - 모든 public API export

- [x] 15. Remotion 설정 업데이트
  - [x] 15.1 `src/SurvivalRoot.tsx` 생성 - 서바이벌 Remotion 루트
    - SurvivalLongform 컴포지션 등록
    - 기본 props 설정
  - [x] 15.2 `remotion.config.ts` 업데이트 - 서바이벌 컴포지션 추가
    - SurvivalLongform 컴포지션 등록

- [x] 16. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - 전체 파이프라인 E2E 테스트
  - 10분 영상 렌더링 테스트
  - SEO 메타데이터 출력 확인

## Notes

- 기존 `src/comparison/` 인프라 최대한 재사용 (expression-db, linguistic-validator, TTS)
- 기존 `src/tts/generator.ts` 재사용 (새로 만들지 않음)
- Property test는 fast-check 라이브러리 사용 (100+ iterations)
- 타이밍은 8-10초/라운드로 기존 비교형(15초)보다 빠름
- 랜덤 시드 지원으로 재현 가능한 결과 생성 가능
- All tasks including property tests are required for comprehensive coverage
