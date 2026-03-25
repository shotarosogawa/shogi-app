import type { GameRecordInput } from "./buildPositionRecords"

export type GameDocument = {
  gameId: string
  winner: GameRecordInput["winner"]
  moveCount: number
  openingNameFromKif?: string
  eventName?: string
  blackPlayerName?: string
  whitePlayerName?: string
  startDate?: string
  source: string
  importedAt: string
}

export const buildGameDocument = (
  game: GameRecordInput,
  source: string
): GameDocument => {
  return {
    gameId: game.gameId,
    winner: game.winner,
    moveCount: game.moves.length,
    openingNameFromKif: game.metadata?.openingName,
    eventName: game.metadata?.eventName,
    blackPlayerName: game.metadata?.blackPlayerName,
    whitePlayerName: game.metadata?.whitePlayerName,
    startDate: game.metadata?.startDate,
    source,
    importedAt: new Date().toISOString(),
  }
}