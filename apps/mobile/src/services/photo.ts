import { File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";

export async function compressAttendancePhoto(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  const source = new File(result.uri);
  const destination = new File(Paths.document, `attendance-${Date.now()}.jpg`);
  source.copy(destination);
  const base64 = await destination.base64();
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
  return { uri: destination.uri, hash };
}
