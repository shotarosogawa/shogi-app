/**
 * 連続王手千日手かどうかを判定する
 *
 * 前提:
 * - boardKeys は局面履歴（index 0 は開始局面）
 * - moveChecks は各指し手が王手だったかの履歴
 */
export function isPerpetualCheckSennichite(
  boardKeys: string[],
  moveChecks: boolean[],
  currentIndex: number
): boolean {
  const currentKey = boardKeys[currentIndex]

  // 同じ局面が出た位置を集める（開始局面は除外）
  const matchedIndexes = boardKeys
    .map((key, index) => ({ key, index }))
    .filter(item => item.index !== 0 && item.key === currentKey)
    .map(item => item.index)

  // 4回未満なら連続王手千日手ではない
  if (matchedIndexes.length < 4) {
    return false
  }

  // 直近4回分だけを見る
  const lastFour = matchedIndexes.slice(-4)

  // それぞれの局面に至った直前の手が全部王手か確認する
  // boardKeys[1] は moveChecks[0] に対応する
  return lastFour.every(boardIndex => {
    const moveIndex = boardIndex - 1
    return moveChecks[moveIndex] === true
  })
}