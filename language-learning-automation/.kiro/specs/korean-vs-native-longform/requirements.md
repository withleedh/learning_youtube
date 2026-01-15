# Requirements Document

## Introduction

유튜브 롱폼 영어 학습 채널을 위한 고유지율 콘텐츠 자동 생성 시스템. "한국인 영어 vs 원어민 영어" 비교형 포맷을 메인으로, 시뮬레이션형과 레벨업 RPG형을 서브 포맷으로 지원한다. 10초마다 새로운 정보를 제공하여 이탈을 방지하고, 시청자가 "판단"만 하게 하여 참여도를 높이는 구조.

## Glossary

- **Comparison_Segment**: 한국인 영어와 원어민 영어를 비교하는 단일 콘텐츠 단위 (10~20초)
- **Korean_Expression**: 한국인이 흔히 사용하는 영어 표현 (❌ 표시)
- **Native_Expression**: 원어민이 실제로 사용하는 자연스러운 표현 (⭕ 표시)
- **Hook_Intro**: 영상 시작 0~20초 구간의 시청자 유인 멘트 (예: "90%가 틀리는 영어")
- **Segment_Transition**: 비교 세그먼트 간 전환 효과 및 타이밍
- **Simulation_Scenario**: 특정 상황(공항, 카페, 면접)을 처음부터 끝까지 영어로 체험하는 롤플레이 콘텐츠
- **Level_Progression**: 같은 의미를 Level 1(초급)부터 Level 100(CEO급)까지 단계별로 표현하는 구조
- **Mistake_Reveal**: 착한 줄 알았는데 욕인 표현 등 실수/공포 기반 콘텐츠
- **Comment_Hook**: 영상 마지막에 댓글 유도를 위한 질문/CTA
- **Shorts_Clip**: 롱폼에서 추출한 하이라이트 쇼츠 (15~60초)

## Requirements

### Requirement 1: 비교형 콘텐츠 생성 (Korean vs Native)

**User Story:** As a 콘텐츠 제작자, I want to 한국인 영어와 원어민 영어를 비교하는 콘텐츠를 자동 생성, so that 10초마다 새 정보를 제공하여 시청자 이탈을 방지할 수 있다.

#### Acceptance Criteria

1. WHEN generating comparison content, THE Content_Generator SHALL produce 25-35 Comparison_Segments for a 10-12 minute video
2. THE Content_Generator SHALL structure each Comparison_Segment with: situation context → Korean_Expression (❌) → Native_Expression (⭕) → brief explanation
3. WHEN displaying Korean_Expression, THE Visual_Composer SHALL show ❌ indicator with red/muted styling
4. WHEN displaying Native_Expression, THE Visual_Composer SHALL show ⭕ indicator with green/highlighted styling
5. THE Content_Generator SHALL ensure each segment is self-contained (understandable without previous context)
6. THE Content_Generator SHALL vary situations across categories: 일상, 비즈니스, 감정표현, 요청/거절, 사과/감사
7. WHEN generating segments, THE Content_Generator SHALL prioritize expressions that trigger "나도 이렇게 말했는데?" reaction

### Requirement 2: Hook Intro 생성

**User Story:** As a 콘텐츠 제작자, I want to 강력한 Hook Intro를 자동 생성, so that 첫 20초 내에 시청자를 사로잡을 수 있다.

#### Acceptance Criteria

1. WHEN generating Hook_Intro, THE Content_Generator SHALL create attention-grabbing text within 0-20 seconds
2. THE Content_Generator SHALL use patterns like: "90%가 틀리는 영어", "이거 모르면 망신당합니다", "원어민이 절대 안 쓰는 표현"
3. THE Visual_Composer SHALL display Hook_Intro with large, bold typography and attention-grabbing animation
4. THE Content_Generator SHALL vary Hook_Intro text for each video to avoid repetition detection
5. WHEN Hook_Intro ends, THE Visual_Composer SHALL smoothly transition to first Comparison_Segment

### Requirement 3: 시뮬레이션형 콘텐츠 생성 (Situation Roleplay)

**User Story:** As a 콘텐츠 제작자, I want to 특정 상황을 처음부터 끝까지 영어로 체험하는 콘텐츠를 생성, so that 스토리 기반으로 시청자 유지율을 높일 수 있다.

#### Acceptance Criteria

1. WHEN generating simulation content, THE Content_Generator SHALL create complete scenario scripts for: 공항 입국심사, 카페 주문, 면접, 호텔 체크인, 병원 방문
2. THE Content_Generator SHALL structure simulation as: Hook → Q&A pairs (질문 → 잘못된 답 → 올바른 답) → 다음 상황
3. WHEN displaying Q&A, THE Visual_Composer SHALL show question first, then wrong answer with ❌, then correct answer with ⭕
4. THE Content_Generator SHALL maintain narrative continuity (중간부터 보면 이해 안 됨 → 유지율↑)
5. THE Visual_Composer SHALL display scenario progress indicator (예: "입국심사 3/7 단계")
6. WHEN scenario involves tension (면접, 입국심사), THE Content_Generator SHALL emphasize "틀리면 큰일" 느낌

### Requirement 4: 레벨업 RPG형 콘텐츠 생성 (Level Progression)

**User Story:** As a 콘텐츠 제작자, I want to 같은 의미를 레벨별로 표현하는 콘텐츠를 생성, so that 게임적 요소로 시청자가 끝까지 보게 만들 수 있다.

#### Acceptance Criteria

1. WHEN generating level content, THE Content_Generator SHALL create expressions for levels: 1, 10, 25, 50, 75, 100
2. THE Content_Generator SHALL ensure each level represents progressively more sophisticated/professional expression
3. THE Visual_Composer SHALL display level indicator with game-style UI (레벨 바, 경험치 느낌)
4. WHEN level increases, THE Visual_Composer SHALL upgrade visual elements (배경 색상, BGM 톤, 이펙트 강도)
5. THE Content_Generator SHALL create level content for themes: 사과하기, 거절하기, 칭찬하기, 요청하기, 불만 표현
6. THE Visual_Composer SHALL show "Level 100" with premium styling (금색, 왕관 아이콘 등)

### Requirement 5: 실수 폭로/공포형 콘텐츠 생성 (Mistake Reveal)

**User Story:** As a 콘텐츠 제작자, I want to 실수하면 망신당하는 영어 표현 콘텐츠를 생성, so that 공포/호기심 기반으로 클릭과 댓글을 유도할 수 있다.

#### Acceptance Criteria

1. WHEN generating mistake content, THE Content_Generator SHALL create expressions in categories: 착한 줄 알았는데 욕, 순진한데 야하게 들림, 공손한 줄 알았는데 무례
2. THE Content_Generator SHALL provide context for why the expression is problematic
3. THE Visual_Composer SHALL use warning/danger styling (빨간색, 경고 아이콘)
4. THE Content_Generator SHALL include "나도 썼는데?" 공감 유발 요소
5. WHEN revealing the mistake, THE Visual_Composer SHALL use dramatic reveal animation (blur → clear, 충격 효과음)

### Requirement 6: 댓글 유도 및 CTA

**User Story:** As a 콘텐츠 제작자, I want to 영상 마지막에 댓글을 유도하는 CTA를 자동 생성, so that 참여도와 알고리즘 점수를 높일 수 있다.

#### Acceptance Criteria

1. WHEN video ends, THE Visual_Composer SHALL display Comment_Hook section
2. THE Content_Generator SHALL generate questions like: "여러분은 몇 개나 알고 계셨나요?", "가장 충격적인 표현은?", "이런 실수 해본 적 있으신가요?"
3. THE Visual_Composer SHALL display comment icon animation and subscribe reminder
4. THE Content_Generator SHALL vary CTA text for each video
5. WHEN displaying CTA, THE Visual_Composer SHALL show for 10-15 seconds with engaging animation

### Requirement 7: 쇼츠 하이라이트 추출

**User Story:** As a 콘텐츠 제작자, I want to 롱폼에서 쇼츠용 하이라이트를 자동 추출, so that 쇼츠 채널 콘텐츠를 효율적으로 생산할 수 있다.

#### Acceptance Criteria

1. WHEN longform video is generated, THE Shorts_Extractor SHALL identify top 3-5 segments for shorts
2. THE Shorts_Extractor SHALL select segments based on: 충격도, 공감도, 독립성 (맥락 없이 이해 가능)
3. THE Shorts_Extractor SHALL format each segment as 15-60 second vertical video (9:16)
4. THE Shorts_Extractor SHALL add shorts-specific hook at the beginning (0-3초)
5. THE Shorts_Extractor SHALL add channel branding and CTA at the end
6. WHEN extracting from comparison content, THE Shorts_Extractor SHALL include both Korean and Native expressions in single short

### Requirement 8: 콘텐츠 다양성 및 반복 방지

**User Story:** As a 콘텐츠 제작자, I want to 콘텐츠가 반복되지 않도록 다양성을 보장, so that 시청자가 지루해하지 않고 유튜브 알고리즘에 불이익을 받지 않는다.

#### Acceptance Criteria

1. THE Content_Generator SHALL maintain expression database to track used expressions
2. WHEN generating new content, THE Content_Generator SHALL avoid expressions used in last 10 videos
3. THE Content_Generator SHALL rotate through different situation categories evenly
4. THE Visual_Composer SHALL vary visual elements (배경색, 폰트 스타일, 전환 효과) between videos
5. THE Content_Generator SHALL support manual expression blacklist for overused items
6. WHEN generating batch content, THE Content_Generator SHALL ensure no duplicate expressions within batch

### Requirement 9: 영상 구조 템플릿

**User Story:** As a 콘텐츠 제작자, I want to 검증된 영상 구조 템플릿을 사용, so that 일관된 품질과 유지율을 보장할 수 있다.

#### Acceptance Criteria

1. THE Pipeline SHALL support video structure template: [0:00] Hook → [0:20] Content Start → [9:00] Last Segment → [10:00] CTA
2. THE Pipeline SHALL insert brief transitions between segments (0.5-1초)
3. THE Pipeline SHALL support configurable segment timing (default: 15-20초 per segment)
4. WHEN total duration exceeds 12 minutes, THE Pipeline SHALL trim or combine segments
5. WHEN total duration is under 8 minutes, THE Pipeline SHALL add more segments or extend explanations
6. THE Pipeline SHALL generate timestamp markers for YouTube chapters

### Requirement 10: Hook A/B 테스트 변형

**User Story:** As a 콘텐츠 제작자, I want to 같은 영상에 여러 Hook 변형을 생성, so that A/B 테스트로 최적의 Hook을 찾을 수 있다.

#### Acceptance Criteria

1. WHEN generating content, THE Content_Generator SHALL produce 3-5 hook variants per script
2. THE Content_Generator SHALL store hook variants in hookVariants array in the script
3. WHEN rendering video, THE Pipeline SHALL accept hook selection via CLI option or random selection
4. THE Content_Generator SHALL ensure each hook variant has different emotional appeal (공포, 호기심, 공감, 도전)
5. THE Pipeline SHALL support rendering multiple videos with different hooks from same script

### Requirement 11: Retention 타이밍 프로필

**User Story:** As a 콘텐츠 제작자, I want to 다양한 타이밍 프로필을 적용, so that 시청자 체류 시간을 최적화할 수 있다.

#### Acceptance Criteria

1. THE Pipeline SHALL support timing profiles: fast (7초/segment), normal (10초), suspense (12초)
2. THE Pipeline SHALL automatically insert "burst" sequences (빠른 3연타) every 5 segments
3. WHEN burst sequence is triggered, THE Visual_Composer SHALL reduce segment duration to 5초 for 3 consecutive segments
4. THE Config_Manager SHALL support custom timing profile configuration
5. THE Pipeline SHALL vary timing within video to maintain viewer engagement

### Requirement 12: 영어 뉘앙스 QA (Linguistic Validator)

**User Story:** As a 콘텐츠 제작자, I want to AI 생성 영어의 뉘앙스를 자동 검증, so that 원어민 관점에서 어색한 표현을 방지할 수 있다.

#### Acceptance Criteria

1. THE Linguistic_Validator SHALL check generated expressions against forbidden patterns (과도하게 교과서적인 표현)
2. THE Linguistic_Validator SHALL flag expressions like "I am sorry for bothering you" and suggest "Sorry to bother you"
3. WHEN validation fails, THE Content_Generator SHALL regenerate the problematic expression
4. THE Linguistic_Validator SHALL maintain a pattern database of common Korean-English mistakes
5. THE Linguistic_Validator SHALL provide confidence score for each expression's naturalness

### Requirement 13: 난이도 메타데이터

**User Story:** As a 콘텐츠 제작자, I want to 각 표현에 난이도를 태깅, so that 나중에 레벨별 콘텐츠를 분리할 수 있다.

#### Acceptance Criteria

1. THE Content_Generator SHALL assign difficulty level to each segment: A2, B1, B2, C1
2. THE Content_Generator SHALL balance difficulty distribution (초반 A2-B1 위주, 후반 B2-C1)
3. THE Expression_Database SHALL store difficulty metadata for future filtering
4. THE Pipeline SHALL support difficulty-based content filtering option
5. WHEN generating beginner content, THE Content_Generator SHALL prioritize A2-B1 expressions

### Requirement 14: 쇼츠 자막 최적화

**User Story:** As a 콘텐츠 제작자, I want to 쇼츠 전용 자막을 최적화, so that 세로 화면에서 가독성을 높일 수 있다.

#### Acceptance Criteria

1. THE Shorts_Extractor SHALL apply shorts-specific caption rules (1줄 12자 제한)
2. THE Shorts_Extractor SHALL preserve ❌/⭕ indicators in captions
3. THE Shorts_Extractor SHALL highlight key words with color emphasis
4. THE Shorts_Extractor SHALL position captions in optimal vertical video area (중앙 하단)
5. THE Shorts_Extractor SHALL support caption animation (fade-in per word)

### Requirement 15: SEO 메타데이터 자동 생성

**User Story:** As a 콘텐츠 제작자, I want to YouTube SEO 메타데이터를 자동 생성, so that 검색 유입을 최대화할 수 있다.

#### Acceptance Criteria

1. THE Pipeline SHALL generate video description with key expressions summary
2. THE Pipeline SHALL generate category-specific tags (#한국인영어 #원어민영어 #영어회화 #영어뉘앙스)
3. THE Pipeline SHALL generate pinned comment suggestion for engagement
4. THE Pipeline SHALL include timestamp chapters in description
5. THE Content_Generator SHALL generate SEO-optimized title variants
