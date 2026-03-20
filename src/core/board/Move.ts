import type { Position } from "./Position"
import type { PieceType } from "./Piece"

/**
 * 指し手
 *
 * 将棋の「1手」を表すデータ構造です。
 */
export interface Move {

  /**
   * 移動元
   *
   * 通常の移動では必須。
   *
   * ただし「持ち駒を打つ」場合は
   * 移動元が存在しないため undefined になります。
   */
  from?: Position

  /**
   * 移動先
   *
   * 駒が最終的に置かれる位置
   */
  to: Position

  /**
   * 駒の種類
   *
   * 打つ駒の種類や
   * 移動する駒の種類を表します。
   */
  piece: PieceType

  /**
   * 成りフラグ
   *
   * true の場合
   * 成り駒になります。
   */
  promote?: boolean

  /**
   * 打ちフラグ
   *
   * true の場合
   * 持ち駒を打つ手になります。
   */
  drop?: boolean
}