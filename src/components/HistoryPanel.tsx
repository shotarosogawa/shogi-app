import type { SimilarPositionResult } from "../core/history/findSimilarPositions"

type Props = {
  historicalContext: SimilarPositionResult | null
  isLoading?: boolean
}

const toPercent = (value: number): string => {
  return `${Math.round(value * 100)}%`
}

const getShareLabel = (share: number): string => {
  if (share >= 0.7) return "はっきり多い"
  if (share >= 0.5) return "やや多い"
  return "分散気味"
}

export const HistoryPanel = ({
  historicalContext,
  isLoading = false,
}: Props) => {
  if (isLoading) {
    return (
      <section className="history-panel">
        <h3 className="history-title">実戦傾向</h3>
        <p className="history-empty">読み込み中...</p>
      </section>
    )
  }

  if (!historicalContext || historicalContext.matchedCount === 0) {
    return (
      <section className="history-panel">
        <h3 className="history-title">実戦傾向</h3>
        <p className="history-empty">一致する棋譜はまだありません</p>
      </section>
    )
  }

  return (
    <section className="history-panel">
      <h3 className="history-title">実戦傾向</h3>

      <div className="history-summary-line">
        一致件数 <strong>{historicalContext.matchedCount}件</strong>
        <span className="history-summary-sep">/</span>
        傾向 <strong>{getShareLabel(historicalContext.topMoveShare)}</strong>
        <span>（{toPercent(historicalContext.topMoveShare)}）</span>
      </div>

      <div className="history-list">
        {historicalContext.popularMoves.map((move, index) => (
          <div key={`${move.moveText}-${index}`} className="history-row">
            <div className="history-rank">{index + 1}位</div>

            <div className="history-content">
              <div className="history-move">{move.moveText}</div>
              <div className="history-sub">
                <span>{move.count}件</span>
                <span>指した側勝率 {toPercent(move.movePlayerWinRate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}