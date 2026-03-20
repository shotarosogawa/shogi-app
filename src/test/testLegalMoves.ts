import { BoardFactory } from "../core/board/BoardFactory"
import { MoveGenerator } from "../core/rules/MoveGenerator"

const board = BoardFactory.createInitialBoard()
const generator = new MoveGenerator()

const pseudoMoves = generator.generatePseudoLegalMoves(board)
const legalMoves = generator.generateLegalMoves(board)

console.log("擬似合法手数:", pseudoMoves.length)
console.log("合法手数:", legalMoves.length)
console.log("合法手一覧:", legalMoves)