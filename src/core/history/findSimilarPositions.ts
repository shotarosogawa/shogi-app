// src/core/history/findSimilarPositions.ts

import type { PositionRecord } from "./PositionRecord"

/**
 * 次の手ごとの集計結果
 */
export type PopularMoveStat = {
  moveText: string
  count: number
  movePlayerWinRate: number
}

/**
 * 類似局面検索結果
 *
 * まずは「完全一致の positionKey」を類似局面とする。
 */
export type SimilarPositionResult = {
  matchedCount: number
  popularMoves: PopularMoveStat[]
  topMoveShare: number
}

/**
 * 同一局面を検索して、
 * 次に指された手のランキングを返す
 */
export const findSimilarPositions = (
  positionKey: string,
  records: PositionRecord[],
  limit: number = 5
): SimilarPositionResult => {
  const matched = records.filter(r => r.positionKey === positionKey)
  const matchedCount = matched.length

  const moveMap = new Map<
    string,
    {
      count: number
      decisiveCount: number
      win: number
    }
  >()

  matched.forEach(r => {
    const key = r.nextMoveText

    if (!moveMap.has(key)) {
      moveMap.set(key, {
        count: 0,
        decisiveCount: 0,
        win: 0,
      })
    }

    const data = moveMap.get(key)!
    data.count++

    // 勝敗がついた対局のみ勝率計算対象にする
    if (r.winner === "black" || r.winner === "white") {
      data.decisiveCount++

      if (r.winner === r.sideToMove) {
        data.win++
      }
    }
  })

  const popularMoves = Array.from(moveMap.entries())
    .map(([moveText, data]) => ({
      moveText,
      count: data.count,
      movePlayerWinRate:
        data.decisiveCount > 0 ? data.win / data.decisiveCount : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.movePlayerWinRate !== a.movePlayerWinRate) {
        return b.movePlayerWinRate - a.movePlayerWinRate
      }
      return a.moveText.localeCompare(b.moveText, "ja")
    })
    .slice(0, limit)

  const topCount = popularMoves[0]?.count ?? 0
  const topMoveShare = matchedCount > 0 ? topCount / matchedCount : 0

  return {
    matchedCount,
    popularMoves,
    topMoveShare,
  }
}