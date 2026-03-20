import type { Board } from "../board/Board"
import type { PieceType } from "../board/Piece"

const PIECE_VALUE: Record<PieceType, number> = {
  FU: 1,
  KY: 3,
  KE: 3,
  GI: 5,
  KI: 6,
  KA: 8,
  HI: 10,
  OU: 0,
  TO: 6,
  NY: 6,
  NK: 6,
  NG: 6,
  UM: 10,
  RY: 12,
}

/**
 * 簡易評価値
 *
 * +なら先手有利
 * -なら後手有利
 */
export const evaluateBoard = (board: Board): number => {
  let score = 0

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })
      if (!piece) continue

      const value = PIECE_VALUE[piece.type]

      score += piece.owner === "black" ? value : -value
    }
  }

  // 持ち駒も加点
  const addHand = (owner: "black" | "white") => {
    const hand = board.getHand(owner)

    hand.forEach(p => {
      const value = PIECE_VALUE[p]
      score += owner === "black" ? value : -value
    })
  }

  addHand("black")
  addHand("white")

  return score
}