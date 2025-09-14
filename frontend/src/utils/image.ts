/**
 * Converts an array of byte values into a Base64 encoded string.
 * This is a browser-safe implementation.
 * @param buffer The array of numbers, where each number is a byte value.
 * @returns A Base64 encoded string.
 */
export function arrayBufferToBase64(buffer: number[]): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
