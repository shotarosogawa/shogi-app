import { Board } from "../board/Board"
import type { Player } from "../board/Piece"
import type { Position } from "../board/Position"
import { MoveGenerator } from "./MoveGenerator"

/**
 * 利き判定クラス
 *
 * 役割:
 * - 指定プレイヤーの玉が王手されているか判定する
 * - 指定座標が相手の利きに入っているかを見る
 */
export class AttackDetector {
  private generator: MoveGenerator

  constructor() {
    this.generator = new MoveGenerator()
  }

  /**
   * 指定プレイヤーの玉が王手されているか判定する
   */
  isKingInCheck(board: Board, owner: Player): boolean {
    const kingPos = this.findKingPosition(board, owner)

    // 玉が見つからない局面は異常なので true 扱い
    if (!kingPos) {
      return true
    }

    const opponent = this.getOpponent(owner)

    const opponentBoard = board.clone()
    opponentBoard.setTurn(opponent)

    const opponentMoves = this.generator.generatePseudoLegalMoves(opponentBoard)

    return opponentMoves.some(move =>
      move.to.x === kingPos.x && move.to.y === kingPos.y
    )
  }

  /**
   * 指定プレイヤーの玉位置を探す
   */
  findKingPosition(board: Board, owner: Player): Position | null {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const piece = board.getPiece({ x, y })

        if (!piece) continue

        if (piece.owner === owner && piece.type === "OU") {
          return { x, y }
        }
      }
    }

    return null
  }

  private getOpponent(player: Player): Player {
    return player === "black" ? "white" : "black"
  }
}