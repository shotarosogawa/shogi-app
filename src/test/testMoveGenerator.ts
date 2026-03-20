import { Board } from "../core/board/Board"
import { MoveGenerator } from "../core/rules/MoveGenerator"
import type { PieceType } from "../core/board/Piece"

// -----------------------------
// ヘルパー
// -----------------------------
const createEmptyBoard = () => new Board()

const put = (
  board: Board,
  x: number,
  y: number,
  owner: "black" | "white",
  type: PieceType
) => {
  board.setPiece({ x, y }, { owner, type })
}

const assert = (label: string, condition: boolean) => {
  if (condition) {
    console.log(`✅ PASS: ${label}`)
  } else {
    console.error(`❌ FAIL: ${label}`)
    throw new Error(label)
  }
}

// -----------------------------
// テスト1: 王手中に関係ない手は指せない
// -----------------------------
const testIllegalMovesUnderCheck = () => {
  const board = createEmptyBoard()
  const generator = new MoveGenerator()

  // 黒玉
  put(board, 4, 8, "black", "OU")

  // 白玉（適当）
  put(board, 0, 0, "white", "OU")

  // 白飛車で王手
  put(board, 4, 0, "white", "HI")

  // 黒の適当な駒（関係ない位置）
  put(board, 0, 8, "black", "FU")

  const moves = generator.generateLegalMoves(board)

  // 歩を動かす手が含まれていないこと
  const hasIrrelevantMove = moves.some(
    m => m.from?.x === 0 && m.from?.y === 8
  )

  assert("王手中に関係ない手は指せない", !hasIrrelevantMove)
}

// -----------------------------
// テスト2: 玉が逃げられるなら合法手が残る
// -----------------------------
const testKingCanEscape = () => {
  const board = createEmptyBoard()
  const generator = new MoveGenerator()

  // 黒玉
  put(board, 4, 8, "black", "OU")

  // 白玉
  put(board, 0, 0, "white", "OU")

  // 白飛車で王手
  put(board, 4, 0, "white", "HI")

  const moves = generator.generateLegalMoves(board)

  assert("王手中でも逃げられるなら合法手がある", moves.length > 0)
}

// -----------------------------
// テスト3: 明らかな詰みで合法手ゼロ
// -----------------------------
const testCheckmate = () => {
  const board = createEmptyBoard()
  const generator = new MoveGenerator()

  // 黒玉
  put(board, 4, 8, "black", "OU")

  // 白玉
  put(board, 0, 0, "white", "OU")

  // 王手＋逃げ道なしの配置
  put(board, 4, 7, "white", "HI") // 上
  put(board, 3, 7, "white", "KI") // 左上
  put(board, 5, 7, "white", "KI") // 右上

  const moves = generator.generateLegalMoves(board)

  assert("詰み局面で合法手がゼロ", moves.length === 0)
}

// -----------------------------
// テスト4: 玉が危険マスに逃げる手は除外される
// -----------------------------
const testKingCannotMoveIntoCheck = () => {
  const board = createEmptyBoard()
  const generator = new MoveGenerator()

  // 黒玉
  put(board, 4, 8, "black", "OU")

  // 白玉
  put(board, 0, 0, "white", "OU")

  // 白角で斜め利き
  put(board, 2, 6, "white", "KA")

  const moves = generator.generateLegalMoves(board)

  // 玉が角の利きに入るマス（例: 3,7）へ行く手が含まれていないか
  const illegalEscape = moves.some(
    m => m.to.x === 3 && m.to.y === 7
  )

  assert("玉が危険マスに逃げる手は除外される", !illegalEscape)
}

// -----------------------------
// 実行
// -----------------------------
const run = () => {
  console.log("=== MoveGenerator テスト開始 ===")

  testIllegalMovesUnderCheck()
  testKingCanEscape()
  testCheckmate()
  testKingCannotMoveIntoCheck()

  console.log("=== MoveGenerator テスト完了 ===")
}

run()