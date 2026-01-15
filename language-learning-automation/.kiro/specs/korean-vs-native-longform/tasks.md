# Implementation Plan: Korean vs Native Longform

## Overview

"한국인 영어 vs 원어민 영어" 비교형 롱폼 콘텐츠 자동 생성 시스템 구현. 기존 Remotion 파이프라인을 확장하여 비교형 콘텐츠를 생성하고 렌더링한다.

## Tasks

- [x] 1. 비교형 콘텐츠 타입 및 스키마 정의
  - [x] 1.1 `src/comparison/types.ts` 생성 - ComparisonSegment, ComparisonScript Zod 스키마
    - category enum (daily, business, emotion, request_reject, apology_thanks)
    - segment 구조 (situation, koreanExpression, nativeExpression, explanation)
    - script 구조 (title, hook, segments, cta)
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Property test: Segment structure completeness
    - **Property 2: Segment Structure Completeness**
    - **Validates: Requirements 1.2**

- [x] 2. Comparison Generator 구현
  - [x] 2.1 `src/comparison/generator.ts` 생성 - Gemini 기반 비교 표현 생성
    - generateScript() 메인 함수
    - Gemini 프롬프트 템플릿
    - Hook 3-5개 변형 생성 (hookVariants)
    - CTA 텍스트 생성
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1, 2.2, 6.2, 10.1, 10.2, 10.4_
  - [x] 2.2 Property test: Segment count bounds
    - **Property 1: Segment Count Bounds**
    - **Validates: Requirements 1.1**
  - [x] 2.3 Property test: Category distribution
    - **Property 3: Category Distribution**
    - **Validates: Requirements 1.6**
  - [x] 2.4 Property test: Hook variants count
    - **Property 11: Hook Variants Count**
    - _For any_ generated script, hookVariants array SHALL contain 3-5 items
    - **Validates: Requirements 10.1**

- [x] 3. Expression Database 구현
  - [x] 3.1 `src/comparison/expression-db.ts` 생성 - JSON 기반 표현 DB
    - addExpression() - 표현 추가 (난이도 메타데이터 포함)
    - getRecentExpressions() - 최근 N개 비디오 표현 조회
    - isBlacklisted() - 블랙리스트 체크
    - difficulty 필드 (A2, B1, B2, C1)
    - _Requirements: 8.1, 8.2, 8.5, 13.1, 13.3_
  - [x] 3.2 Property test: Expression uniqueness in batch
    - **Property 5: Expression Uniqueness in Batch**
    - **Validates: Requirements 8.6**
  - [x] 3.3 Property test: Expression recency check
    - **Property 6: Expression Recency Check**
    - **Validates: Requirements 8.2**

- [x] 4. Linguistic Validator 구현 (영어 뉘앙스 QA)
  - [x] 4.1 `src/comparison/linguistic-validator.ts` 생성 - 원어민 표현 검증
    - validateExpression() - 표현 자연스러움 검증
    - 금칙 패턴 DB (교과서적 표현 필터링)
    - 대안 표현 제안
    - confidence score 반환
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 4.2 Property test: Forbidden pattern detection
    - **Property 12: Forbidden Pattern Detection**
    - _For any_ expression matching forbidden patterns, validator SHALL return failed status
    - **Validates: Requirements 12.1, 12.2**

- [x] 5. Checkpoint - 콘텐츠 생성 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - 테스트 스크립트로 비교 표현 생성 확인
  - Linguistic Validator 동작 확인

- [x] 6. TTS 오디오 생성 (기존 시스템 활용)
  - [x] 6.1 `src/comparison/audio.ts` 생성 - 기존 TTS 시스템 래퍼
    - 기존 `src/tts/generator.ts` 활용
    - 각 세그먼트별 오디오 생성 (situation, korean, native, explanation)
    - 한국어는 기존 Korean TTS, 영어는 기존 English TTS 사용
    - _Requirements: 2.6, 2.7_

- [x] 7. Retention 타이밍 프로필 구현
  - [x] 7.1 `src/comparison/timing-profile.ts` 생성 - 타이밍 프로필 시스템
    - fast (7초), normal (10초), suspense (12초) 프로필
    - burst sequence 자동 삽입 (5개마다 빠른 3연타)
    - 타이밍 계산 함수
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 7.2 Property test: Burst sequence insertion
    - **Property 13: Burst Sequence Insertion**
    - _For any_ video with 15+ segments, burst sequences SHALL be inserted every 5 segments
    - **Validates: Requirements 11.2, 11.3**

- [-] 8. Remotion 컴포넌트 구현
  - [x] 8.1 `src/compositions/ComparisonView.tsx` 생성 - 단일 비교 세그먼트 렌더링
    - phase별 렌더링 (situation → korean → native → explanation)
    - ❌/⭕ 인디케이터 스타일링
    - 텍스트 애니메이션
    - 타이밍 프로필 지원
    - _Requirements: 1.3, 1.4, 3.3, 3.4, 11.1_
  - [x] 8.2 `src/compositions/HookIntro.tsx` 생성 - Hook 인트로 컴포넌트
    - 메인/서브 텍스트 애니메이션
    - 배경 효과
    - hookVariants 선택 지원
    - _Requirements: 2.1, 2.3, 10.3_
  - [x] 8.3 `src/compositions/CTAEnding.tsx` 생성 - CTA 엔딩 컴포넌트
    - 질문 텍스트
    - 구독 유도 애니메이션
    - _Requirements: 6.1, 6.3_
  - [x] 8.4 `src/compositions/ComparisonLongform.tsx` 생성 - 메인 컴포지션
    - Hook → Segments → CTA 구조
    - 타이밍 프로필 적용
    - burst sequence 처리
    - 트랜지션 처리
    - _Requirements: 9.1, 9.2, 9.3, 11.2, 11.3_
  - [x] 8.5 Property test: Video duration bounds
    - **Property 7: Video Duration Bounds**
    - **Validates: Requirements 9.4, 9.5**

- [x] 9. Checkpoint - 컴포넌트 렌더링 테스트
  - Ensure all tests pass, ask the user if questions arise.
  - Remotion Studio에서 컴포넌트 확인

- [x] 10. Pipeline 통합
  - [x] 10.1 `src/comparison/pipeline.ts` 생성 - 전체 파이프라인
    - 스크립트 생성 → Linguistic Validation → TTS → 렌더링 통합
    - 타임스탬프 생성
    - Hook 선택 옵션 (CLI or random)
    - 타이밍 프로필 옵션
    - _Requirements: 6.1, 6.4, 9.6, 10.3, 10.5, 11.4_
  - [x] 10.2 `scripts/generate-comparison.ts` 생성 - CLI 스크립트
    - 채널 ID, 세그먼트 수 옵션
    - --hook 옵션 (hook 선택)
    - --timing 옵션 (fast/normal/suspense)
    - _Requirements: 6.5, 10.3_
  - [x] 10.3 Property test: Timestamp generation
    - **Property 9: Timestamp Generation**
    - **Validates: Requirements 9.6**

- [ ] 11. SEO 메타데이터 생성
  - [ ] 11.1 `src/comparison/seo-generator.ts` 생성 - SEO 메타데이터 자동 생성
    - description 생성 (표현 요약 포함)
    - tags 생성 (카테고리별 키워드)
    - pinned comment 제안
    - title variants 생성
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 12. Shorts 추출 기능 (자막 최적화 포함)
  - [ ] 12.1 `src/comparison/shorts-extractor.ts` 생성 - 쇼츠 추출
    - 세그먼트 선택 로직
    - 9:16 포맷 변환
    - _Requirements: 7.1, 7.3, 7.6_
  - [ ] 12.2 `src/comparison/shorts-caption-generator.ts` 생성 - 쇼츠 자막 최적화
    - 1줄 12자 제한
    - ❌/⭕ 인디케이터 유지
    - 핵심 단어 강조
    - 자막 애니메이션
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [ ] 12.3 Property test: Shorts extraction count
    - **Property 10: Shorts Extraction Count**
    - **Validates: Requirements 7.1**
  - [ ] 12.4 Property test: Shorts caption length
    - **Property 14: Shorts Caption Length**
    - _For any_ shorts caption line, character count SHALL be <= 12
    - **Validates: Requirements 14.1**

- [ ] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - 전체 파이프라인 E2E 테스트
  - Hook A/B 변형 렌더링 테스트
  - SEO 메타데이터 출력 확인

## Notes

- 모든 property test 포함 (테스트 우선 개발)
- 기존 `src/tts/generator.ts` 재사용 (새로 만들지 않음)
- 기존 `src/image/generator.ts` 배경 이미지 생성 재사용
- Remotion 설정은 기존 `remotion.config.ts` 활용
- Linguistic Validator로 영어 품질 보장
- Hook A/B 테스트로 최적 Hook 발굴 가능
