import { AttackDetector } from "../rules/AttackDetector"
import type { PieceType } from "../board/Piece"
import type { AnalysisTarget } from "./AnalysisTarget"
import type { MoveAnalysisContext } from "./MoveAnalysisContext"

/**
 * AnalysisTarget から、1手の説明用コンテキストを作る
 *
 * 初期局面（move = null）は対象外
 */
export const createMoveAnalysisContext = (
  target: AnalysisTarget
): MoveAnalysisContext | null => {
  const { lineType, moveIndex, move, beforeBoard, currentBoard } = target

  // 初期局面は「1手」ではないので null
  if (!move || !beforeBoard) {
    return null
  }

  const attackDetector = new AttackDetector()

  // この手を指した側
  const player = moveIndex % 2 === 1 ? "black" : "white"

  // 取った駒
  let capturedPieceType: PieceType | null = null

  if (!move.drop) {
    const captured = beforeBoard.getPiece(move.to)
    capturedPieceType = captured?.type ?? null
  }

  // 指した後の局面では手番が相手に渡っているので、
  // 「現在手番の側が王手されているか」を見れば、
  // 今指した手が王手だったか分かる
  const givesCheck = attackDetector.isKingInCheck(
    currentBoard,
    currentBoard.getTurn()
  )

  return {
    lineType,
    moveIndex,
    move,
    player,
    beforeBoard,
    afterBoard: currentBoard,
    isDrop: !!move.drop,
    isPromote: !!move.promote,
    capturedPieceType,
    givesCheck,
  }
}