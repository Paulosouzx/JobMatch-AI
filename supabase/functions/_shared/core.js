// packages/core/src/prompts/cover-letter.v1.ts
var COVER_LETTER_PROMPT_VERSION = "cover-letter.v2";
var COVER_LETTER_SYSTEM_PROMPT = `You write concise, honest cover letters. Rules:
- At most 3 short paragraphs, maximum 220 words.
- Mention only skills and experience that appear in the candidate CV. Never invent facts.
- Address the specific role and company; connect 2 or 3 concrete strengths to the job requirements.
- Plain text only, no markdown, no placeholders for contact details, no subject line.`;
function buildCoverLetterSystemPrompt(styleGuide) {
  return styleGuide ? `${COVER_LETTER_SYSTEM_PROMPT}

${styleGuide}` : COVER_LETTER_SYSTEM_PROMPT;
}
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

// packages/core/src/prompts/fix-text.v1.ts
function buildFixTextSystemPrompt(styleGuide) {
  return `You rewrite individual sentences so they follow a style guide. Return ONLY a JSON object {"sentences": string[]} with exactly one rewritten sentence per input sentence, in the same order and the same language. Keep the meaning and every fact; do not add new facts, numbers or technologies.

${styleGuide}`;
}
function buildFixTextUserPrompt(sentences, banned) {
  return [
    `Remove these words or expressions: ${banned.join("; ")}.`,
    "",
    JSON.stringify({ sentences }, null, 2)
  ].join("\n");
}

// packages/core/src/prompts/resume-adapt.v1.ts
var RESUME_ADAPT_PROMPT_VERSION = "resume-adapt.v1";
function buildResumeAdaptSystemPrompt(styleGuide) {
  return `You tailor CV text to a specific job posting. You receive a JSON object of CV fields and a job summary.

Hard rules:
- Return ONLY a JSON object with EXACTLY the same keys you received. No new keys, no removed keys, no nested objects.
- Every value is a rewrite of the original value for that same key.
- Use ONLY facts already present in that original value: do not add technologies, tools, numbers, results, employers, responsibilities or claims that are not in it.
- You may reorder, shorten, rephrase and emphasise what matches the job. Keep each value at most 15% longer than its original.
- Keep the same language as the original value.
- If a value cannot be improved without inventing anything, return it unchanged.

${styleGuide}

Do not include markdown, code fences or any text outside the JSON object.`;
}
function buildResumeAdaptUserPrompt(jobSummary, fields) {
  return ["## Job", jobSummary, "", "## CV fields (JSON)", JSON.stringify(fields, null, 2)].join(
    "\n"
  );
}

// packages/core/src/style/style-guide.ts
var DEFAULT_STYLE_GUIDE = {
  rules: [
    "Use short, direct sentences.",
    "Use concrete verbs (built, reduced, migrated, shipped) instead of vague ones.",
    "Keep real numbers when the source text has them. Never add numbers that are not in the source.",
    "No filler, no flourish, no closing sentence that repeats everything.",
    "Cover letters have at most 3 short paragraphs.",
    "Never use the em dash (\u2014) or the en dash (\u2013) inside sentences. Use a comma, a full stop or parentheses instead."
  ],
  bannedPhrases: [
    "apaixonado por",
    "apaixonada por",
    "din\xE2mico",
    "din\xE2mica",
    "sinergia",
    "alavancar",
    "robusto",
    "robusta",
    "inovador",
    "inovadora",
    "jornada",
    "mergulhar",
    "no cen\xE1rio atual",
    "em constante evolu\xE7\xE3o",
    "al\xE9m disso",
    "\xE9 importante ressaltar",
    "n\xE3o apenas... mas tamb\xE9m",
    "desbloquear",
    "potencializar",
    "passionate",
    "leverage",
    "delve",
    "seamless",
    "cutting-edge",
    "spearheaded"
  ],
  samples: []
};
function fold(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function phrasePattern(phrase) {
  const parts = fold(phrase.trim()).split(/\s*(?:\.\.\.|…)\s*/).filter(Boolean).map((part) => escapeRegExp(part).replace(/\s+/g, "\\s+"));
  const body = parts.join("[\\s\\S]{1,80}?");
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${body})(?=$|[^\\p{L}\\p{N}])`, "giu");
}
function findBannedPhrases(text, phrases) {
  const folded = fold(text);
  const hits = [];
  for (const phrase of phrases) {
    if (phrase.trim() === "") continue;
    for (const match of folded.matchAll(phrasePattern(phrase))) {
      const start = (match.index ?? 0) + (match[1]?.length ?? 0);
      const end = start + (match[2]?.length ?? 0);
      hits.push({ phrase, start, end, match: text.slice(start, end) });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}
function replaceDashes(text) {
  return text.replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2").replace(/\s*[—–]\s*([.,;:!?])/g, "$1").replace(/(^|\n)\s*[—–]\s*/g, "$1").replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",").replace(/[ \t]{2,}/g, " ");
}
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"“(])|\n+/u).map((sentence) => sentence.trim()).filter(Boolean);
}
function sentencesWithBannedPhrases(text, phrases) {
  return splitSentences(text).filter((sentence) => findBannedPhrases(sentence, phrases).length > 0);
}
function formatStyleGuide(guide) {
  const lines = ["Writing rules:", ...guide.rules.map((rule) => `- ${rule}`)];
  if (guide.bannedPhrases.length > 0) {
    lines.push(
      "",
      `Never use these words or expressions (in any language or inflection): ${guide.bannedPhrases.join("; ")}.`
    );
  }
  const samples = guide.samples.map((sample) => sample.trim()).filter(Boolean).slice(0, 3);
  if (samples.length > 0) {
    lines.push(
      "",
      "Match the tone of these texts written by the candidate (tone only, do not copy content):"
    );
    samples.forEach(
      (sample, index) => lines.push(`<sample ${index + 1}>`, sample.slice(0, 1500), `</sample ${index + 1}>`)
    );
  }
  return lines.join("\n");
}

// packages/core/src/prompts/score.v1.ts
var SCORE_PROMPT_VERSION = "score.v2";
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
  "summary": string,
  "language": string,
  "work_mode": "remote" | "hybrid" | "onsite" | "unknown",
  "salary": string | null,
  "requirements_required": string[],
  "requirements_nice": string[],
  "benefits": string[]
}
"reasons" must contain 2 to 4 short reasons. "seniority_fit" is one of "good", "stretch", "overqualified", "unknown". "location_fit" is one of "good", "partial", "poor", "unknown". "summary" is one sentence. "language" is the ISO 639-1 code of the job posting language (for example "en" or "pt"). "work_mode" comes from the posting. "salary" is the salary or range exactly as stated in the posting, or null. "requirements_required" lists the mandatory requirements, "requirements_nice" the nice-to-have ones and "benefits" what the company offers, each as short items copied or condensed from the posting (empty arrays when the posting does not say). Write these three lists in the language of the posting.
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
  summary: z.string(),
  language: z.string().optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite", "unknown"]).optional(),
  salary: z.string().nullable().optional(),
  requirements_required: z.array(z.string()).optional(),
  requirements_nice: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional()
});
var extractedProfileSchema = z.object({
  skills: z.array(z.string()).max(40),
  seniority: z.enum(["intern", "junior", "mid", "senior", "lead"]).nullable(),
  location: z.string().nullable(),
  work_modes: z.array(workModeSchema),
  keywords: z.array(z.string()).max(12),
  headline: z.string()
});

// packages/core/src/prompts/profile-extract.v1.ts
var PROFILE_EXTRACT_PROMPT_VERSION = "profile-extract.v1";
var PROFILE_EXTRACT_SYSTEM_PROMPT = `You read a candidate CV and extract structured job-search preferences. Return ONLY a JSON object with exactly these keys:
{
  "skills": string[],
  "seniority": "intern" | "junior" | "mid" | "senior" | "lead" | null,
  "location": string | null,
  "work_modes": ("remote" | "hybrid" | "onsite")[],
  "keywords": string[],
  "headline": string
}
Rules:
- "skills": 5 to 20 concrete technical or professional skills, tools, languages and frameworks that appear in the CV, as short canonical names (for example "TypeScript", "React", "PostgreSQL"). No soft skills.
- "seniority": infer from total years of professional experience and job titles (under 1 year intern or junior, 1 to 3 junior, 3 to 6 mid, 6 or more senior, team or tech lead roles lead). Use null if unclear.
- "location": the city and country where the candidate lives, if stated, for example "Porto, Portugal". Never include street addresses or postal codes. Use null if absent.
- "work_modes": only modes the CV explicitly mentions as preferred or experienced; empty array if not stated.
- "keywords": 3 to 6 role keywords that job titles should contain for this candidate, for example "frontend", "react", "full-stack".
- "headline": one short line describing the candidate's profile, in the CV language.
Do not include markdown, code fences or text outside the JSON object. Do not invent facts.`;
function buildProfileExtractUserPrompt(cvText) {
  return ["CV:", cvText.slice(0, 12e3)].join("\n");
}

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
  groq: "openai/gpt-oss-120b",
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
var LANGUAGE_NAMES = {
  pt: "Portuguese (Portugal)",
  "pt-br": "Brazilian Portuguese",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  nl: "Dutch"
};
function languageName(code, fallback) {
  if (!code) return fallback;
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}
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
function parseWith(schema, text) {
  let data;
  try {
    data = extractJson(text);
  } catch (error) {
    return { problem: `output is not valid JSON (${error.message})` };
  }
  const result = schema.safeParse(data);
  if (result.success) return { value: result.data };
  return {
    problem: result.error.issues.map((issue) => `${issue.path.map(String).join(".") || "root"}: ${issue.message}`).join("; ")
  };
}
function parseExtractedProfile(text) {
  const parsed = parseWith(extractedProfileSchema, text);
  return "value" in parsed ? { profile: parsed.value } : parsed;
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
    async extractProfile(rawCv) {
      const user = buildProfileExtractUserPrompt(stripPii(rawCv));
      const first = await call(
        () => client.complete({
          system: PROFILE_EXTRACT_SYSTEM_PROMPT,
          user,
          json: true,
          temperature: 0
        })
      );
      const parsed = parseExtractedProfile(first);
      if ("profile" in parsed) {
        return { profile: parsed.profile, model, promptVersion: PROFILE_EXTRACT_PROMPT_VERSION };
      }
      const second = await call(
        () => client.complete({
          system: PROFILE_EXTRACT_SYSTEM_PROMPT,
          user: `${user}

${buildRepairPrompt(first, parsed.problem)}`,
          json: true,
          temperature: 0
        })
      );
      const retried = parseExtractedProfile(second);
      if ("profile" in retried) {
        return { profile: retried.profile, model, promptVersion: PROFILE_EXTRACT_PROMPT_VERSION };
      }
      throw new LLMParseError(`Invalid LLM output after retry: ${retried.problem}`, second);
    },
    async draftCoverLetter(job, profile, writing) {
      const cvText = stripPii(profile.cvText).slice(0, 8e3);
      const guide = writing?.styleGuide ? formatStyleGuide(writing.styleGuide) : void 0;
      const text = await call(
        () => client.complete({
          system: buildCoverLetterSystemPrompt(guide),
          user: buildCoverLetterUserPrompt(
            job,
            profile,
            cvText,
            languageName(writing?.language, language)
          ),
          json: false,
          temperature: 0.5
        })
      );
      return {
        text: replaceDashes(stripReasoning(text)),
        model,
        promptVersion: COVER_LETTER_PROMPT_VERSION
      };
    },
    async adaptResume(fields, jobSummary, styleGuide) {
      const system = buildResumeAdaptSystemPrompt(styleGuide ? formatStyleGuide(styleGuide) : "");
      const user = buildResumeAdaptUserPrompt(jobSummary, fields);
      const first = await call(
        () => client.complete({ system, user, json: true, temperature: 0.3 })
      );
      try {
        return { proposed: extractJson(first), model, promptVersion: RESUME_ADAPT_PROMPT_VERSION };
      } catch (error) {
        const second = await call(
          () => client.complete({
            system,
            user: `${user}

${buildRepairPrompt(first, error.message)}`,
            json: true,
            temperature: 0
          })
        );
        try {
          return {
            proposed: extractJson(second),
            model,
            promptVersion: RESUME_ADAPT_PROMPT_VERSION
          };
        } catch (retryError) {
          throw new LLMParseError(
            `Invalid LLM output after retry: ${retryError.message}`,
            second
          );
        }
      }
    },
    async fixSentences(sentences, banned, styleGuide) {
      const system = buildFixTextSystemPrompt(styleGuide ? formatStyleGuide(styleGuide) : "");
      const text = await call(
        () => client.complete({
          system,
          user: buildFixTextUserPrompt(sentences, banned),
          json: true,
          temperature: 0.2
        })
      );
      const data = extractJson(text);
      const fixed = Array.isArray(data.sentences) ? data.sentences : [];
      if (fixed.length !== sentences.length || fixed.some((value) => typeof value !== "string")) {
        throw new LLMParseError("The model did not return one sentence per input sentence", text);
      }
      return fixed.map((value) => replaceDashes(value.trim()));
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

// packages/core/src/resume/template.ts
import { z as z2 } from "zod";
var resumeFieldKey = z2.string().regex(/^[a-z0-9_]+$/);
var educationItem = z2.object({
  school: z2.string(),
  degree: z2.string(),
  location: z2.string(),
  dates: z2.string()
});
var skillGroup = z2.object({ label: z2.string(), field: resumeFieldKey });
var experienceItem = z2.object({
  heading: z2.string(),
  dates: z2.string(),
  subtitle: z2.string().optional(),
  stackLabel: z2.string().optional(),
  stackField: resumeFieldKey.optional(),
  bullets: z2.array(resumeFieldKey)
});
var resumeSectionSchema = z2.discriminatedUnion("type", [
  z2.object({ type: z2.literal("summary"), title: z2.string(), field: resumeFieldKey }),
  z2.object({ type: z2.literal("education"), title: z2.string(), items: z2.array(educationItem) }),
  z2.object({ type: z2.literal("skills"), title: z2.string(), groups: z2.array(skillGroup) }),
  z2.object({ type: z2.literal("experience"), title: z2.string(), items: z2.array(experienceItem) }),
  z2.object({ type: z2.literal("list"), title: z2.string(), items: z2.array(z2.string()) })
]);
var resumeStructureSchema = z2.object({
  name: z2.string(),
  links: z2.array(z2.string()),
  contact: z2.string(),
  sections: z2.array(resumeSectionSchema)
});
function fieldKeysOf(structure) {
  const keys = [];
  for (const section of structure.sections) {
    if (section.type === "summary") keys.push(section.field);
    if (section.type === "skills") keys.push(...section.groups.map((group) => group.field));
    if (section.type === "experience") {
      for (const item of section.items) {
        if (item.stackField) keys.push(item.stackField);
        keys.push(...item.bullets);
      }
    }
  }
  return keys;
}
var TECH_TOKEN = /[A-Za-z][A-Za-z0-9]*(?:[.#+/-][A-Za-z0-9#+]+)*/g;
var COMMON_CAPITALIZED = /* @__PURE__ */ new Set([
  "I",
  "A",
  "An",
  "The",
  "And",
  "For",
  "With",
  "In",
  "On",
  "At",
  "To",
  "Of",
  "By",
  "From",
  "As",
  "Via",
  "O",
  "E",
  "Em",
  "De",
  "Do",
  "Da",
  "Para",
  "Com",
  "Por",
  "Na",
  "No",
  "Os",
  "As",
  "Um",
  "Uma"
]);
function numbersIn(text) {
  return [...text.matchAll(/\d+(?:[.,]\d+)?%?/g)].map((match) => match[0].replace(",", "."));
}
function techTermsIn(text) {
  return [...text.matchAll(TECH_TOKEN)].map((match) => match[0]).filter((token, index, all) => {
    if (COMMON_CAPITALIZED.has(token)) return false;
    const startsSentence = index === 0;
    const looksTechnical = /[A-Z].*[A-Z]|[.#+]|\d/.test(token) || /^[A-Z]/.test(token) && !startsSentence;
    return looksTechnical && all.indexOf(token) === index;
  });
}
function inventedContent(original, proposed, allowedContext = "") {
  const reasons = [];
  const originalNumbers = new Set(numbersIn(original));
  const newNumbers = numbersIn(proposed).filter((value) => !originalNumbers.has(value));
  if (newNumbers.length > 0) reasons.push(`new numbers: ${[...new Set(newNumbers)].join(", ")}`);
  const known = `${original} ${allowedContext}`.toLowerCase();
  const newTerms = techTermsIn(proposed).filter((term) => !known.includes(term.toLowerCase()));
  if (newTerms.length > 0) reasons.push(`new terms: ${newTerms.slice(0, 5).join(", ")}`);
  return reasons;
}
function reviewAdaptation(original, proposedRaw, options = {}) {
  const maxGrowth = options.maxGrowth ?? 0.15;
  const banned = options.bannedPhrases ?? [];
  const proposed = proposedRaw && typeof proposedRaw === "object" && !Array.isArray(proposedRaw) ? proposedRaw : {};
  const extraKeys = Object.keys(proposed).filter((key) => !(key in original));
  const missingKeys = Object.keys(original).filter((key) => typeof proposed[key] !== "string");
  const fields = Object.entries(original).map(([key, originalText]) => {
    const raw = proposed[key];
    if (typeof raw !== "string" || raw.trim() === "") {
      return {
        key,
        original: originalText,
        proposed: originalText,
        accepted: false,
        status: "rejected",
        reasons: ["missing key"],
        bannedHits: []
      };
    }
    const cleaned = replaceDashes(raw.trim());
    const reasons = [];
    const limit = Math.ceil(originalText.length * (1 + maxGrowth));
    if (cleaned.length > limit) reasons.push(`too long (${cleaned.length}/${limit} chars)`);
    reasons.push(...inventedContent(originalText, cleaned, options.allowedContext));
    if (reasons.length > 0) {
      return {
        key,
        original: originalText,
        proposed: cleaned,
        accepted: false,
        status: "rejected",
        reasons,
        bannedHits: findBannedPhrases(cleaned, banned)
      };
    }
    const unchanged = cleaned === originalText.trim();
    return {
      key,
      original: originalText,
      proposed: cleaned,
      accepted: !unchanged,
      status: unchanged ? "unchanged" : "changed",
      reasons: [],
      bannedHits: findBannedPhrases(cleaned, banned)
    };
  });
  return { fields, extraKeys, missingKeys };
}
export {
  DEFAULT_MODELS,
  DEFAULT_STYLE_GUIDE,
  LLMParseError,
  LLMRequestError,
  RateLimitError,
  createChatClient,
  createLLMProvider,
  extractJson,
  fieldKeysOf,
  findBannedPhrases,
  formatStyleGuide,
  languageName,
  parseExtractedProfile,
  parseScore,
  replaceDashes,
  resumeStructureSchema,
  reviewAdaptation,
  sentencesWithBannedPhrases,
  stripPii
};
