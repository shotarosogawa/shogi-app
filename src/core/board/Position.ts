/**
 * 盤面座標
 *
 * 将棋盤は 9×9 のマスなので
 *
 * x = 横
 * y = 縦
 *
 * で表します。
 *
 * 例
 *
 * (0,0)   → 左上
 * (8,8)   → 右下
 */
export interface Position {

  /** 横座標 */
  x: number

  /** 縦座標 */
  y: number
}

/**
 * Positionコピー関数
 *
 * オブジェクトは参照渡しになるため
 * AI探索などで安全に使うためコピー関数を用意します。
 */
export function clonePosition(pos: Position): Position {
  return { x: pos.x, y: pos.y }
}