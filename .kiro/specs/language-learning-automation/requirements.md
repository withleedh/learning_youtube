# Requirements Document

## Introduction

다채널 언어 학습 영상 자동화 시스템으로, 하나의 템플릿/엔진으로 여러 언어 학습 YouTube 채널을 운영할 수 있는 시스템입니다. '귀가 뚫리는 영어' 채널을 벤치마킹하되, **인터벌 변속 반복(3단계 속도 변화)**과 **빈칸 퀴즈(Active Recall)** 기능을 추가하여 차별화합니다.

## Glossary

- **Core_Engine**: AI 대본 생성, TTS 생성, Remotion 렌더링을 담당하는 공통 엔진
- **Channel_Config**: 채널별 테마, 언어, TTS 설정 등을 정의하는 JSON 설정 파일
- **Target_Language**: 학습 대상 언어 (예: English, Japanese)
- **Native_Language**: 학습자의 모국어 (예: Korean)
- **Script**: AI가 생성한 대본 데이터 (문장, 번역, 단어별 뜻, 빈칸 정보 포함)
- **TTS_Service**: Text-to-Speech 서비스 (OpenAI, Google 등)
- **Remotion**: React 기반 영상 렌더링 프레임워크
- **Pipeline**: 대본 생성 → TTS 생성 → 영상 렌더링의 전체 워크플로우
- **Interval_Training**: 느린 속도(0.8x) → 정상 속도(1.0x) → 빠른 속도(1.2x)로 변속하며 반복하는 학습 방식
- **Blank_Quiz**: 핵심 단어를 빈칸으로 처리하여 학습자가 능동적으로 참여하게 하는 기법

## Requirements

### Requirement 1: 채널 설정 관리

**User Story:** As a 콘텐츠 운영자, I want to 채널별 설정 파일로 테마와 언어를 관리하고 싶다, so that 하나의 엔진으로 여러 채널을 효율적으로 운영할 수 있다.

#### Acceptance Criteria

1. WHEN a Channel_Config JSON 파일이 로드될 때, THE Core_Engine SHALL 해당 채널의 메타정보, 테마, 색상, TTS 설정을 파싱하여 적용한다
2. WHEN a 새로운 채널을 추가할 때, THE System SHALL 새 JSON 설정 파일만으로 채널을 생성할 수 있어야 한다
3. IF a Channel_Config 파일에 필수 필드가 누락된 경우, THEN THE Core_Engine SHALL 명확한 에러 메시지를 반환한다
4. THE Channel_Config SHALL 다음 필수 섹션을 포함한다: meta, theme, colors, tts, content

### Requirement 2: AI 대본 생성

**User Story:** As a 콘텐츠 운영자, I want to AI가 자동으로 학습 대본을 생성하길 원한다, so that 매일 새로운 콘텐츠를 효율적으로 제작할 수 있다.

#### Acceptance Criteria

1. WHEN a 대본 생성 요청이 들어올 때, THE Script_Generator SHALL Gemini API를 사용하여 Target_Language와 Native_Language 조합의 대본을 생성한다
2. THE Script SHALL 설정된 sentenceCount 만큼의 문장을 포함한다
3. WHEN a Script가 생성될 때, THE Script_Generator SHALL 각 문장에 대해 단어별 뜻(words)을 함께 생성한다
4. THE Script SHALL speaker 필드로 남성(M)과 여성(F) 화자를 번갈아 지정한다
5. WHEN a Script가 생성될 때, THE Script_Generator SHALL JSON 형식으로 저장한다
6. WHEN a Script가 생성될 때, THE Script_Generator SHALL 각 문장에서 핵심 키워드(blank_word)를 선정하고 빈칸 버전(english_blank)을 함께 생성한다
7. THE Script SHALL 요일별 카테고리(월:이야기, 화:회화, 수:뉴스, 목:광고/안내, 금:여행/비즈니스, 토:수업, 일:동화)에 맞는 주제를 생성한다

### Requirement 3: TTS 음성 생성

**User Story:** As a 콘텐츠 운영자, I want to 채널별로 다른 TTS 음성을 사용하고 싶다, so that 각 언어에 맞는 자연스러운 음성을 제공할 수 있다.

#### Acceptance Criteria

1. WHEN a TTS 생성 요청이 들어올 때, THE TTS_Service SHALL Channel_Config의 tts 설정에 따라 적절한 provider를 선택한다
2. THE TTS_Service SHALL 화자(M/F)에 따라 maleVoice 또는 femaleVoice를 사용한다
3. WHEN a TTS 파일이 생성될 때, THE TTS_Service SHALL 문장별로 개별 오디오 파일을 생성한다
4. IF a TTS 생성이 실패한 경우, THEN THE TTS_Service SHALL 재시도 로직을 수행하고 실패 시 에러를 기록한다
5. WHEN a TTS 파일이 생성될 때, THE TTS_Service SHALL 3가지 속도 버전(0.8x, 1.0x, 1.2x)의 오디오를 생성한다

### Requirement 4: 영상 렌더링 (Remotion)

**User Story:** As a 콘텐츠 운영자, I want to 4단계 구조의 학습 영상을 자동으로 렌더링하고 싶다, so that 일관된 품질의 영상을 대량 생산할 수 있다.

#### Acceptance Criteria

1. THE Remotion_Renderer SHALL 인트로(30초), Step1, Step2, Step3, Step4, 아웃트로의 6개 섹션으로 영상을 구성한다
2. WHEN a 인트로 섹션이 렌더링될 때, THE Remotion_Renderer SHALL 처음 2초간 효과음과 채널 로고를 표시하고, 이후 28초간 4개의 학습 단계 항목을 하나씩 순차적으로 나타내며 설명한다
3. WHEN a Step1(자막 없이 듣기) 섹션이 렌더링될 때, THE Remotion_Renderer SHALL 배경 이미지와 함께 전체 대화를 자막 없이 재생한다 (2분~2분30초)
4. WHEN a Step2(문장별 듣기) 섹션이 렌더링될 때, THE Remotion_Renderer SHALL 배경 이미지를 어둡게 처리하고 문장별 자막을 표시한다 (2분~2분30초)
5. WHEN a Step3(10번씩 반복) 섹션이 렌더링될 때, THE Remotion_Renderer SHALL 상단에 이미지, 하단에 검은 배경으로 영어문장/한글문장/단어별뜻을 표시한다
6. WHEN a Step3에서 화자가 남성(M)일 때, THE Remotion_Renderer SHALL 텍스트를 파란색(maleText)으로 표시한다
7. WHEN a Step3에서 화자가 여성(F)일 때, THE Remotion_Renderer SHALL 텍스트를 핑크색(femaleText)으로 표시한다
8. WHEN a Step4(다시 자막 없이 듣기) 섹션이 렌더링될 때, THE Remotion_Renderer SHALL Step1과 동일하게 자막 없이 재생한다
9. THE Remotion_Renderer SHALL Channel_Config의 theme에서 로고와 인트로 사운드를 로드한다
10. WHEN a 영상 렌더링이 완료될 때, THE Remotion_Renderer SHALL output/{channelId}/ 경로에 영상을 저장한다

### Requirement 5: 인터벌 트레이닝 (Step 3 차별화)

**User Story:** As a 학습자, I want to 다양한 속도로 문장을 반복 청취하고 싶다, so that 지루하지 않게 집중력을 유지하며 학습할 수 있다.

#### Acceptance Criteria

1. WHEN a Step3 문장 반복이 실행될 때, THE Remotion_Renderer SHALL 3단계 변속 구조로 재생한다: 느린 속도(0.8x) → 정상 속도(1.0x) → 빠른 속도(1.2x)
2. WHEN a 느린 속도(0.8x) 구간이 재생될 때, THE Remotion_Renderer SHALL 전체 문장(english_full)과 해석(meaning)을 화면에 표시한다
3. WHEN a 정상 속도(1.0x) 구간이 재생될 때, THE Remotion_Renderer SHALL 빈칸 문장(english_blank)을 화면에 표시하여 퀴즈 형태로 제공한다
4. WHEN a 빠른 속도(1.2x) 구간이 재생될 때, THE Remotion_Renderer SHALL 전체 문장과 정답 단어(blank_answer)를 강조 색상으로 표시한다
5. THE Interval_Training SHALL 각 문장당 3단계 세트를 설정된 횟수만큼 반복한다

### Requirement 6: 파이프라인 실행

**User Story:** As a 콘텐츠 운영자, I want to CLI 명령어로 전체 파이프라인을 실행하고 싶다, so that 간편하게 영상을 생성할 수 있다.

#### Acceptance Criteria

1. WHEN a `npm run pipeline -- --channel {channelId}` 명령이 실행될 때, THE Pipeline SHALL 해당 채널의 대본 생성 → TTS 생성 → 영상 렌더링을 순차적으로 수행한다
2. WHEN a `npm run pipeline:all` 명령이 실행될 때, THE Pipeline SHALL 모든 채널에 대해 파이프라인을 실행한다
3. THE Pipeline SHALL 각 단계의 진행 상황을 콘솔에 출력한다
4. IF a 파이프라인 단계가 실패한 경우, THEN THE Pipeline SHALL 에러를 기록하고 다음 채널로 진행한다

### Requirement 7: 에셋 관리

**User Story:** As a 콘텐츠 운영자, I want to 채널별 에셋(로고, 인트로 사운드, 배경 이미지)을 분리 관리하고 싶다, so that 각 채널의 브랜딩을 유지할 수 있다.

#### Acceptance Criteria

1. THE System SHALL assets/{channelId}/ 경로에 채널별 에셋을 저장한다
2. WHEN a Channel_Config가 로드될 때, THE Core_Engine SHALL theme.logo와 theme.introSound 경로의 파일 존재를 검증한다
3. IF a 에셋 파일이 존재하지 않는 경우, THEN THE Core_Engine SHALL 기본 에셋을 사용하거나 경고를 출력한다
4. THE System SHALL 각 대본에 맞는 배경 이미지를 assets/{channelId}/images/ 경로에서 로드한다
