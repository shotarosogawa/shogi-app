import type { Board } from "../board/Board"
import type { Move } from "../board/Move"

export type AnalysisLineType = "mainline" | "variation"

/**
 * 解析対象を表す構造
 *
 * - どの系統の棋譜か
 * - 何手目か
 * - その手
 * - 指す前の局面
 * - 指した後の局面
 *
 * をまとめて扱う
 */
export type AnalysisTarget = {
  /**
   * 本譜か変化手順か
   */
  lineType: AnalysisLineType

  /**
   * 何手目か
   *
   * 0 の場合は初期局面
   * 1 の場合は 1手目の着手後局面
   */
  moveIndex: number

  /**
   * 対象の指し手
   *
   * 初期局面の場合は null
   */
  move: Move | null

  /**
   * 指す前の局面
   *
   * 初期局面の場合は null
   */
  beforeBoard: Board | null

  /**
   * 現在の対象局面
   *
   * moveIndex = 0 なら初期局面
   * moveIndex > 0 ならその手を指した後の局面
   */
  currentBoard: Board
}