import type { Board } from "../core/board/Board"
import type { EngineAnalysisResult } from "../core/engine/EngineAnalysisResult"
import { usiToJapanese } from "../core/utils/usiToJapanese"

type Props = {
  engineAnalysis: EngineAnalysisResult | null
  board: Board
  isLoading?: boolean
}

const formatEval = (value: number | null): string => {
  if (value === null) return "?"
  if (value > 0) return `+${value}`
  return `${value}`
}

export const EngineCandidatesPanel = ({
  engineAnalysis,
  board,
  isLoading = false,
}: Props) => {
  if (isLoading) {
    return (
      <section className="engine-panel">
        <h3 className="engine-title">解析候補手</h3>
        <p className="engine-empty">読み込み中...</p>
      </section>
    )
  }

  if (!engineAnalysis) {
    return (
      <section className="engine-panel">
        <h3 className="engine-title">解析候補手</h3>
        <p className="engine-empty">解析結果がありません</p>
      </section>
    )
  }

  if (!engineAnalysis.candidates || engineAnalysis.candidates.length === 0) {
    return (
      <section className="engine-panel">
        <h3 className="engine-title">解析候補手</h3>
        <p className="engine-empty">候補手がありません</p>
      </section>
    )
  }

  return (
    <section className="engine-panel">
      <h3 className="engine-title">解析候補手</h3>

      <div className="engine-best">
        <span className="engine-best-label">最善手</span>
        <span className="engine-best-move">
          {engineAnalysis.bestMove
            ? usiToJapanese(engineAnalysis.bestMove, board)
            : "不明"}
        </span>
        <span className="engine-best-eval">
          {formatEval(engineAnalysis.evaluationCp)}
        </span>
      </div>

      <div className="engine-list">
        {engineAnalysis.candidates.map((candidate, index) => (
          <div key={`${candidate.moveText}-${index}`} className="engine-row">
            <div className="engine-rank">{index + 1}位</div>

            <div className="engine-main">
              <div className="engine-move-row">
                <span className="engine-move">{usiToJapanese(candidate.moveText, board)}</span>
                <span className="engine-eval">
                  {formatEval(candidate.evaluationCp)}
                </span>
              </div>

              {candidate.principalVariation.length > 0 && (
                <div className="engine-pv">
                  読み筋: {candidate.principalVariation.slice(0, 5).map(cp => usiToJapanese(cp, board)).join(" ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}