import React from "react"
import type { FullAiInput } from "../core/analysis/buildFullAiInput"

type Props = {
  input: FullAiInput | null
}

export const DebugPanel: React.FC<Props> = ({ input }) => {
  if (!input) return <div>データなし</div>

  const bestCp = input.bestLine?.evaluationCp ?? null
  const playedCp = input.playedLine?.evaluationCp ?? null

  const diff =
    bestCp !== null && playedCp !== null
      ? Math.max(0, bestCp - playedCp)
      : null

  return (
    <div style={styles.container}>
      <h2>🧪 Debug Panel</h2>

      {/* 主ラベル */}
      <Section title="主ラベル">
        {input.mainTacticalFeature ? (
          <div>
            {input.mainTacticalFeature.name} (
            {input.mainTacticalFeature.confidence})
            <div style={styles.sub}>
              {input.mainTacticalFeature.reasons.join(" / ")}
            </div>
          </div>
        ) : (
          "なし"
        )}
      </Section>

      {/* 補助 */}
      <Section title="補助特徴">
        {input.subTacticalFeatures.length === 0
          ? "なし"
          : input.subTacticalFeatures.map((f, i) => (
              <div key={i}>
                {f.name} ({f.confidence})
              </div>
            ))}
      </Section>

      {/* 評価 */}
      <Section title="評価">
        <div>best: {bestCp ?? "null"}</div>
        <div>played: {playedCp ?? "null"}</div>
        <div>diff: {diff ?? "null"}</div>
        <div>
          raw(best): {input.bestLine?.rawEvaluationCp ?? "null"}
        </div>
        <div>
          raw(played): {input.playedLine?.rawEvaluationCp ?? "null"}
        </div>
      </Section>

      {/* 候補手 */}
      <Section title="候補手">
        {input.candidates.length === 0
          ? "なし"
          : input.candidates.map((c, i) => (
              <div key={i}>
                {i + 1}. {c.moveLabel} / score:{c.score} / diff:
                {c.scoreDiff} {c.isBest ? "←best" : ""}
              </div>
            ))}
      </Section>

      {/* PV */}
      <Section title="PV (best)">
        {input.bestLine?.steps.map((s, i) => (
          <div key={i}>
            {i + 1}. {s.moveLabel}
          </div>
        ))}
      </Section>

      <Section title="PV (played)">
        {input.playedLine?.steps.map((s, i) => (
          <div key={i}>
            {i + 1}. {s.moveLabel}
          </div>
        ))}
      </Section>

      {/* その他 */}
      <Section title="その他">
        <div>pvDepth: {input.pvDisplaySteps}</div>
        <div>opening: {input.openingInfo?.name ?? "なし"}</div>
        <div>castle: {input.castleInfo?.name ?? "なし"}</div>
      </Section>

      {/* 生データ */}
      <Section title="Raw JSON">
        <pre style={styles.pre}>
          {JSON.stringify(input, null, 2)}
        </pre>
      </Section>
    </div>
  )
}

const Section = ({ title, children }: any) => (
  <div style={styles.section}>
    <h3>{title}</h3>
    {children}
  </div>
)

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 350,
    padding: 12,
    background: "#111",
    color: "#0f0",
    fontSize: 12,
    overflowY: "auto",
    height: "100vh",
  },
  section: {
    marginBottom: 16,
    borderBottom: "1px solid #333",
    paddingBottom: 8,
  },
  sub: {
    color: "#aaa",
    fontSize: 11,
  },
  pre: {
    whiteSpace: "pre-wrap",
    fontSize: 10,
  },
}