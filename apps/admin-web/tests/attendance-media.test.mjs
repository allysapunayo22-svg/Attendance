import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  MAX_EVIDENCE_BYTES,
  hashEvidenceBlob,
  requestVideoStream,
  stopMediaStream,
  validateEvidenceBlob
} from "../lib/student/attendance/media.ts";

test("camera permission success requests the preferred camera", async () => {
  let constraints;
  const stream = { getTracks: () => [] };
  const result = await requestVideoStream("user", {
    async getUserMedia(received) {
      constraints = received;
      return stream;
    }
  });
  assert.equal(result, stream);
  assert.equal(constraints.audio, false);
  assert.equal(constraints.video.facingMode.ideal, "user");
});

test("camera permission failure and unsupported APIs have friendly errors", async () => {
  await assert.rejects(requestVideoStream("user", undefined), (error) => error.code === "unsupported");
  await assert.rejects(requestVideoStream("environment", {
    async getUserMedia() {
      throw new DOMException("denied", "NotAllowedError");
    }
  }), (error) => error.code === "permission_denied");
});

test("closing media stops every camera track", () => {
  let stopped = 0;
  stopMediaStream({ getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] });
  assert.equal(stopped, 2);
});

test("JPEG evidence validates and hashes while invalid or oversized files fail", async () => {
  const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" });
  assert.equal(validateEvidenceBlob(photo), photo);
  assert.match(await hashEvidenceBlob(photo, webcrypto.subtle), /^[0-9a-f]{64}$/);
  assert.throws(() => validateEvidenceBlob(new Blob(["x"], { type: "image/png" })), /JPEG/);
  assert.throws(() => validateEvidenceBlob(new Blob([new Uint8Array(MAX_EVIDENCE_BYTES + 1)], { type: "image/jpeg" })), /5 MB/);
});

test("QR and selfie components expose open, cleanup, capture, retake, and confirmation controls", async () => {
  const scanner = await readFile(new URL("../components/student/attendance/QrScanner.tsx", import.meta.url), "utf8");
  const camera = await readFile(new URL("../components/student/attendance/CameraCapture.tsx", import.meta.url), "utf8");
  assert.match(scanner, /Open QR scanner/);
  assert.match(scanner, /controlsRef\.current\?\.stop/);
  assert.match(scanner, /releaseAllStreams/);
  assert.match(scanner, /facingMode: \{ ideal: "environment" \}/);
  assert.match(camera, /Open front camera/);
  assert.match(camera, /Capture photo/);
  assert.match(camera, /Retake/);
  assert.match(camera, /Use this photo/);
  assert.match(camera, /capture="user"/);
});
