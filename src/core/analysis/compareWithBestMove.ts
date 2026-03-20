import type { MoveAnalysisContext } from "./MoveAnalysisContext"
import type { CandidateMoveAnalysis } from "./analyzeCandidateMoves"
import { evaluateMove } from "./evaluateMove"

export type MoveComparison = {
  currentScore: number
  bestScore: number
  scoreDiff: number
  isBestMove: boolean
}

/**
 * 現在の手と最善手を比較する
 */
export const compareWithBestMove = (
  ctx: MoveAnalysisContext | null,
  candidates: CandidateMoveAnalysis[]
): MoveComparison | null => {
  if (!ctx || candidates.length === 0) return null

  const currentScore = evaluateMove(ctx)

  const best = candidates[0]
  const bestScore = best.score

  const scoreDiff = currentScore - bestScore

  // 同じ手かどうか（雑判定）
  const isBestMove =
    ctx.move.to.x === best.move.to.x &&
    ctx.move.to.y === best.move.to.y &&
    ctx.move.piece === best.move.piece

  return {
    currentScore,
    bestScore,
    scoreDiff,
    isBestMove,
  }
}