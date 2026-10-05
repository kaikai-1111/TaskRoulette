import { ECONOMY } from "@/lib/economy";
import type {
  AnyChallengeAnswer,
  AnyChallengeConfig,
  BoundingBoxAnswer,
  BoundingBoxConfig,
  FreeformDrawingAnswer,
  LabelingAnswer,
  LabelingConfig,
  PhotoCaptureAnswer,
  SurveyAnswer,
  SurveyConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  PointAnswer,
  PointConfig,
  TemplateType,
  VideoRecordingAnswer,
  VideoRecordingConfig,
} from "./types";

export class ValidationError extends Error {}

function requireTargetLabel(config: unknown, kind: string): { targetLabel: string } {
  const c = config as Partial<BoundingBoxConfig | PointConfig>;
  if (!c.targetLabel || typeof c.targetLabel !== "string" || !c.targetLabel.trim()) {
    throw new ValidationError(`${kind} challenges need a target label (what to find).`);
  }
  return { targetLabel: c.targetLabel.trim() };
}

const SURVEY_KINDS: SurveyQuestionKind[] = ["SINGLE", "MULTI", "TEXT", "SCALE"];

function validateSurveyConfig(config: unknown): SurveyConfig {
  const c = config as Partial<SurveyConfig>;
  if (!Array.isArray(c.questions) || c.questions.length === 0) {
    throw new ValidationError("Add at least one survey question.");
  }
  if (c.questions.length > ECONOMY.MAX_SURVEY_QUESTIONS) {
    throw new ValidationError(`A survey can have at most ${ECONOMY.MAX_SURVEY_QUESTIONS} questions.`);
  }
  const seen = new Set<string>();
  const questions = c.questions.map((raw, i): SurveyQuestion => {
    const n = i + 1;
    const q = raw as Partial<SurveyQuestion>;
    const id = typeof q.id === "string" ? q.id.trim().slice(0, 40) : "";
    if (!id || seen.has(id)) throw new ValidationError(`Question ${n} is malformed — reload and try again.`);
    seen.add(id);
    const text = typeof q.text === "string" ? q.text.trim() : "";
    if (!text) throw new ValidationError(`Question ${n} needs some text.`);
    if (text.length > 300) throw new ValidationError(`Question ${n} is too long (max 300 characters).`);
    if (!q.kind || !SURVEY_KINDS.includes(q.kind)) throw new ValidationError(`Question ${n} has an unknown type.`);
    const base = { id, text, kind: q.kind, required: q.required !== false };

    if (q.kind === "SINGLE" || q.kind === "MULTI") {
      const options = Array.isArray(q.options)
        ? q.options.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean)
        : [];
      if (new Set(options).size !== options.length) {
        throw new ValidationError(`Question ${n} has duplicate answer options.`);
      }
      if (options.length < 2 || options.length > ECONOMY.MAX_SURVEY_OPTIONS) {
        throw new ValidationError(
          `Question ${n} needs between 2 and ${ECONOMY.MAX_SURVEY_OPTIONS} answer options.`
        );
      }
      if (options.some((o) => o.length > 100)) {
        throw new ValidationError(`Question ${n} has an option over 100 characters.`);
      }
      return { ...base, options };
    }
    if (q.kind === "SCALE") {
      const max = q.scaleMax === undefined ? 5 : Number(q.scaleMax);
      if (!Number.isInteger(max) || max < 3 || max > 10) {
        throw new ValidationError(`Question ${n}: a rating scale goes up to between 3 and 10.`);
      }
      return { ...base, scaleMax: max };
    }
    return base;
  });
  return { questions };
}

export function validateConfig(templateType: TemplateType, config: unknown): AnyChallengeConfig {
  if (templateType === "BOUNDING_BOX") return requireTargetLabel(config, "Bounding box");
  if (templateType === "POINT") return requireTargetLabel(config, "Find-the-spot");

  if (templateType === "FREEFORM_DRAWING") return {};
  if (templateType === "PHOTO_CAPTURE") return {};
  if (templateType === "SURVEY") return validateSurveyConfig(config);

  if (templateType === "VIDEO_RECORDING") {
    const c = config as Partial<VideoRecordingConfig>;
    const seconds = Number(c.maxDurationSeconds);
    if (!Number.isFinite(seconds)) {
      throw new ValidationError("Set a recording length.");
    }
    if (seconds < ECONOMY.MIN_VIDEO_SECONDS || seconds > ECONOMY.MAX_VIDEO_SECONDS) {
      throw new ValidationError(
        `Recording length must be between ${ECONOMY.MIN_VIDEO_SECONDS} and ${ECONOMY.MAX_VIDEO_SECONDS} seconds.`
      );
    }
    return { maxDurationSeconds: seconds };
  }

  const c = config as Partial<LabelingConfig>;
  if (c.options !== null && c.options !== undefined) {
    if (!Array.isArray(c.options) || c.options.some((o) => typeof o !== "string" || !o.trim())) {
      throw new ValidationError("Labeling options must be a list of non-empty strings, or omitted for free text.");
    }
    if (c.options.length < 2) {
      throw new ValidationError("Give at least two labeling options, or leave options empty for free text.");
    }
  }
  return { options: c.options && c.options.length > 0 ? c.options.map((o) => o.trim()) : null };
}

export function validateAnswer(
  templateType: TemplateType,
  config: AnyChallengeConfig,
  answer: unknown
): AnyChallengeAnswer {
  if (templateType === "BOUNDING_BOX") {
    const a = answer as Partial<BoundingBoxAnswer>;
    const nums = [a.x, a.y, a.width, a.height, a.naturalWidth, a.naturalHeight];
    if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
      throw new ValidationError("Bounding box answer is missing coordinates.");
    }
    if ((a.width as number) <= 0 || (a.height as number) <= 0) {
      throw new ValidationError("Draw a box with non-zero size before submitting.");
    }
    return {
      x: a.x as number,
      y: a.y as number,
      width: a.width as number,
      height: a.height as number,
      naturalWidth: a.naturalWidth as number,
      naturalHeight: a.naturalHeight as number,
    };
  }

  if (templateType === "POINT") {
    const a = answer as Partial<PointAnswer>;
    const nums = [a.x, a.y, a.naturalWidth, a.naturalHeight];
    if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
      throw new ValidationError("Point answer is missing coordinates.");
    }
    return {
      x: a.x as number,
      y: a.y as number,
      naturalWidth: a.naturalWidth as number,
      naturalHeight: a.naturalHeight as number,
    };
  }

  if (templateType === "FREEFORM_DRAWING") {
    const a = answer as Partial<FreeformDrawingAnswer>;
    if (
      !Array.isArray(a.strokes) ||
      a.strokes.length === 0 ||
      !a.strokes.every(
        (stroke) =>
          Array.isArray(stroke) &&
          stroke.length > 0 &&
          stroke.every(
            (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n))
          )
      )
    ) {
      throw new ValidationError("Draw something before submitting.");
    }
    return { strokes: a.strokes as [number, number][][] };
  }

  if (templateType === "SURVEY") {
    const survey = config as SurveyConfig;
    const a = answer as Partial<SurveyAnswer>;
    if (!Array.isArray(a.responses)) throw new ValidationError("Answer the survey before submitting.");
    const given = new Map<string, unknown>();
    for (const r of a.responses) {
      if (r && typeof r === "object" && typeof r.questionId === "string") given.set(r.questionId, r.value);
    }
    const responses = survey.questions.map((q) => {
      const v = given.get(q.id);
      const blank =
        v === undefined ||
        v === null ||
        (typeof v === "string" && !v.trim()) ||
        (Array.isArray(v) && v.length === 0);
      if (blank) {
        if (q.required) throw new ValidationError(`Please answer: "${q.text}"`);
        return { questionId: q.id, value: null };
      }
      if (q.kind === "SINGLE") {
        if (typeof v !== "string" || !q.options?.includes(v)) {
          throw new ValidationError(`Pick one of the offered options for: "${q.text}"`);
        }
        return { questionId: q.id, value: v };
      }
      if (q.kind === "MULTI") {
        if (
          !Array.isArray(v) ||
          v.some((x) => typeof x !== "string" || !q.options?.includes(x)) ||
          new Set(v).size !== v.length
        ) {
          throw new ValidationError(`Pick from the offered options for: "${q.text}"`);
        }
        return { questionId: q.id, value: v as string[] };
      }
      if (q.kind === "SCALE") {
        if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > (q.scaleMax ?? 5)) {
          throw new ValidationError(`Pick a rating for: "${q.text}"`);
        }
        return { questionId: q.id, value: v };
      }
      if (typeof v !== "string") throw new ValidationError(`Type an answer for: "${q.text}"`);
      return { questionId: q.id, value: v.trim().slice(0, ECONOMY.MAX_SURVEY_TEXT_ANSWER_CHARS) };
    });
    return { responses };
  }

  if (templateType === "PHOTO_CAPTURE") {
    const a = answer as Partial<PhotoCaptureAnswer>;
    if (typeof a.mediaUrl !== "string" || !a.mediaUrl.trim()) {
      throw new ValidationError("Photo didn't upload correctly — try again.");
    }
    return { mediaUrl: a.mediaUrl };
  }

  if (templateType === "VIDEO_RECORDING") {
    const a = answer as Partial<VideoRecordingAnswer>;
    const videoConfig = config as VideoRecordingConfig;
    if (typeof a.mediaUrl !== "string" || !a.mediaUrl.trim()) {
      throw new ValidationError("Recording didn't upload correctly — try again.");
    }
    if (typeof a.durationMs !== "number" || !Number.isFinite(a.durationMs) || a.durationMs <= 0) {
      throw new ValidationError("Recording had no duration — try again.");
    }
    // +1.5s buffer for encoder/flush lag around the auto-stop timer.
    if (a.durationMs > videoConfig.maxDurationSeconds * 1000 + 1500) {
      throw new ValidationError("Recording is longer than this challenge allows.");
    }
    return { mediaUrl: a.mediaUrl, durationMs: a.durationMs };
  }

  const labelConfig = config as LabelingConfig;
  const a = answer as Partial<LabelingAnswer>;
  if (typeof a.value !== "string" || !a.value.trim()) {
    throw new ValidationError("Pick an option or type an answer before submitting.");
  }
  if (labelConfig.options && !labelConfig.options.includes(a.value)) {
    throw new ValidationError("That answer isn't one of the offered options.");
  }
  return { value: a.value.trim() };
}
