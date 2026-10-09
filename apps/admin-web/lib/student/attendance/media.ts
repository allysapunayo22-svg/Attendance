export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_MAX_DIMENSION = 1280;

interface MediaDevicesLike {
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
}

export class BrowserCameraError extends Error {
  readonly code: "unsupported" | "permission_denied" | "unavailable";

  constructor(code: "unsupported" | "permission_denied" | "unavailable", message: string) {
    super(message);
    this.code = code;
    this.name = "BrowserCameraError";
  }
}

export async function requestVideoStream(
  facingMode: "user" | "environment",
  mediaDevices: MediaDevicesLike | undefined = typeof navigator === "undefined" ? undefined : navigator.mediaDevices
) {
  if (!mediaDevices?.getUserMedia) throw new BrowserCameraError("unsupported", "Camera capture is not supported by this browser.");
  try {
    return await mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1280 }
      }
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : (error as { name?: unknown })?.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new BrowserCameraError("permission_denied", "Camera permission is required. Allow camera access and try again.");
    }
    throw new BrowserCameraError("unavailable", "The camera is unavailable or is being used by another application.");
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function validateEvidenceBlob(blob: Blob) {
  if (blob.type !== "image/jpeg") throw new Error("Attendance evidence must be a JPEG image.");
  if (blob.size <= 0) throw new Error("The captured photo is empty. Retake the photo.");
  if (blob.size > MAX_EVIDENCE_BYTES) throw new Error("The captured photo exceeds the 5 MB evidence limit. Retake the photo.");
  return blob;
}

export async function hashEvidenceBlob(blob: Blob, subtle: Pick<SubtleCrypto, "digest"> = crypto.subtle) {
  const digest = await subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.78) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Unable to prepare the captured photo."));
      else {
        try {
          resolve(validateEvidenceBlob(blob));
        } catch (error) {
          reject(error);
        }
      }
    }, "image/jpeg", quality);
  });
}

export async function videoFrameToEvidence(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) throw new Error("The camera preview is not ready yet.");
  const scale = Math.min(1, EVIDENCE_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the captured photo.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}

export async function imageFileToEvidence(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Select an image captured by the device camera.");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, EVIDENCE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the captured photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToJpeg(canvas);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
