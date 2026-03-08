import type { EpisodeStage } from '../types';
import { workbenchCategoryOptions } from '../helpers';

type PayloadObject = Record<string, unknown>;

export function GenerationPayloadForm(props: {
  stage: EpisodeStage;
  payloadText: string;
  onChange(value: string): void;
}) {
  const { stage, payloadText, onChange } = props;
  const payload = parsePayloadText(payloadText);

  const updatePayload = (updater: (current: PayloadObject) => PayloadObject) => {
    onChange(serializePayload(updater({ ...payload })));
  };

  if (stage === 'topic') {
    const candidateCount =
      typeof payload.candidateCount === 'number' && Number.isFinite(payload.candidateCount)
        ? payload.candidateCount
        : 3;
    const category = typeof payload.category === 'string' ? payload.category : '';

    return (
      <>
        <div className="payload-form-grid">
          <label className="inspector-form-field">
            <span>Topic Category</span>
            <select
              aria-label="Topic category"
              value={category}
              onChange={(event) => {
                const value = event.target.value;
                updatePayload((current) => ({
                  ...current,
                  category: value || undefined,
                }));
              }}
            >
              <option value="">Auto by day</option>
              {workbenchCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inspector-form-field">
            <span>Topic Candidate Count</span>
            <input
              aria-label="Topic candidate count"
              type="number"
              min={1}
              max={200}
              value={String(candidateCount)}
              onChange={(event) => {
                const rawValue = event.target.value.trim();
                const nextValue = rawValue ? Number.parseInt(rawValue, 10) : undefined;
                updatePayload((current) => ({
                  ...current,
                  candidateCount:
                    nextValue && Number.isFinite(nextValue) ? clamp(nextValue, 1, 200) : undefined,
                }));
              }}
            />
          </label>
        </div>
        <p className="panel-note">비워두면 요일 기준 카테고리와 기본 후보 3개를 사용합니다.</p>
      </>
    );
  }

  if (stage === 'script') {
    const category = typeof payload.category === 'string' ? payload.category : '';
    const topic = typeof payload.topic === 'string' ? payload.topic : '';
    const usePipeline =
      typeof payload.usePipeline === 'boolean' ? payload.usePipeline : true;
    const candidateCount =
      typeof payload.candidateCount === 'number' && Number.isFinite(payload.candidateCount)
        ? payload.candidateCount
        : 5;

    return (
      <>
        <div className="payload-form-grid">
          <label className="inspector-form-field">
            <span>Script Category</span>
            <select
              aria-label="Script category"
              value={category}
              onChange={(event) => {
                const value = event.target.value;
                updatePayload((current) => ({
                  ...current,
                  category: value || undefined,
                }));
              }}
            >
              <option value="">Use approved topic category</option>
              {workbenchCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inspector-form-field">
            <span>Script Topic Override</span>
            <input
              aria-label="Script topic override"
              placeholder="optional topic override"
              value={topic}
              onChange={(event) => {
                const value = event.target.value;
                updatePayload((current) => ({
                  ...current,
                  topic: value.trim() || undefined,
                }));
              }}
            />
          </label>

          <label className="inspector-form-field">
            <span>Script Candidate Count</span>
            <input
              aria-label="Script candidate count"
              type="number"
              min={1}
              max={50}
              value={String(candidateCount)}
              onChange={(event) => {
                const rawValue = event.target.value.trim();
                const nextValue = rawValue ? Number.parseInt(rawValue, 10) : undefined;
                updatePayload((current) => ({
                  ...current,
                  candidateCount:
                    nextValue && Number.isFinite(nextValue) ? clamp(nextValue, 1, 50) : undefined,
                }));
              }}
            />
          </label>
        </div>
        <label className="checkbox-field">
          <input
            aria-label="Use script pipeline"
            type="checkbox"
            checked={usePipeline}
            onChange={(event) => {
              const checked = event.target.checked;
              updatePayload((current) => ({
                ...current,
                usePipeline: checked,
              }));
            }}
          />
          <span>Use multi-step script pipeline</span>
        </label>
      </>
    );
  }

  if (stage === 'image') {
    const styleId = typeof payload.styleId === 'string' ? payload.styleId : '';

    return (
      <>
        <label className="inspector-form-field">
          <span>Image Style ID</span>
          <input
            aria-label="Image style id"
            placeholder="optional style id"
            value={styleId}
            onChange={(event) => {
              const value = event.target.value;
              updatePayload((current) => ({
                ...current,
                styleId: value.trim() || undefined,
              }));
            }}
          />
        </label>
        <p className="panel-note">비워두면 채널 기본 스타일을 사용합니다.</p>
      </>
    );
  }

  return <p className="panel-note">이 stage는 추가 생성 옵션 없이 바로 실행됩니다.</p>;
}

function parsePayloadText(payloadText: string): PayloadObject {
  try {
    const parsed = payloadText.trim() ? JSON.parse(payloadText) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PayloadObject;
    }
  } catch {
    // Ignore invalid payload text and fall back to an empty object.
  }

  return {};
}

function serializePayload(payload: PayloadObject): string {
  const normalizedEntries = Object.entries(payload).filter(([, value]) => {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    return true;
  });

  return JSON.stringify(Object.fromEntries(normalizedEntries));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
