import type { Board } from "../board/Board"

/**
 * 局面を一意に表すキーを生成する
 */
export const serializeBoard = (board: Board): string => {

  // =========================
  // ① 盤面
  // =========================
  const cells: string[] = []

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })

      if (!piece) {
        cells.push("--")
      } else {
        const owner = piece.owner === "black" ? "b" : "w"
        cells.push(`${owner}${piece.type}`)
      }
    }
  }

  // 区切りなしでOK（固定長なので）
  const boardStr = cells.join("")

  // =========================
  // ② 手番
  // =========================
  const turnStr = board.getTurn() === "black" ? "b" : "w"

  // =========================
  // ③ 持ち駒
  // =========================
  const order = ["FU", "KY", "KE", "GI", "KI", "KA", "HI"]

  const countHands = (hand: string[]) => {
    const counts: Record<string, number> = {}

    for (const p of hand) {
      counts[p] = (counts[p] ?? 0) + 1
    }

    return order
      .map(type => `${type}${counts[type] ?? 0}`)
      .join(",")
  }

  const blackHands = countHands(board.getHand("black"))
  const whiteHands = countHands(board.getHand("white"))

  // =========================
  // 結合
  // =========================
  return `${boardStr}|${turnStr}|${blackHands}|${whiteHands}`
}