/**
 * PHASE-11: AI optional — NO diagnosis, NO test scoring, NO norm invention
 * Only helper: summarization of already written notes, with guardrails
 * KVKK: no PII sent to LLM without explicit consent, no logging
 */

export type AISummaryRequest = {
  text: string; // already written expert notes, max 5000
  type: 'session_notes' | 'assessment_findings' | 'report_draft';
};

export type AISummaryResponse = {
  summary: string; // max 1000 chars
  warnings: string[]; // guardrails
  model: string;
  timestamp: string;
};

export const AI_GUARDRAILS = [
  'AI tanı koymaz — sadece uzmanın yazdığı metni özetler',
  'AI test puanı üretmez, norm uydurmaz',
  'AI hassas veriyi loglamaz, 3rd party\'ye PII göndermez',
  'AI çıktısı uzman tarafından gözden geçirilmeli',
] as const;

export function validateAIRequest(req: AISummaryRequest): { ok: boolean; error?: string } {
  if (!req.text || req.text.trim().length < 10) return { ok: false, error: 'Metin çok kısa' };
  if (req.text.length > 5000) return { ok: false, error: 'Metin çok uzun (max 5000)' };
  // Block diagnosis attempts
  const lower = req.text.toLowerCase();
  if (lower.includes('tanı koy') || lower.includes('diagnose')) {
    return { ok: false, error: 'AI tanı koymaz — lütfen tanı ifadesi içermeyen metin gönderin' };
  }
  return { ok: true };
}

// Stub implementation — no real LLM call in MVP, returns rule-based summary
export async function summarizeWithAI(req: AISummaryRequest): Promise<AISummaryResponse> {
  const validation = validateAIRequest(req);
  if (!validation.ok) throw new Error(validation.error);

  // Simple extractive summary: first 2 sentences
  const sentences = req.text.split(/[.!?]+/).filter((s) => s.trim().length > 0).slice(0, 2);
  const summary = sentences.join('. ').slice(0, 1000);

  return {
    summary: summary + (summary ? '.' : ''),
    warnings: [...AI_GUARDRAILS],
    model: 'stub-extractive-v1',
    timestamp: new Date().toISOString(),
  };
}
