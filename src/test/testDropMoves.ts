import { BoardFactory } from "../core/board/BoardFactory"
import { MoveGenerator } from "../core/rules/MoveGenerator"

const board = BoardFactory.createInitialBoard()
const generator = new MoveGenerator()

// 先手に歩を1枚持たせる
board.addHand("black", "FU")

const moves = generator.generatePseudoLegalMoves(board)
const dropMoves = moves.filter(move => move.drop)

console.log("全手数:", moves.length)
console.log("打ち手数:", dropMoves.length)
console.log("最初の10件:", dropMoves.slice(0, 10))