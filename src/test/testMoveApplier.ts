import { Board } from "../core/board/Board"
import { MoveApplier } from "../core/rules/MoveApplier"

const board = new Board()
const applier = new MoveApplier()

board.setPiece({ x: 4, y: 8 }, { type: "OU", owner: "black" })
board.setPiece({ x: 4, y: 0 }, { type: "OU", owner: "white" })
board.setPiece({ x: 4, y: 6 }, { type: "FU", owner: "black" })

console.log("移動前:", board.getPiece({ x: 4, y: 6 }))

const next = applier.apply(board, {
  from: { x: 4, y: 6 },
  to: { x: 4, y: 5 },
  piece: "FU",
})

console.log("移動後元マス:", next.getPiece({ x: 4, y: 6 }))
console.log("移動後先マス:", next.getPiece({ x: 4, y: 5 }))
console.log("手番:", next.getTurn())