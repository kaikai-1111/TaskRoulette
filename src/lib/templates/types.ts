// The task-template abstraction. Each template type declares:
//   - a Config shape (what the creator specifies when posting a challenge)
//   - an Answer shape (what a doer produces)
// The feed and creation form never branch on template-specific logic directly —
// they render whatever component the registry (registry.tsx) maps a type to.

export type TemplateType =
  | "BOUNDING_BOX"
  | "POINT"
  | "LABELING"
  | "FREEFORM_DRAWING"
  | "VIDEO_RECORDING"
  | "PHOTO_CAPTURE";

export const TEMPLATE_TYPES: { value: TemplateType; label: string; blurb: string }[] = [
  {
    value: "BOUNDING_BOX",
    label: "Bounding box",
    blurb: "Doer draws a rectangle around something in an image.",
  },
  {
    value: "POINT",
    label: "Find the spot",
    blurb: "Doer taps a single point on something in an image.",
  },
  {
    value: "LABELING",
    label: "Labeling",
    blurb: "Doer picks an option (or types a short answer) for an image or text prompt.",
  },
  {
    value: "FREEFORM_DRAWING",
    label: "Draw it",
    blurb: "Doer gets a blank canvas and draws whatever the prompt says.",
  },
  {
    value: "VIDEO_RECORDING",
    label: "Record it",
    blurb: "Doer records a few seconds of video on their camera. Requires camera consent, 13+.",
  },
  {
    value: "PHOTO_CAPTURE",
    label: "Take a picture",
    blurb: "Doer takes a photo on their camera. For collecting new data rather than annotating existing data.",
  },
];

export interface BoundingBoxConfig {
  targetLabel: string; // what to draw a box around, e.g. "the cat"
}

export interface BoundingBoxAnswer {
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number; // the image's natural pixel size, so the box can be
  naturalHeight: number; // rescaled correctly regardless of display size
}

export interface PointConfig {
  targetLabel: string; // what to tap, e.g. "the cat's nose"
}

export interface PointAnswer {
  x: number;
  y: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface LabelingConfig {
  options: string[] | null; // null => free-text answer instead of fixed choices
}

export interface LabelingAnswer {
  value: string;
}

// No creator-supplied config — the item's text (or the challenge prompt, for
// single-item challenges) IS the drawing instruction.
export type FreeformDrawingConfig = Record<string, never>;

export interface FreeformDrawingAnswer {
  strokes: [number, number][][]; // each stroke = ordered points, 0..1 normalized to the canvas
}

export interface VideoRecordingConfig {
  maxDurationSeconds: number;
}

export interface VideoRecordingAnswer {
  mediaUrl: string; // uploaded recording, served from /uploads/recordings/...
  durationMs: number;
}

// No creator-supplied config — the item's text (or the challenge prompt, for
// single-item challenges) IS the photo instruction, same as freeform drawing.
export type PhotoCaptureConfig = Record<string, never>;

export interface PhotoCaptureAnswer {
  mediaUrl: string; // uploaded photo, served from /uploads/images/...
}

export type ChallengeConfigFor<T extends TemplateType> = T extends "BOUNDING_BOX"
  ? BoundingBoxConfig
  : T extends "POINT"
    ? PointConfig
    : T extends "LABELING"
      ? LabelingConfig
      : T extends "FREEFORM_DRAWING"
        ? FreeformDrawingConfig
        : T extends "PHOTO_CAPTURE"
          ? PhotoCaptureConfig
          : VideoRecordingConfig;

export type ChallengeAnswerFor<T extends TemplateType> = T extends "BOUNDING_BOX"
  ? BoundingBoxAnswer
  : T extends "POINT"
    ? PointAnswer
    : T extends "LABELING"
      ? LabelingAnswer
      : T extends "FREEFORM_DRAWING"
        ? FreeformDrawingAnswer
        : T extends "PHOTO_CAPTURE"
          ? PhotoCaptureAnswer
          : VideoRecordingAnswer;

export type AnyChallengeConfig =
  | BoundingBoxConfig
  | PointConfig
  | LabelingConfig
  | FreeformDrawingConfig
  | VideoRecordingConfig
  | PhotoCaptureConfig;

export type AnyChallengeAnswer =
  | BoundingBoxAnswer
  | PointAnswer
  | LabelingAnswer
  | FreeformDrawingAnswer
  | VideoRecordingAnswer
  | PhotoCaptureAnswer;

// One ChallengeItem as handed to a capture component: the item's own media plus
// the parsed (not raw JSON string) challenge-level config and prompt.
export interface FeedItem {
  itemId: string;
  challengeId: string;
  templateType: TemplateType;
  prompt: string;
  config: AnyChallengeConfig;
  mediaUrl: string | null;
  textContent: string | null;
  timeLimitSeconds: number;
}
