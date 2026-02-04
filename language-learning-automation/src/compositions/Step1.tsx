import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { AudioFile } from '../tts/types';
import type { ScenePrompt } from '../script/types';
import {
  getSceneInfoForSentence,
  AnimatedSceneBackground,
  getCameraMotion,
  type PreviousCameraState,
} from '../components/CameraMotion';

export interface Step1Props {
  backgroundImage?: string;
  sceneImages?: string[];
  scenePrompts?: ScenePrompt[];
  audioFiles: AudioFile[];
  title?: string;
  stepLabel?: string;
}

export const Step1: React.FC<Step1Props> = ({
  backgroundImage,
  sceneImages,
  scenePrompts,
  audioFiles,
  title,
  stepLabel = '전체 흐름 파악 (자막 없이 듣기)',
}) => {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  const GAP_FRAMES = 60;
  let cumulativeFrame = 0;
  let previousSceneIndex = -1;
  let previousSceneImage: string | undefined;
  let previousCameraState: PreviousCameraState | undefined;

  const audioSequences = normalSpeedAudios.map((audio, index) => {
    const startFrame = cumulativeFrame;
    const audioDurationFrames = Math.ceil(audio.duration * 30);
    const isLastSentence = index === normalSpeedAudios.length - 1;
    const durationFrames = isLastSentence ? audioDurationFrames : audioDurationFrames + GAP_FRAMES;

    const sceneInfo = getSceneInfoForSentence(audio.sentenceId, sceneImages, scenePrompts);
    const isSceneChange = sceneInfo.sceneIndex !== previousSceneIndex;
    const prevImage = isSceneChange ? previousSceneImage : undefined;

    // 이전 카메라 상태 저장 (씬이 바뀌면 리셋)
    const prevCameraState = isSceneChange ? undefined : previousCameraState;

    // 현재 문장의 카메라 끝 상태 계산 (다음 문장을 위해)
    const motion = getCameraMotion(sceneInfo.cameraDirection);
    const currentEndState: PreviousCameraState = {
      scale: prevCameraState ? motion.scaleEnd : motion.scaleEnd,
      panX: prevCameraState ? motion.panXEnd : motion.panXEnd,
      panY: prevCameraState ? motion.panYEnd : motion.panYEnd,
      rotate: prevCameraState ? motion.rotateEnd : motion.rotateEnd,
    };

    // 다음 반복을 위해 저장
    previousSceneIndex = sceneInfo.sceneIndex;
    previousSceneImage = sceneInfo.image;
    previousCameraState = currentEndState;

    cumulativeFrame += audioDurationFrames + GAP_FRAMES;

    return {
      audio,
      startFrame,
      durationFrames,
      audioDurationFrames,
      sceneImage: sceneInfo.image,
      cameraDirection: sceneInfo.cameraDirection,
      isSceneChange,
      previousSceneImage: prevImage,
      isLastScene: isLastSentence,
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
        Step 1: {stepLabel}
      </div>

      {audioSequences.map(
        (
          {
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
          idx
        ) => (
          <Sequence key={idx} from={startFrame} durationInFrames={durationFrames}>
            <SentenceDisplay
              audio={audio}
              sceneImage={sceneImage}
              previousSceneImage={previousSceneImage}
              cameraDirection={cameraDirection}
              title={title}
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
  audio: AudioFile;
  sceneImage?: string;
  previousSceneImage?: string;
  cameraDirection?: string;
  title?: string;
  durationFrames: number;
  audioDurationFrames: number;
  isSceneChange?: boolean;
  isLastScene?: boolean;
  previousCameraState?: PreviousCameraState;
}> = ({
  audio,
  sceneImage,
  previousSceneImage,
  cameraDirection,
  title,
  durationFrames,
  audioDurationFrames,
  isSceneChange = false,
  isLastScene = false,
  previousCameraState,
}) => {
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
        previousCameraState={previousCameraState}
      />

      {audio.path && <Audio src={staticFile(audio.path)} volume={1} />}

      {title && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 72,
            fontWeight: 600,
            color: '#FFFFFF',
            textShadow:
              '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 10px rgba(0,0,0,0.8)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {title}
        </div>
      )}
    </AbsoluteFill>
  );
};

export function calculateStep1Duration(audioFiles: AudioFile[]): number {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  const totalDuration = normalSpeedAudios.reduce((sum, af) => sum + af.duration, 0);
  const gaps = (normalSpeedAudios.length - 1) * 2;
  return Math.ceil((totalDuration + gaps) * 30);
}
