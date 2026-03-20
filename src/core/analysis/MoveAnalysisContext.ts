import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { PieceType, Player } from "../board/Piece"
import type { AnalysisLineType } from "./AnalysisTarget"

/**
 * 1手について、説明や解析に使いやすい形へ整えたデータ
 */
export type MoveAnalysisContext = {
  /**
   * 本譜か変化手順か
   */
  lineType: AnalysisLineType

  /**
   * 何手目か
   *
   * 1 以上を想定
   */
  moveIndex: number

  /**
   * この手そのもの
   */
  move: Move

  /**
   * 手番側（この手を指した側）
   */
  player: Player

  /**
   * 指す前の局面
   */
  beforeBoard: Board

  /**
   * 指した後の局面
   */
  afterBoard: Board

  /**
   * 打ちかどうか
   */
  isDrop: boolean

  /**
   * 成りかどうか
   */
  isPromote: boolean

  /**
   * 取った駒の種類
   *
   * 取っていなければ null
   */
  capturedPieceType: PieceType | null

  /**
   * この手で相手玉に王手がかかったか
   */
  givesCheck: boolean
}