/**
 * ComparisonRoot - Comparison Longform 전용 Remotion Root
 *
 * 사용법:
 *   npm run start:comparison
 *
 * 기존 Root.tsx와 분리하여 ComparisonScript만 로드합니다.
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import {
  ComparisonLongform,
  calculateTotalDuration as calculateComparisonDuration,
} from './compositions/ComparisonLongform';
import { ComparisonView, calculateSegmentDuration } from './compositions/ComparisonView';
import { HookIntro } from './compositions/HookIntro';
import { CTAEnding } from './compositions/CTAEnding';
import { createSampleComparisonScript } from './comparison/sample';
import type { TimingProfileType } from './comparison/timing-profile';
import type { ComparisonScript } from './comparison/types';

// =============================================================================
// Dynamic Loading from public/ folder
// =============================================================================

let dynamicComparisonScript: ComparisonScript | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rawScript = require('../public/script.json');
  if (rawScript.segments && rawScript.segments[0]?.koreanExpression) {
    dynamicComparisonScript = rawScript as ComparisonScript;
    console.log('✅ Loaded ComparisonScript from public/script.json');
    console.log(`   - ${rawScript.segments.length} segments`);
    console.log(`   - Hook: "${rawScript.hook?.text}"`);
  } else {
    console.log('ℹ️ public/script.json is not a ComparisonScript, using sample data');
  }
} catch {
  console.log('ℹ️ No script.json found, using sample data');
}

const activeScript =
  dynamicComparisonScript ?? createSampleComparisonScript('korean-vs-native', 25);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ComparisonLongform - Full comparison video */}
      <Composition
        id="ComparisonLongform"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonLongform as any}
        durationInFrames={calculateComparisonDuration(activeScript.segments.length, 'normal')}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: activeScript,
          timingProfile: 'normal' as TimingProfileType,
          selectedHookVariant: 0,
        }}
      />

      {/* ComparisonLongform - Fast timing */}
      <Composition
        id="ComparisonLongform-Fast"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonLongform as any}
        durationInFrames={calculateComparisonDuration(activeScript.segments.length, 'fast')}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: activeScript,
          timingProfile: 'fast' as TimingProfileType,
          selectedHookVariant: 0,
        }}
      />

      {/* ComparisonLongform - Suspense timing */}
      <Composition
        id="ComparisonLongform-Suspense"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonLongform as any}
        durationInFrames={calculateComparisonDuration(activeScript.segments.length, 'suspense')}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: activeScript,
          timingProfile: 'suspense' as TimingProfileType,
          selectedHookVariant: 0,
        }}
      />

      {/* ComparisonView - Single segment preview (normal) */}
      <Composition
        id="ComparisonView"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonView as any}
        durationInFrames={calculateSegmentDuration('normal', false, 30)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          segment: activeScript.segments[0],
          timingProfile: 'normal' as TimingProfileType,
          isBurst: false,
        }}
      />

      {/* ComparisonView - Burst segment preview */}
      <Composition
        id="ComparisonView-Burst"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonView as any}
        durationInFrames={calculateSegmentDuration('normal', true, 30)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          segment: activeScript.segments[0],
          timingProfile: 'normal' as TimingProfileType,
          isBurst: true,
        }}
      />

      {/* HookIntro - Hook intro preview */}
      <Composition
        id="HookIntro"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={HookIntro as any}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          hook: activeScript.hook,
          hookVariants: activeScript.hookVariants,
          selectedVariantIndex: 0,
        }}
      />

      {/* HookIntro variants */}
      {activeScript.hookVariants?.map((_, idx) => (
        <Composition
          key={`HookIntro-${idx}`}
          id={`HookIntro-Variant${idx}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={HookIntro as any}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            hook: activeScript.hook,
            hookVariants: activeScript.hookVariants,
            selectedVariantIndex: idx,
          }}
        />
      ))}

      {/* CTAEnding - CTA ending preview */}
      <Composition
        id="CTAEnding"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={CTAEnding as any}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          cta: activeScript.cta,
        }}
      />

      {/* Individual segment previews (first 5) */}
      {activeScript.segments.slice(0, 5).map((segment) => (
        <Composition
          key={`Segment-${segment.id}`}
          id={`Segment-${segment.id}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={ComparisonView as any}
          durationInFrames={calculateSegmentDuration('normal', false, 30)}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            segment,
            timingProfile: 'normal' as TimingProfileType,
            isBurst: false,
          }}
        />
      ))}
    </>
  );
};

registerRoot(RemotionRoot);
