// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    public getGenerativeModel() {
      return {
        generateContent: generateContentMock,
      };
    }
  },
}));

vi.mock('../config/gemini', () => ({
  GEMINI_MODELS: {
    text: 'gemini-test',
  },
  getGeminiApiKey: () => 'test-key',
}));

vi.mock('./performance-patterns', () => ({
  selectPatternByWeight: vi.fn(() => ({
    pattern: { id: 'pattern-test', avgViews: 12345 },
    variationGuide: 'Keep it concrete',
  })),
  inferPatternFromTopic: vi.fn(() => 'pattern-test'),
}));

import { generateTopicWorkbenchBundle } from './topic-selector';

function createModelResponse(text: string) {
  return {
    response: {
      text: () => text,
    },
  };
}

describe('Topic Selector', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('builds topic pools by repeating the cli-style topic selection path', async () => {
    generateContentMock
      .mockResolvedValueOnce(createModelResponse('Topic A1\nTopic A2\nTopic A3'))
      .mockResolvedValueOnce(createModelResponse('Topic A2'))
      .mockResolvedValueOnce(createModelResponse('Topic B1\nTopic B2\nTopic B3'))
      .mockResolvedValueOnce(createModelResponse('Topic B1'))
      .mockResolvedValueOnce(createModelResponse('Topic A2'));

    const bundle = await generateTopicWorkbenchBundle('conversation', 'English', 'Korean', 2);

    expect(bundle.category).toBe('conversation');
    expect(bundle.candidates).toEqual(['Topic A2', 'Topic B1']);
    expect(bundle.recommendedTopic).toBe('Topic A2');
    expect(generateContentMock).toHaveBeenCalledTimes(5);
  });
});
