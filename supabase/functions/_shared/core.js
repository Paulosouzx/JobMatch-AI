// packages/core/src/prompts/cover-letter.v1.ts
var COVER_LETTER_PROMPT_VERSION = "cover-letter.v1";
var COVER_LETTER_SYSTEM_PROMPT = `You write concise, honest cover letters. Rules:
- 3 short paragraphs, maximum 220 words.
- Mention only skills and experience that appear in the candidate CV. Never invent facts.
- Address the specific role and company; connect 2 or 3 concrete strengths to the job requirements.
- Plain text only, no markdown, no placeholders for contact details, no subject line.`;
function buildCoverLetterUserPrompt(job, profile, cvText, language) {
  return [
    `Write the cover letter in ${language}.`,
    "",
    "## Candidate",
    `Seniority: ${profile.seniority ?? "not specified"}`,
    `Skills: ${profile.skills.join(", ") || "not specified"}`,
    "",
    "CV:",
    cvText || "(no CV provided)",
    "",
    "## Job",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    "",
    job.description.slice(0, 6e3)
  ].join("\n");
}

// packages/core/src/prompts/score.v1.ts
var SCORE_PROMPT_VERSION = "score.v1";
var SCORE_SYSTEM_PROMPT = `You are a precise recruiting analyst. You compare one job posting with one candidate profile and return a strict JSON object.

Scoring guide (score is an integer from 0 to 100):
- 90-100: near-perfect fit on skills, seniority and location
- 70-89: strong fit with minor gaps
- 50-69: partial fit, notable gaps
- 0-49: poor fit

Return ONLY a JSON object with exactly these keys:
{
  "score": number,
  "reasons": string[],
  "matched_skills": string[],
  "missing_skills": string[],
  "seniority_fit": string,
  "location_fit": string,
  "summary": string
}
"reasons" must contain 2 to 4 short reasons. "seniority_fit" is one of "good", "stretch", "overqualified", "unknown". "location_fit" is one of "good", "partial", "poor", "unknown". "summary" is one sentence.
Do not include markdown, code fences or any text outside the JSON object. Base the analysis only on the provided data.`;
function buildScoreUserPrompt(job, profile, cvText, language) {
  return [
    `Write "reasons" and "summary" in ${language}. Keep skill names as written in the job posting.`,
    "",
    "## Candidate profile",
    `Seniority: ${profile.seniority ?? "not specified"}`,
    `Location: ${profile.location ?? "not specified"}`,
    `Work mode preference: ${profile.workModes.join(", ") || "not specified"}`,
    `Declared skills: ${profile.skills.join(", ") || "not specified"}`,
    "",
    "CV:",
    cvText || "(no CV provided)",
    "",
    "## Job posting",
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? "not specified"}`,
    `Remote: ${job.remote ? "yes" : "no"}`,
    "",
    "Description:",
    job.description.slice(0, 6e3)
  ].join("\n");
}
function buildRepairPrompt(previousOutput, problem) {
  return [
    "Your previous answer was not valid for the required schema.",
    `Problem: ${problem}`,
    "",
    "Previous answer:",
    previousOutput.slice(0, 4e3),
    "",
    "Return ONLY the corrected JSON object with the exact required keys and no extra text."
  ].join("\n");
}

// packages/core/src/types/index.ts
import { z } from "zod";
var workModeSchema = z.enum(["remote", "hybrid", "onsite"]);
var matchStatusSchema = z.enum(["new", "seen", "saved", "applied", "discarded"]);
var jobSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullable(),
  remote: z.boolean(),
  description: z.string(),
  url: z.string().url(),
  postedAt: z.string().datetime().nullable()
});
var profileSchema = z.object({
  cvText: z.string(),
  skills: z.array(z.string()),
  seniority: z.string().nullable(),
  location: z.string().nullable(),
  workModes: z.array(workModeSchema),
  mustKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
  ignoredCompanies: z.array(z.string())
});
var matchScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  matched_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  seniority_fit: z.string(),
  location_fit: z.string(),
  summary: z.string()
});

// packages/core/src/llm/errors.ts
var RateLimitError = class extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.retryAfterMs = retryAfterMs;
    this.name = "RateLimitError";
  }
  retryAfterMs;
};
var LLMParseError = class extends Error {
  constructor(message, rawOutput) {
    super(message);
    this.rawOutput = rawOutput;
    this.name = "LLMParseError";
  }
  rawOutput;
};
var LLMRequestError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "LLMRequestError";
  }
  status;
};

// packages/core/src/llm/clients.ts
var DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  ollama: "llama3.1"
};
function retryAfter(response) {
  const header = response.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds * 1e3 : void 0;
}
async function readError(response) {
  const text = await response.text().catch(() => "");
  return `${response.status} ${text.slice(0, 300)}`.trim();
}
async function postJson(fetchFn, url, headers, body) {
  const response = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  if (response.status === 429) {
    throw new RateLimitError(await readError(response), retryAfter(response));
  }
  if (!response.ok) throw new LLMRequestError(await readError(response), response.status);
  return response.json();
}
function geminiClient(config, fetchFn) {
  const model = config.model || DEFAULT_MODELS.gemini;
  return {
    async complete(request) {
      const data = await postJson(
        fetchFn,
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": config.apiKey ?? "" },
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.user }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            ...request.json ? { responseMimeType: "application/json" } : {}
          }
        }
      );
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      if (!text) throw new LLMRequestError("Gemini returned an empty response");
      return text;
    }
  };
}
function openAiCompatibleClient(config, fetchFn, baseUrl, sendJsonFormat) {
  const model = config.model || DEFAULT_MODELS[config.provider];
  return {
    async complete(request) {
      const data = await postJson(
        fetchFn,
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        {
          model,
          temperature: request.temperature ?? 0.2,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user }
          ],
          ...request.json && sendJsonFormat ? { response_format: { type: "json_object" } } : {}
        }
      );
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new LLMRequestError("Provider returned an empty response");
      return text;
    }
  };
}
function createChatClient(config, fetchFn) {
  switch (config.provider) {
    case "gemini":
      return geminiClient(config, fetchFn);
    case "groq":
      return openAiCompatibleClient(config, fetchFn, "https://api.groq.com/openai/v1", true);
    case "openrouter":
      return openAiCompatibleClient(config, fetchFn, "https://openrouter.ai/api/v1", false);
    case "ollama":
      return openAiCompatibleClient(
        config,
        fetchFn,
        `${(config.baseUrl || "http://localhost:11434").replace(/\/+$/, "")}/v1`,
        true
      );
  }
}

// packages/core/src/llm/sanitize.ts
var EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
var PHONE = /(?<![\w])(?:\+|00)?\d[\d\s().-]{7,}\d(?![\w])/g;
var ADDRESS_LINE = /^\s*(?:address|morada|endere[cç]o)\b.*$|^.*\b(?:rua|av\.|avenida|travessa|pra[cç]a|street|road|rd\.|calle|stra[sß]e)\b.*\d.*$|^.*\b\d{4}-\d{3}\b.*$|^.*\b\d{5}-\d{3}\b.*$/gim;
function stripPii(text) {
  return text.replace(EMAIL, "[email removed]").replace(ADDRESS_LINE, "[address removed]").replace(PHONE, "[phone removed]");
}

// packages/core/src/llm/provider.ts
function stripReasoning(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}
function extractJson(text) {
  const trimmed = stripReasoning(text);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(candidate.slice(start, end + 1));
}
function parseScore(text) {
  let data;
  try {
    data = extractJson(text);
  } catch (error) {
    return { problem: `output is not valid JSON (${error.message})` };
  }
  const result = matchScoreSchema.safeParse(data);
  if (result.success) return { score: result.data };
  const problem = result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ");
  return { problem };
}
function createLLMProvider(config, options) {
  const client = options.client ?? createChatClient(config, options.fetchFn);
  const model = config.model || DEFAULT_MODELS[config.provider];
  const language = options.language ?? "Brazilian Portuguese";
  const call = (task) => options.queue ? options.queue.run(task) : task();
  return {
    async scoreJob(job, profile) {
      const cvText = stripPii(profile.cvText).slice(0, 8e3);
      const user = buildScoreUserPrompt(job, profile, cvText, language);
      const first = await call(
        () => client.complete({ system: SCORE_SYSTEM_PROMPT, user, json: true })
      );
      const parsed = parseScore(first);
      if ("score" in parsed) {
        return { score: parsed.score, model, promptVersion: SCORE_PROMPT_VERSION };
      }
      const second = await call(
        () => client.complete({
          system: SCORE_SYSTEM_PROMPT,
          user: `${user}

${buildRepairPrompt(first, parsed.problem)}`,
          json: true,
          temperature: 0
        })
      );
      const retried = parseScore(second);
      if ("score" in retried) {
        return { score: retried.score, model, promptVersion: SCORE_PROMPT_VERSION };
      }
      throw new LLMParseError(`Invalid LLM output after retry: ${retried.problem}`, second);
    },
    async draftCoverLetter(job, profile) {
      const cvText = stripPii(profile.cvText).slice(0, 8e3);
      const text = await call(
        () => client.complete({
          system: COVER_LETTER_SYSTEM_PROMPT,
          user: buildCoverLetterUserPrompt(job, profile, cvText, language),
          json: false,
          temperature: 0.6
        })
      );
      return { text: stripReasoning(text), model, promptVersion: COVER_LETTER_PROMPT_VERSION };
    },
    async testConnection() {
      try {
        const reply = await client.complete({
          system: "Reply with the single word OK.",
          user: "ping",
          json: false,
          temperature: 0
        });
        return {
          ok: true,
          message: `Connected to ${config.provider} (${model}): ${stripReasoning(reply).slice(0, 40)}`
        };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    }
  };
}
export {
  DEFAULT_MODELS,
  LLMParseError,
  LLMRequestError,
  RateLimitError,
  createChatClient,
  createLLMProvider,
  extractJson,
  parseScore,
  stripPii
};
