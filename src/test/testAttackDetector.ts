import { Board } from "../core/board/Board"
import { AttackDetector } from "../core/rules/AttackDetector"
import type { PieceType } from "../core/board/Piece"

// テスト用：空盤面を作る
const createEmptyBoard = () => new Board()

// テスト用：指定位置に駒を置く
const put = (
  board: Board,
  x: number,
  y: number,
  owner: "black" | "white",
  type: PieceType
) => {
  board.setPiece({ x, y }, { owner, type })
}

// 簡易アサート関数
const assertEqual = (label: string, actual: boolean, expected: boolean) => {
  if (actual === expected) {
    console.log(`✅ PASS: ${label}`)
    return
  }

  console.error(`❌ FAIL: ${label}`)
  console.error(`   expected: ${expected}`)
  console.error(`   actual  : ${actual}`)

  // 失敗時は例外を投げて止める
  throw new Error(`Test failed: ${label}`)
}

// -----------------------------
// テスト1: 飛車の縦利きで王手になる
// -----------------------------
const testRookCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  // 玉を両方置く
  put(board, 4, 8, "black", "OU")
  put(board, 0, 0, "white", "OU")

  // 後手飛車
  put(board, 4, 0, "white", "HI")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("飛車の縦利きで王手になる", result, true)
}

// -----------------------------
// テスト2: 飛車の間に駒があると王手にならない
// -----------------------------
const testRookBlocked = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 8, "black", "OU")
  put(board, 0, 0, "white", "OU")
  put(board, 4, 0, "white", "HI")

  // 間に駒を置く
  put(board, 4, 4, "black", "FU")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("飛車の間に駒があると王手にならない", result, false)
}

// -----------------------------
// テスト3: 角の斜め利きで王手になる
// -----------------------------
const testBishopCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 8, 8, "black", "OU")
  put(board, 1, 0, "white", "OU")
  put(board, 0, 0, "white", "KA")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("角の斜め利きで王手になる", result, true)
}

// -----------------------------
// テスト4: 桂馬の利きで王手になる
// -----------------------------
const testKnightCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 4, "black", "OU")
  put(board, 0, 0, "white", "OU")
  put(board, 3, 2, "white", "KE")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("桂馬の利きで王手になる", result, true)
}

// -----------------------------
// テスト5: 歩の利きで王手になる
// -----------------------------
const testPawnCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 4, "black", "OU")
  put(board, 0, 0, "white", "OU")
  put(board, 4, 3, "white", "FU")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("歩の利きで王手になる", result, true)
}

// -----------------------------
// テスト6: 香車の縦利きで王手になる
// -----------------------------
const testLanceCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 8, "black", "OU")
  put(board, 0, 0, "white", "OU")
  put(board, 4, 0, "white", "KY")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("香車の縦利きで王手になる", result, true)
}

// -----------------------------
// テスト7: 金の利きで王手になる
// -----------------------------
const testGoldCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 4, "black", "OU")
  put(board, 0, 0, "white", "OU")

  // 後手金：黒玉の1マス上に置く
  put(board, 4, 3, "white", "KI")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("金の利きで王手になる", result, true)
}

// -----------------------------
// テスト8: 銀の利きで王手になる
// -----------------------------
const testSilverCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 4, "black", "OU")
  put(board, 0, 0, "white", "OU")

  // 後手銀：黒玉の左上
  put(board, 3, 3, "white", "GI")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("銀の利きで王手になる", result, true)
}

// -----------------------------
// テスト9: 玉の隣接を攻撃として判定する
// -----------------------------
const testKingAdjacentCheck = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 4, 4, "black", "OU")
  put(board, 4, 3, "white", "OU")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("玉の隣接を攻撃として判定する", result, true)
}

// -----------------------------
// テスト10: 角の間に駒があると王手にならない
// -----------------------------
const testBishopBlocked = () => {
  const board = createEmptyBoard()
  const detector = new AttackDetector()

  put(board, 8, 8, "black", "OU")
  put(board, 1, 0, "white", "OU")
  put(board, 0, 0, "white", "KA")

  // 間に駒
  put(board, 4, 4, "black", "FU")

  const result = detector.isKingInCheck(board, "black")
  assertEqual("角の間に駒があると王手にならない", result, false)
}

// -----------------------------
// テスト実行
// -----------------------------
const run = () => {
  console.log("=== AttackDetector テスト開始 ===")

  testRookCheck()
  testRookBlocked()
  testBishopCheck()
  testKnightCheck()
  testPawnCheck()

  testLanceCheck()
  testGoldCheck()
  testSilverCheck()
  testKingAdjacentCheck()
  testBishopBlocked()

  console.log("=== AttackDetector テスト完了 ===")
}

run()