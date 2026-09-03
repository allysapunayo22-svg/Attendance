import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";

export async function compressAttendancePhoto(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true
    }
  );

  const base64 = result.base64 || "";
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
  return { uri: result.uri, hash };
}
