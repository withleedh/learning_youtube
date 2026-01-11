import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import type { Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';

export interface FillInBlankShortsProps {
  backgroundImage?: string;
  sentences: Sentence[];
  audioFiles: AudioFile[];
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
    background: string;
  };
  maxSentences?: number; // 최대 문장 수 (기본 5개)
}

// 문장당 타이밍 (프레임, 30fps 기준)
const COUNTDOWN_FRAMES = 30; // 1초 카운트다운
const QUESTION_FRAMES = 120; // 4초 문제 표시
const ANSWER_FRAMES = 60; // 2초 정답 공개
const TTS_BUFFER_FRAMES = 90; // 3초 TTS + 여유

const SENTENCE_TOTAL_FRAMES = QUESTION_FRAMES + ANSWER_FRAMES + TTS_BUFFER_FRAMES; // 10초

export const FillInBlankShorts: React.FC<FillInBlankShortsProps> = ({
  backgroundImage,
  sentences,
  audioFiles,
  colors,
  maxSentences = 5,
}) => {
  const limitedSentences = sentences.slice(0, maxSentences);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Background Image */}
      {backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* 인트로 카운트다운 */}
      <Sequence from={0} durationInFrames={COUNTDOWN_FRAMES}>
        <CountdownIntro />
      </Sequence>

      {/* 각 문장 시퀀스 */}
      {limitedSentences.map((sentence, index) => {
        const startFrame = COUNTDOWN_FRAMES + index * SENTENCE_TOTAL_FRAMES;
        const audio = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === '1.0x');

        return (
          <Sequence key={sentence.id} from={startFrame} durationInFrames={SENTENCE_TOTAL_FRAMES}>
            <SentenceQuiz
              sentence={sentence}
              audio={audio}
              colors={colors}
              questionNumber={index + 1}
              totalQuestions={limitedSentences.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// 카운트다운 인트로
const CountdownIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 200,
          fontWeight: 900,
          color: '#FFD700',
          transform: `scale(${scale})`,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          textShadow: '0 0 40px rgba(255, 215, 0, 0.5)',
        }}
      >
        🧩
      </div>
      <div
        style={{
          fontSize: 60,
          fontWeight: 700,
          color: '#FFFFFF',
          marginTop: 20,
          opacity: interpolate(frame, [0, 15], [0, 1]),
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        빈칸을 채워보세요!
      </div>
    </AbsoluteFill>
  );
};

// 개별 문장 퀴즈
const SentenceQuiz: React.FC<{
  sentence: Sentence;
  audio?: AudioFile;
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
  };
  questionNumber: number;
  totalQuestions: number;
}> = ({ sentence, audio, colors, questionNumber, totalQuestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;

  // 페이즈 결정
  const isQuestionPhase = frame < QUESTION_FRAMES;
  const isAnswerPhase = frame >= QUESTION_FRAMES && frame < QUESTION_FRAMES + ANSWER_FRAMES;
  const isTtsPhase = frame >= QUESTION_FRAMES + ANSWER_FRAMES;

  // 정답 애니메이션
  const answerScale = spring({
    frame: frame - QUESTION_FRAMES,
    fps,
    config: { damping: 8, stiffness: 150 },
  });

  const answerOpacity = interpolate(frame, [QUESTION_FRAMES, QUESTION_FRAMES + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* TTS 오디오 (정답 공개 후 재생) */}
      {audio && audio.path && isTtsPhase && <Audio src={staticFile(audio.path)} volume={1} />}

      {/* 문제 번호 */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 215, 0, 0.9)',
            padding: '16px 40px',
            borderRadius: 50,
            fontSize: 36,
            fontWeight: 700,
            color: '#000000',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          Q{questionNumber} / {totalQuestions}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        {/* 빈칸 문장 또는 전체 문장 */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.3,
            marginBottom: 40,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          {isQuestionPhase
            ? // 빈칸 표시
              sentence.targetBlank.split('_______').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span
                      style={{
                        backgroundColor: 'rgba(255, 215, 0, 0.3)',
                        padding: '0 20px',
                        borderRadius: 10,
                        borderBottom: '4px solid #FFD700',
                      }}
                    >
                      {'       '}
                    </span>
                  )}
                </React.Fragment>
              ))
            : // 정답 강조
              sentence.target.split(new RegExp(`(${sentence.blankAnswer})`, 'i')).map((part, i) =>
                part.toLowerCase() === sentence.blankAnswer.toLowerCase() ? (
                  <span
                    key={i}
                    style={{
                      color: '#FFD700',
                      fontWeight: 900,
                      transform: isAnswerPhase ? `scale(${answerScale})` : 'scale(1)',
                      display: 'inline-block',
                    }}
                  >
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
        </div>

        {/* 한글 해석 */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 500,
            color: colors.nativeText,
            textAlign: 'center',
            opacity: 0.9,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
        >
          {sentence.native}
        </div>

        {/* 정답 팝업 (정답 공개 시) */}
        {isAnswerPhase && (
          <div
            style={{
              marginTop: 60,
              backgroundColor: '#FFD700',
              padding: '24px 60px',
              borderRadius: 20,
              opacity: answerOpacity,
              transform: `scale(${answerScale})`,
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#000000',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              ✓ {sentence.blankAnswer}
            </div>
          </div>
        )}
      </div>

      {/* 하단 힌트 (문제 페이즈에서만) */}
      {isQuestionPhase && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '16px 32px',
              borderRadius: 30,
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            💡 힌트:{' '}
            {sentence.words.find((w) => w.word.toLowerCase() === sentence.blankAnswer.toLowerCase())
              ?.meaning || '생각해보세요!'}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// 총 길이 계산 함수
export function calculateFillInBlankShortsDuration(sentenceCount: number): number {
  return COUNTDOWN_FRAMES + sentenceCount * SENTENCE_TOTAL_FRAMES;
}
