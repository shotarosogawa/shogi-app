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
}

/**
 * 同一局面を検索して、
 * 次に指された手のランキングを返す
 */
export const findSimilarPositions = (
  positionKey: string,
  records: PositionRecord[],
  limit = 5
): SimilarPositionResult => {
  const matched = records.filter(record => record.positionKey === positionKey)

  if (matched.length === 0) {
    return {
      matchedCount: 0,
      popularMoves: [],
    }
  }

  const grouped = new Map<string, PositionRecord[]>()

  for (const record of matched) {
    const list = grouped.get(record.nextMoveText) ?? []
    list.push(record)
    grouped.set(record.nextMoveText, list)
  }

  const popularMoves: PopularMoveStat[] = Array.from(grouped.entries())
    .map(([moveText, moveRecords]) => {
      const decisive = moveRecords.filter(
        record => record.winner === "black" || record.winner === "white"
      )

      // この局面で指した側が勝った率
      const movePlayerWins = decisive.filter(
        record => record.sideToMove === record.winner
      ).length

      return {
        moveText,
        count: moveRecords.length,
        movePlayerWinRate:
          decisive.length > 0 ? movePlayerWins / decisive.length : 0,
      }
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.movePlayerWinRate - a.movePlayerWinRate
    })
    .slice(0, limit)

  return {
    matchedCount: matched.length,
    popularMoves,
  }
}