/**
 * Gemini API 공통 설정
 */

// 모델 설정
export const GEMINI_MODELS = {
  // 텍스트 생성용 (스크립트, 주제 선정)
  text: 'gemini-3-pro-preview',

  // 이미지 생성용
  image: 'gemini-3-pro-image-preview',
} as const;

// API URL
export const GEMINI_API_URLS = {
  text: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.text}:generateContent`,
  image: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent`,
} as const;

/**
 * Gemini API 키 가져오기
 */
export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Gemini 이미지 응답 타입
 */
export interface GeminiImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

/**
 * Gemini 이미지 생성 요청
 */
export async function generateImageWithGemini(prompt: string): Promise<Buffer | null> {
  const apiKey = getGeminiApiKey();

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['image', 'text'],
        responseMimeType: 'text/plain',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiImageResponse;

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }

  return null;
}
