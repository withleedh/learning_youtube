# Requirements Document

## Introduction

AI로 생성한 고정 캐릭터(할아버지-손녀 등)가 일상 상황에서 짧은 영어 표현을 대화하는 YouTube Shorts 영상을 자동 생성하는 기능. Google Veo 3.1을 활용하여 캐릭터 이미지 기반 대화 영상을 만들고, 영어 학습 콘텐츠로 활용한다.

## Glossary

- **Character**: AI로 생성된 고정 캐릭터 (할아버지, 손녀 등). 일관된 외모와 특성을 유지함
- **Character_Image**: Imagen 3 등으로 생성한 캐릭터의 정적 이미지
- **Dialogue_Scene**: 두 캐릭터가 짧은 영어 표현으로 대화하는 장면
- **Veo_Generator**: Google Veo 3.1 API를 사용하여 이미지 기반 영상을 생성하는 모듈
- **Expression**: 학습할 짧은 영어 표현 (예: "Ring up", "Couldn't be better")
- **Scene_Context**: 대화가 일어나는 상황/배경 (예: 식당, 거실, 공원)
- **Shorts_Composer**: 생성된 영상에 자막, 발음, 번역을 합성하는 모듈
- **Character_Consistency**: 여러 영상에서 동일 캐릭터가 일관된 외모를 유지하는 것

## Requirements

### Requirement 1: 캐릭터 정의 및 관리

**User Story:** As a 콘텐츠 제작자, I want to 고정 캐릭터를 정의하고 관리, so that 여러 에피소드에서 일관된 캐릭터를 사용할 수 있다.

#### Acceptance Criteria

1. THE Character_Manager SHALL store character definitions including name, age, gender, appearance description, and relationship
2. WHEN a character is created, THE Character_Manager SHALL generate a reference image using Imagen 3 or similar AI image generator
3. THE Character_Manager SHALL support at least 2 characters per channel (e.g., grandfather and granddaughter)
4. WHEN loading a character, THE Character_Manager SHALL return the character's reference image path and metadata
5. THE Character_Manager SHALL persist character data in JSON format within the channel configuration

### Requirement 2: 대화 스크립트 생성

**User Story:** As a 콘텐츠 제작자, I want to 짧은 영어 표현을 중심으로 대화 스크립트를 생성, so that 학습 효과가 높은 콘텐츠를 만들 수 있다.

#### Acceptance Criteria

1. WHEN generating a dialogue script, THE Script_Generator SHALL create a conversation featuring a target English expression
2. THE Script_Generator SHALL include context setup (상황 설명), dialogue lines (2-4 exchanges), and expression highlight
3. WHEN a target expression is provided, THE Script_Generator SHALL ensure the expression appears naturally in the dialogue
4. THE Script_Generator SHALL generate Korean translations and pronunciation guides for each line
5. THE Script_Generator SHALL output dialogue in a structured format compatible with Veo prompt generation

### Requirement 3: Veo 3.1 영상 생성

**User Story:** As a 시스템, I want to Veo 3.1 API를 통해 캐릭터 대화 영상을 생성, so that 자연스러운 대화 장면을 만들 수 있다.

#### Acceptance Criteria

1. WHEN generating a video, THE Veo_Generator SHALL accept character reference images and dialogue script as input
2. THE Veo_Generator SHALL construct a prompt that maintains character consistency with the reference images
3. WHEN the API call succeeds, THE Veo_Generator SHALL download and store the generated video file
4. IF the API call fails, THEN THE Veo_Generator SHALL retry up to 3 times with exponential backoff
5. THE Veo_Generator SHALL generate videos in 16:9 aspect ratio suitable
6. WHEN generating video, THE Veo_Generator SHALL include scene context (location, lighting, mood) in the prompt

### Requirement 4: 쇼츠 합성 및 편집

**User Story:** As a 콘텐츠 제작자, I want to 생성된 영상에 자막과 학습 요소를 합성, so that 완성된 학습 쇼츠를 만들 수 있다.

#### Acceptance Criteria

1. WHEN composing a short, THE Shorts_Composer SHALL overlay the target expression text at the top of the video
2. THE Shorts_Composer SHALL display Korean translation and pronunciation guide at appropriate timing
3. WHEN the dialogue plays, THE Shorts_Composer SHALL highlight the speaker's lines with visual indicators
4. THE Shorts_Composer SHALL add channel branding (logo, watermark) to the video
5. THE Shorts_Composer SHALL output final video in MP4 format with H.264 encoding
6. THE Shorts_Composer SHALL ensure total duration is under 60 seconds for Shorts compliance

### Requirement 5: 파이프라인 통합

**User Story:** As a 콘텐츠 제작자, I want to 전체 프로세스를 자동화된 파이프라인으로 실행, so that 효율적으로 콘텐츠를 대량 생산할 수 있다.

#### Acceptance Criteria

1. WHEN running the pipeline, THE Pipeline SHALL execute steps in order: script generation → video generation → composition
2. THE Pipeline SHALL accept a list of target expressions and generate one short per expression
3. WHEN a step fails, THE Pipeline SHALL log the error and continue with the next expression
4. THE Pipeline SHALL output progress status and estimated completion time
5. THE Pipeline SHALL store all generated assets in an organized output directory structure
6. WHEN all shorts are complete, THE Pipeline SHALL generate upload metadata (title, description, tags) for each video

### Requirement 6: 채널 설정 확장

**User Story:** As a 콘텐츠 제작자, I want to 채널별로 캐릭터와 스타일을 설정, so that 다양한 채널에서 다른 캐릭터를 사용할 수 있다.

#### Acceptance Criteria

1. THE Channel_Config SHALL include a characters section defining the channel's fixed characters
2. WHEN loading channel config, THE System SHALL validate character definitions against the schema
3. THE Channel_Config SHALL support style settings for video generation (lighting, color tone, scene preferences)
4. THE Channel_Config SHALL include Veo-specific settings (model version, quality, duration preferences)
