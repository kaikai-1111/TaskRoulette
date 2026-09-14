import type { ComponentType } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { TemplateType } from "@/lib/templates/types";
import BoundingBoxCapture from "./BoundingBoxCapture";
import PointCapture from "./PointCapture";
import LabelingCapture from "./LabelingCapture";
import FreeformDrawingCapture from "./FreeformDrawingCapture";
import VideoRecordingCapture from "./VideoRecordingCapture";

// The feed never branches on template type itself — it just looks up the
// right capture component here. Adding a new template type means adding one
// entry to this map (plus a matching entry in lib/templates/validate.ts).
export const CAPTURE_COMPONENTS: Record<TemplateType, ComponentType<CaptureProps>> = {
  BOUNDING_BOX: BoundingBoxCapture,
  POINT: PointCapture,
  LABELING: LabelingCapture,
  FREEFORM_DRAWING: FreeformDrawingCapture,
  VIDEO_RECORDING: VideoRecordingCapture,
};
