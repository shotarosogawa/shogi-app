// src/core/history/parseKif.ts

import type { Move } from "../board/Move"
import type { Player } from "../board/Piece"
import type { GameRecordInput } from "./buildPositionRecords"

type ParsedKifMetadata = {
  openingName?: string
  eventName?: string
  blackPlayerName?: string
  whitePlayerName?: string
  startDate?: string
}

const FILE_MAP: Record<string, number> = {
  "１": 1,
  "２": 2,
  "３": 3,
  "４": 4,
  "５": 5,
  "６": 6,
  "７": 7,
  "８": 8,
  "９": 9,
}

const RANK_MAP: Record<string, number> = {
  "一": 1,
  "二": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
}

const PIECE_MAP = {
  "歩": "FU",
  "香": "KY",
  "桂": "KE",
  "銀": "GI",
  "金": "KI",
  "角": "KA",
  "飛": "HI",
  "玉": "OU",
  "王": "OU",
  "と": "TO",
  "成香": "NY",
  "成桂": "NK",
  "成銀": "NG",
  "馬": "UM",
  "龍": "RY",
  "竜": "RY",
} as const

type PieceLabel = keyof typeof PIECE_MAP

const pieceLabels = Object.keys(PIECE_MAP).sort((a, b) => b.length - a.length) as PieceLabel[]

const toBoardX = (file: number): number => 9 - file
const toBoardY = (rank: number): number => rank - 1

const parsePieceLabel = (text: string): Move["piece"] | null => {
  for (const label of pieceLabels) {
    if (text.startsWith(label)) {
      return PIECE_MAP[label]
    }
  }
  return null
}

const parseSourceSquare = (src: string): { x: number; y: number } | null => {
  if (!/^\d\d$/.test(src)) return null

  const file = Number(src[0])
  const rank = Number(src[1])

  if (file < 1 || file > 9 || rank < 1 || rank > 9) {
    return null
  }

  return {
    x: toBoardX(file),
    y: toBoardY(rank),
  }
}

const parseMoveText = (
  moveText: string,
  previousTo: { x: number; y: number } | null
): Move | null => {
  const normalized = moveText.replace(/\s+/g, "")

  // 例:
  // ７六歩(77)
  // 同歩(86)
  // ８八角成(22)
  // ５五角打
  // 同銀成(31)

  const moveMatch = normalized.match(/^(.+?)(?:\((\d\d)\))?$/)
  if (!moveMatch) return null

  const main = moveMatch[1]
  const sourceText = moveMatch[2] ?? null

  let rest = main
  let to: { x: number; y: number } | null = null

  if (rest.startsWith("同")) {
    if (!previousTo) return null
    to = previousTo
    rest = rest.slice(1)
  } else {
    const fileChar = rest[0]
    const rankChar = rest[1]

    const file = FILE_MAP[fileChar]
    const rank = RANK_MAP[rankChar]

    if (!file || !rank) return null

    to = {
      x: toBoardX(file),
      y: toBoardY(rank),
    }

    rest = rest.slice(2)
  }

  let drop = false
  let promote = false

  if (rest.endsWith("打")) {
    drop = true
    rest = rest.slice(0, -1)
  }

  if (rest.endsWith("成")) {
    promote = true
    rest = rest.slice(0, -1)
  }

  // 「不成」は今回は無視して通常扱い
  if (rest.endsWith("不成")) {
    rest = rest.slice(0, -2)
  }

  const piece = parsePieceLabel(rest)
  if (!piece) return null

  return {
    from: drop ? null : parseSourceSquare(sourceText ?? ""),
    to,
    piece,
    promote,
    drop,
  }
}

const parseMetadataLine = (
  line: string,
  metadata: ParsedKifMetadata
): void => {
  const trimmed = line.trim()

  if (trimmed.startsWith("先手：")) {
    metadata.blackPlayerName = trimmed.replace("先手：", "").trim()
    return
  }

  if (trimmed.startsWith("後手：")) {
    metadata.whitePlayerName = trimmed.replace("後手：", "").trim()
    return
  }

  if (trimmed.startsWith("手合割：")) {
    return
  }

  if (trimmed.startsWith("戦型：")) {
    metadata.openingName = trimmed.replace("戦型：", "").trim()
    return
  }

  if (trimmed.startsWith("開始日時：")) {
    metadata.startDate = trimmed.replace("開始日時：", "").trim()
    return
  }

  if (trimmed.startsWith("棋戦：")) {
    metadata.eventName = trimmed.replace("棋戦：", "").trim()
  }
}

const detectWinnerFromResultLine = (
  line: string,
  moveCount: number
): Player | "draw" | "unknown" => {
  const trimmed = line.trim()

  if (trimmed.includes("投了")) {
    // KIFは「その手番の人が投了した結果、その相手が勝ち」
    // moveCount はすでに push 済みの指し手数
    return moveCount % 2 === 1 ? "black" : "white"
  }

  if (trimmed.includes("持将棋")) return "draw"
  if (trimmed.includes("千日手")) return "draw"

  return "unknown"
}

/**
 * KIF文字列を内部形式へ変換
 */
export const parseKif = (
  kifText: string,
  gameId?: string
): GameRecordInput => {
  const lines = kifText.split(/\r?\n/)
  const moves: Move[] = []
  const metadata: ParsedKifMetadata = {}

  let previousTo: { x: number; y: number } | null = null
  let winner: Player | "draw" | "unknown" = "unknown"

  for (const line of lines) {
    parseMetadataLine(line, metadata)

    const trimmed = line.trim()
    if (!trimmed) continue

    // 指し手行
    // 例: 12 ８五歩(84) (00:00/00:00:00)
    const moveLineMatch = trimmed.match(/^\d+\s+(.+?)(?:\s+\(.+\))?$/)
    if (moveLineMatch) {
      const moveText = moveLineMatch[1].trim()

      // 終局行っぽいものはここでは弾く
      if (
        moveText.includes("投了") ||
        moveText.includes("千日手") ||
        moveText.includes("持将棋")
      ) {
        winner = detectWinnerFromResultLine(moveText, moves.length)
        continue
      }

      const move = parseMoveText(moveText, previousTo)
      if (!move) continue

      moves.push(move)
      previousTo = move.to
    }
  }

  return {
    gameId: gameId ?? `kif-${Date.now()}`,
    winner,
    moves,
    metadata,
  }
}