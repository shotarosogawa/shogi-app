// src/test/testInvalidDropOnly.ts

import { Board } from "../core/board/Board"
import { MoveGenerator } from "../core/rules/MoveGenerator"
import { RuleValidator } from "../core/rules/RuleValidator"

const board = new Board()
const generator = new MoveGenerator()
const validator = new RuleValidator()

board.setTurn("black")

// 駒を持たせる
board.addHand("black", "FU")
board.addHand("black", "KY")
board.addHand("black", "KE")

const moves = generator.generatePseudoLegalMoves(board)
const dropMoves = moves.filter(m => m.drop)

// 行きどころのない打ちだけ抽出
const invalidDrops = dropMoves.filter(m =>
  // @ts-ignore（private回避）
  validator.isInvalidDropPosition(m, "black")
)

console.log("打ち手総数:", dropMoves.length)
console.log("行きどころNG:", invalidDrops.length)
console.log("例:", invalidDrops.slice(0, 10))