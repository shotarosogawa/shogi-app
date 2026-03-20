/**
 * プレイヤー（先手 / 後手）
 *
 * 将棋では
 * 先手 = black
 * 後手 = white
 *
 * として扱うことが多いです。
 */
export type Player = "black" | "white"

/**
 * 駒の種類
 *
 * 成り駒も別タイプとして扱っています。
 *
 * FU → 歩
 * KY → 香
 * KE → 桂
 * GI → 銀
 * KI → 金
 * KA → 角
 * HI → 飛
 * OU → 玉
 *
 * TO → と金
 * NY → 成香
 * NK → 成桂
 * NG → 成銀
 * UM → 馬
 * RY → 龍
 */
export type PieceType =
  | "FU" | "KY" | "KE" | "GI" | "KI"
  | "KA" | "HI" | "OU"
  | "TO" | "NY" | "NK" | "NG" | "UM" | "RY"

/**
 * 駒オブジェクト
 *
 * 将棋盤には「駒」が置かれます。
 * その駒が
 *
 * ・どの種類か
 * ・どちらのプレイヤーの駒か
 *
 * を表します。
 */
export interface Piece {

  /** 駒の種類 */
  type: PieceType

  /** 駒の所有者（先手 / 後手） */
  owner: Player
}