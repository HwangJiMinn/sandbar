import { env } from './utils';

// ─── 타입 ─────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean; // response_format: json_object
  temperature?: number;
  retries?: number; // JSON 파싱 실패 시 재시도 횟수 (기본 2)
}

// ─── JSON 추출 헬퍼 ───────────────────────────────────────
// 모델이 간혹 ```json ... ``` 블록이나 앞뒤 설명문을 붙여 응답하는 경우 대응

function extractJson(text: string): string | null {
  // 1) 직접 파싱 시도
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  // 2) ```json ... ``` 코드 블록
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) return codeBlock[1];

  // 3) 첫 번째 { ... } 블록 (중첩 포함)
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

// ─── OpenAI API 단일 호출 ─────────────────────────────────

async function callOnce(options: ChatOptions, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    max_completion_tokens: options.maxTokens ?? 2000,
    // GPT-5 계열은 temperature=1 고정 (설정 시 무시되므로 전달하지 않음)
    ...(options.temperature !== undefined && { temperature: options.temperature }),
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API 오류 (${response.status}): ${err}`);
  }

  const result = (await response.json()) as {
    choices: Array<{ message: { content: string }; finish_reason: string }>;
  };

  const choice = result.choices[0];

  // finish_reason이 'length'이면 토큰 초과로 응답이 잘린 것
  if (choice?.finish_reason === 'length') {
    throw new Error('응답이 토큰 한도를 초과해 잘렸습니다 (finish_reason: length)');
  }

  return choice?.message?.content ?? '';
}

// ─── OpenAI Chat Completions 호출 (재시도 포함) ───────────

export async function chatCompletion<T = string>(options: ChatOptions): Promise<T> {
  const apiKey = env('OPENAI_API_KEY');
  const maxRetries = options.retries ?? 2;

  let lastError: Error = new Error('알 수 없는 오류');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await callOnce(options, apiKey);

      if (!options.jsonMode) return text as T;

      // JSON 파싱
      const jsonStr = extractJson(text);
      if (!jsonStr) throw new Error(`JSON을 찾을 수 없음 (응답: ${text.slice(0, 200)})`);

      return JSON.parse(jsonStr) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        // 재시도 전 짧은 대기 (0.5s → 1s)
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  throw new Error(`OpenAI 호출 ${maxRetries + 1}회 모두 실패: ${lastError.message}`);
}
