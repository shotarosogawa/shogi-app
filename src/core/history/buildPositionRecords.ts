import { BoardFactory } from "../board/BoardFactory"
import type { Move } from "../board/Move"
import type { Player } from "../board/Piece"
import { MoveApplier } from "../rules/MoveApplier"
import { serializeBoard } from "../utils/boardSerializer"
import type { PositionRecord } from "./PositionRecord"
import { detectOpening } from "../analysis/detectOpening"
import { detectCastle } from "../analysis/detectCastle"
import { formatMoveText } from "./formatMoveText"

export type GameRecordInput = {
  gameId: string
  winner: Player | "draw" | "unknown"
  moves: Move[]

  // 棋譜に明示されていたメタ情報
  metadata?: {
    openingName?: string
    eventName?: string
    blackPlayerName?: string
    whitePlayerName?: string
    startDate?: string
  }
}

/**
 * 棋譜を初期局面から順に進めて、
 * 各局面の PositionRecord を生成する
 */
export const buildPositionRecords = (
  input: GameRecordInput
): PositionRecord[] => {
  const board = BoardFactory.createInitialBoard()
  const applier = new MoveApplier()

  const records: PositionRecord[] = []

  for (let moveIndex = 0; moveIndex < input.moves.length; moveIndex++) {
    const move = input.moves[moveIndex]
    const previousMove = moveIndex > 0 ? input.moves[moveIndex - 1] : undefined

    // この局面で指す側
    const sideToMove = board.getTurn()

    // 指す前の局面情報を保存
    const positionKey = serializeBoard(board)

    const openingInfo = detectOpening(board)
    const castleInfo = detectCastle(board)

    records.push({
      gameId: input.gameId,
      moveIndex,
      positionKey,
      sideToMove,
      nextMoveText: formatMoveText(move, previousMove),
      winner: input.winner,
      openingCategory: openingInfo?.openingCategory ?? "unknown",
      blackCastle: castleInfo?.blackCastle ?? "unknown",
      whiteCastle: castleInfo?.whiteCastle ?? "unknown",
    })

    // 次局面へ進める
    applier.applyInPlace(board, move)
  }

  return records
}