// src/core/history/findSimilarPositionsFromDb.ts

import type { Db } from "mongodb"
import type { SimilarPositionResult } from "./findSimilarPositions"

type PositionAggregateRow = {
  moveText: string
  count: number
  decisiveCount: number
  winCount: number
}

/**
 * MongoDB上の positions コレクションから
 * 同一局面の次の手ランキングを集計する
 */
export const findSimilarPositionsFromDb = async (
  db: Db,
  positionKey: string,
  limit: number = 5
): Promise<SimilarPositionResult> => {
  const positions = db.collection("positions")

  const matchedCount = await positions.countDocuments({ positionKey })

  if (matchedCount === 0) {
    return {
      matchedCount: 0,
      popularMoves: [],
      topMoveShare: 0,
    }
  }

  const rows = await positions
    .aggregate<PositionAggregateRow>([
      {
        $match: { positionKey },
      },
      {
        $group: {
          _id: "$nextMoveText",
          count: { $sum: 1 },

          decisiveCount: {
            $sum: {
              $cond: [
                { $in: ["$winner", ["black", "white"]] },
                1,
                0,
              ],
            },
          },

          winCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$winner", ["black", "white"]] },
                    { $eq: ["$winner", "$sideToMove"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          moveText: "$_id",
          count: 1,
          decisiveCount: 1,
          winCount: 1,
        },
      },
      {
        $sort: {
          count: -1,
          winCount: -1,
          moveText: 1,
        },
      },
      {
        $limit: limit,
      },
    ])
    .toArray()

  const popularMoves = rows.map(row => ({
    moveText: row.moveText,
    count: row.count,
    movePlayerWinRate:
      row.decisiveCount > 0 ? row.winCount / row.decisiveCount : 0,
  }))

  const topCount = popularMoves[0]?.count ?? 0
  const topMoveShare = matchedCount > 0 ? topCount / matchedCount : 0

  return {
    matchedCount,
    popularMoves,
    topMoveShare,
  }
}