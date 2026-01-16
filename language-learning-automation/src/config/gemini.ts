/**
 * Gemini API 공통 설정
 */

import * as fs from 'fs';
import * as path from 'path';

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
 * Veo API 키 로테이션 관리
 * .env에 GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... 형식으로 여러 키 설정 가능
 * 현재 키 인덱스를 파일에 저장하여 다음 실행 시 이어서 사용
 */
const KEY_STATE_FILE = path.join(process.cwd(), '.veo-key-state.json');

interface KeyState {
  currentIndex: number;
  exhaustedKeys: number[];
  lastUpdated: string;
}

class VeoApiKeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private exhaustedKeys: Set<number> = new Set();

  constructor() {
    this.loadKeys();
    this.loadState();
  }

  private loadKeys(): void {
    // 기본 키
    if (process.env.GEMINI_API_KEY) {
      this.keys.push(process.env.GEMINI_API_KEY);
    }

    // 추가 키들 (GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...)
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.keys.push(key);
      }
    }

    if (this.keys.length === 0) {
      throw new Error('No GEMINI_API_KEY found in environment');
    }

    console.log(`🔑 Loaded ${this.keys.length} API key(s) for Veo`);
  }

  private loadState(): void {
    try {
      if (fs.existsSync(KEY_STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(KEY_STATE_FILE, 'utf-8')) as KeyState;

        // 키 개수가 바뀌었으면 리셋
        if (data.currentIndex < this.keys.length) {
          this.currentIndex = data.currentIndex;
          this.exhaustedKeys = new Set(data.exhaustedKeys.filter((i) => i < this.keys.length));
          console.log(
            `📂 Restored key state: using key ${this.currentIndex + 1}/${this.keys.length}`
          );
        }
      }
    } catch {
      // 파일 읽기 실패 시 무시
    }
  }

  private saveState(): void {
    try {
      const state: KeyState = {
        currentIndex: this.currentIndex,
        exhaustedKeys: Array.from(this.exhaustedKeys),
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(KEY_STATE_FILE, JSON.stringify(state, null, 2));
    } catch {
      // 저장 실패 시 무시
    }
  }

  /**
   * 현재 사용할 API 키 반환
   */
  getCurrentKey(): string {
    if (this.exhaustedKeys.size >= this.keys.length) {
      throw new Error('All API keys exhausted. Please wait for quota reset.');
    }

    // 소진되지 않은 키 찾기
    while (this.exhaustedKeys.has(this.currentIndex)) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }

    return this.keys[this.currentIndex];
  }

  /**
   * 현재 키를 소진됨으로 표시하고 다음 키로 전환
   */
  markCurrentKeyExhausted(): boolean {
    console.log(`⚠️ API key ${this.currentIndex + 1} exhausted, switching...`);
    this.exhaustedKeys.add(this.currentIndex);

    if (this.exhaustedKeys.size >= this.keys.length) {
      console.log('❌ All API keys exhausted!');
      this.saveState();
      return false;
    }

    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    while (this.exhaustedKeys.has(this.currentIndex)) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }

    console.log(`🔄 Switched to API key ${this.currentIndex + 1}`);
    this.saveState();
    return true;
  }

  /**
   * 모든 키 상태 리셋 (새 세션 시작 시)
   */
  resetAllKeys(): void {
    this.exhaustedKeys.clear();
    this.currentIndex = 0;
    this.saveState();
  }

  /**
   * 사용 가능한 키 개수
   */
  getAvailableKeyCount(): number {
    return this.keys.length - this.exhaustedKeys.size;
  }
}

// 싱글톤 인스턴스 (lazy initialization)
let _veoApiKeyManager: VeoApiKeyManager | null = null;

export function getVeoApiKeyManager(): VeoApiKeyManager {
  if (!_veoApiKeyManager) {
    _veoApiKeyManager = new VeoApiKeyManager();
  }
  return _veoApiKeyManager;
}

/**
 * Veo용 API 키 가져오기 (로테이션 지원)
 */
export function getVeoApiKey(): string {
  return getVeoApiKeyManager().getCurrentKey();
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
