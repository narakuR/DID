import { GoogleGenAI } from '@google/genai';
import { VerifiableCredential } from '@/types';

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

class GeminiService {
  async explainCredential(credential: VerifiableCredential): Promise<string> {
    const ai = getAI();
    if (!ai) {
      return 'AI explanation is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY to enable this feature.';
    }
    try {
      const prompt = `You are a helpful assistant explaining digital identity credentials to everyday users.

Explain the following Verifiable Credential in simple, plain language. Focus on:
1. What this credential is
2. What information it contains
3. Why it is useful
4. Any notable details

Credential:
${JSON.stringify(credential, null, 2)}

Keep your explanation under 150 words and avoid technical jargon.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text ?? 'Unable to generate explanation.';
    } catch (e) {
      console.warn('[GeminiService] explainCredential error:', e);
      return 'AI explanation is temporarily unavailable. Please try again later.';
    }
  }

  async verifyCredentialIntegrity(credential: VerifiableCredential): Promise<{ valid: boolean; notes: string }> {
    const ai = getAI();
    if (!ai) {
      return { valid: true, notes: 'AI verification not available without API key.' };
    }
    try {
      const prompt = `Analyze this Verifiable Credential for potential integrity issues. Check:
1. Are required fields present (@context, id, type, issuer, issuanceDate, credentialSubject)?
2. Does the data appear internally consistent?
3. Are dates valid and logical?

Respond ONLY with valid JSON in this format:
{"valid": true|false, "notes": "brief explanation"}

Credential:
${JSON.stringify(credential, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text ?? '{"valid": true, "notes": ""}';
      return JSON.parse(text);
    } catch (e) {
      console.warn('[GeminiService] verifyCredentialIntegrity error:', e);
      return { valid: true, notes: 'Verification unavailable.' };
    }
  }
}

export const geminiService = new GeminiService();
