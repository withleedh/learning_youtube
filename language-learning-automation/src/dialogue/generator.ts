import { GEMINI_API_URLS, getGeminiApiKey } from '../config/gemini';
import type { CharacterDefinition } from '../character/types';
import { dialogueScriptSchema, type DialogueScript, type DialogueGeneratorConfig } from './types';
import { DIALOGUE_SYSTEM_PROMPT, buildDialoguePrompt, buildVeoPromptFromScript } from './prompts';

/**
 * Gemini API 응답 타입
 */
interface GeminiTextResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * 대화 스크립트 생성기
 * Gemini API를 사용하여 캐릭터 대화 스크립트를 생성
 */
export class DialogueGenerator {
  /**
   * 대화 스크립트 생성
   * @param config - 생성 설정 (타겟 표현, 캐릭터 등)
   * @param foreignCharacter - 외국인 캐릭터 (시청자 모국어로 말함)
   * @param nativeCharacter - 시청자와 같은 언어권 캐릭터 (학습 대상 언어로 말함)
   */
  async generate(
    config: DialogueGeneratorConfig,
    foreignCharacter: CharacterDefinition,
    nativeCharacter: CharacterDefinition
  ): Promise<DialogueScript> {
    const apiKey = getGeminiApiKey();
    const prompt = buildDialoguePrompt(config, foreignCharacter, nativeCharacter);

    console.log(`🎬 Generating dialogue script for: "${config.targetExpression}"...`);

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: DIALOGUE_SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [
            {
              text: "I understand. I will create dialogue scripts following the language reversal concept where the foreign character speaks the viewer's native language and the native character speaks the target language. Please provide the details.",
            },
          ],
        },
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(`${GEMINI_API_URLS.text}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiTextResponse;

    // 응답에서 텍스트 추출
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response text from Gemini API');
    }

    // JSON 파싱
    const script = this.parseScriptResponse(responseText);

    // Veo 프롬프트 생성
    script.veoPrompt = buildVeoPromptFromScript(script, [foreignCharacter, nativeCharacter]);

    console.log(`✅ Dialogue script generated: ${script.lines.length} lines`);
    return script;
  }

  /**
   * Gemini 응답에서 JSON 파싱
   */
  private parseScriptResponse(responseText: string): DialogueScript {
    // JSON 블록 추출 (```json ... ``` 또는 { ... })
    let jsonStr = responseText;

    // ```json 블록 추출
    const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      // { } 블록 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    // JSON 파싱
    let rawScript: unknown;
    try {
      rawScript = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse dialogue script JSON: ${error}`);
    }

    // 스키마 검증
    const result = dialogueScriptSchema.safeParse(rawScript);
    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid dialogue script schema: ${errors}`);
    }

    return result.data;
  }

  /**
   * Veo 프롬프트 빌드 (외부에서 직접 호출용)
   */
  buildVeoPrompt(script: DialogueScript, characters: CharacterDefinition[]): string {
    return buildVeoPromptFromScript(script, characters);
  }
}

// 싱글톤 인스턴스
export const dialogueGenerator = new DialogueGenerator();
