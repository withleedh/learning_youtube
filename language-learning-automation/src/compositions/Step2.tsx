import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { Sentence, ScenePrompt } from '../script/types';
import type { AudioFile } from '../tts/types';
import {
  getSceneInfoForSentence,
  AnimatedSceneBackground,
  getCameraMotion,
  type PreviousCameraState,
} from '../components/CameraMotion';

export interface Step2Props {
  backgroundImage?: string;
  sceneImages?: string[];
  scenePrompts?: ScenePrompt[];
  sentences: Sentence[];
  audioFiles: AudioFile[];
  colors: {
    maleText: string;
    femaleText: string;
    nativeText: string;
  };
  dimOpacity?: number;
  stepLabel?: string;
}

export const Step2: React.FC<Step2Props> = ({
  backgroundImage,
  sceneImages,
  scenePrompts,
  sentences,
  audioFiles,
  colors,
  dimOpacity = 0.6,
  stepLabel = '자막으로 내용 이해 하기',
}) => {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  let cumulativeFrame = 0;
  let previousSceneIndex = -1;
  let previousSceneImage: string | undefined;
  let previousCameraState: PreviousCameraState | undefined;

  const sentenceSequences = sentences.map((sentence, index) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const startFrame = cumulativeFrame;
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 90 : 150;
    const audioDurationFrames = audio ? Math.ceil(audio.duration * 30) : 90;

    const sceneInfo = getSceneInfoForSentence(sentence.id, sceneImages, scenePrompts);
    const isSceneChange = sceneInfo.sceneIndex !== previousSceneIndex;
    const prevImage = isSceneChange ? previousSceneImage : undefined;
    const prevCameraState = isSceneChange ? undefined : previousCameraState;

    // 현재 문장의 카메라 끝 상태 계산
    const motion = getCameraMotion(sceneInfo.cameraDirection);
    const currentEndState: PreviousCameraState = {
      scale: motion.scaleEnd,
      panX: motion.panXEnd,
      panY: motion.panYEnd,
      rotate: motion.rotateEnd,
    };

    previousSceneIndex = sceneInfo.sceneIndex;
    previousSceneImage = sceneInfo.image;
    previousCameraState = currentEndState;

    const isLastScene = index === sentences.length - 1;
    cumulativeFrame += durationFrames;

    return {
      sentence,
      audio,
      startFrame,
      durationFrames,
      audioDurationFrames,
      sceneImage: sceneInfo.image,
      cameraDirection: sceneInfo.cameraDirection,
      isSceneChange,
      previousSceneImage: prevImage,
      isLastScene,
      previousCameraState: prevCameraState,
    };
  });

  const hasSceneImages = sceneImages && sceneImages.length > 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {!hasSceneImages && backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
            }}
          />
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '16px 32px',
          borderRadius: 12,
          fontSize: 48,
          color: '#FFFFFF',
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 10,
        }}
      >
        Step 2: {stepLabel}
      </div>

      {sentenceSequences.map(
        (
          {
            sentence,
            audio,
            startFrame,
            durationFrames,
            audioDurationFrames,
            sceneImage,
            cameraDirection,
            isSceneChange,
            previousSceneImage,
            isLastScene,
            previousCameraState,
          },
          index
        ) => (
          <Sequence key={index} from={startFrame} durationInFrames={durationFrames}>
            <SentenceDisplay
              sentence={sentence}
              audio={audio}
              colors={colors}
              sceneImage={sceneImage}
              previousSceneImage={previousSceneImage}
              cameraDirection={cameraDirection}
              dimOpacity={dimOpacity}
              durationFrames={durationFrames}
              audioDurationFrames={audioDurationFrames}
              isSceneChange={isSceneChange}
              isLastScene={isLastScene}
              previousCameraState={previousCameraState}
            />
          </Sequence>
        )
      )}
    </AbsoluteFill>
  );
};

const SentenceDisplay: React.FC<{
  sentence: Sentence;
  audio?: AudioFile;
  colors: { maleText: string; femaleText: string; nativeText: string };
  sceneImage?: string;
  previousSceneImage?: string;
  cameraDirection?: string;
  dimOpacity?: number;
  durationFrames: number;
  audioDurationFrames: number;
  isSceneChange?: boolean;
  isLastScene?: boolean;
  previousCameraState?: PreviousCameraState;
}> = ({
  sentence,
  audio,
  colors,
  sceneImage,
  previousSceneImage,
  cameraDirection,
  dimOpacity = 0.6,
  durationFrames,
  audioDurationFrames,
  isSceneChange = false,
  isLastScene = false,
  previousCameraState,
}) => {
  const textColor = sentence.speaker === 'M' ? colors.maleText : colors.femaleText;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <AnimatedSceneBackground
        sceneImage={sceneImage}
        previousSceneImage={previousSceneImage}
        cameraDirection={cameraDirection}
        durationFrames={durationFrames}
        audioDurationFrames={audioDurationFrames}
        isSceneChange={isSceneChange}
        isLastScene={isLastScene}
        dimOpacity={dimOpacity}
        previousCameraState={previousCameraState}
      />

      {audio && audio.path && <Audio src={staticFile(audio.path)} volume={1} />}

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 60px 180px 60px',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.25,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            maxWidth: '92%',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            marginBottom: 24,
          }}
        >
          {sentence.target}
        </div>

        {sentence.targetPronunciation && (
          <div
            style={{
              fontSize: 48,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              maxWidth: '92%',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            {sentence.targetPronunciation}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export function calculateStep2Duration(sentences: Sentence[], audioFiles: AudioFile[]): number {
  if (!sentences || !audioFiles) return 0;
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  let totalFrames = 0;

  sentences.forEach((sentence) => {
    const audio = normalSpeedAudios.find((af) => af.sentenceId === sentence.id);
    const durationFrames = audio ? Math.ceil(audio.duration * 30) + 90 : 150;
    totalFrames += durationFrames;
  });

  return totalFrames;
}
