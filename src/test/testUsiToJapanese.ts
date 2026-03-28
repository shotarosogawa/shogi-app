import { BoardFactory } from "../core/board/BoardFactory"
import { usiToJapanese } from "../core/utils/usiToJapanese"

const board = BoardFactory.createInitialBoard()

console.log(usiToJapanese("7g7f", board))