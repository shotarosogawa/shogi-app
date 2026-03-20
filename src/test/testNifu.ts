// src/test/testNifuOnly.ts

import { BoardFactory } from "../core/board/BoardFactory"
import { MoveGenerator } from "../core/rules/MoveGenerator"
import { RuleValidator } from "../core/rules/RuleValidator"

const board = BoardFactory.createInitialBoard()
const generator = new MoveGenerator()
const validator = new RuleValidator()

// 先手に歩を1枚持たせる
board.addHand("black", "FU")

// 歩打ちだけ抽出
const moves = generator.generatePseudoLegalMoves(board)
const pawnDrops = moves.filter(m => m.drop && m.piece === "FU")

// 二歩だけ確認（isNifuを直接使う）
const nifuMoves = pawnDrops.filter(m =>
  // @ts-ignore（private回避）
  validator.isNifu(board, m, "black")
)

console.log("歩打ち総数:", pawnDrops.length)
console.log("二歩:", nifuMoves.length)
console.log("例:", nifuMoves.slice(0, 10))