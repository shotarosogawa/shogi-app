// src/test/testBoardToSfen.ts

import { BoardFactory } from "../core/board/BoardFactory"
import { boardToSfen } from "../core/utils/boardToSfen"

const board = BoardFactory.createInitialBoard()

console.log(boardToSfen(board))