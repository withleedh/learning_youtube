# Requirements Document

## Introduction

This feature addresses the quality issues in AI script generation caused by cognitive overload. Currently, the AI attempts to perform multiple complex tasks simultaneously (creative writing, JSON formatting, word counting, quiz generation, camera direction), resulting in generic stories, broken JSON, and poor educational quality.

The solution is a multi-step pipeline that separates concerns into distinct phases:

1. **Creative Phase**: Focus purely on writing engaging, entertaining scripts
2. **Structural Phase**: Convert creative output into educational JSON format
3. **Visual Phase**: Generate image prompts that match the finalized content

This separation allows each AI call to focus on a single responsibility, improving quality across all dimensions.

## Glossary

- **Script_Pipeline**: The orchestration system that manages the multi-step script generation process
- **Creative_Generator**: The component responsible for generating free-form creative scripts without structural constraints
- **Structural_Converter**: The component that transforms creative scripts into structured educational JSON
- **Visual_Generator**: The component that creates image prompts based on finalized script content
- **Screenplay_Format**: A free-form text format for creative scripts, similar to movie screenplays
- **Educational_JSON**: The structured JSON format containing sentences, blanks, vocabulary, and quiz elements
- **CEFR_Level**: Common European Framework of Reference for Languages proficiency levels (A1-C2)
- **Blank_Word**: A vocabulary word selected for fill-in-the-blank exercises
- **Wrong_Choices**: Phonetically similar words used as distractors in quizzes
- **Scene_Prompt**: A description used to generate images for specific script segments

## Requirements

### Requirement 1: Creative Script Generation

**User Story:** As a content creator, I want the AI to focus purely on creative writing first, so that the generated stories are engaging and entertaining rather than generic.

#### Acceptance Criteria

1. WHEN the Creative_Generator receives a topic and category, THE Creative_Generator SHALL produce a screenplay-format script without JSON constraints
2. WHEN generating creative content, THE Creative_Generator SHALL focus on emotional arc, humor, and engagement without counting words or managing structure
3. WHEN writing dialogue, THE Creative_Generator SHALL use natural conversational patterns including reactions, hesitations, and contractions
4. WHEN writing narration, THE Creative_Generator SHALL employ storytelling techniques like curiosity gaps, micro-drama, and emotional reversals
5. THE Creative_Generator SHALL output scripts in a human-readable screenplay format with speaker labels and dialogue
6. WHEN a category requires specific tone (fairytale, news, lesson), THE Creative_Generator SHALL adapt the creative style accordingly

### Requirement 2: Structural Conversion

**User Story:** As a content creator, I want the creative script to be converted into educational JSON format, so that the content can be used for language learning videos.

#### Acceptance Criteria

1. WHEN the Structural_Converter receives a screenplay-format script, THE Structural_Converter SHALL parse it into individual sentences
2. WHEN processing each sentence, THE Structural_Converter SHALL analyze and assign appropriate CEFR levels (A1-A2 target)
3. WHEN selecting blank words, THE Structural_Converter SHALL choose learnable vocabulary that is contextually meaningful
4. WHEN generating wrong choices, THE Structural_Converter SHALL create phonetically similar single words as distractors
5. WHEN creating native translations, THE Structural_Converter SHALL produce natural conversational translations rather than textbook-style
6. THE Structural_Converter SHALL output valid JSON conforming to the existing Script schema
7. IF the input screenplay contains sentences exceeding the target word count, THEN THE Structural_Converter SHALL split or simplify them while preserving meaning

### Requirement 3: Visual Prompt Generation

**User Story:** As a content creator, I want image prompts generated based on the finalized script, so that visuals match the dialogue content accurately.

#### Acceptance Criteria

1. WHEN the Visual_Generator receives a finalized script, THE Visual_Generator SHALL analyze the content to identify scene boundaries
2. WHEN creating scene prompts, THE Visual_Generator SHALL ensure visual-text coherence by matching image descriptions to dialogue content
3. WHEN generating character appearances, THE Visual_Generator SHALL maintain consistency across all scenes
4. WHEN specifying camera directions, THE Visual_Generator SHALL vary angles and shots to create visual interest
5. THE Visual_Generator SHALL produce 3-6 scene prompts that cover all sentences without gaps or overlaps
6. WHEN the script is narration-style, THE Visual_Generator SHALL describe story scenes rather than the narrator

### Requirement 4: Pipeline Orchestration

**User Story:** As a developer, I want a pipeline that orchestrates the multi-step process, so that I can generate high-quality scripts with a single command.

#### Acceptance Criteria

1. THE Script_Pipeline SHALL execute phases in sequence: Creative → Structural → Visual
2. WHEN a phase fails, THE Script_Pipeline SHALL provide clear error messages indicating which phase failed and why
3. THE Script_Pipeline SHALL pass the output of each phase as input to the next phase
4. WHEN the pipeline completes successfully, THE Script_Pipeline SHALL return a complete Script object matching the existing schema
5. THE Script_Pipeline SHALL support configuration options for enabling/disabling individual phases
6. THE Script_Pipeline SHALL log progress and timing information for each phase

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want the new pipeline to be compatible with existing code, so that I can gradually migrate without breaking the current system.

#### Acceptance Criteria

1. THE Script_Pipeline SHALL produce output compatible with the existing Script type schema
2. THE Script_Pipeline SHALL be usable as a drop-in replacement for the existing generateScript function
3. WHEN the pipeline is disabled, THE system SHALL fall back to the existing single-shot generation
4. THE Script_Pipeline SHALL support all existing categories (story, conversation, news, announcement, travel_business, lesson, fairytale)

### Requirement 6: Quality Validation

**User Story:** As a content creator, I want the pipeline to validate output quality, so that I can catch issues before using the generated content.

#### Acceptance Criteria

1. WHEN the Structural_Converter produces JSON, THE system SHALL validate it against the Script schema using Zod
2. WHEN blank words are selected, THE system SHALL verify they appear exactly in the target sentence
3. WHEN wrong choices are generated, THE system SHALL verify they are single words (not phrases)
4. IF validation fails, THEN THE system SHALL attempt regeneration with specific error feedback
5. THE system SHALL validate that sentence count matches the configured target
