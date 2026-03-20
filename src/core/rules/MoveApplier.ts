import { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { Piece, PieceType, Player } from "../board/Piece"

/**
 * 成り変換テーブル
 */
const PROMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  FU: "TO",
  KY: "NY",
  KE: "NK",
  GI: "NG",
  KA: "UM",
  HI: "RY",
}

/**
 * 成り駒 → 元の駒
 */
const DEMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  TO: "FU",
  NY: "KY",
  NK: "KE",
  NG: "GI",
  UM: "KA",
  RY: "HI",
}

/**
 * 指し手適用クラス
 *
 * MoveGenerator → 手生成
 * RuleValidator → 合法判定
 * MoveApplier → 盤面更新
 */
export class MoveApplier {

  /**
   * 新しい盤面を作って適用
   */
  apply(board: Board, move: Move): Board {

    const next = board.clone()

    this.applyInPlace(next, move)

    return next
  }

  /**
   * 盤面を直接更新
   */
  applyInPlace(board: Board, move: Move): void {

    const currentPlayer = board.getTurn()

    if (move.drop) {
      this.applyDrop(board, move, currentPlayer)
    } else {
      this.applyMove(board, move, currentPlayer)
    }

    board.setTurn(this.getOpponent(currentPlayer))
  }

  /**
   * 駒移動処理
   */
  private applyMove(board: Board, move: Move, currentPlayer: Player): void {

    if (!move.from) {
      throw new Error("from が必要")
    }

    const movingPiece = board.getPiece(move.from)

    if (!movingPiece) {
      throw new Error("移動元に駒なし")
    }

    const targetPiece = board.getPiece(move.to)

    /**
     * 駒取り処理
     */
    if (targetPiece && targetPiece.owner !== currentPlayer) {

      const captured = this.demotePieceType(targetPiece.type)

      board.addHand(currentPlayer, captured)
    }

    /**
     * 元マスを空にする
     */
    board.setPiece(move.from, null)

    /**
     * 成り処理
     */
    const finalType =
      move.promote
        ? this.promotePieceType(movingPiece.type)
        : movingPiece.type

    const placedPiece: Piece = {
      type: finalType,
      owner: currentPlayer
    }

    board.setPiece(move.to, placedPiece)
  }

  /**
   * 駒打ち
   */
  private applyDrop(board: Board, move: Move, currentPlayer: Player): void {

    const hand = board.getHand(currentPlayer)

    const index = hand.findIndex(p => p === move.piece)

    if (index === -1) {
      throw new Error("持ち駒にない")
    }

    hand.splice(index, 1)

    const placedPiece: Piece = {
      type: move.piece,
      owner: currentPlayer
    }

    board.setPiece(move.to, placedPiece)
  }

  private promotePieceType(type: PieceType): PieceType {
    return PROMOTE_MAP[type] ?? type
  }

  private demotePieceType(type: PieceType): PieceType {
    return DEMOTE_MAP[type] ?? type
  }

  private getOpponent(player: Player): Player {
    return player === "black" ? "white" : "black"
  }
}