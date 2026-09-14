import type { FeedItem } from "./types";

export interface CaptureProps {
  item: FeedItem;
  onSubmit: (answer: unknown) => void;
}
