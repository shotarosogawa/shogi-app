// src/core/history/PositionRecord.ts

import type { Player } from "../board/Piece"
import type { OpeningCategory } from "../analysis/detectOpening"
import type { CastleType } from "../analysis/detectCastle"

/**
 * 1局面ぶんの履歴レコード
 *
 * 「この局面で次に何が指されたか」を保存する。
 */
export type PositionRecord = {
  /** 棋譜ID */
  gameId: string

  /** 何手目の局面か（初期局面=0） */
  moveIndex: number

  /** 局面キー（serializeBoardの値） */
  positionKey: string

  /** この局面の手番 */
  sideToMove: Player

  /** この局面から実際に指された次の手 */
  nextMoveText: string

  /** 勝者 */
  winner: Player | "draw" | "unknown"

  /** 戦型 */
  openingCategory: OpeningCategory | "unknown"

  /** 先手囲い */
  blackCastle: CastleType

  /** 後手囲い */
  whiteCastle: CastleType
}