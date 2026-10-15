// What the models section accepts. .pth is the expected format, but any of
// the common ML formats and archives are allowed. Never executable types.
export const ALLOWED_MODEL_EXTENSIONS = [
  "pth", "pt", "ckpt", "safetensors", "bin", "onnx", "gguf",
  "h5", "hdf5", "keras", "pb", "tflite", "mlmodel",
  "pkl", "pickle", "joblib", "npz", "npy",
  "zip", "tar", "gz", "tgz",
] as const;

// These are (or are commonly) Python pickles, which can run arbitrary code
// when loaded. We never load uploaded files, but downloaders should know.
export const PICKLE_FORMATS = new Set(["pth", "pt", "ckpt", "pkl", "pickle", "joblib", "bin"]);

export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

export function isAllowedModelFile(fileName: string): boolean {
  return (ALLOWED_MODEL_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[u]}`;
}
