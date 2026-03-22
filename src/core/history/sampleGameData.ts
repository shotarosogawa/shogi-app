// src/core/history/sampleGameData.ts

import type { GameRecordInput } from "./buildPositionRecords"
import type { Move } from "../board/Move"

/**
 * 超簡易テスト用棋譜
 * とりあえず数手だけでOK
 */
const moves: Move[] = [
  // ７六歩
  {
    from: { x: 6, y: 6 },
    to: { x: 6, y: 5 },
    piece: "FU",
    promote: false,
    drop: false,
  },

  // ３四歩
  {
    from: { x: 2, y: 2 },
    to: { x: 2, y: 3 },
    piece: "FU",
    promote: false,
    drop: false,
  },

  // ２六歩
  {
    from: { x: 7, y: 6 },
    to: { x: 7, y: 5 },
    piece: "FU",
    promote: false,
    drop: false,
  },

  // ８四歩
  {
    from: { x: 1, y: 2 },
    to: { x: 1, y: 3 },
    piece: "FU",
    promote: false,
    drop: false,
  },
]

export const sampleGameData: GameRecordInput = {
  gameId: "sample-1",
  winner: "black",
  moves,
}