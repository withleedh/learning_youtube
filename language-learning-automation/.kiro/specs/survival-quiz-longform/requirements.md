# Requirements Document

## Introduction

"Cat vs Dog 50라운드 서바이벌" 게임쇼 형식의 10분 롱폼 영어 학습 콘텐츠 자동 생성 시스템. 기존 "한국인 영어 vs 원어민 영어" 비교 포맷을 게임쇼 서바이벌 형식으로 변환하여, 두 캐릭터(고양이/강아지)가 50라운드 영어 퀴즈에서 경쟁하는 구조. HP 시스템과 바닥 함락 애니메이션으로 긴장감을 유지하고, 랜덤 승자 결정으로 시청자 참여도를 극대화한다.

## Glossary

- **Survival_Round**: 단일 퀴즈 라운드 (8-10초), 상황 제시 → 캐릭터 답변 → 정답 판정 → 탈락 애니메이션
- **Character**: 퀴즈에 참여하는 캐릭터 (Cat 또는 Dog)
- **HP_Bar**: 캐릭터의 체력 표시 바 (초기값 100, 오답 시 감소)
- **Floor_Drop**: 오답 캐릭터가 바닥이 열리며 떨어지는 애니메이션
- **Winner_Determination**: 각 라운드 승자를 랜덤하게 결정하는 로직 (Math.random() > 0.5)
- **Konglish_Answer**: 한국인이 흔히 쓰는 어색한 영어 표현 (오답)
- **Native_Answer**: 원어민이 실제로 쓰는 자연스러운 표현 (정답)
- **Round_Counter**: 현재 라운드 번호 표시 (예: "Round 15/50")
- **Survival_Intro**: 게임 시작 전 두 캐릭터와 HP 100 상태를 보여주는 인트로
- **Survival_Ending**: 최종 승자 발표 및 결과 화면

## Requirements

### Requirement 1: 서바이벌 라운드 생성

**User Story:** As a 콘텐츠 제작자, I want to 50라운드의 영어 퀴즈를 자동 생성, so that 10분 롱폼 영상에 적합한 빠른 템포의 콘텐츠를 만들 수 있다.

#### Acceptance Criteria

1. WHEN generating survival content, THE Round_Generator SHALL produce exactly 50 Survival_Rounds for a 10-minute video
2. THE Round_Generator SHALL structure each Survival_Round with: situation (한국어) → Character answers → winner reveal → Floor_Drop animation → brief explanation
3. WHEN generating rounds, THE Round_Generator SHALL ensure each round is 8-10 seconds (faster than comparison format's 15 seconds)
4. THE Round_Generator SHALL vary situations across categories: 일상, 비즈니스, 감정표현, 요청/거절, 사과/감사
5. THE Round_Generator SHALL ensure each round is self-contained (understandable without previous context)
6. WHEN generating expressions, THE Round_Generator SHALL prioritize expressions that trigger "나도 이렇게 말했는데?" reaction

### Requirement 2: 캐릭터 시스템

**User Story:** As a 콘텐츠 제작자, I want to 고양이와 강아지 캐릭터가 경쟁하는 구조, so that 시청자가 캐릭터에 감정이입하며 끝까지 시청하게 만들 수 있다.

#### Acceptance Criteria

1. THE Character_System SHALL support two characters: Cat (🐱) and Dog (🐶)
2. WHEN displaying character answers, THE Visual_Composer SHALL show character emoji/avatar alongside their answer
3. THE Character_System SHALL maintain consistent character styling throughout the video
4. WHEN a character gives wrong answer, THE Visual_Composer SHALL show that character's Floor_Drop animation
5. THE Character_System SHALL support character-specific voice/TTS for answers

### Requirement 3: HP 시스템

**User Story:** As a 콘텐츠 제작자, I want to HP 바가 감소하는 시스템, so that 시청자가 "누가 살아남을까?" 긴장감을 느끼며 시청할 수 있다.

#### Acceptance Criteria

1. THE HP_System SHALL initialize both characters with HP 100 at video start
2. WHEN a character gives wrong answer, THE HP_System SHALL decrease that character's HP by a calculated amount
3. THE Visual_Composer SHALL display HP_Bar for both characters throughout the video
4. THE HP_System SHALL calculate HP decrease based on remaining rounds (HP should reach near 0 for loser at round 50)
5. WHEN HP changes, THE Visual_Composer SHALL animate the HP_Bar decrease with visual feedback
6. THE HP_System SHALL ensure HP never goes below 0

### Requirement 4: 랜덤 승자 결정

**User Story:** As a 콘텐츠 제작자, I want to 각 라운드 승자가 랜덤하게 결정, so that 시청자가 결과를 예측할 수 없어 끝까지 시청하게 만들 수 있다.

#### Acceptance Criteria

1. WHEN determining round winner, THE Winner_Logic SHALL use randomization (approximately 50/50 probability)
2. THE Winner_Logic SHALL assign Konglish_Answer to loser and Native_Answer to winner for each round
3. THE Winner_Logic SHALL track cumulative wins for final winner determination
4. WHEN generating script, THE Round_Generator SHALL pre-determine all 50 round winners for consistency
5. THE Winner_Logic SHALL ensure final winner is the character with more round wins

### Requirement 5: 바닥 함락 애니메이션

**User Story:** As a 콘텐츠 제작자, I want to 오답자가 바닥으로 떨어지는 애니메이션, so that 오답의 결과를 시각적으로 강렬하게 전달할 수 있다.

#### Acceptance Criteria

1. WHEN a character gives wrong answer, THE Visual_Composer SHALL trigger Floor_Drop animation after 0.5 second delay
2. THE Floor_Drop animation SHALL show the floor opening beneath the losing character
3. THE Floor_Drop animation SHALL show the character falling through the opened floor
4. THE Floor_Drop animation SHALL complete within 1-1.5 seconds
5. WHEN Floor_Drop completes, THE Visual_Composer SHALL show HP decrease animation
6. THE Visual_Composer SHALL include sound effect for floor drop

### Requirement 6: 라운드 플로우 타이밍

**User Story:** As a 콘텐츠 제작자, I want to 각 라운드가 8-10초 내에 완료, so that 롱폼 영상에서 빠른 템포로 시청자 이탈을 방지할 수 있다.

#### Acceptance Criteria

1. THE Timing_System SHALL structure each round as: situation (1.5초) → Dog answer (1.5초) → Cat answer (1.5초) → delay (0.5초) → Floor_Drop (1.5초) → explanation (1.5초)
2. THE Timing_System SHALL support configurable timing profiles for round duration
3. WHEN total video duration exceeds 12 minutes, THE Pipeline SHALL reduce round timing or round count
4. WHEN total video duration is under 8 minutes, THE Pipeline SHALL increase round timing
5. THE Timing_System SHALL insert brief transitions between rounds (0.3초)

### Requirement 7: 서바이벌 인트로

**User Story:** As a 콘텐츠 제작자, I want to 게임 시작 전 인트로, so that 시청자가 게임 규칙과 캐릭터를 이해하고 기대감을 갖게 할 수 있다.

#### Acceptance Criteria

1. THE Survival_Intro SHALL display both characters with HP 100 bars
2. THE Survival_Intro SHALL show game title: "Cat vs Dog 50라운드 서바이벌"
3. THE Survival_Intro SHALL briefly explain rules: "틀리면 바닥이 열립니다!"
4. THE Survival_Intro SHALL be 5-8 seconds in duration
5. THE Survival_Intro SHALL use attention-grabbing animation and sound

### Requirement 8: 서바이벌 엔딩

**User Story:** As a 콘텐츠 제작자, I want to 최종 승자 발표 엔딩, so that 시청자가 결과에 만족감을 느끼고 댓글/공유를 유도할 수 있다.

#### Acceptance Criteria

1. THE Survival_Ending SHALL display final HP status for both characters
2. THE Survival_Ending SHALL announce winner with celebration animation
3. THE Survival_Ending SHALL show final score (rounds won by each character)
4. THE Survival_Ending SHALL include CTA: "다음 대결에서는 누가 이길까요?"
5. THE Survival_Ending SHALL be 10-15 seconds in duration
6. THE Survival_Ending SHALL include subscribe reminder

### Requirement 9: 라운드 카운터 표시

**User Story:** As a 콘텐츠 제작자, I want to 현재 라운드 번호 표시, so that 시청자가 진행 상황을 파악하고 "얼마나 남았지?" 궁금증을 유지할 수 있다.

#### Acceptance Criteria

1. THE Visual_Composer SHALL display Round_Counter throughout all rounds
2. THE Round_Counter SHALL show format: "Round N/50"
3. THE Round_Counter SHALL update with animation when round changes
4. THE Round_Counter SHALL be positioned consistently (top area of screen)
5. WHEN approaching final rounds (45-50), THE Visual_Composer SHALL add visual emphasis to Round_Counter

### Requirement 10: 설명 표시

**User Story:** As a 콘텐츠 제작자, I want to 각 라운드 후 간단한 설명, so that 시청자가 왜 그 표현이 틀렸는지 학습할 수 있다.

#### Acceptance Criteria

1. WHEN Floor_Drop completes, THE Visual_Composer SHALL display brief explanation
2. THE explanation SHALL be in Korean and under 20 characters
3. THE explanation SHALL highlight the key difference between Konglish and Native expressions
4. THE explanation duration SHALL be 1-1.5 seconds
5. THE explanation SHALL use clear, readable typography

### Requirement 11: 오디오 시스템

**User Story:** As a 콘텐츠 제작자, I want to 각 요소에 적절한 오디오, so that 게임쇼 분위기를 살리고 몰입감을 높일 수 있다.

#### Acceptance Criteria

1. THE Audio_System SHALL generate TTS for situation (Korean voice)
2. THE Audio_System SHALL generate TTS for character answers (English voice, character-specific)
3. THE Audio_System SHALL include sound effect for Floor_Drop
4. THE Audio_System SHALL include sound effect for HP decrease
5. THE Audio_System SHALL include background music appropriate for game show format
6. THE Audio_System SHALL generate TTS for explanation (Korean voice)

### Requirement 12: 콘텐츠 다양성

**User Story:** As a 콘텐츠 제작자, I want to 표현이 반복되지 않도록 다양성 보장, so that 시청자가 지루해하지 않고 유튜브 알고리즘에 불이익을 받지 않는다.

#### Acceptance Criteria

1. THE Round_Generator SHALL maintain expression database to track used expressions
2. WHEN generating new content, THE Round_Generator SHALL avoid expressions used in last 10 videos
3. THE Round_Generator SHALL rotate through different situation categories evenly
4. THE Round_Generator SHALL support manual expression blacklist
5. WHEN generating batch content, THE Round_Generator SHALL ensure no duplicate expressions within batch

### Requirement 13: 영어 뉘앙스 QA

**User Story:** As a 콘텐츠 제작자, I want to AI 생성 영어의 뉘앙스를 자동 검증, so that 원어민 관점에서 어색한 표현을 방지할 수 있다.

#### Acceptance Criteria

1. THE Linguistic_Validator SHALL check generated expressions against forbidden patterns
2. THE Linguistic_Validator SHALL flag overly textbook-like expressions
3. WHEN validation fails, THE Round_Generator SHALL regenerate the problematic expression
4. THE Linguistic_Validator SHALL provide confidence score for each expression's naturalness

### Requirement 14: 타임스탬프 생성

**User Story:** As a 콘텐츠 제작자, I want to YouTube 챕터용 타임스탬프 자동 생성, so that 시청자가 원하는 라운드로 쉽게 이동할 수 있다.

#### Acceptance Criteria

1. THE Pipeline SHALL generate timestamp for intro
2. THE Pipeline SHALL generate timestamps for every 10 rounds (Round 1, 10, 20, 30, 40, 50)
3. THE Pipeline SHALL generate timestamp for ending
4. THE timestamps SHALL be in YouTube chapter format (MM:SS Label)

### Requirement 15: SEO 메타데이터 생성

**User Story:** As a 콘텐츠 제작자, I want to YouTube SEO 메타데이터를 자동 생성, so that 검색 유입을 최대화할 수 있다.

#### Acceptance Criteria

1. THE Pipeline SHALL generate video title variants (예: "고양이 vs 강아지 영어 서바이벌 | 50라운드 대결")
2. THE Pipeline SHALL generate video description with game summary
3. THE Pipeline SHALL generate category-specific tags (#영어퀴즈 #서바이벌 #고양이vs강아지)
4. THE Pipeline SHALL generate pinned comment suggestion for engagement
5. THE Pipeline SHALL include timestamp chapters in description
