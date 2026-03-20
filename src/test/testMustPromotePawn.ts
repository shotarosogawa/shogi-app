// src/test/testMustPromotePawn.ts

import { Board } from "../core/board/Board"
import { MoveGenerator } from "../core/rules/MoveGenerator"

const board = new Board()
const generator = new MoveGenerator()

board.setTurn("black")

// 先手歩を 1,1 に置く
// ここから 1,0 に進むと最終段なので強制成り
board.setPiece({ x: 1, y: 1 }, {
  type: "FU",
  owner: "black"
})

// 玉がないと後でValidator系を使う時に困るので一応置いてもいいが、
// 今回は擬似合法手だけを見るので不要
const moves = generator.generatePseudoLegalMoves(board)

console.log(moves)