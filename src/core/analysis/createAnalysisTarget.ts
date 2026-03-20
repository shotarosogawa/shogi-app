import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { AnalysisLineType, AnalysisTarget } from "./AnalysisTarget"

type CreateAnalysisTargetParams = {
  lineType: AnalysisLineType
  moveIndex: number
  boardHistory: Board[]
  moveHistory: Move[]
}

/**
 * 履歴から解析対象を組み立てる
 */
export const createAnalysisTarget = ({
  lineType,
  moveIndex,
  boardHistory,
  moveHistory,
}: CreateAnalysisTargetParams): AnalysisTarget => {
  const currentBoard = boardHistory[moveIndex]
  const move = moveIndex > 0 ? moveHistory[moveIndex - 1] ?? null : null
  const beforeBoard = moveIndex > 0 ? boardHistory[moveIndex - 1] ?? null : null

  if (!currentBoard) {
    throw new Error(`AnalysisTargetの作成に失敗しました: moveIndex=${moveIndex}`)
  }

  return {
    lineType,
    moveIndex,
    move,
    beforeBoard,
    currentBoard,
  }
}