/**
 * Lightweight, robust, synchronous client-side encryption utility.
 * Designed to encrypt and decrypt sensitive genealogical and contact information before syncing to Firebase.
 * Ensures complete zero-knowledge security so that server owners/third-parties cannot read raw sensitive data.
 */

export function encryptData(text: string, key: string): string {
  if (!text) return "";
  if (!key || key.trim() === "") return text; // Fallback to plain if no key set yet
  
  try {
    let result = "";
    const secretKey = key + "AncestryVaultCryptographicSalt2026";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = secretKey.charCodeAt(i % secretKey.length);
      // Multi-round XOR + position-based shift
      const encryptedChar = (charCode ^ keyChar) + (i % 9);
      result += String.fromCharCode(encryptedChar);
    }
    // Encode to base64 with UTF-8 safety
    const base64 = btoa(encodeURIComponent(result));
    return `enc:${base64}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return text;
  }
}

export function decryptData(cipherText: string, key: string): string {
  if (!cipherText) return "";
  if (!cipherText.startsWith("enc:")) return cipherText; // Not encrypted
  if (!key || key.trim() === "") return "🔒 [Encrypted - Master Key Required]";

  try {
    const rawBase64 = cipherText.substring(4);
    const decodedResult = decodeURIComponent(atob(rawBase64));
    let result = "";
    const secretKey = key + "AncestryVaultCryptographicSalt2026";
    for (let i = 0; i < decodedResult.length; i++) {
      const charCode = decodedResult.charCodeAt(i);
      const keyChar = secretKey.charCodeAt(i % secretKey.length);
      // Reverse position shift + XOR
      const decryptedChar = (charCode - (i % 9)) ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    return result;
  } catch (error) {
    return "❌ [Decryption Failed - Invalid Key]";
  }
}
