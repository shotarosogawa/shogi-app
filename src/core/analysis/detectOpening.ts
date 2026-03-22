import type { Board } from "../board/Board"
import type { Player } from "../board/Piece"

export type RookStyle =
  | "unknown"
  | "ibisha"
  | "ichikenbisha"
  | "sodebisha"
  | "migishikenbisha"
  | "nakabisha"
  | "shikenbisha"
  | "sankenbisha"
  | "mukaibisha"
  | "kyukenbisha"

export type OpeningCategory =
  | "unknown"
  | "aibisha"
  | "taikou"
  | "aifuri"
  | "kakugawari"

export type OpeningInfo = {
  blackRookStyle: RookStyle
  whiteRookStyle: RookStyle
  blackMainStyle: "ibisha" | "furibisha" | "unknown"
  whiteMainStyle: "ibisha" | "furibisha" | "unknown"
  openingCategory: OpeningCategory
  confidence: number
  reasons: string[]
}

type RookPosition = {
  found: boolean
  x: number | null
  y: number | null
  file: number | null
}

const BLACK_ROOK_STYLE_BY_FILE: Record<number, RookStyle> = {
  1: "ichikenbisha",
  2: "ibisha",
  3: "sodebisha",
  4: "migishikenbisha",
  5: "nakabisha",
  6: "shikenbisha",
  7: "sankenbisha",
  8: "mukaibisha",
  9: "kyukenbisha",
}

const WHITE_ROOK_STYLE_BY_FILE: Record<number, RookStyle> = {
  1: "kyukenbisha",
  2: "mukaibisha",
  3: "sankenbisha",
  4: "shikenbisha",
  5: "nakabisha",
  6: "migishikenbisha",
  7: "sodebisha",
  8: "ibisha",
  9: "ichikenbisha",
}

const getMainStyleFromRookStyle = (
  rookStyle: RookStyle
): "ibisha" | "furibisha" | "unknown" => {
  if (rookStyle === "unknown") {
    return "unknown"
  }

  if (rookStyle === "ibisha") {
    return "ibisha"
  }

  return "furibisha"
}

const findRookPosition = (board: Board, owner: Player): RookPosition => {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })

      if (piece && piece.owner === owner && piece.type === "HI") {
        // 内部座標 x を表示筋に変換
        const file = 9 - x

        return {
          found: true,
          x,
          y,
          file,
        }
      }
    }
  }

  return {
    found: false,
    x: null,
    y: null,
    file: null,
  }
}

const detectPlayerRookStyle = (
  board: Board,
  owner: Player
): {
  rookStyle: RookStyle
  mainStyle: "ibisha" | "furibisha" | "unknown"
  reasons: string[]
} => {
  const rook = findRookPosition(board, owner)
  const reasons: string[] = []

  if (!rook.found || rook.file === null) {
    reasons.push(`${owner === "black" ? "先手" : "後手"}の飛車位置を特定できない`)
    return {
      rookStyle: "unknown",
      mainStyle: "unknown",
      reasons,
    }
  }

  const rookStyle =
    owner === "black"
      ? (BLACK_ROOK_STYLE_BY_FILE[rook.file] ?? "unknown")
      : (WHITE_ROOK_STYLE_BY_FILE[rook.file] ?? "unknown")

  const mainStyle = getMainStyleFromRookStyle(rookStyle)

  reasons.push(
    `${owner === "black" ? "先手" : "後手"}飛車が${rook.file}筋にいるため ${rookStyle} と判定`
  )

  if (mainStyle === "ibisha") {
    reasons.push(`${owner === "black" ? "先手" : "後手"}は居飛車系`)
  } else if (mainStyle === "furibisha") {
    reasons.push(`${owner === "black" ? "先手" : "後手"}は振り飛車系`)
  } else {
    reasons.push(`${owner === "black" ? "先手" : "後手"}の大分類は不明`)
  }

  return {
    rookStyle,
    mainStyle,
    reasons,
  }
}

const hasBishopInHand = (board: Board): boolean => {
  return board.getHand("black").includes("KA") || board.getHand("white").includes("KA")
}

export const detectOpening = (board: Board): OpeningInfo => {
  const black = detectPlayerRookStyle(board, "black")
  const white = detectPlayerRookStyle(board, "white")
  const reasons = [...black.reasons, ...white.reasons]

  const bishopInHand = hasBishopInHand(board)

  if (bishopInHand) {
    reasons.push("持ち駒に角があり、角交換済みの可能性がある")
  }

  // 相居飛車系
  if (black.mainStyle === "ibisha" && white.mainStyle === "ibisha") {
    if (bishopInHand) {
      reasons.push("両者居飛車系かつ角交換の可能性があるため角換わり寄り")

      return {
        blackRookStyle: black.rookStyle,
        whiteRookStyle: white.rookStyle,
        blackMainStyle: black.mainStyle,
        whiteMainStyle: white.mainStyle,
        openingCategory: "kakugawari",
        confidence: 0.78,
        reasons,
      }
    }

    reasons.push("両者が居飛車系のため相居飛車")

    return {
      blackRookStyle: black.rookStyle,
      whiteRookStyle: white.rookStyle,
      blackMainStyle: black.mainStyle,
      whiteMainStyle: white.mainStyle,
      openingCategory: "aibisha",
      confidence: 0.68,
      reasons,
    }
  }

  // 対抗形
  if (
    (black.mainStyle === "ibisha" && white.mainStyle === "furibisha") ||
    (black.mainStyle === "furibisha" && white.mainStyle === "ibisha")
  ) {
    reasons.push("片方が居飛車、片方が振り飛車のため対抗形")

    return {
      blackRookStyle: black.rookStyle,
      whiteRookStyle: white.rookStyle,
      blackMainStyle: black.mainStyle,
      whiteMainStyle: white.mainStyle,
      openingCategory: "taikou",
      confidence: 0.85,
      reasons,
    }
  }

  // 相振り飛車
  if (black.mainStyle === "furibisha" && white.mainStyle === "furibisha") {
    reasons.push("両者が振り飛車系のため相振り飛車")

    return {
      blackRookStyle: black.rookStyle,
      whiteRookStyle: white.rookStyle,
      blackMainStyle: black.mainStyle,
      whiteMainStyle: white.mainStyle,
      openingCategory: "aifuri",
      confidence: 0.8,
      reasons,
    }
  }

  reasons.push("大分類を確定できなかった")

  return {
    blackRookStyle: black.rookStyle,
    whiteRookStyle: white.rookStyle,
    blackMainStyle: black.mainStyle,
    whiteMainStyle: white.mainStyle,
    openingCategory: "unknown",
    confidence: 0.35,
    reasons,
  }
}