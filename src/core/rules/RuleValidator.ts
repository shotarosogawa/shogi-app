import { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { Player } from "../board/Piece"
import type { Position } from "../board/Position"
import { AttackDetector } from "./AttackDetector"
import { MoveApplier } from "./MoveApplier"
import { MoveGenerator } from "./MoveGenerator"

/**
 * ルール検証クラス
 *
 * 役割:
 * - 指し手が合法か判定する
 * - 王手放置を防ぐ
 * - 二歩を防ぐ
 * - 行きどころのない打ちを防ぐ
 * - 打ち歩詰めを防ぐ
 */
export class RuleValidator {
  private detector: AttackDetector
  private applier: MoveApplier
  private generator: MoveGenerator

  constructor() {
    this.detector = new AttackDetector()
    this.applier = new MoveApplier()
    this.generator = new MoveGenerator()
  }

  /**
   * 通常の合法手判定
   *
   * 外から使う入口。
   * 打ち歩詰めまで含めて判定する。
   */
  isLegalMove(board: Board, move: Move): boolean {
    const currentPlayer = board.getTurn()

    // まずは通常の違法手を落とす
    if (!this.isLegalMoveWithoutUchifuzume(board, move, currentPlayer)) {
      return false
    }

    // 最後に打ち歩詰めを確認
    if (this.isUchifuzume(board, move, currentPlayer)) {
      return false
    }

    return true
  }

  /**
   * 打ち歩詰めを除いた合法手判定
   *
   * isUchifuzume 内で相手の応手を調べる時に使う。
   * ここで isLegalMove を呼ぶと再帰しやすいので分ける。
   */
  private isLegalMoveWithoutUchifuzume(
    board: Board,
    move: Move,
    currentPlayer: Player
  ): boolean {
    // 二歩
    if (this.isNifu(board, move, currentPlayer)) {
      return false
    }

    // 行きどころのない打ち
    if (this.isInvalidDropPosition(move, currentPlayer)) {
      return false
    }

    // 手を適用した次局面を作る
    const nextBoard = this.applier.apply(board, move)

    // 次局面で自玉が取られるなら違法
    return !this.detector.isKingInCheck(nextBoard, currentPlayer)
  }

  /**
   * 打ち歩詰めか判定する
   *
   * 条件:
   * - 歩打ちである
   * - その結果、相手玉が王手される
   * - 相手に合法な応手が1つもない
   */
  private isUchifuzume(
    board: Board,
    move: Move,
    currentPlayer: Player
  ): boolean {
    // 歩打ち以外は関係ない
    if (!move.drop || move.piece !== "FU") {
      return false
    }

    // 歩打ち後の局面
    const nextBoard = this.applier.apply(board, move)

    const opponent = this.getOpponent(currentPlayer)

    // 相手玉に王手がかかっていなければ打ち歩詰めではない
    if (!this.detector.isKingInCheck(nextBoard, opponent)) {
      return false
    }

    // 相手番にして応手を生成する
    nextBoard.setTurn(opponent)

    const replies = this.generator.generatePseudoLegalMoves(nextBoard)

    // 相手に1手でも合法手があれば詰みではない
    const legalReplies = replies.filter(reply =>
      this.isLegalMoveWithoutUchifuzume(nextBoard, reply, opponent)
    )

    return legalReplies.length === 0
  }

  /**
   * 二歩か判定する
   *
   * 条件:
   * - 打ち手である
   * - 歩打ちである
   * - 同じ筋に自分の未成歩(FU)がある
   */
  private isNifu(board: Board, move: Move, owner: Player): boolean {
    if (!move.drop) {
      return false
    }

    if (move.piece !== "FU") {
      return false
    }

    const file = move.to.x

    for (let y = 0; y < 9; y++) {
      const piece = board.getPiece({ x: file, y })

      if (!piece) continue

      if (piece.owner === owner && piece.type === "FU") {
        return true
      }
    }

    return false
  }

  /**
   * 行きどころのない駒打ちか判定する
   *
   * - 歩・香 → 最終段NG
   * - 桂 → 最終段 & その1つ手前NG
   */
  private isInvalidDropPosition(move: Move, owner: Player): boolean {
    if (!move.drop) {
      return false
    }

    const y = move.to.y

    if (move.piece === "FU" || move.piece === "KY") {
      if (owner === "black" && y === 0) return true
      if (owner === "white" && y === 8) return true
    }

    if (move.piece === "KE") {
      if (owner === "black" && (y === 0 || y === 1)) return true
      if (owner === "white" && (y === 8 || y === 7)) return true
    }

    return false
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

  /**
   * 相手プレイヤーを返す
   */
  private getOpponent(player: Player): Player {
    return player === "black" ? "white" : "black"
  }
}