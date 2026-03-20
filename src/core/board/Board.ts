import type { Piece, PieceType, Player } from "./Piece"
import type { Position } from "./Position"

/**
 * 将棋盤クラス
 *
 * 盤面の状態を管理します。
 *
 * 主に保持している情報
 *
 * ・盤上の駒
 * ・持ち駒
 * ・手番
 */
export class Board {

  /**
   * 盤面
   *
   * 9×9 の2次元配列
   *
   * Piece | null
   *
   * null = 駒がない
   */
  private squares: (Piece | null)[][]

  /**
   * 持ち駒
   *
   * Record<Player, PieceType[]>
   *
   * 例
 *
 * black: ["FU", "FU", "KA"]
 */
  private hands: Record<Player, PieceType[]>

  /**
   * 現在の手番
   */
  private turn: Player

  constructor() {

    /**
     * 9×9盤面を生成
     *
     * 初期状態では全て null
     */
    this.squares = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => null)
    )

    /**
     * 持ち駒初期化
     */
    this.hands = {
      black: [],
      white: []
    }

    /**
     * 初手は先手
     */
    this.turn = "black"
  }

  /**
   * 指定マスの駒取得
   */
  getPiece(pos: Position): Piece | null {
    return this.squares[pos.y][pos.x]
  }

  /**
   * 駒配置
   */
  setPiece(pos: Position, piece: Piece | null) {
    this.squares[pos.y][pos.x] = piece
  }

  /**
   * 現在の手番取得
   */
  getTurn(): Player {
    return this.turn
  }

  /**
   * 手番更新
   */
  setTurn(player: Player) {
    this.turn = player
  }

  /**
   * 持ち駒取得
   */
  getHand(player: Player): PieceType[] {
    return this.hands[player]
  }

  /**
   * 持ち駒追加
   *
   * 駒を取ったときに使用
   */
  addHand(player: Player, piece: PieceType) {
    this.hands[player].push(piece)
  }

  /**
   * 盤面コピー
   *
   * AI探索では必須です。
   *
   * cloneせずに盤面を書き換えると
 * 探索木が壊れます。
   */
  clone(): Board {

    const b = new Board()

    /**
     * 盤面コピー
     */
    b.squares = this.squares.map(row =>
      row.map(p => (p ? { ...p } : null))
    )

    /**
     * 持ち駒コピー
     */
    b.hands = {
      black: [...this.hands.black],
      white: [...this.hands.white]
    }

    /**
     * 手番コピー
     */
    b.turn = this.turn

    return b
  }
}