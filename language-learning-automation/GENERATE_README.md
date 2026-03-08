# 🎬 Language Learning Video Automation

다채널 언어 학습 영상 자동화 시스템

> 기본 운영 진입점은 CLI가 아니라 `npm start` 로 여는 Workbench 입니다.
> 이 문서는 batch/backfill 용 CLI 커맨드를 정리합니다.

## 📺 채널 목록

| Channel ID       | 타겟            | 설명               |
| ---------------- | --------------- | ------------------ |
| `english`        | 한국인 → 영어   | 들려요! English!   |
| `english_korean` | 영어권 → 한국어 | Listen Up! Korean! |
| `cat_interview`  | -               | 고양이 인터뷰 쇼츠 |

---

## 🚀 자주 쓰는 커맨드

### Workbench 실행 (권장)

```bash
npm start
```

### 전체 파이프라인 (내부 batch 용)

```bash
# 특정 채널 실행
npx tsx src/pipeline/cli.ts --channel english --render

# 주제 직접 지정
npx tsx src/pipeline/cli.ts --channel english_korean --topic "카페에서 주문하기" --render

# 모든 채널 실행
npx tsx src/pipeline/cli.ts --all --render
```

### 비디오만 렌더링 (이미 생성된 스크립트)

```bash
npx tsx scripts/render-video.ts <channelId> <outputFolder>

# 예시
npx tsx scripts/render-video.ts english_korean 2026-01-13_100101
```

### 쇼츠 렌더링

```bash
npx tsx scripts/render-shorts.ts <channelId> <outputFolder>

# 예시
npx tsx scripts/render-shorts.ts english 2026-01-12_212252
```

### 썸네일 생성

```bash
npx tsx scripts/generate-thumbnail.ts <channelId> <outputFolder>
```

### Remotion Studio (프리뷰)

```bash
npm run studio
```

### 주제 히스토리 확인

```bash
npx tsx src/pipeline/cli.ts --history
```

---

## 📁 폴더 구조

```
├── channels/          # 채널 설정 JSON
├── output/            # 생성된 콘텐츠
│   └── {channelId}/
│       └── {timestamp}/
│           ├── *.json        # 스크립트
│           ├── audio/        # TTS 오디오
│           ├── background.png
│           ├── video.mp4
│           └── upload_info.txt
├── scripts/           # 유틸리티 스크립트
├── src/
│   ├── compositions/  # Remotion 컴포넌트
│   ├── pipeline/      # 메인 파이프라인
│   ├── script/        # 스크립트 생성
│   ├── tts/           # TTS 생성
│   └── image/         # 이미지 생성
└── public/            # Remotion 프리뷰용 (자동 생성)
```

---

## 🔧 환경 설정 (.env)

```env
GEMINI_API_KEY=xxx          # Google Gemini (스크립트/이미지 생성)
OPENAI_API_KEY=xxx          # OpenAI (대체용)
GOOGLE_APPLICATION_CREDENTIALS=xxx  # Google TTS
```

---

## 📅 업로드 스케줄 (추천)

### 롱폼 (주 1회)

- **토요일 오전 10시** 또는 **수요일 저녁 7시**

### 쇼츠 (하루 2개, 12시간 간격)

- **오전 7-8시** (출근/등교 시간)
- **저녁 8-9시** (퇴근 후 휴식)

| 요일 | 롱폼 | 쇼츠 |
| ---- | ---- | ---- |
| 토   | ✅   | 2개  |
| 일   | -    | 2개  |
| 월   | -    | 2개  |
| 화   | -    | 2개  |
| 수   | -    | 2개  |
| 목   | -    | 2개  |
| 금   | -    | 3개  |

---

## 🛠 유틸리티 스크립트

| 스크립트                       | 설명                 |
| ------------------------------ | -------------------- |
| `generate-intro.ts`            | 인트로 에셋 생성     |
| `generate-intro-tts.ts`        | 인트로 TTS 생성      |
| `generate-thumbnails-batch.ts` | 썸네일 일괄 생성     |
| `generate-upload-info.ts`      | 업로드 정보 생성     |
| `setup-preview.ts`             | Remotion 프리뷰 설정 |
| `extract-subtitles.py`         | 자막 추출 (Python)   |

---

## 🐱 Cat Interview (특수 채널)

```bash
# 캐릭터 생성
npx tsx scripts/generate-cat-character.ts

# 콘텐츠 생성
npx tsx scripts/generate-cat-content.ts
```
