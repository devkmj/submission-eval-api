import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AzureOpenAI } from 'openai';

interface EvaluationRaw {
  score?: unknown;
  feedback?: unknown;
  highlights?: unknown;
}

interface EvaluationResult {
  score: number; // 0~10 int
  feedback: string;
  highlights: string[];
  highlightSubmitText: string;
  latencyMs: number;
}

@Injectable()
export class EvaluationService {
  private readonly client: AzureOpenAI;
  private readonly logger = new Logger(EvaluationService.name);

  constructor() {
    this.client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_KEY!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    });
  }

  /**
   * Call Azure OpenAI to evaluate the essay and return a robust, validated shape.
   * - Forces JSON-only responses where possible
   * - Tolerates non-JSON by extracting JSON blocks and coercing fields
   * - Generates highlightSubmitText by tagging matched phrases
   * - Returns latency for upstream logging
   */
  async evaluateEssay(submitText: string): Promise<EvaluationResult> {
    const startedAt = Date.now();
    this.logger.log('[AI] calling Azure OpenAI…');

    try {
      const response = await this.client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
          {
            role: 'system',
            content: [
              'You are an English essay evaluator.',
              'Return JSON ONLY with the exact shape:',
              '{ "score": number (0-10 integer), "feedback": string, "highlights": string[] }',
              'Rules:',
              '- "score" MUST be an integer from 0 to 10.',
              '- "feedback" MUST be concise paragraph-level comments.',
              '- "highlights" MUST contain phrases that APPEAR VERBATIM in the user essay (submitText).',
              "- Do NOT include meta-comments like 'Clear thesis' unless those exact words appear in the essay.",
              '- Use only ASCII quotes if you include quoted phrases.',
            ].join('\n'),
          },
          { role: 'user', content: submitText },
        ],
        // Hint the model to emit strict JSON (supported in recent API versions)
        // Cast to avoid SDK type friction if the field isn't declared in typings.
        response_format: { type: 'json_object' } as unknown as undefined,
        temperature: 0.2,
        max_tokens: 600,
      });

      const raw = response.choices?.[0]?.message?.content ?? '{}';

      // 1) Parse resiliently
      const parsedUnknown = this.safeParseJson(raw);
      const coerced = this.coerceEvaluation(parsedUnknown);

      // 2) If highlights look meta-like, try to extract quoted phrases fallback
      const effectiveHighlights =
        this.extractQuotedPhrases(coerced.highlights).length > 0
          ? this.extractQuotedPhrases(coerced.highlights)
          : coerced.highlights;

      // 3) Build highlight HTML
      const highlightSubmitText = this.highlightSubmitText(submitText, effectiveHighlights);

      const latencyMs = Date.now() - startedAt;

      const result: EvaluationResult = {
        score: coerced.score,
        feedback: coerced.feedback,
        highlights: effectiveHighlights,
        highlightSubmitText,
        latencyMs,
      };

      // Minimal trace log (DB persist happens upstream service)
      this.logger.log(`[AI] done in ${latencyMs}ms, score=${result.score}`);

      return result;
    } catch (e) {
      const latencyMs = Date.now() - startedAt;
      this.logger.error(`[AI] failed in ${latencyMs}ms: ${(e as Error).message}`);
      throw new InternalServerErrorException(`OpenAI evaluation failed: ${(e as Error).message}`);
    }
  }

  // ---------- Helpers ----------

  /** Tolerant JSON parser. Extracts the first {...} block if necessary. */
  private safeParseJson(input: string): unknown {
    // Try straight parse first
    try {
      return JSON.parse(input);
    } catch {
      // Find first balanced-looking JSON object
      const first = input.indexOf('{');
      const last = input.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        const maybe = input.slice(first, last + 1);
        try {
          return JSON.parse(maybe);
        } catch {
          // fallthrough
        }
      }
      // Fallback to a minimal object
      return {};
    }
  }

  /** Coerce unknown parsed value into a validated EvaluationRaw → strict shape */
  private coerceEvaluation(value: unknown): {
    score: number;
    feedback: string;
    highlights: string[];
  } {
    const obj = (value && typeof value === 'object' ? value : {}) as EvaluationRaw;

    // score
    let scoreNum = 0;
    if (typeof obj.score === 'number') {
      scoreNum = obj.score;
    } else if (typeof obj.score === 'string') {
      const n = Number(obj.score);
      if (!Number.isNaN(n)) scoreNum = n;
    }
    // integer clamp 0~10
    scoreNum = Math.max(0, Math.min(10, Math.round(scoreNum)));

    // feedback
    let feedback = '';
    if (typeof obj.feedback === 'string') feedback = obj.feedback.trim();
    // sane fallback
    if (!feedback) {
      feedback = 'Automatic evaluation summary is unavailable. Please review manually.';
    }
    // truncate excessively long feedback to avoid payload bloat
    if (feedback.length > 2000) feedback = feedback.slice(0, 2000);

    // highlights
    let highlights: string[] = [];
    if (Array.isArray(obj.highlights)) {
      highlights = obj.highlights.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      );
    }
    // de-dup and trim
    highlights = Array.from(new Set(highlights.map((s) => s.trim())));

    return { score: scoreNum, feedback, highlights };
  }

  /** Extract phrases inside quotes from highlight items (e.g., "'For example,' 'Moreover,'"). */
  private extractQuotedPhrases(items: string[]): string[] {
    const out: string[] = [];
    const rx = /["“”'‘’]([^"“”'‘’]+)["“”'‘’]/g;
    for (const s of items) {
      let m: RegExpExecArray | null;
      while ((m = rx.exec(s)) !== null) {
        const phrase = m[1].trim();
        if (phrase) out.push(phrase);
      }
    }
    return Array.from(new Set(out));
  }

  /** Escape HTML for safe output. */
  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Wrap all exact occurrences of candidate phrases with &lt;b&gt;…&lt;/b&gt;.
   * - Works on the raw (non-normalized) original; phrases are used verbatim
   * - De-duplicates and applies longer phrases first to avoid nesting overlap
   */
  private highlightSubmitText(submitText: string, phrases: string[]): string {
    if (!submitText) return '';
    const escapedOriginal = this.escapeHtml(submitText);

    const unique = Array.from(new Set(phrases.filter(Boolean)));
    if (unique.length === 0) return escapedOriginal;

    // Sort by length desc
    const sorted = [...unique].sort((a, b) => b.length - a.length);

    // Build a single pass replacer by chaining, using regex escape for phrases
    let output = escapedOriginal;
    for (const p of sorted) {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // regex escape
      const rx = new RegExp(`(${escaped})`, 'g'); // case-sensitive verbatim match
      output = output.replace(rx, '<b>$1</b>');
    }
    return output;
  }
}
