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
  // 동적 타이밍용 duration (초 단위)
  audioDuration?: number;
  slowAudioDuration?: number;
}

// =============================================================================
// Layout Constants (1080x1920 for 9:16)
// =============================================================================

const TOP_BLACK_HEIGHT = 420;
const BOTTOM_PADDING = 350;
const BOTTOM_IMAGE_HEIGHT = 608;
const MIDDLE_HEIGHT = 1920 - TOP_BLACK_HEIGHT - BOTTOM_IMAGE_HEIGHT - BOTTOM_PADDING;

// =============================================================================
// Timing Constants (30fps) - 기본값, 실제는 audioDuration 기반으로 동적 계산
// =============================================================================

const FPS = 30;
const AUDIO_PADDING = Math.round(1.0 * FPS); // TTS 후 1초 여유
const DEFAULT_AUDIO_DURATION = 3.5; // 기본 오디오 길이 (초)
const COUNTDOWN_DURATION = 4 * FPS; // 카운트다운 4초 (3,2,1,0)
const CTA_DURATION = 2 * FPS; // 2초

// =============================================================================
// Duration Calculator - 동적 타이밍 계산
// =============================================================================

export function calculateListeningQuizShortDuration(
  audioDuration: number = DEFAULT_AUDIO_DURATION,
  slowAudioDuration: number = audioDuration * 1.25
): number {
  const audioStartDelay = 15; // 0.5초 딜레이

  // Phase 1: Hook + Audio (오디오 길이 + 패딩)
  const phase1Duration = audioStartDelay + Math.ceil(audioDuration * FPS) + AUDIO_PADDING;

  // Phase 2: Choices + Audio replay + Countdown (오디오 + 카운트다운)
  const phase2AudioStart = 10; // 0.33초 딜레이
  const phase2Duration = phase2AudioStart + Math.ceil(audioDuration * FPS) + COUNTDOWN_DURATION;

  // Phase 3: Reveal + Slow Audio (느린 오디오 + 패딩)
  const phase3AudioStart = 15; // 0.5초 딜레이
  const phase3Duration = phase3AudioStart + Math.ceil(slowAudioDuration * FPS) + AUDIO_PADDING;

  // Phase 4: CTA
  const phase4Duration = CTA_DURATION;

  return phase1Duration + phase2Duration + phase3Duration + phase4Duration;
}

// =============================================================================
// Helper: 선택지 생성 (정답 위치 랜덤) - 단어 기반 퀴즈
// =============================================================================

export function generateQuizChoices(sentence: Sentence): QuizChoice[] {
  const correctAnswer = sentence.blankAnswer; // 정답은 blankAnswer (단어)

  // wrongWordChoices가 있으면 사용, 없으면 폴백 생성
  const wrongAnswers =
    sentence.wrongWordChoices && sentence.wrongWordChoices.length >= 2
      ? sentence.wrongWordChoices.slice(0, 2)
      : generateFallbackWrongWords(correctAnswer, sentence.id);

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
// 폴백: 발음 유사 단어 생성 (wrongWordChoices가 없을 때)
// =============================================================================

function generateFallbackWrongWords(correctWord: string, sentenceId: number): string[] {
  const lower = correctWord.toLowerCase();

  // 발음 유사 단어 매핑
  const similarWords: Record<string, string[]> = {
    // 동사
    meeting: ['eating', 'beating'],
    eating: ['meeting', 'heating'],
    walking: ['working', 'talking'],
    working: ['walking', 'waking'],
    talking: ['walking', 'taking'],
    looking: ['booking', 'cooking'],
    coming: ['becoming', 'running'],
    running: ['coming', 'cunning'],
    going: ['growing', 'knowing'],
    playing: ['paying', 'staying'],
    staying: ['playing', 'saying'],
    saying: ['staying', 'paying'],
    thinking: ['drinking', 'sinking'],
    drinking: ['thinking', 'shrinking'],
    waiting: ['dating', 'rating'],
    reading: ['leading', 'feeding'],
    writing: ['riding', 'fighting'],
    living: ['giving', 'leaving'],
    leaving: ['living', 'believing'],
    // 명사
    coffee: ['copy', 'coughing'],
    money: ['honey', 'funny'],
    family: ['familiar', 'finally'],
    weather: ['whether', 'feather'],
    water: ['waiter', 'later'],
    letter: ['later', 'better'],
    better: ['letter', 'butter'],
    dinner: ['winner', 'thinner'],
    morning: ['warning', 'mourning'],
    evening: ['leaving', 'believing'],
    // 형용사
    familiar: ['similar', 'family'],
    similar: ['familiar', 'simpler'],
    different: ['difficult', 'diffident'],
    important: ['impatient', 'impotent'],
    beautiful: ['bountiful', 'dutiful'],
    wonderful: ['wanderful', 'plentiful'],
    // 부사/기타
    really: ['rarely', 'nearly'],
    actually: ['factually', 'virtually'],
    probably: ['possibly', 'properly'],
    definitely: ['defiantly', 'infinitely'],
    // 기본 동사
    like: ['light', 'life'],
    want: ["won't", 'want'],
    need: ['neat', 'knead'],
    have: ['half', 'halve'],
    make: ['wake', 'take'],
    take: ['make', 'wake'],
    get: ['got', 'jet'],
    see: ['sea', 'she'],
    know: ['no', 'now'],
    think: ['thing', 'sink'],
    come: ['calm', 'comb'],
    find: ['fine', 'mind'],
    give: ['live', 'gift'],
    tell: ['tall', 'sell'],
    feel: ['fill', 'fell'],
    become: ['because', 'welcome'],
    leave: ['live', 'leaf'],
    call: ['cool', 'coal'],
    try: ['dry', 'cry'],
    ask: ['axe', 'mask'],
    work: ['walk', 'word'],
    seem: ['seam', 'steam'],
    help: ['held', 'health'],
    show: ['shoe', 'slow'],
    hear: ['here', 'hair'],
    play: ['pay', 'pray'],
    move: ['movie', 'prove'],
    live: ['leave', 'love'],
    believe: ['believe', 'relieve'],
    bring: ['ring', 'thing'],
    happen: ['happy', 'heaven'],
    write: ['right', 'white'],
    sit: ['set', 'hit'],
    stand: ['sand', 'hand'],
    lose: ['loose', 'choose'],
    pay: ['play', 'say'],
    meet: ['meat', 'beat'],
    include: ['conclude', 'exclude'],
    continue: ['contain', 'constrain'],
    set: ['sit', 'sat'],
    learn: ['lean', 'earn'],
    change: ['chance', 'charge'],
    lead: ['lead', 'read'],
    understand: ['undertake', 'underhand'],
    watch: ['wash', 'match'],
    follow: ['fellow', 'hollow'],
    stop: ['step', 'shop'],
    create: ['great', 'crate'],
    speak: ['speak', 'sneak'],
    read: ['red', 'lead'],
    spend: ['send', 'spent'],
    grow: ['glow', 'throw'],
    open: ['often', 'oven'],
    walk: ['work', 'talk'],
    win: ['win', 'wind'],
    offer: ['often', 'officer'],
    remember: ['remember', 'member'],
    love: ['live', 'dove'],
    consider: ['consider', 'consist'],
    appear: ['appeal', 'disappear'],
    buy: ['by', 'bye'],
    wait: ['weight', 'late'],
    serve: ['serve', 'curve'],
    die: ['dye', 'dry'],
    send: ['spend', 'sent'],
    expect: ['except', 'accept'],
    build: ['built', 'guild'],
    stay: ['say', 'play'],
    fall: ['fail', 'fell'],
    cut: ['cat', 'cot'],
    reach: ['reach', 'teach'],
    kill: ['skill', 'fill'],
    remain: ['remain', 'retain'],
  };

  // 매핑에 있으면 사용
  if (similarWords[lower]) {
    return similarWords[lower];
  }

  // 폴백: 간단한 변형
  const fallbacks: string[] = [];

  // 1. 첫 글자 변형
  const firstLetterAlts = ['b', 'c', 'd', 'f', 'g', 'h', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w'];
  const altLetter = firstLetterAlts[sentenceId % firstLetterAlts.length];
  if (lower[0] !== altLetter) {
    fallbacks.push(altLetter + lower.slice(1));
  }

  // 2. 끝 변형 (-ing, -ed, -s)
  if (lower.endsWith('ing')) {
    fallbacks.push(lower.slice(0, -3) + 'ed');
  } else if (lower.endsWith('ed')) {
    fallbacks.push(lower.slice(0, -2) + 'ing');
  } else {
    fallbacks.push(lower + 'ing');
  }

  // 최소 2개 보장
  while (fallbacks.length < 2) {
    fallbacks.push(lower + 's');
  }

  return fallbacks.slice(0, 2);
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
  audioDuration,
  slowAudioDuration,
}) => {
  const frame = useCurrentFrame();

  // 동적 타이밍 계산
  const actualAudioDuration = audioDuration || audioFile.duration || DEFAULT_AUDIO_DURATION;
  const actualSlowDuration =
    slowAudioDuration || slowAudioFile?.duration || actualAudioDuration * 1.25;

  const audioStartDelay = 15; // 0.5초
  const phase1Duration = audioStartDelay + Math.ceil(actualAudioDuration * FPS) + AUDIO_PADDING;

  const phase2AudioStart = 10;
  const phase2Duration =
    phase2AudioStart + Math.ceil(actualAudioDuration * FPS) + COUNTDOWN_DURATION;

  const phase3AudioStart = 15;
  const phase3Duration = phase3AudioStart + Math.ceil(actualSlowDuration * FPS) + AUDIO_PADDING;

  const phase1Start = 0;
  const phase2Start = phase1Duration;
  const phase3Start = phase2Start + phase2Duration;
  const phase4Start = phase3Start + phase3Duration;

  // Phase2 카운트다운 계산 (메인에서 오버레이 렌더링용)
  const phase2Frame = frame - phase2Start;
  const countdownStart = phase2AudioStart + Math.ceil(actualAudioDuration * FPS); // 오디오 끝난 후 카운트다운
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
      <TopHeader
        episodeTitle={episodeTitle}
        sentenceIndex={sentenceIndex}
        quizHook={config.uiLabels?.quizHook}
        quizHookColor={config.shortsTheme?.quizHookColor}
      />

      {/* Bottom Image Area */}
      <BottomImageArea
        backgroundImage={backgroundImage}
        phase2End={phase3Start}
        totalDuration={phase4Start + CTA_DURATION}
      />

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
        <Sequence from={phase1Start} durationInFrames={phase1Duration}>
          <Phase1Hook audioFile={audioFile} nativeLanguage={config.meta.nativeLanguage} />
        </Sequence>

        {/* Phase 2: Choices */}
        <Sequence from={phase2Start} durationInFrames={phase2Duration}>
          <Phase2Choices
            choices={sentence.choices}
            audioFile={audioFile}
            targetBlank={sentence.targetBlank}
          />
        </Sequence>

        {/* Phase 3: Reveal */}
        <Sequence from={phase3Start} durationInFrames={phase3Duration}>
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

const BottomImageArea: React.FC<{
  backgroundImage?: string;
  phase2End: number;
  totalDuration: number;
}> = ({ backgroundImage, phase2End, totalDuration }) => {
  const frame = useCurrentFrame();

  let scale: number;

  if (frame < phase2End) {
    // Phase 1-2: Breathing 효과 (1.0 ↔ 1.03 반복)
    const breathCycle = Math.sin(frame * 0.05) * 0.015;
    scale = 1.01 + breathCycle;
  } else {
    // Phase 3-4: 1.0 → 1.2 확대
    const zoomProgress = (frame - phase2End) / (totalDuration - phase2End);
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
// Shared Choice Item Component - 단어 퀴즈용 (가로 배치, 컴팩트)
// =============================================================================

const CHOICE_STYLE = {
  container: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: '16px 24px',
    minWidth: 200,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '4px solid transparent',
  },
  label: {
    fontSize: 36,
    fontWeight: 900 as const,
    color: '#FF9500',
    marginRight: 12,
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  text: {
    fontSize: 42,
    fontWeight: 700 as const,
    color: '#333',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
};

// =============================================================================
// Phase 2: Choices with Countdown - 빈칸 문장 + 선택지 (가로 배치)
// =============================================================================

const Phase2Choices: React.FC<{
  choices: QuizChoice[];
  audioFile: AudioFile;
  targetBlank: string;
}> = ({ choices, audioFile, targetBlank }) => {
  const frame = useCurrentFrame();

  // 빈칸 문장 페이드인
  const blankOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        paddingTop: 120,
        gap: 32,
      }}
    >
      {/* Audio - 선택지 보여주면서 한번 더 재생 */}
      <Sequence from={10}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 빈칸 문장 표시 */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          lineHeight: 1.4,
          padding: '0 24px',
          opacity: blankOpacity,
        }}
      >
        {highlightBlank(targetBlank)}
      </div>

      {/* Choices - 가로 배치 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '0 16px',
        }}
      >
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
    </div>
  );
};

// 빈칸(_______)을 노란색 밑줄로 하이라이트
function highlightBlank(text: string): React.ReactNode {
  const parts = text.split('_______');
  if (parts.length === 1) return text;

  return (
    <>
      {parts[0]}
      <span
        style={{
          color: '#FFD93D',
          fontWeight: 800,
          borderBottom: '4px solid #FFD93D',
          paddingBottom: 4,
        }}
      >
        ____
      </span>
      {parts[1]}
    </>
  );
}

// =============================================================================
// Phase 3: Reveal Answer - 빈칸 문장 유지 + 가로 배치 + 정답 하이라이트
// =============================================================================

const Phase3Reveal: React.FC<{
  sentence: QuizSentence;
  audioFile: AudioFile;
}> = ({ sentence, audioFile }) => {
  const frame = useCurrentFrame();

  const revealDelay = 10;
  const showResult = frame >= revealDelay;

  // 오답 fade out (but keep space)
  const wrongOpacity = interpolate(frame, [revealDelay, revealDelay + 20], [1, 0.3], {
    extrapolateRight: 'clamp',
  });

  // 정답 문장 표시 (빈칸 → 정답 단어로 변경)
  const answerRevealOpacity = interpolate(frame, [revealDelay + 25, revealDelay + 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        paddingTop: 120,
        gap: 32,
      }}
    >
      {/* Audio - 느린 속도로 재생 */}
      <Sequence from={15}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 빈칸 문장 → 정답 문장으로 전환 */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          lineHeight: 1.4,
          padding: '0 24px',
        }}
      >
        {answerRevealOpacity < 0.5
          ? highlightBlank(sentence.targetBlank)
          : highlightBlankAnswer(sentence.target, sentence.blankAnswer)}
      </div>

      {/* Choices - 가로 배치, 정답 하이라이트 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '0 16px',
        }}
      >
        {sentence.choices.map((choice, index) => {
          const label = ['A', 'B', 'C'][index];
          const isCorrect = choice.isCorrect;

          return (
            <div
              key={index}
              style={{
                ...CHOICE_STYLE.container,
                opacity: isCorrect ? 1 : wrongOpacity,
                borderColor: isCorrect && showResult ? '#4CAF50' : 'transparent',
                boxShadow:
                  isCorrect && showResult
                    ? `0 0 ${20 + Math.sin(frame * 0.2) * 10}px rgba(76, 175, 80, 0.5)`
                    : CHOICE_STYLE.container.boxShadow,
                transform: isCorrect && showResult ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <div
                style={{
                  ...CHOICE_STYLE.label,
                  color: isCorrect && showResult ? '#4CAF50' : CHOICE_STYLE.label.color,
                }}
              >
                {isCorrect && showResult ? '✅' : `${label}.`}
              </div>
              <div style={CHOICE_STYLE.text}>{choice.text}</div>
            </div>
          );
        })}
      </div>

      {/* 번역 (하단) */}
      <div
        style={{
          fontSize: 32,
          color: '#AAAAAA',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          opacity: answerRevealOpacity,
          padding: '0 24px',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// 문장에서 정답 단어를 하이라이트하는 헬퍼 함수
function highlightBlankAnswer(sentence: string, blankAnswer: string): React.ReactNode {
  const lowerSentence = sentence.toLowerCase();
  const lowerAnswer = blankAnswer.toLowerCase();
  const index = lowerSentence.indexOf(lowerAnswer);

  if (index === -1) {
    return sentence;
  }

  const before = sentence.slice(0, index);
  const match = sentence.slice(index, index + blankAnswer.length);
  const after = sentence.slice(index + blankAnswer.length);

  return (
    <>
      {before}
      <span style={{ color: '#4CAF50', fontWeight: 800 }}>{match}</span>
      {after}
    </>
  );
}

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
