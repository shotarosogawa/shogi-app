import type { Board } from "../board/Board"
import type { PieceType } from "../board/Piece"

const fileMap = ["１", "２", "３", "４", "５", "６", "７", "８", "９"]
const rankMap = ["一", "二", "三", "四", "五", "六", "七", "八", "九"]

const pieceNameMap: Record<PieceType, string> = {
  FU: "歩",
  KY: "香",
  KE: "桂",
  GI: "銀",
  KI: "金",
  KA: "角",
  HI: "飛",
  OU: "玉",
  TO: "と",
  NY: "成香",
  NK: "成桂",
  NG: "成銀",
  UM: "馬",
  RY: "龍",
}

// USI打ち駒文字 → PieceType
const usiDropPieceMap: Record<string, PieceType> = {
  P: "FU",
  L: "KY",
  N: "KE",
  S: "GI",
  G: "KI",
  B: "KA",
  R: "HI",
}

// USI座標 → 内部座標
const parseSquare = (file: string, rank: string) => {
  const x = 9 - Number(file)
  const y = rank.charCodeAt(0) - "a".charCodeAt(0)
  return { x, y }
}

export const usiToJapanese = (
  usi: string,
  board: Board
): string => {
  // 打ち
  if (usi.includes("*")) {
    const [pieceCode, to] = usi.split("*")

    const file = to[0]
    const rank = to[1]

    const { x, y } = parseSquare(file, rank)

    const fileStr = fileMap[8 - x]
    const rankStr = rankMap[y]

    const pieceType = usiDropPieceMap[pieceCode]
    if (!pieceType) {
      return usi
    }

    return `${fileStr}${rankStr}${pieceNameMap[pieceType]}打`
  }

  const from = usi.slice(0, 2)
  const to = usi.slice(2, 4)
  const promote = usi.length === 5 && usi[4] === "+"

  const fromSq = parseSquare(from[0], from[1])
  const toSq = parseSquare(to[0], to[1])

  const piece = board.getPiece(fromSq)

  if (!piece) {
    return usi // fallback
  }

  const fileStr = fileMap[8 - toSq.x]
  const rankStr = rankMap[toSq.y]

  let pieceName = pieceNameMap[piece.type]

  if (promote) {
    pieceName += "成"
  }

  return `${fileStr}${rankStr}${pieceName}`
}