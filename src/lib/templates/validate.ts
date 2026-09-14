import { ECONOMY } from "@/lib/economy";
import type {
  AnyChallengeAnswer,
  AnyChallengeConfig,
  BoundingBoxAnswer,
  BoundingBoxConfig,
  FreeformDrawingAnswer,
  LabelingAnswer,
  LabelingConfig,
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

export function validateConfig(templateType: TemplateType, config: unknown): AnyChallengeConfig {
  if (templateType === "BOUNDING_BOX") return requireTargetLabel(config, "Bounding box");
  if (templateType === "POINT") return requireTargetLabel(config, "Find-the-spot");

  if (templateType === "FREEFORM_DRAWING") return {};

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
