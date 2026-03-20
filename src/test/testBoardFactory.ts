import { BoardFactory } from "../core/board/BoardFactory"
import { Board } from "../core/board/Board"

const board = BoardFactory.createInitialBoard()

console.log("先手玉:", board.getPiece({ x: 4, y: 8 }))
console.log("後手玉:", board.getPiece({ x: 4, y: 0 }))
console.log("先手飛車:", board.getPiece({ x: 7, y: 7 }))
console.log("後手角:", board.getPiece({ x: 7, y: 1 }))
console.log("手番:", board.getTurn())

export function createEmptyBoard(): Board {

  const board = new Board()

  // 全マス null にする
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      board.setPiece({ x, y }, null)
    }
  }

  return board
}