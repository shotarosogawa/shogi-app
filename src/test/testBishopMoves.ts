import { MoveGenerator } from "../core/rules/MoveGenerator"
import { createEmptyBoard } from "./testBoardFactory"

const board = createEmptyBoard()

// 盤中央に角を置く
board.setPiece({ x: 4, y: 4 }, {
  type: "KA",
  owner: "black"
})

const generator = new MoveGenerator()

const moves = generator.generatePseudoLegalMoves(board)

console.log("角の手数:", moves.length)
console.log(moves)