/**
 * ListeningQuizShort Component
 *
 * 선택지 퀴즈 형식의 YouTube Shorts (9:16)
 * - Phase 1: 훅 + 음성 재생 (3초)
 * - Phase 2: A/B/C 선택지 + 카운트다운 (4초)
 * - Phase 3: 정답 공개 + 느린 재생 (4초)
 * - Phase 4: CTA (2초)
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import type { Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import type { ChannelConfig } from '../config/types';

// =============================================================================
// Types
// =============================================================================

export interface QuizChoice {
  text: string;
  isCorrect: boolean;
}

export interface QuizSentence extends Sentence {
  choices: QuizChoice[];
}

export interface ListeningQuizShortProps {
  sentence: QuizSentence;
  audioFile: AudioFile;
  slowAudioFile?: AudioFile; // 0.8x 속도 오디오
  config: ChannelConfig;
  backgroundImage?: string;
  sentenceIndex?: number;
  episodeTitle?: string;
}

// =============================================================================
// Layout Constants (1080x1920 for 9:16)
// =============================================================================

const TOP_BLACK_HEIGHT = 420;
const BOTTOM_PADDING = 350;
const BOTTOM_IMAGE_HEIGHT = 608;
const MIDDLE_HEIGHT = 1920 - TOP_BLACK_HEIGHT - BOTTOM_IMAGE_HEIGHT - BOTTOM_PADDING;

// =============================================================================
// Timing Constants (30fps)
// =============================================================================

const FPS = 30;
const AUDIO_PADDING = Math.round(1.0 * FPS); // TTS 후 1초 여유
const HOOK_DURATION = 3 * FPS + AUDIO_PADDING; // 4초
const CHOICE_DURATION = Math.round(6.5 * FPS); // 6.5초 (오디오 2.5초 + 카운트다운 4초: 3,2,1,0)
const REVEAL_DURATION = 4 * FPS + AUDIO_PADDING; // 5초
const CTA_DURATION = 2 * FPS; // 2초

// =============================================================================
// Duration Calculator
// =============================================================================

export function calculateListeningQuizShortDuration(): number {
  return HOOK_DURATION + CHOICE_DURATION + REVEAL_DURATION + CTA_DURATION;
}

// =============================================================================
// Helper: 선택지 생성 (정답 위치 랜덤)
// =============================================================================

export function generateQuizChoices(sentence: Sentence): QuizChoice[] {
  const correctAnswer = sentence.target;

  // 오답 생성 로직
  const wrongAnswers = generateWrongAnswers(correctAnswer, sentence.id);

  // 정답 위치 랜덤 (sentence.id 기반)
  const correctIndex = sentence.id % 3;

  const choices: QuizChoice[] = [];
  let wrongIdx = 0;

  for (let i = 0; i < 3; i++) {
    if (i === correctIndex) {
      choices.push({ text: correctAnswer, isCorrect: true });
    } else {
      choices.push({ text: wrongAnswers[wrongIdx++], isCorrect: false });
    }
  }

  return choices;
}

// =============================================================================
// 발음 유사 단어 쌍 (리스닝에서 헷갈리기 쉬운 것들)
// =============================================================================

const SOUND_ALIKE_PAIRS: Record<string, string[]> = {
  // 축약형 혼동
  "i'd": ['i', "i'll", "i've"],
  "i'll": ['i', "i'd", "i've"],
  "i've": ['i', "i'd", "i'll"],
  "i'm": ['i', 'i am'],
  "you're": ['your', 'you'],
  "you'll": ['you', "you'd"],
  "they're": ['their', 'there'],
  "we're": ['were', 'we'],
  "it's": ['its', 'it'],
  "that's": ['that', 'thats'],
  "what's": ['what', 'whats'],
  "there's": ['theirs', 'there'],
  "here's": ['heres', 'here'],
  "let's": ['lets', 'let'],
  "don't": ['do', "doesn't"],
  "doesn't": ['does', "don't"],
  "didn't": ['did', "doesn't"],
  "can't": ['can', "couldn't"],
  "couldn't": ['could', "can't"],
  "won't": ['want', "wouldn't"],
  "wouldn't": ['would', "won't"],
  "shouldn't": ['should', "couldn't"],
  "haven't": ['have', "hasn't"],
  "hasn't": ['has', "haven't"],
  "isn't": ['is', "wasn't"],
  "wasn't": ['was', "isn't"],
  "aren't": ['are', "weren't"],
  "weren't": ['were', "aren't"],

  // 시제 혼동
  like: ['liked', 'likes'],
  liked: ['like', 'likes'],
  want: ['wanted', 'wants'],
  wanted: ['want', 'wants'],
  need: ['needed', 'needs'],
  needed: ['need', 'needs'],
  have: ['had', 'has'],
  had: ['have', 'has'],
  is: ['was', 'are'],
  was: ['is', 'were'],
  are: ['were', 'is'],
  were: ['are', 'was'],
  do: ['did', 'does'],
  did: ['do', 'does'],
  go: ['went', 'goes'],
  went: ['go', 'gone'],
  come: ['came', 'comes'],
  came: ['come', 'comes'],
  get: ['got', 'gets'],
  got: ['get', 'gotten'],
  take: ['took', 'takes'],
  took: ['take', 'taken'],
  make: ['made', 'makes'],
  made: ['make', 'makes'],
  think: ['thought', 'thinks'],
  thought: ['think', 'thinks'],
  know: ['knew', 'knows'],
  knew: ['know', 'known'],
  see: ['saw', 'seen'],
  saw: ['see', 'seen'],
  say: ['said', 'says'],
  said: ['say', 'says'],

  // 발음 유사 (위에서 정의 안 된 것들만)
  some: ['sum', 'same'],
  of: ['off', 'have'],
  then: ['than', 'them'],
  than: ['then', 'that'],
  there: ['their', "they're"],
  their: ['there', "they're"],
  your: ["you're", 'you'],
  its: ["it's", 'is'],
  to: ['too', 'two'],
  too: ['to', 'two'],
  for: ['four', 'from'],
  hear: ['here', 'heard'],
  here: ['hear', 'her'],
  no: ['know', 'now'],
  right: ['write', 'rite'],
  write: ['right', 'wrote'],
  buy: ['by', 'bye'],
  by: ['buy', 'bye'],
  new: ['knew', 'now'],
  been: ['being', 'bean'],
  being: ['been', 'begin'],
};

// =============================================================================
// 오답 생성 함수
// =============================================================================

function generateWrongAnswers(correct: string, sentenceId: number): string[] {
  const words = correct.split(' ');
  const wrongAnswers: string[] = [];

  // 변형할 단어 인덱스 찾기 (의미있는 단어 우선)
  const targetIndices = findTargetWordIndices(words);

  // 오답 1: 첫 번째 타겟 단어 변형
  if (targetIndices.length > 0) {
    const idx = targetIndices[0];
    const transformed = transformWordSmart(words[idx], sentenceId);
    if (transformed !== words[idx]) {
      const wrong1 = [...words];
      wrong1[idx] = transformed;
      wrongAnswers.push(wrong1.join(' '));
    }
  }

  // 오답 2: 두 번째 타겟 단어 변형 (또는 다른 위치)
  if (targetIndices.length > 1) {
    const idx = targetIndices[1];
    const transformed = transformWordSmart(words[idx], sentenceId + 1);
    if (transformed !== words[idx]) {
      const wrong2 = [...words];
      wrong2[idx] = transformed;
      wrongAnswers.push(wrong2.join(' '));
    }
  }

  // 오답이 부족하면 기본 변형 추가
  while (wrongAnswers.length < 2) {
    const fallback = generateFallbackWrong(correct, wrongAnswers.length, sentenceId);
    if (!wrongAnswers.includes(fallback) && fallback !== correct) {
      wrongAnswers.push(fallback);
    } else {
      // 최후의 수단: 단어 순서 살짝 변경
      const shuffled = shuffleMiddleWords(words, sentenceId + wrongAnswers.length);
      wrongAnswers.push(shuffled.join(' '));
    }
  }

  return wrongAnswers.slice(0, 2);
}

// 변형할 가치가 있는 단어 인덱스 찾기
function findTargetWordIndices(words: string[]): number[] {
  const indices: number[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?;:'"]+$/, '');

    // 축약형이나 동사는 변형 가치가 높음
    if (SOUND_ALIKE_PAIRS[word]) {
      indices.unshift(i); // 우선순위 높음
    } else if (word.length > 2 && !['the', 'a', 'an', 'and', 'or', 'but'].includes(word)) {
      indices.push(i);
    }
  }

  return indices;
}

// 스마트 단어 변형
function transformWordSmart(word: string, seed: number): string {
  const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
  const cleanWord = word.replace(/[.,!?;:'"]+$/, '');
  const lower = cleanWord.toLowerCase();

  // 발음 유사 단어가 있으면 사용
  if (SOUND_ALIKE_PAIRS[lower]) {
    const alternatives = SOUND_ALIKE_PAIRS[lower];
    const selected = alternatives[seed % alternatives.length];
    // 원래 대소문자 유지
    const result =
      cleanWord[0] === cleanWord[0].toUpperCase()
        ? selected.charAt(0).toUpperCase() + selected.slice(1)
        : selected;
    return result + punctuation;
  }

  // 기본 변형
  return transformWordBasic(cleanWord, seed) + punctuation;
}

// 기본 단어 변형
function transformWordBasic(word: string, seed: number): string {
  const lower = word.toLowerCase();

  // 동사 시제 변형
  if (lower.endsWith('ed')) {
    return word.slice(0, -2); // walked -> walk
  }
  if (lower.endsWith('ing')) {
    return word.slice(0, -3); // walking -> walk
  }
  if (lower.endsWith('s') && lower.length > 3) {
    return word.slice(0, -1); // walks -> walk
  }

  // 기본: ed 추가
  if (seed % 2 === 0) {
    return word + 'ed';
  }
  return word + 's';
}

// 폴백 오답 생성
function generateFallbackWrong(correct: string, index: number, seed: number): string {
  const words = correct.split(' ');

  // 중간 단어 하나 변형
  const midIdx = Math.floor(words.length / 2) + index;
  const targetIdx = midIdx % words.length;

  const newWords = [...words];
  newWords[targetIdx] =
    transformWordBasic(words[targetIdx].replace(/[.,!?;:'"]+$/, ''), seed + index) +
    (words[targetIdx].match(/[.,!?;:'"]+$/)?.[0] || '');

  return newWords.join(' ');
}

// 중간 단어 순서 변경 (최후의 수단)
function shuffleMiddleWords(words: string[], seed: number): string[] {
  if (words.length < 4) return words;

  const result = [...words];
  // 첫 단어와 마지막 단어는 유지, 중간만 swap
  const i = 1 + (seed % (words.length - 2));
  const j = 1 + ((seed + 1) % (words.length - 2));
  if (i !== j) {
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// =============================================================================
// Main Component
// =============================================================================

export const ListeningQuizShort: React.FC<ListeningQuizShortProps> = ({
  sentence,
  audioFile,
  slowAudioFile,
  config,
  backgroundImage,
  sentenceIndex,
  episodeTitle,
}) => {
  const frame = useCurrentFrame();
  const phase1Start = 0;
  const phase2Start = HOOK_DURATION;
  const phase3Start = phase2Start + CHOICE_DURATION;
  const phase4Start = phase3Start + REVEAL_DURATION;

  // Phase2 카운트다운 계산 (메인에서 오버레이 렌더링용)
  const phase2Frame = frame - phase2Start;
  const countdownStart = Math.round(2.5 * FPS);
  const isInPhase2 = frame >= phase2Start && frame < phase3Start;
  const showCountdown = isInPhase2 && phase2Frame >= countdownStart;
  const countdownFrame = Math.max(0, phase2Frame - countdownStart);
  const countdown =
    countdownFrame < FPS ? 3 : countdownFrame < 2 * FPS ? 2 : countdownFrame < 3 * FPS ? 1 : 0;
  const countdownPop = showCountdown
    ? interpolate(countdownFrame % FPS, [0, 8, 15], [0.5, 1.2, 1], { extrapolateRight: 'clamp' })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Top Header Area */}
      <TopHeader episodeTitle={episodeTitle} sentenceIndex={sentenceIndex} quizHook={config.uiLabels?.quizHook} quizHookColor={config.shortsTheme?.quizHookColor} />

      {/* Bottom Image Area */}
      <BottomImageArea backgroundImage={backgroundImage} />

      {/* Bottom padding */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: BOTTOM_PADDING,
          backgroundColor: '#000',
        }}
      />

      {/* Middle Quiz Area */}
      <div
        style={{
          position: 'absolute',
          top: TOP_BLACK_HEIGHT,
          left: 0,
          right: 0,
          height: MIDDLE_HEIGHT,
          backgroundColor: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {/* Phase 1: Hook + Audio */}
        <Sequence from={phase1Start} durationInFrames={HOOK_DURATION}>
          <Phase1Hook audioFile={audioFile} nativeLanguage={config.meta.nativeLanguage} />
        </Sequence>

        {/* Phase 2: Choices */}
        <Sequence from={phase2Start} durationInFrames={CHOICE_DURATION}>
          <Phase2Choices choices={sentence.choices} audioFile={audioFile} />
        </Sequence>

        {/* Phase 3: Reveal */}
        <Sequence from={phase3Start} durationInFrames={REVEAL_DURATION}>
          <Phase3Reveal sentence={sentence} audioFile={slowAudioFile || audioFile} />
        </Sequence>

        {/* Phase 4: CTA */}
        <Sequence from={phase4Start} durationInFrames={CTA_DURATION}>
        <Phase4CTA nativeLanguage={config.meta.nativeLanguage} shortsTheme={config.shortsTheme} />
        </Sequence>
      </div>

      {/* 카운트다운 오버레이 - 하단 백그라운드 이미지 영역 */}
      {showCountdown && (
        <div
          style={{
            position: 'absolute',
            bottom: BOTTOM_PADDING,
            left: 0,
            right: 0,
            height: BOTTOM_IMAGE_HEIGHT,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontSize: 280,
              fontWeight: 900,
              color: '#FFFFFF',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              transform: `scale(${countdownPop})`,
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {countdown}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// =============================================================================
// Top Header Component
// =============================================================================

const TopHeader: React.FC<{
  episodeTitle?: string;
  sentenceIndex?: number;
  quizHook?: string;
  quizHookColor?: string;
}> = ({ episodeTitle, sentenceIndex, quizHook, quizHookColor }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: TOP_BLACK_HEIGHT,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 200,
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 108,
          fontWeight: 900,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          letterSpacing: 4,
        }}
      >
        <span style={{ color: quizHookColor || '#FF9500' }}>{quizHook || 'Guess it right!'}</span>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 500,
          color: '#FFFFFF',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        {episodeTitle && `${episodeTitle}`}
        {sentenceIndex && ` (${sentenceIndex})`}
      </div>
    </div>
  );
};

// =============================================================================
// Bottom Image Area with Breathing + Zoom Effect
// =============================================================================

const BottomImageArea: React.FC<{ backgroundImage?: string }> = ({ backgroundImage }) => {
  const frame = useCurrentFrame();

  // Phase 경계점
  const phase2End = HOOK_DURATION + CHOICE_DURATION;
  const phase4End = phase2End + REVEAL_DURATION + CTA_DURATION;

  let scale: number;

  if (frame < phase2End) {
    // Phase 1-2: Breathing 효과 (1.0 ↔ 1.03 반복)
    const breathCycle = Math.sin(frame * 0.05) * 0.015;
    scale = 1.01 + breathCycle;
  } else {
    // Phase 3-4: 1.0 → 1.2 확대
    const zoomProgress = (frame - phase2End) / (phase4End - phase2End);
    scale = 1 + zoomProgress * 0.2; // 1.0 → 1.2
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: BOTTOM_PADDING,
        left: 0,
        right: 0,
        height: BOTTOM_IMAGE_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {backgroundImage && (
        <Img
          src={staticFile(backgroundImage)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// Phase 1: Hook + Audio Play
// =============================================================================

const Phase1Hook: React.FC<{
  audioFile: AudioFile;
  nativeLanguage: string;
}> = ({ audioFile, nativeLanguage }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // 스피커 아이콘 펄스 애니메이션
  const pulse = 1 + Math.sin(frame * 0.3) * 0.1;

  const listenText =
    nativeLanguage === 'Korean'
      ? '잘 들어보세요!'
      : nativeLanguage === 'Japanese'
        ? 'よく聞いてください！'
        : 'Listen carefully!';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 32,
      }}
    >
      {/* Audio */}
      <Sequence from={15}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* Speaker Icon */}
      <div
        style={{
          fontSize: 120,
          opacity: fadeIn,
          transform: `scale(${pulse})`,
        }}
      >
        🔊
      </div>

      {/* Listen Text */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {listenText}
      </div>
    </div>
  );
};

// =============================================================================
// Shared Choice Item Component
// =============================================================================

const CHOICE_STYLE = {
  container: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '16px 32px',
    width: '90%',
    maxWidth: 900,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '3px solid transparent', // 기본 투명 border로 크기 일관성 유지
  },
  label: {
    fontSize: 48,
    fontWeight: 900 as const,
    color: '#FF9500',
    marginRight: 24,
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  text: {
    fontSize: 36,
    fontWeight: 600 as const,
    color: '#333',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
};

// =============================================================================
// Phase 2: Choices with Countdown
// =============================================================================

const Phase2Choices: React.FC<{
  choices: QuizChoice[];
  audioFile: AudioFile;
}> = ({ choices, audioFile }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 20,
      }}
    >
      {/* Audio - 선택지 보여주면서 한번 더 재생 */}
      <Sequence from={10}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* Choices - 바로 나타남 (애니메이션 없음) */}
      {choices.map((choice, index) => {
        const label = ['A', 'B', 'C'][index];

        return (
          <div key={index} style={CHOICE_STYLE.container}>
            <div style={CHOICE_STYLE.label}>{label}.</div>
            <div style={CHOICE_STYLE.text}>{choice.text}</div>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// Phase 3: Reveal Answer
// =============================================================================

const Phase3Reveal: React.FC<{
  sentence: QuizSentence;
  audioFile: AudioFile;
}> = ({ sentence, audioFile }) => {
  const frame = useCurrentFrame();

  const revealDelay = 10;
  const showResult = frame >= revealDelay;

  // 정답 찾기
  const correctIndex = sentence.choices.findIndex((c) => c.isCorrect);
  const correctLabel = ['A', 'B', 'C'][correctIndex];

  // 오답 fade out
  const wrongOpacity = interpolate(frame, [revealDelay, revealDelay + 15], [1, 0], {
    extrapolateRight: 'clamp',
  });

  // 정답이 중앙(2번째 위치)으로 이동하는 애니메이션
  // 각 선택지 높이 약 80px + gap 20px = 100px
  const ITEM_HEIGHT = 100;
  // correctIndex: 0(A) -> 중앙으로 +100px, 1(B) -> 그대로 0, 2(C) -> 중앙으로 -100px
  const targetOffset = correctIndex === 0 ? ITEM_HEIGHT : correctIndex === 2 ? -ITEM_HEIGHT : 0;
  const correctYOffset = interpolate(
    frame,
    [revealDelay + 15, revealDelay + 35],
    [0, targetOffset],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 20,
        position: 'relative',
      }}
    >
      {/* Audio - 느린 속도로 재생 */}
      <Sequence from={15}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 선택지들을 원래 순서대로 렌더링 */}
      {sentence.choices.map((choice, index) => {
        const label = ['A', 'B', 'C'][index];
        const isCorrect = choice.isCorrect;

        if (!isCorrect) {
          // 오답 - fade out
          return (
            <div
              key={index}
              style={{
                ...CHOICE_STYLE.container,
                opacity: wrongOpacity,
              }}
            >
              <div style={CHOICE_STYLE.label}>{label}.</div>
              <div style={CHOICE_STYLE.text}>{choice.text}</div>
            </div>
          );
        }

        // 정답 - 중앙으로 이동 + 펄스 애니메이션
        return (
          <div
            key={index}
            style={{
              ...CHOICE_STYLE.container,
              boxShadow: showResult
                ? `0 0 ${20 + Math.sin(frame * 0.2) * 10}px rgba(76, 175, 80, 0.5)`
                : CHOICE_STYLE.container.boxShadow,
              borderColor: showResult ? '#4CAF50' : 'transparent',
              transform: `translateY(${correctYOffset}px)`,
            }}
          >
            <div
              style={{
                ...CHOICE_STYLE.label,
                color: showResult ? '#4CAF50' : CHOICE_STYLE.label.color,
              }}
            >
              {showResult ? '✅' : `${correctLabel}.`}
            </div>
            <div style={CHOICE_STYLE.text}>{choice.text}</div>
          </div>
        );
      })}

      {/* Korean translation - absolute 배치로 레이아웃 영향 없음 */}
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: 0,
          right: 0,
          fontSize: 42,
          color: '#AAAAAA',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 4: CTA
// =============================================================================

const Phase4CTA: React.FC<{
  nativeLanguage: string;
  shortsTheme?: {
    ctaQuestion?: string;
    ctaText?: string;
  };
}> = ({ nativeLanguage, shortsTheme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const bounceY = interpolate((frame - 15) % 30, [0, 15, 30], [0, 6, 0], {
    extrapolateLeft: 'clamp',
  });

  // Use config values if available, otherwise fallback to hardcoded
  const defaultQuestion =
    nativeLanguage === 'Korean'
      ? '맞추셨나요? 🎉'
      : nativeLanguage === 'Japanese'
        ? '正解できましたか？🎉'
        : 'Did you get it? 🎉';

  const defaultCtaText =
    nativeLanguage === 'Korean'
      ? '💬 맞추셨다면 댓글 남겨주세요!'
      : nativeLanguage === 'Japanese'
        ? '💬 コメントで教えてね！'
        : '💬 Leave a comment if you got it!';

  const questionText = shortsTheme?.ctaQuestion || defaultQuestion;
  const ctaText = shortsTheme?.ctaText || defaultCtaText;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 24,
      }}
    >
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {questionText}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: '#FF3B30',
          textAlign: 'center',
          opacity: fadeIn,
          transform: `scale(${scale}) translateY(${frame > 15 ? bounceY : 0}px)`,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {ctaText}
      </div>
    </div>
  );
};

export default ListeningQuizShort;
