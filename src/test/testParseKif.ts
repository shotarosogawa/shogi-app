// src/test/testParseKif.ts

import { parseKif } from "../core/history/parseKif"
import { buildPositionRecords } from "../core/history/buildPositionRecords"

/**
 * テスト用KIF
 *
 * 最小構成で以下を確認する:
 * - 通常手
 * - 同
 * - 成
 * - 投了
 * - 戦型メタ情報
 */
const sampleKif = `
開始日時：2026/03/25
棋戦：テスト棋戦
戦型：相掛かり
先手：先手太郎
後手：後手次郎
手合割：平手

手数----指手---------消費時間--
1 ７六歩(77)   (00:00/00:00:00)
2 ３四歩(33)   (00:00/00:00:00)
3 ２二角成(88) (00:00/00:00:00)
4 同　銀(31)   (00:00/00:00:00)
5 ８八銀(79)   (00:00/00:00:00)
6 投了         (00:00/00:00:00)
`

const main = () => {
  const game = parseKif(sampleKif, "test-kif-001")

  console.log("=== parsed game ===")
  console.log(JSON.stringify(game, null, 2))

  const records = buildPositionRecords(game)

  console.log("=== position records ===")
  console.log(JSON.stringify(records, null, 2))

  console.log("=== summary ===")
  console.log("gameId:", game.gameId)
  console.log("winner:", game.winner)
  console.log("moveCount:", game.moves.length)
  console.log("recordCount:", records.length)
  console.log("openingNameFromKif:", game.metadata?.openingName)
}

main()