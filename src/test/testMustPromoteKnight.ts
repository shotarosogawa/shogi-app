// src/test/testMustPromoteKnight.ts

import { Board } from "../core/board/Board"
import { MoveGenerator } from "../core/rules/MoveGenerator"

const board = new Board()
const generator = new MoveGenerator()

board.setTurn("black")

// 先手桂を 4,2 に置く
// 行き先は 3,0 / 5,0 なので最終段 → 強制成り
board.setPiece({ x: 4, y: 2 }, {
  type: "KE",
  owner: "black"
})

const moves = generator.generatePseudoLegalMoves(board)

console.log(moves)