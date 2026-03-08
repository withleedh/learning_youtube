# Project Structure

## Overview

이 워크스페이스의 실제 애플리케이션 프로젝트는 저장소 루트가 아니라 `language-learning-automation/` 하위에 있다.

이 프로젝트는 언어 학습용 YouTube 영상을 자동으로 생성하는 시스템이며, 크게 다음 3개 레이어로 나뉜다.

1. 채널 설정 레이어: 채널별 브랜딩, TTS, UI 라벨, 콘텐츠 규칙 관리
2. 생성 파이프라인 레이어: 스크립트, 이미지, 오디오, 렌더링 산출물 생성
3. Remotion 렌더링 레이어: 생성된 데이터를 실제 영상 컴포지션으로 렌더링

## Workspace Layout

```text
learning_youtube copy/
├── .env
├── 1226.mp4
├── rules.md
└── language-learning-automation/
    ├── assets/
    ├── channels/
    ├── docs/
    ├── n8n/
    ├── output/
    ├── public/
    ├── reference/
    ├── scripts/
    ├── src/
    ├── package.json
    ├── remotion.config.ts
    └── vitest.config.ts
```

## Top-Level Directory Roles

### `language-learning-automation/src`

핵심 애플리케이션 소스 코드가 있는 곳이다.

- `compositions/`: Remotion 영상 장면과 UI 컴포지션
- `script/`: 주제 선정, 프롬프트, 스크립트 생성, 스크립트 파이프라인
- `tts/`: 음성 생성과 오디오 메타데이터 처리
- `image/`: 배경 이미지 및 장면 이미지 생성
- `config/`: 채널 설정 스키마, 로더, 공통 설정
- `comparison/`: 비교형 영상 포맷 도메인
- `survival/`: 서바이벌 퀴즈 영상 포맷 도메인
- `intro/`: 인트로 에셋 생성
- `components/`: 공통 React 컴포넌트
- `pipeline/`: 전체 생성 파이프라인 오케스트레이션
- `character/`: 캐릭터 정의 및 이미지 생성 관련 로직
- `dialogue/`, `veo/`, `video/`: 보조 생성/렌더 도메인

### `language-learning-automation/channels`

채널별 설정 JSON이 위치한다. 예:

- `english.json`
- `english_korean.json`
- `survival.json`
- `cat_interview.json`

각 파일은 채널 메타 정보, 테마 색상, TTS 설정, UI 문구, 썸네일 설정 등을 정의한다.

### `language-learning-automation/assets`

프로젝트의 정적 소스 자산 저장소다.

- 캐릭터 이미지
- 인트로 오디오
- 효과음
- 배경 이미지
- 채널별 공용 리소스

### `language-learning-automation/public`

Remotion 미리보기와 렌더에서 직접 참조하는 정적 파일 위치다.

파이프라인 결과물 중 일부를 `public/` 으로 복사하면 `npm run start` 같은 preview 환경에서 바로 확인할 수 있다.

### `language-learning-automation/output`

실행 결과물이 쌓이는 산출물 디렉터리다.

일반적으로 채널별, 날짜별, 시간별 하위 폴더가 만들어진다. 예:

```text
output/english/2026-01-08_153045/
```

여기에는 보통 다음이 저장된다.

- `script.json`
- `audio/manifest.json`
- 생성된 mp3 파일들
- 배경 이미지 또는 장면 이미지
- 업로드용 메타데이터

### `language-learning-automation/scripts`

운영 스크립트와 실험용 스크립트 모음이다.

주요 역할:

- 파이프라인 실행 보조
- 단일 기능 테스트
- 썸네일/인트로/TTS 생성
- 비디오 렌더링
- 업로드 준비
- 경쟁 채널 분석 데이터 수집

### `language-learning-automation/reference`

리서치 데이터와 외부 수집 자료를 저장하는 폴더다.

### `language-learning-automation/n8n`

YouTube 업로드 자동화 등 외부 워크플로우 정의가 있다.

## Main Entry Points

### Workbench Entry

- `src/workbench/start.ts`
  - 현재 프로젝트의 기본 실행 진입점
  - workbench server 와 background worker 를 함께 띄움
- `src/workbench/run-server.ts`
  - control plane API 와 React UI 실행
- `src/workbench/run-worker.ts`
  - queued stage generation jobs 처리

### Remotion Entry

- `src/index.ts`
  - 기본 Remotion root 등록
- `src/Root.tsx`
  - 일반 언어 학습 영상용 기본 컴포지션 묶음
- `src/ComparisonRoot.tsx`
  - 비교형 longform 영상 전용 root
- `src/SurvivalRoot.tsx`
  - survival 포맷 전용 root

### CLI Entry

- `src/pipeline/cli.ts`
  - 배치 실행과 백필용 보조 진입점
  - `--channel`, `--all`, `--topic`, `--mock-tts`, `--render` 등의 옵션 지원
  - 운영 기본 흐름은 CLI one-shot 이 아니라 workbench 승인 플로우 기준

## Core Execution Flow

현재 기준 권장 실행 흐름은 아래와 같다.

1. `src/workbench/start.ts` 에서 server + worker 동시 실행
2. workbench UI 에서 episode 생성
3. topic / script 를 사람이 검수하고 승인
4. 승인된 artifact 를 기준으로 image / tts / render / shorts 진행

보조적으로, 기존 CLI batch 흐름도 유지된다.

1. `src/pipeline/cli.ts` 에서 CLI 옵션 파싱
2. `src/pipeline/index.ts` 에서 채널 단위 파이프라인 실행
3. `src/config/loader.ts` 로 채널 설정 로드 및 검증
4. `src/script/generator.ts` 에서 스크립트 생성
5. 필요 시 `src/script/pipeline/` 하위의 멀티스텝 스크립트 파이프라인 실행
6. `src/image/generator.ts` 에서 배경/장면 이미지 생성
7. `src/tts/generator.ts` 에서 문장별 TTS 오디오 생성
8. 산출물을 `output/` 하위에 저장
9. 필요 시 Remotion 컴포지션으로 렌더링

## Script Generation Architecture

`src/script/` 는 이 프로젝트에서 가장 중요한 도메인 중 하나다.

### 주요 파일

- `src/script/generator.ts`
  - 스크립트 생성의 상위 진입점
  - 단일 샷 생성과 멀티스텝 파이프라인 둘 다 지원
- `src/script/prompts.ts`
  - 모델 입력 프롬프트 구성
- `src/script/topic-selector.ts`
  - 시의성 있는 주제 선택
- `src/script/types.ts`
  - 스크립트 타입 정의

### 멀티스텝 파이프라인

`src/script/pipeline/` 은 더 높은 품질의 스크립트를 만들기 위한 분리된 단계형 파이프라인이다.

- `creative-generator.ts`
  - 자연스러운 대화/상황 기반 초안 생성
- `structural-converter.ts`
  - 초안을 구조화된 문장 데이터로 변환
- `visual-generator.ts`
  - 장면 프롬프트 등 시각 정보 생성
- `validators.ts`
  - 구조/품질/커버리지 검증
- `orchestrator.ts`
  - `Creative -> Structural -> Visual` 순서로 전체 실행

## Rendering Architecture

Remotion 렌더링 레이어는 `src/compositions/` 와 각 root 파일로 구성된다.

### 일반 영상 컴포지션

`src/Root.tsx` 에 등록된 대표 컴포지션:

- `Intro`
- `Main`
- `Step1`
- `Step2`
- `Step3`
- `Step4`
- `Ending`
- Shorts 계열 컴포지션

### 특수 포맷

- `src/ComparisonRoot.tsx`
  - 비교형 롱폼, Hook, CTA, 세그먼트 프리뷰 제공
- `src/SurvivalRoot.tsx`
  - survival longform, round view, intro, ending 제공

## Testing Layout

테스트는 소스 파일 근처에 함께 위치하는 co-located 방식이다.

대표 특징:

- `*.test.ts`, `*.test.tsx`
- `*.property.test.ts`
- 설정 파일: `vitest.config.ts`

특히 다음 영역에 테스트가 집중되어 있다.

- `src/script/`
- `src/script/pipeline/`
- `src/survival/`
- `src/tts/`
- `src/config/`
- `src/components/`

## Important Config Files

- `package.json`
  - 실행 스크립트와 의존성 정의
- `remotion.config.ts`
  - Remotion public dir, 렌더 설정
- `vitest.config.ts`
  - 테스트 환경과 alias 설정
- `tsconfig.json`
  - TypeScript 컴파일 설정

## Frequently Used Commands

```bash
npm run start
npm run start:comparison
npm run start:survival
npm run test
npm run pipeline -- --channel english
npm run pipeline:all
```

## How To Read This Project Quickly

처음 구조를 파악할 때는 아래 순서가 가장 효율적이다.

1. `package.json` 로 실행 스크립트 확인
2. `src/pipeline/cli.ts` 로 전체 파이프라인 진입점 확인
3. `src/pipeline/index.ts` 로 생성 순서 확인
4. `channels/*.json` 으로 채널별 설정 구조 확인
5. `src/script/` 와 `src/script/pipeline/` 으로 스크립트 생성 핵심 확인
6. `src/Root.tsx`, `src/ComparisonRoot.tsx`, `src/SurvivalRoot.tsx` 로 렌더 구조 확인
7. `scripts/` 에서 운영용 보조 스크립트 확인

## Recommended Codex Workflow

이 프로젝트에서는 완전 자동화형보다 "inspect -> design -> implement -> validate" 루프가 더 잘 맞는다.

권장 순서:

1. 조사
   - 관련 기능과 파일 범위를 먼저 찾는다.
   - 바로 코드를 쓰지 않는다.
2. 설계
   - 구현안 2개와 트레이드오프를 비교한다.
   - 더 안전한 최소 변경안을 고른다.
3. 구현
   - 확인된 파일 범위 안에서만 수정한다.
   - 관련 없는 레이어로 수정 범위를 넓히지 않는다.
4. 검증
   - 변경 부위에 맞는 가장 작은 검증부터 실행한다.
   - 남은 리스크와 다음 개선점을 함께 적는다.

특히 파일 범위를 미리 자르는 것이 중요하다. 예:

```text
Only modify:
- src/script/generator.ts
- src/script/pipeline/orchestrator.ts
- src/script/pipeline/integration.test.ts

Do not modify:
- src/compositions/
- assets/
- public/
```

추가 가이드:

- workspace-level rules: `../../AGENTS.md`
- project-level rules: `../AGENTS.md`
- prompt templates: `codex-prompts.md`

## Notes

- 워크스페이스 루트와 실제 앱 루트가 다르므로, 대부분의 작업은 `language-learning-automation/` 기준으로 봐야 한다.
- `output/` 과 `public/` 은 소스 코드와 다르게 실행 결과물 또는 프리뷰용 데이터가 섞일 수 있으니 수정 시 의도를 분명히 해야 한다.
- 이 프로젝트는 단순한 프론트엔드 앱이 아니라, 생성형 AI 기반 콘텐츠 제작 파이프라인과 Remotion 렌더링 시스템이 결합된 구조다.
