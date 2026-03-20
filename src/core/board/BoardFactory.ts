import { Board } from "./Board"
import type { Piece } from "./Piece"

// 毎回 board.setPiece({ x, y }, piece) と書くと長いので補助関数を作る
function set(board: Board, x: number, y: number, piece: Piece) {
  board.setPiece({ x, y }, piece)
}

export class BoardFactory {
  static createInitialBoard(): Board {
    const board = new Board()

    // 後手側
    set(board, 0, 0, { type: "KY", owner: "white" })
    set(board, 1, 0, { type: "KE", owner: "white" })
    set(board, 2, 0, { type: "GI", owner: "white" })
    set(board, 3, 0, { type: "KI", owner: "white" })
    set(board, 4, 0, { type: "OU", owner: "white" })
    set(board, 5, 0, { type: "KI", owner: "white" })
    set(board, 6, 0, { type: "GI", owner: "white" })
    set(board, 7, 0, { type: "KE", owner: "white" })
    set(board, 8, 0, { type: "KY", owner: "white" })

    set(board, 1, 1, { type: "HI", owner: "white" })
    set(board, 7, 1, { type: "KA", owner: "white" })

    for (let x = 0; x < 9; x++) {
      set(board, x, 2, { type: "FU", owner: "white" })
    }

    // 先手側
    for (let x = 0; x < 9; x++) {
      set(board, x, 6, { type: "FU", owner: "black" })
    }

    set(board, 1, 7, { type: "KA", owner: "black" })
    set(board, 7, 7, { type: "HI", owner: "black" })

    set(board, 0, 8, { type: "KY", owner: "black" })
    set(board, 1, 8, { type: "KE", owner: "black" })
    set(board, 2, 8, { type: "GI", owner: "black" })
    set(board, 3, 8, { type: "KI", owner: "black" })
    set(board, 4, 8, { type: "OU", owner: "black" })
    set(board, 5, 8, { type: "KI", owner: "black" })
    set(board, 6, 8, { type: "GI", owner: "black" })
    set(board, 7, 8, { type: "KE", owner: "black" })
    set(board, 8, 8, { type: "KY", owner: "black" })

    // 初期局面は先手番
    board.setTurn("black")

    return board
  }
}