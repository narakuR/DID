# T09 — geminiService（AI 集成）

> **阶段**: 2 - 服务层
> **依赖**: T01（@google/genai 已安装）, T02（类型）
> **产出文件**: `src/services/geminiService.ts`

---

## 任务描述

封装 Google Gemini API，提供凭证 AI 解释和完整性验证功能，支持无 API Key 时的优雅降级。

---

## 实现内容

```typescript
import { GoogleGenAI } from '@google/genai';
import { VerifiableCredential } from '@/types';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';

// 懒初始化，避免无 key 时报错
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!apiKey) return null;
  if (!aiInstance) aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

/** 用自然语言解释凭证内容 */
export const explainCredential = async (credential: VerifiableCredential): Promise<string> => {
  const ai = getAI();
  if (!ai) return '请配置 EXPO_PUBLIC_GEMINI_API_KEY 以启用 AI 解释功能。';

  const credentialSummary = JSON.stringify({
    type: credential.type,
    issuer: credential.issuer.name,
    subject: credential.credentialSubject,
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,
  }, null, 2);

  const prompt = `你是一个数字身份证件助理。请用简洁易懂的语言（3-5句话）解释以下欧盟数字身份凭证的含义、用途和重要信息。使用用户的语言回答。

凭证数据：
${credentialSummary}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text || '无法生成解释。';
  } catch (error) {
    console.error('[GeminiService] explainCredential error:', error);
    return 'AI 解释服务暂时不可用，请稍后重试。';
  }
};

/** 验证凭证完整性（返回 JSON） */
export const verifyCredentialIntegrity = async (
  credential: VerifiableCredential
): Promise<{ isValid: boolean; reason: string }> => {
  const ai = getAI();
  if (!ai) return { isValid: true, reason: '验证已模拟（无 API Key）。' };

  const prompt = `分析以下 W3C Verifiable Credential 的结构完整性。返回 JSON 格式：{"isValid": boolean, "reason": "说明"}

凭证：${JSON.stringify(credential, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('[GeminiService] verifyCredentialIntegrity error:', error);
    return { isValid: true, reason: '验证服务暂时不可用。' };
  }
};
```

---

## 验证标准

- [ ] 无 API Key 时调用 `explainCredential()` 返回提示文字，不崩溃
- [ ] 有 API Key 时成功返回 AI 生成文本
- [ ] API 调用失败时返回错误提示文字，不崩溃
- [ ] `verifyCredentialIntegrity` 在无 key 时返回 `{ isValid: true, reason: '...' }`
