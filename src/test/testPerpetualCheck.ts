import { isPerpetualCheckSennichite } from "../core/rules/perpetualCheck"

// 簡易アサート
const assertEqual = (label: string, actual: boolean, expected: boolean) => {
  if (actual === expected) {
    console.log(`✅ PASS: ${label}`)
    return
  }

  console.error(`❌ FAIL: ${label}`)
  console.error(`   expected: ${expected}`)
  console.error(`   actual  : ${actual}`)
  throw new Error(`Test failed: ${label}`)
}

// -----------------------------
// テスト1: 通常千日手（連続王手ではない）
// -----------------------------
const testNormalSennichite = () => {
  // index 0 は開始局面
  // A, B, A, B, A, B, A のような繰り返し
  const boardKeys = [
    "START",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]

  // 王手履歴なし
  const moveChecks = [
    false, // START -> A
    false, // A -> B
    false, // B -> A
    false, // A -> B
    false, // B -> A
    false, // A -> B
    false, // B -> A
  ]

  const result = isPerpetualCheckSennichite(boardKeys, moveChecks, 7)
  assertEqual("通常千日手は連続王手千日手ではない", result, false)
}

// -----------------------------
// テスト2: 連続王手千日手
// -----------------------------
const testPerpetualCheckSennichite = () => {
  const boardKeys = [
    "START",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]

  // A に至る直前の手が全部王手
  // matchedIndexes = [1, 3, 5, 7]
  // moveChecks[0], [2], [4], [6] が全部 true なら連続王手千日手
  const moveChecks = [
    true,  // START -> A
    false, // A -> B
    true,  // B -> A
    false, // A -> B
    true,  // B -> A
    false, // A -> B
    true,  // B -> A
  ]

  const result = isPerpetualCheckSennichite(boardKeys, moveChecks, 7)
  assertEqual("連続王手千日手を検出できる", result, true)
}

// -----------------------------
// テスト3: 4回未満は成立しない
// -----------------------------
const testNotEnoughRepetitions = () => {
  const boardKeys = [
    "START",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]

  const moveChecks = [
    true,
    false,
    true,
    false,
    true,
  ]

  const result = isPerpetualCheckSennichite(boardKeys, moveChecks, 5)
  assertEqual("同一局面が4回未満なら成立しない", result, false)
}

// -----------------------------
// テスト4: 一部だけ王手なら成立しない
// -----------------------------
const testInterruptedCheckSequence = () => {
  const boardKeys = [
    "START",
    "A",
    "B",
    "A",
    "B",
    "A",
    "B",
    "A",
  ]

  const moveChecks = [
    true,  // START -> A
    false, // A -> B
    true,  // B -> A
    false, // A -> B
    false, // B -> A ← ここで途切れる
    false, // A -> B
    true,  // B -> A
  ]

  const result = isPerpetualCheckSennichite(boardKeys, moveChecks, 7)
  assertEqual("一部だけ王手なら連続王手千日手ではない", result, false)
}

// -----------------------------
// 実行
// -----------------------------
const run = () => {
  console.log("=== 連続王手千日手 テスト開始 ===")

  testNormalSennichite()
  testPerpetualCheckSennichite()
  testNotEnoughRepetitions()
  testInterruptedCheckSequence()

  console.log("=== 連続王手千日手 テスト完了 ===")
}

run()