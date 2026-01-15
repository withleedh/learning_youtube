# Requirements Document

## Introduction

유튜브 수익 창출 제재를 회피하고 시청 지속 시간을 극대화하기 위한 고품질 자동화 어학 영상 생성 시스템. Google Cloud TTS의 SSML Mark 기능과 `enableTimepointing: ["SSML_MARK"]` 옵션을 활용하여 단어별 타임포인트를 추출하고, Remotion과 연동하여 '노래방 자막(Karaoke Text)' 효과와 Ken Burns 동적 효과를 적용한 영상을 100% 코드로 자동 생성한다.

## Glossary

- **SSML**: Speech Synthesis Markup Language. TTS 음성 합성을 제어하는 마크업 언어
- **SSML_Mark**: SSML 내 `<mark name="index_N"/>` 태그. TTS 엔진이 해당 지점 도달 시 타임포인트를 반환
- **Timepoint**: TTS 엔진이 반환하는 특정 마크의 도달 시간 (초 단위)
- **Sync_Data**: 각 단어/구문의 word, startInSeconds, endInSeconds를 담은 JSON 데이터
- **Karaoke_Text**: 음성 재생에 맞춰 단어가 순차적으로 하이라이트되는 자막 효과 (Opacity 0.5→1.0, Color 변경)
- **Ken_Burns_Effect**: 정지 이미지에 5~10초 간격으로 Scale(1.0→1.15) 및 Pan 애니메이션을 적용하는 동적 효과
- **Dynamic_Element**: 유튜브 알고리즘의 '정지 화면' 감지를 우회하기 위한 움직이는 시각 요소
- **Dust_Particles**: 화면 전체에 미세한 먼지나 빛 입자가 부유하는 투명 영상 레이어
- **Cinemagraph**: 3~5초 길이의 반복 영상으로 정지 이미지 대체 가능
- **Pre_Processor**: 입력 스크립트를 SSML Mark가 삽입된 형태로 변환하는 모듈 (SSML_Injector)
- **Visual_Composer**: Remotion 기반으로 오디오, 이미지, 자막을 합성하는 모듈
- **Word_Component**: Remotion의 useCurrentFrame()과 useVideoConfig()를 사용하여 현재 단어를 하이라이트하는 컴포넌트
- **Script_Sync_Data**: Remotion에 전달되는 최종 동기화 데이터 (sentenceId, text, audioFile, words[])

## Requirements

### Requirement 1: SSML Mark 삽입 전처리 (SSML Injector)

**User Story:** As a 콘텐츠 제작자, I want to 스크립트에 자동으로 SSML Mark를 삽입, so that TTS 생성 시 단어별 타임포인트를 얻을 수 있다.

#### Acceptance Criteria

1. WHEN a plain text script is provided, THE Pre_Processor SHALL insert `<mark name="index_N"/>` tags before each word using regex-based tokenization
2. THE Pre_Processor SHALL use regex to separate words and punctuation without breaking their association
3. WHEN processing multi-line scripts, THE Pre_Processor SHALL assign unique sequential IDs (index_0, index_1, ...) across all sentences
4. THE Pre_Processor SHALL handle punctuation correctly by keeping punctuation attached to the preceding word (not creating separate marks)
5. THE Pre_Processor SHALL output valid SSML wrapped in `<speak>` tags that passes Google Cloud TTS validation
6. WHEN special characters or numbers are present, THE Pre_Processor SHALL normalize them for TTS compatibility
7. THE Pre_Processor SHALL preserve the original word text alongside each mark for later sync data generation

### Requirement 2: Google Cloud TTS 타임포인트 추출

**User Story:** As a 시스템, I want to Google Cloud TTS API로부터 오디오와 타임포인트를 동시에 추출, so that 정밀한 자막 동기화가 가능하다.

#### Acceptance Criteria

1. WHEN calling TTS API with SSML marks, THE TTS_Generator SHALL set `enableTimepointing: ["SSML_MARK"]` option
2. THE TTS_Generator SHALL parse the API response to extract timepoints array with markName and timeSeconds
3. WHEN timepoints are extracted, THE TTS_Generator SHALL calculate endInSeconds by using the next word's startInSeconds
4. THE TTS_Generator SHALL output Script_Sync_Data in JSON format: `{ sentenceId, text, audioFile, words: [{ word, start, end }] }`
5. IF the API returns incomplete timepoint data, THEN THE TTS_Generator SHALL estimate missing timestamps based on audio duration and word count
6. THE TTS_Generator SHALL support multiple voice options (languageCode, name, ssmlGender, speakingRate)
7. WHEN generating audio, THE TTS_Generator SHALL output MP3 format and store in assets folder with consistent naming

### Requirement 3: 노래방 자막 (Karaoke Text) 렌더링

**User Story:** As a 시청자, I want to 음성에 맞춰 단어가 하이라이트되는 자막을 보고 싶다, so that 발음과 텍스트를 동시에 학습할 수 있다.

#### Acceptance Criteria

1. WHEN rendering subtitles, THE Word_Component SHALL use useCurrentFrame() and useVideoConfig() to calculate current time (frame / fps)
2. THE Word_Component SHALL apply 'active' class when currentTime is between word.start and word.end
3. WHEN a word becomes active, THE Word_Component SHALL animate Opacity from 0.5 to 1.0 and change color (e.g., White to Yellow)
4. THE Word_Component SHALL apply CSS transition of approximately 0.1 seconds for smooth highlight transitions
5. THE Visual_Composer SHALL display inactive words in muted style (Opacity 0.5, neutral color)
6. THE Visual_Composer SHALL position subtitles in a readable area (bottom third) that doesn't obstruct key visual content
7. WHEN displaying long sentences, THE Visual_Composer SHALL wrap text appropriately and maintain highlight continuity across lines

### Requirement 4: Ken Burns 동적 효과 적용 (Anti-Static Policy)

**User Story:** As a 콘텐츠 제작자, I want to 정지 이미지에 Ken Burns 효과를 적용, so that 유튜브의 '정지 화면' 감지를 우회할 수 있다.

#### Acceptance Criteria

1. WHEN a static image is used as background, THE Visual_Composer SHALL apply Ken Burns effect with Scale animation (1.0 → 1.15)
2. THE Visual_Composer SHALL apply Ken Burns effect at 5~10 second intervals with smooth easing
3. THE Visual_Composer SHALL support multiple patterns: zoom-in, zoom-out, pan-left, pan-right, and diagonal combinations
4. THE Visual_Composer SHALL use spring or ease-in-out easing functions for natural motion
5. THE Visual_Composer SHALL cycle through different patterns for consecutive scenes to maintain visual variety
6. WHEN video clips (Cinemagraph, 3~5 seconds loop) are used instead of images, THE Visual_Composer SHALL skip Ken Burns and use native video motion
7. THE Visual_Composer SHALL allow configuration of effect intensity (zoom percentage 5-20%, pan distance in pixels)

### Requirement 5: 추가 동적 요소 오버레이 (Dust/Particles)

**User Story:** As a 콘텐츠 제작자, I want to 다양한 동적 요소를 화면에 추가, so that 픽셀 고정을 방지하고 시청자의 시각적 몰입도를 높일 수 있다.

#### Acceptance Criteria

1. THE Visual_Composer SHALL support Dust_Particles overlay - transparent video layer with floating dust or light particles
2. THE Visual_Composer SHALL support animated progress bars showing video timeline position
3. WHEN displaying learning content, THE Visual_Composer SHALL animate text appearance (fade-in with 0.3s duration, slide-in, typewriter effect)
4. THE Visual_Composer SHALL support animated speaker indicators showing which character is speaking
5. THE Visual_Composer SHALL layer multiple dynamic elements using z-index ordering without performance degradation
6. WHEN configuring overlays, THE Visual_Composer SHALL accept timing parameters (startFrame, endFrame) for element appearance/disappearance
7. THE Visual_Composer SHALL ensure all overlays maintain consistent frame rate (30fps minimum)

### Requirement 6: 영상 구조 및 통합 렌더링 파이프라인

**User Story:** As a 콘텐츠 제작자, I want to 스크립트 입력부터 최종 영상까지 원스텝으로 처리, so that 효율적으로 대량의 영상을 생산할 수 있다.

#### Acceptance Criteria

1. WHEN a script is provided, THE Pipeline SHALL execute: Pre-processing → TTS Generation → Asset Preparation → Rendering
2. THE Pipeline SHALL structure videos with: Intro (채널 로고 + Hook 멘트) → Main Content (Listen → Speak → Review) → Bridge (3~5분 간격 화면 환기)
3. THE Pipeline SHALL validate input script format before processing
4. WHEN all assets are ready, THE Pipeline SHALL invoke Remotion to render the final video
5. THE Pipeline SHALL support batch processing of multiple scripts in a single run
6. IF any step fails, THEN THE Pipeline SHALL log detailed error information and skip to the next script
7. THE Pipeline SHALL output final videos in YouTube-optimized format (MP4, H.264, AAC audio, 1080p)
8. WHEN rendering completes, THE Pipeline SHALL generate upload metadata (title, description, tags, thumbnail)
9. THE Pipeline SHALL vary Intro background music and hook text slightly for each video to avoid repetition detection

### Requirement 7: 설정 및 템플릿 관리

**User Story:** As a 콘텐츠 제작자, I want to 채널별로 스타일과 설정을 관리, so that 일관된 브랜딩을 유지할 수 있다.

#### Acceptance Criteria

1. THE Config_Manager SHALL support channel-specific TTS settings (languageCode, voiceName, ssmlGender, speakingRate)
2. THE Config_Manager SHALL support channel-specific visual settings (highlightColor, inactiveColor, fontSize, fontFamily, logoPlacement)
3. THE Config_Manager SHALL support Ken Burns effect presets per channel (zoomRange, panDistance, intervalSeconds)
4. THE Config_Manager SHALL support Dust_Particles overlay settings (opacity, particleCount, speed)
5. WHEN loading configuration, THE Config_Manager SHALL merge channel settings with global defaults
6. THE Config_Manager SHALL validate configuration against a Zod schema and report errors with specific field paths
7. THE Config_Manager SHALL support template inheritance for creating channel variants

### Requirement 8: 대화형 화자 연출 (Dialogue Mode)

**User Story:** As a 시청자, I want to 두 명이 대화하는 것처럼 시각적으로 연출된 영상을 보고 싶다, so that 상황에 더 몰입할 수 있다.

#### Acceptance Criteria

1. THE Visual_Composer SHALL support dialogue mode with two speaker avatars (Speaker A, Speaker B) positioned left and right
2. WHEN Speaker A's turn begins, THE Visual_Composer SHALL scale up Speaker A's avatar (1.0 → 1.2) and increase brightness
3. WHEN Speaker B's turn begins, THE Visual_Composer SHALL scale up Speaker B's avatar and dim Speaker A's avatar
4. THE Visual_Composer SHALL align subtitles based on current speaker (left-aligned for A, right-aligned for B)
5. THE TTS_Generator SHALL support pitch adjustment per speaker to differentiate voices (e.g., Speaker A: pitch +2, Speaker B: pitch -2)
6. THE Visual_Composer SHALL animate speaker transitions with smooth easing (0.3s duration)
7. THE Config_Manager SHALL support avatar image configuration per speaker (simple icons or character images)

### Requirement 9: 단일 화자 연출 (Narrator Mode)

**User Story:** As a 콘텐츠 제작자, I want to 뉴스나 이야기 형식의 단일 화자 콘텐츠도 시각적으로 풍부하게 연출, so that 단조로움을 피할 수 있다.

#### Acceptance Criteria

1. THE Visual_Composer SHALL support narrator mode with centered avatar and bottom subtitle bar (news anchor style)
2. WHEN important keywords appear in the script, THE Visual_Composer SHALL display keyword popup animation (scale up + glow effect)
3. THE Visual_Composer SHALL support automatic background image transitions based on sentence topics (configurable interval)
4. WHEN numbers or statistics appear, THE Visual_Composer SHALL display infographic-style animations (counter, bar chart)
5. THE Visual_Composer SHALL support topic-based image generation prompts for AI background creation
6. THE Config_Manager SHALL support keyword highlighting rules (regex patterns for important terms)
7. THE Visual_Composer SHALL maintain visual variety by cycling through different transition effects (fade, slide, zoom)
