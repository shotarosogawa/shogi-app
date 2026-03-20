import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import { MoveApplier } from "../rules/MoveApplier"
import { evaluateBoard } from "./evaluateBoard"

export type CandidateMoveAnalysis = {
  move: Move
  score: number
}

/**
 * 現局面の候補手を簡易評価して返す
 *
 * +なら先手寄り
 * -なら後手寄り
 */
export const analyzeCandidateMoves = (
  board: Board,
  legalMoves: Move[]
): CandidateMoveAnalysis[] => {
  const applier = new MoveApplier()

  const currentTurn = board.getTurn()

  const candidates = legalMoves.map(move => {
    const nextBoard = applier.apply(board, move)
    const score = evaluateBoard(nextBoard)

    return {
      move,
      score,
    }
  })

  // 先手番なら高い順、後手番なら低い順
  candidates.sort((a, b) => {
    return currentTurn === "black"
      ? b.score - a.score
      : a.score - b.score
  })

  return candidates
}