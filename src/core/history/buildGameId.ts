import crypto from "crypto"

/**
 * KIF本文から安定した gameId を作る
 */
export const buildGameId = (kifText: string): string => {
  return crypto
    .createHash("sha1")
    .update(kifText, "utf-8")
    .digest("hex")
}