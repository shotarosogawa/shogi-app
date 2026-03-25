import fs from "fs"
import path from "path"
import { parseKif } from "./parseKif"
import { buildGameId } from "./buildGameId"
import { buildPositionRecords, type GameRecordInput } from "./buildPositionRecords"
import type { PositionRecord } from "./PositionRecord"

export type ParsedKifFileResult = {
  game: GameRecordInput
  positions: PositionRecord[]
  fileName: string
}

export const parseKifFile = (filePath: string): ParsedKifFileResult => {
  const kifText = fs.readFileSync(filePath, "utf-8")
  const gameId = buildGameId(kifText)

  const game = parseKif(kifText, gameId)
  const positions = buildPositionRecords(game)

  return {
    game,
    positions,
    fileName: path.basename(filePath),
  }
}

export const parseKifDirectory = (dirPath: string): ParsedKifFileResult[] => {
  const files = fs.readdirSync(dirPath)

  const results: ParsedKifFileResult[] = []

  for (const file of files) {
    if (!file.toLowerCase().endsWith(".kif")) continue

    const filePath = path.join(dirPath, file)

    try {
      const result = parseKifFile(filePath)
      results.push(result)
    } catch (error) {
      console.warn(`parse error: ${file}`, error)
    }
  }

  return results
}