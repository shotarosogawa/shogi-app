// src/core/utils/boardToSfen.ts

import type { Board } from "../board/Board"
import type { PieceType, Player } from "../board/Piece"

/**
 * 駒 → SFEN文字
 */
const pieceToSfen = (type: PieceType, owner: Player): string => {
  const map: Record<PieceType, string> = {
    FU: "p",
    KY: "l",
    KE: "n",
    GI: "s",
    KI: "g",
    KA: "b",
    HI: "r",
    OU: "k",
    TO: "+p",
    NY: "+l",
    NK: "+n",
    NG: "+s",
    UM: "+b",
    RY: "+r",
  }

  const base = map[type]

  // 先手は大文字、後手は小文字
  return owner === "black" ? base.toUpperCase() : base
}

/**
 * 持ち駒 → SFEN
 */
const handToSfen = (pieces: PieceType[]): string => {
  if (pieces.length === 0) return ""

  // SFENの持ち駒順: R B G S N L P
  const order: PieceType[] = ["HI", "KA", "KI", "GI", "KE", "KY", "FU"]

  const countMap: Record<string, number> = {}

  for (const p of pieces) {
    countMap[p] = (countMap[p] || 0) + 1
  }

  let result = ""

  for (const type of order) {
    const count = countMap[type]
    if (!count) continue

    const sfenChar = pieceToSfen(type, "black") // handは大文字
    result += count > 1 ? `${count}${sfenChar}` : sfenChar
  }

  return result
}

/**
 * Board → SFEN
 */
export const boardToSfen = (board: Board): string => {
  let sfen = ""

  // --------------------------
  // 盤面
  // --------------------------
  for (let y = 0; y < 9; y++) {
    let emptyCount = 0

    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })

      if (!piece) {
        emptyCount++
        continue
      }

      if (emptyCount > 0) {
        sfen += emptyCount
        emptyCount = 0
      }

      sfen += pieceToSfen(piece.type, piece.owner)
    }

    if (emptyCount > 0) {
      sfen += emptyCount
    }

    if (y !== 8) {
      sfen += "/"
    }
  }

  // --------------------------
  // 手番
  // --------------------------
  const turn = board.getTurn() === "black" ? "b" : "w"

  // --------------------------
  // 持ち駒
  // --------------------------
  const blackHand = handToSfen(board.getHand("black"))
  const whiteHandRaw = handToSfen(board.getHand("white"))

  // 後手の持ち駒は小文字にする
  const whiteHand = whiteHandRaw.toLowerCase()

  let hand = ""

  if (!blackHand && !whiteHand) {
    hand = "-"
  } else {
    hand = `${blackHand}${whiteHand}`
  }

  // --------------------------
  // 手数（とりあえず1固定）
  // --------------------------
  const moveNumber = 1

  return `${sfen} ${turn} ${hand} ${moveNumber}`
}