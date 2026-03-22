import type { Board } from "../board/Board"
import type { Player, PieceType } from "../board/Piece"
import type { OpeningCategory } from "./detectOpening"

export type CastleType =
  | "unknown"
  | "katamino"
  | "mino"
  | "takamino"
  | "ginkanmuri"
  | "anaguma"
  | "funagakoi"
  | "yagura"

export type CastleInfo = {
  blackCastle: CastleType
  whiteCastle: CastleType
  blackConfidence: number
  whiteConfidence: number
  reasons: string[]
}

type PieceCondition = {
  x: number
  y: number
  owner: Player
  type: PieceType
  weight: number
  label: string
}

type EmptyCondition = {
  x: number
  y: number
  weight: number
  label: string
}

type KeepInitialCondition = {
  x: number
  y: number
  owner: Player
  type: PieceType
  weight: number
  label: string
}

type CastlePattern = {
  name: CastleType
  player: Player
  requiredPieces: PieceCondition[]
  requiredEmpties?: EmptyCondition[]
  keepInitial?: KeepInitialCondition[]
  openingBias?: OpeningCategory[]
}

type CandidateResult = {
  castle: CastleType
  score: number
  confidence: number
  reasons: string[]
}

const getPiece = (board: Board, x: number, y: number) => {
  return board.getPiece({ x, y })
}

const hasPiece = (
  board: Board,
  x: number,
  y: number,
  owner: Player,
  type: PieceType
): boolean => {
  const piece = getPiece(board, x, y)
  return !!piece && piece.owner === owner && piece.type === type
}

const isEmpty = (board: Board, x: number, y: number): boolean => {
  return getPiece(board, x, y) === null
}

const scorePattern = (
  board: Board,
  pattern: CastlePattern,
  openingCategory?: OpeningCategory
): CandidateResult => {
  let score = 0
  let maxScore = 0
  const reasons: string[] = []

  for (const cond of pattern.requiredPieces) {
    maxScore += cond.weight

    if (hasPiece(board, cond.x, cond.y, cond.owner, cond.type)) {
      score += cond.weight
      reasons.push(`${cond.label} が一致`)
    } else {
      reasons.push(`${cond.label} が不一致`)
    }
  }

  for (const cond of pattern.requiredEmpties ?? []) {
    maxScore += cond.weight

    if (isEmpty(board, cond.x, cond.y)) {
      score += cond.weight
      reasons.push(`${cond.label} が空で一致`)
    } else {
      reasons.push(`${cond.label} が埋まっていて不一致`)
    }
  }

  for (const cond of pattern.keepInitial ?? []) {
    maxScore += cond.weight

    if (hasPiece(board, cond.x, cond.y, cond.owner, cond.type)) {
      score += cond.weight
      reasons.push(`${cond.label} が初期位置維持`)
    } else {
      reasons.push(`${cond.label} が初期位置から変化`)
    }
  }

  if (
    openingCategory &&
    pattern.openingBias &&
    pattern.openingBias.includes(openingCategory)
  ) {
    score += 0.6
    maxScore += 0.6
    reasons.push(`戦型 ${openingCategory} と相性が良い`)
  }

  const confidence = maxScore > 0 ? score / maxScore : 0

  return {
    castle: pattern.name,
    score,
    confidence,
    reasons,
  }
}

const pickBestCastle = (
  board: Board,
  patterns: CastlePattern[],
  openingCategory?: OpeningCategory
): CandidateResult => {
  const results = patterns.map(pattern => scorePattern(board, pattern, openingCategory))
  results.sort((a, b) => b.score - a.score)

  const best = results[0]

  if (!best || best.confidence < 0.55) {
    return {
      castle: "unknown",
      score: 0,
      confidence: best?.confidence ?? 0,
      reasons: best?.reasons ?? ["囲いを特定できない"],
    }
  }

  return best
}

/**
 * 先手の囲いパターン
 *
 * 既存:
 * - 片美濃
 * - 本美濃
 * - 舟囲い
 * - 矢倉
 *
 * 追加:
 * - 高美濃
 * - 銀冠
 * - 穴熊
 *
 * 座標メモ:
 * 9九=(0,8), 8八=(1,7), 7八=(2,7), 6七=(3,6), 5八=(4,7),
 * 4九=(5,8), 4七=(5,6), 3八=(6,7), 3七=(6,6), 2八=(7,7),
 * 2七=(7,6), 1九=(8,8), 9八=(0,7)
 */
const BLACK_PATTERNS: CastlePattern[] = [
  // -------------------------
  // 発展形を先に置く
  // -------------------------

  // 銀冠:
  // 高美濃から 3八銀→2七, 4九金→3八
  // コア:
  // 2八玉, 2七銀, 3八金, 4七金
  {
    name: "ginkanmuri",
    player: "black",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 7, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 2八" },
      { x: 7, y: 6, owner: "black", type: "GI", weight: 2.6, label: "先手銀 2七" },
      { x: 6, y: 7, owner: "black", type: "KI", weight: 2.2, label: "先手金 3八" },
      { x: 5, y: 6, owner: "black", type: "KI", weight: 2.2, label: "先手金 4七" },
      { x: 5, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 4六" },
      { x: 7, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 2六" },
      { x: 8, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 1六" },
    ],
    requiredEmpties: [
      { x: 5, y: 8, weight: 0.8, label: "先手 4九 が空（銀冠で金が移動済み）" },
      { x: 6, y: 7, weight: 0.4, label: "先手 3八 の銀がいない" },
    ],
    keepInitial: [
      { x: 8, y: 8, owner: "black", type: "KY", weight: 0.3, label: "先手香 1九" },
      { x: 7, y: 8, owner: "black", type: "KE", weight: 0.3, label: "先手桂 2九" },
    ],
  },

  // 高美濃:
  // 本美濃から 5八金→4七
  // コア:
  // 2八玉, 3八銀, 4九金, 4七金
  {
    name: "takamino",
    player: "black",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 7, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 2八" },
      { x: 6, y: 7, owner: "black", type: "GI", weight: 2.4, label: "先手銀 3八" },
      { x: 5, y: 8, owner: "black", type: "KI", weight: 2.0, label: "先手金 4九" },
      { x: 5, y: 6, owner: "black", type: "KI", weight: 2.4, label: "先手金 4七" },
      { x: 5, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 4六" },
      { x: 8, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 1六" },
    ],
    requiredEmpties: [
      { x: 4, y: 7, weight: 1.0, label: "先手 5八 が空（高美濃で金が上がった）" },
    ],
    keepInitial: [
      { x: 8, y: 8, owner: "black", type: "KY", weight: 0.3, label: "先手香 1九" },
      { x: 7, y: 8, owner: "black", type: "KE", weight: 0.3, label: "先手桂 2九" },
    ],
  },

  // 穴熊:
  // 9八に香を上がり、9九に玉を潜り、8八に銀で蓋
  {
    name: "anaguma",
    player: "black",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 0, y: 8, owner: "black", type: "OU", weight: 3.2, label: "先手玉 9九" },
      { x: 0, y: 7, owner: "black", type: "KY", weight: 2.6, label: "先手香 9八" },
      { x: 1, y: 7, owner: "black", type: "GI", weight: 2.4, label: "先手銀 8八" },
    ],
  },

  // -------------------------
  // 既存
  // -------------------------

  {
    name: "mino",
    player: "black",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 7, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 2八" },
      { x: 6, y: 7, owner: "black", type: "GI", weight: 2.4, label: "先手銀 3八" },
      { x: 5, y: 8, owner: "black", type: "KI", weight: 1.8, label: "先手金 4九" },
      { x: 4, y: 7, owner: "black", type: "KI", weight: 2.2, label: "先手金 5八" },
      { x: 5, y: 6, owner: "black", type: "FU", weight: 1.0, label: "先手歩 4七" },
      { x: 8, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 1六" },
    ],
    keepInitial: [
      { x: 8, y: 8, owner: "black", type: "KY", weight: 0.4, label: "先手香 1九" },
      { x: 7, y: 8, owner: "black", type: "KE", weight: 0.4, label: "先手桂 2九" },
      { x: 7, y: 7, owner: "black", type: "OU", weight: 0.2, label: "右辺の玉移動先" },
    ],
  },
  {
    name: "katamino",
    player: "black",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 7, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 2八" },
      { x: 6, y: 7, owner: "black", type: "GI", weight: 2.4, label: "先手銀 3八" },
      { x: 5, y: 8, owner: "black", type: "KI", weight: 2.0, label: "先手金 4九" },
      { x: 5, y: 6, owner: "black", type: "FU", weight: 1.0, label: "先手歩 4七" },
      { x: 8, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 1六" },
    ],
    requiredEmpties: [
      { x: 4, y: 7, weight: 1.2, label: "先手 5八 が空（本美濃未完成）" },
    ],
    keepInitial: [
      { x: 8, y: 8, owner: "black", type: "KY", weight: 0.4, label: "先手香 1九" },
      { x: 7, y: 8, owner: "black", type: "KE", weight: 0.4, label: "先手桂 2九" },
    ],
  },
  {
    name: "funagakoi",
    player: "black",
    openingBias: ["taikou"],
    requiredPieces: [
      { x: 2, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 7八" },
      { x: 4, y: 7, owner: "black", type: "KI", weight: 2.2, label: "先手金 5八" },
      { x: 5, y: 7, owner: "black", type: "GI", weight: 2.0, label: "先手銀 4八" },
      { x: 4, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 5六" },
      { x: 2, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 7六" },
      { x: 0, y: 5, owner: "black", type: "FU", weight: 0.8, label: "先手歩 9六" },
    ],
    keepInitial: [
      { x: 1, y: 7, owner: "black", type: "KA", weight: 0.5, label: "先手角 8八" },
      { x: 0, y: 8, owner: "black", type: "KY", weight: 0.3, label: "先手香 9九" },
      { x: 1, y: 8, owner: "black", type: "KE", weight: 0.3, label: "先手桂 8九" },
    ],
  },
  {
    name: "yagura",
    player: "black",
    openingBias: ["aibisha", "kakugawari"],
    requiredPieces: [
      { x: 1, y: 7, owner: "black", type: "OU", weight: 3.0, label: "先手玉 8八" },
      { x: 2, y: 6, owner: "black", type: "GI", weight: 2.4, label: "先手銀 7七" },
      { x: 2, y: 7, owner: "black", type: "KI", weight: 2.0, label: "先手金 7八" },
      { x: 3, y: 6, owner: "black", type: "KI", weight: 2.0, label: "先手金 6七" },
      { x: 3, y: 7, owner: "black", type: "KA", weight: 1.8, label: "先手角 6八" },
      { x: 4, y: 5, owner: "black", type: "FU", weight: 0.8, label: "先手歩 5六" },
      { x: 3, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 6六" },
      { x: 2, y: 5, owner: "black", type: "FU", weight: 1.0, label: "先手歩 7六" },
    ],
    keepInitial: [
      { x: 0, y: 8, owner: "black", type: "KY", weight: 0.3, label: "先手香 9九" },
      { x: 1, y: 8, owner: "black", type: "KE", weight: 0.3, label: "先手桂 8九" },
    ],
  },
]

/**
 * 後手の囲いパターン
 *
 * 先手定義を180度回転させた形で追加
 */
const WHITE_PATTERNS: CastlePattern[] = [
  // -------------------------
  // 発展形
  // -------------------------

  // 銀冠
  {
    name: "ginkanmuri",
    player: "white",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 1, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 8二" },
      { x: 1, y: 2, owner: "white", type: "GI", weight: 2.6, label: "後手銀 8三" },
      { x: 2, y: 1, owner: "white", type: "KI", weight: 2.2, label: "後手金 7二" },
      { x: 3, y: 2, owner: "white", type: "KI", weight: 2.2, label: "後手金 6三" },
      { x: 3, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 6四" },
      { x: 1, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 8四" },
      { x: 0, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 9四" },
    ],
    requiredEmpties: [
      { x: 3, y: 0, weight: 0.8, label: "後手 6一 が空（銀冠で金が移動済み）" },
      { x: 2, y: 1, weight: 0.4, label: "後手 7二 の銀がいない" },
    ],
    keepInitial: [
      { x: 0, y: 0, owner: "white", type: "KY", weight: 0.3, label: "後手香 9一" },
      { x: 1, y: 0, owner: "white", type: "KE", weight: 0.3, label: "後手桂 8一" },
    ],
  },

  // 高美濃
  {
    name: "takamino",
    player: "white",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 1, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 8二" },
      { x: 2, y: 1, owner: "white", type: "GI", weight: 2.4, label: "後手銀 7二" },
      { x: 3, y: 0, owner: "white", type: "KI", weight: 2.0, label: "後手金 6一" },
      { x: 3, y: 2, owner: "white", type: "KI", weight: 2.4, label: "後手金 6三" },
      { x: 3, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 6四" },
      { x: 0, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 9四" },
    ],
    requiredEmpties: [
      { x: 4, y: 1, weight: 1.0, label: "後手 5二 が空（高美濃で金が上がった）" },
    ],
    keepInitial: [
      { x: 0, y: 0, owner: "white", type: "KY", weight: 0.3, label: "後手香 9一" },
      { x: 1, y: 0, owner: "white", type: "KE", weight: 0.3, label: "後手桂 8一" },
    ],
  },

  // 穴熊
  {
    name: "anaguma",
    player: "white",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 8, y: 0, owner: "white", type: "OU", weight: 3.2, label: "後手玉 1一" },
      { x: 8, y: 1, owner: "white", type: "KY", weight: 2.6, label: "後手香 1二" },
      { x: 7, y: 1, owner: "white", type: "GI", weight: 2.4, label: "後手銀 2二" },
    ],
  },

  // -------------------------
  // 既存
  // -------------------------

  {
    name: "mino",
    player: "white",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 1, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 8二" },
      { x: 2, y: 1, owner: "white", type: "GI", weight: 2.4, label: "後手銀 7二" },
      { x: 3, y: 0, owner: "white", type: "KI", weight: 1.8, label: "後手金 6一" },
      { x: 4, y: 1, owner: "white", type: "KI", weight: 2.2, label: "後手金 5二" },
      { x: 3, y: 2, owner: "white", type: "FU", weight: 1.0, label: "後手歩 6三" },
      { x: 0, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 9四" },
    ],
    keepInitial: [
      { x: 0, y: 0, owner: "white", type: "KY", weight: 0.4, label: "後手香 9一" },
      { x: 1, y: 0, owner: "white", type: "KE", weight: 0.4, label: "後手桂 8一" },
    ],
  },
  {
    name: "katamino",
    player: "white",
    openingBias: ["taikou", "aifuri"],
    requiredPieces: [
      { x: 1, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 8二" },
      { x: 2, y: 1, owner: "white", type: "GI", weight: 2.4, label: "後手銀 7二" },
      { x: 3, y: 0, owner: "white", type: "KI", weight: 2.0, label: "後手金 6一" },
      { x: 3, y: 2, owner: "white", type: "FU", weight: 1.0, label: "後手歩 6三" },
      { x: 0, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 9四" },
    ],
    requiredEmpties: [
      { x: 4, y: 1, weight: 1.2, label: "後手 5二 が空（本美濃未完成）" },
    ],
    keepInitial: [
      { x: 0, y: 0, owner: "white", type: "KY", weight: 0.4, label: "後手香 9一" },
      { x: 1, y: 0, owner: "white", type: "KE", weight: 0.4, label: "後手桂 8一" },
    ],
  },
  {
    name: "funagakoi",
    player: "white",
    openingBias: ["taikou"],
    requiredPieces: [
      { x: 6, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 3二" },
      { x: 4, y: 1, owner: "white", type: "KI", weight: 2.2, label: "後手金 5二" },
      { x: 3, y: 1, owner: "white", type: "GI", weight: 2.0, label: "後手銀 6二" },
      { x: 4, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 5四" },
      { x: 6, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 3四" },
      { x: 8, y: 3, owner: "white", type: "FU", weight: 0.8, label: "後手歩 1四" },
    ],
    keepInitial: [
      { x: 7, y: 1, owner: "white", type: "KA", weight: 0.5, label: "後手角 2二" },
      { x: 8, y: 0, owner: "white", type: "KY", weight: 0.3, label: "後手香 1一" },
      { x: 7, y: 0, owner: "white", type: "KE", weight: 0.3, label: "後手桂 2一" },
    ],
  },
  {
    name: "yagura",
    player: "white",
    openingBias: ["aibisha", "kakugawari"],
    requiredPieces: [
      { x: 7, y: 1, owner: "white", type: "OU", weight: 3.0, label: "後手玉 2二" },
      { x: 6, y: 2, owner: "white", type: "GI", weight: 2.4, label: "後手銀 3三" },
      { x: 6, y: 1, owner: "white", type: "KI", weight: 2.0, label: "後手金 3二" },
      { x: 5, y: 2, owner: "white", type: "KI", weight: 2.0, label: "後手金 4三" },
      { x: 5, y: 1, owner: "white", type: "KA", weight: 1.8, label: "後手角 4二" },
      { x: 4, y: 3, owner: "white", type: "FU", weight: 0.8, label: "後手歩 5四" },
      { x: 5, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 4四" },
      { x: 6, y: 3, owner: "white", type: "FU", weight: 1.0, label: "後手歩 3四" },
    ],
    keepInitial: [
      { x: 8, y: 0, owner: "white", type: "KY", weight: 0.3, label: "後手香 1一" },
      { x: 7, y: 0, owner: "white", type: "KE", weight: 0.3, label: "後手桂 2一" },
    ],
  },
]

export const detectCastle = (
  board: Board,
  openingCategory?: OpeningCategory
): CastleInfo => {
  const black = pickBestCastle(board, BLACK_PATTERNS, openingCategory)
  const white = pickBestCastle(board, WHITE_PATTERNS, openingCategory)

  return {
    blackCastle: black.castle,
    whiteCastle: white.castle,
    blackConfidence: black.confidence,
    whiteConfidence: white.confidence,
    reasons: [
      `先手囲い候補: ${black.castle} (${black.confidence.toFixed(2)})`,
      ...black.reasons,
      `後手囲い候補: ${white.castle} (${white.confidence.toFixed(2)})`,
      ...white.reasons,
    ],
  }
}