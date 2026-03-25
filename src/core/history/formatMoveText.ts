import type { Move } from "../board/Move"
import type { PieceType } from "../board/Piece"

const PIECE_MAP: Record<PieceType, string> = {
  FU: "歩",
  KY: "香",
  KE: "桂",
  GI: "銀",
  KI: "金",
  KA: "角",
  HI: "飛",
  OU: "玉",
  TO: "と",
  NY: "成香",
  NK: "成桂",
  NG: "成銀",
  UM: "馬",
  RY: "龍",
}

/**
 * 半角数字を全角数字に変換
 */
const toFileText = (num: number): string => {
  return "０１２３４５６７８９"[num]
}

/**
 * 漢数字に変換
 * @param num 
 * @returns 
 */
const toRankText = (num: number): string => {
  return ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][num]
}

/**
 * 座標を将棋表記に変換する
 * 例: x=6, y=5 -> "７六"
 */
const toSquareText = (x: number, y: number): string => {
  const file = 9 - x
  const rank = y + 1
  return `${toFileText(file)}${toRankText(rank)}`
}

/**
 * 2つの指し手が同じ移動先かどうか
 */
const isSameDestination = (currentMove: Move, previousMove?: Move): boolean => {
  if (!previousMove) return false

  return (
    currentMove.to.x === previousMove.to.x &&
    currentMove.to.y === previousMove.to.y
  )
}

/**
 * 指し手を人間向けの棋譜表記に変換する
 *
 * 例:
 * - ７六歩
 * - 同歩
 * - ８八角成
 * - 同銀不成
 * - ５五角打
 */
export const formatMoveText = (
  move: Move,
  previousMove?: Move
): string => {
  const squareText = isSameDestination(move, previousMove)
    ? "同"
    : toSquareText(move.to.x, move.to.y)

  const pieceText = PIECE_MAP[move.piece]

  // 打つ手
  if (move.drop) {
    return `${squareText}${pieceText}打`
  }

  // 成り
  if (move.promote) {
    return `${squareText}${pieceText}成`
  }

  return `${squareText}${pieceText}`
}