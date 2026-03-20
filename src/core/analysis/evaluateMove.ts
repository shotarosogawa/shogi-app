import { evaluateBoard } from "./evaluateBoard"
import type { MoveAnalysisContext } from "./MoveAnalysisContext"

/**
 * 手の評価（前後差分）
 */
export const evaluateMove = (ctx: MoveAnalysisContext | null): number => {
  if (!ctx) return 0

  const before = evaluateBoard(ctx.beforeBoard)
  const after = evaluateBoard(ctx.afterBoard)

  return after - before
}