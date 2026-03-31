// src/core/analysis/buildAnalysisPrompt.ts

import type { FullAiInput } from "./buildFullAiInput"
import type { DetectionResult } from "./detectTactics"

type FollowupMode = "none" | "why" | "best" | "other" | "chat"

const buildHistoricalGuidance = (input: FullAiInput): string => {
  const history = input.historicalContext

  const common = `
・勝率が含まれる場合は、それも補足情報として自然に説明してよい
・ただし勝率だけで手の良し悪しを断定しない
・件数・勝率・占有率を踏まえて、「はっきり多い」「やや多い」「分散している」など強弱を言い分ける
`.trim()

  if (!history || history.matchedCount <= 0) {
    return `
・過去棋譜傾向は存在しないので、その話題には触れなくてよい
`.trim()
  }

  if (history.matchedCount <= 2) {
    return `
・過去棋譜傾向は一致件数が少ないため、参考程度として扱う
・触れる場合は「少数の実戦例では」「参考程度ですが」などの弱い表現を使う
・この情報だけで善し悪しを断定しない
${common}
`.trim()
  }

  if (history.matchedCount <= 9) {
    return `
・過去棋譜傾向は一定数あるため、実戦傾向として軽く触れてよい
・ただし、評価値や候補手の比較より優先してはいけない
・「実戦では〜が比較的多い」「過去例では〜がよく指される」程度の表現にする
${common}
`.trim()
  }

  return `
・過去棋譜傾向は十分な一致件数があるため、実戦傾向として説明に含めてよい
・ただし、最善手と人気手は別物なので混同しない
・評価値や候補手比較と矛盾する場合は、局面評価を優先して説明する
${common}
`.trim()
}

const buildHistoryVsEvaluationHint = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount <= 0 || history.popularMoves.length === 0) {
    return `
・履歴情報がないため、局面評価を中心に説明する
`.trim()
  }

  return `
・「実戦で多い手」「勝率」「評価」は別の軸として扱う
・多く指される手と評価上の最善手は一致しないことがある
・多く指されていても勝率が低めなら、「選ばれやすいが内容は別」と説明してよい
・多く指されていて勝率も高めなら、実戦的にも有力な手として説明してよい
・実戦例が少なくても、評価が高い手なら「実戦では少ないが有力」と説明してよい
・人気・勝率・評価がズレる場合は、その違いを自然に説明してよい
・最終的な手の良し悪しは局面評価を主軸にする
`.trim()
}

const buildHistoricalSummary = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount <= 0) {
    return "なし"
  }

  const lines: string[] = []
  lines.push(`一致件数: ${history.matchedCount}件`)
  lines.push(`最多手占有率: ${Math.round(history.topMoveShare * 100)}%`)

  history.popularMoves.slice(0, 3).forEach((move, index) => {
    const winRate = Math.round(move.movePlayerWinRate * 100)

    let label = ""
    if (winRate >= 60) label = "勝率やや高め"
    else if (winRate <= 40) label = "勝率やや低め"
    else label = "勝率は概ね平均的"

    lines.push(
      `${index + 1}. ${move.moveText} (${move.count}件 / 勝率 ${winRate}% / ${label})`
    )
  })

  return lines.join("\n")
}

const pieceLabelMap: Record<string, string> = {
  FU: "歩",
  KY: "香",
  KE: "桂",
  GI: "銀",
  KI: "金",
  KA: "角",
  HI: "飛",
  OU: "玉",
  TO: "と",
  NY: "成香",
  NK: "成桂",
  NG: "成銀",
  UM: "馬",
  RY: "龍",
}

const formatSquareKey = (key: string): string => {
  const [xText, yText] = key.split(",")
  const x = Number(xText)
  const y = Number(yText)

  const file = 9 - x
  const rankMap = ["一", "二", "三", "四", "五", "六", "七", "八", "九"]
  const rank = rankMap[y] ?? "?"
  return `${file}${rank}`
}

const formatSquareState = (
  state: { owner: "black" | "white"; piece: string } | null
): string => {
  if (!state) return "空"

  const owner = state.owner === "black" ? "先手" : "後手"
  const piece = pieceLabelMap[state.piece] ?? state.piece
  return `${owner}${piece}`
}

const buildChangedSquaresSummary = (
  changedSquares: Record<string, { owner: "black" | "white"; piece: string } | null>
): string => {
  const entries = Object.entries(changedSquares)

  if (entries.length === 0) {
    return "なし"
  }

  return entries
    .map(([square, state]) => `- ${formatSquareKey(square)}: ${formatSquareState(state)}`)
    .join("\n")
}

const buildLineSummary = (
  title: string,
  line: FullAiInput["bestLine"] | FullAiInput["playedLine"],
  maxSteps: number
): string => {
  if (!line) {
    return `${title}: なし`
  }

  const lines: string[] = []

  lines.push(`${title}:`)
  lines.push(`評価: ${line.evaluationCp !== null ? `${line.evaluationCp}cp` : "不明"}`)

  if (line.mate !== null) {
    lines.push(`詰み: ${line.mate}`)
  }

  if (line.steps.length === 0) {
    lines.push("変化: なし")
    return lines.join("\n")
  }

  line.steps.slice(0, maxSteps).forEach((step, index) => {
    const sideLabel = step.player === "black" ? "先手" : "後手"

    lines.push(`${index + 1}手目: ${sideLabel} ${step.moveLabel}`)
    lines.push(`王手: ${step.givesCheck ? "あり" : "なし"}`)
    lines.push(`成り: ${step.isPromote ? "あり" : "なし"}`)
    lines.push(`打ち: ${step.isDrop ? "あり" : "なし"}`)

    if (step.capturedPiece) {
      lines.push(`取得駒: ${formatSquareState(step.capturedPiece)}`)
    } else {
      lines.push("取得駒: なし")
    }

    lines.push("変化マス:")
    lines.push(buildChangedSquaresSummary(step.changedSquares))
  })

  return lines.join("\n")
}

const buildPvMoveSequence = (
  line: FullAiInput["bestLine"] | FullAiInput["playedLine"],
  maxSteps: number
): string => {
  if (!line || line.steps.length === 0) {
    return "なし"
  }

  return line.steps
    .slice(0, maxSteps)
    .map((step, index) => {
      const sideLabel = step.player === "black" ? "先手" : "後手"
      return `${index + 1}手目 ${sideLabel} ${step.moveLabel}`
    })
    .join(" → ")
}

const buildPvSequenceSummary = (input: FullAiInput): string => {
  const maxSteps = input.pvDisplaySteps ?? 4

  return [
    `最善手順: ${buildPvMoveSequence(input.bestLine, maxSteps)}`,
    `実際の手順: ${buildPvMoveSequence(input.playedLine, maxSteps)}`,
  ].join("\n")
}

const buildBaseBoardSummary = (input: FullAiInput): string => {
  if (!input.baseBoard) {
    return "なし"
  }

  const entries = Object.entries(input.baseBoard)
  if (entries.length === 0) {
    return "なし"
  }

  return entries
    .slice(0, 40)
    .map(([square, state]) => `- ${formatSquareKey(square)}: ${formatSquareState(state)}`)
    .join("\n")
}

const buildCandidatesSummary = (input: FullAiInput): string => {
  if (!input.candidates || input.candidates.length === 0) {
    return "なし"
  }

  return input.candidates
    .map((candidate, index) => {
      const scoreText =
        candidate.score !== null ? `${candidate.score}` : "不明"

      const diffText =
        candidate.scoreDiff !== null
          ? (candidate.scoreDiff >= 0 ? `+${candidate.scoreDiff}` : `${candidate.scoreDiff}`)
          : "不明"

      return `${index + 1}. ${candidate.moveLabel} / score ${scoreText} / 差 ${diffText}${candidate.isBest ? " / 最善" : ""}`
    })
    .join("\n")
}

const buildEngineGuidance = (input: FullAiInput): string => {
  const bestLine = input.bestLine
  const playedLine = input.playedLine

  if (!bestLine && !playedLine) {
    return `
・解析エンジン結果がない場合は、候補手・評価・履歴情報を中心に説明する
`.trim()
  }

  return `
・解析エンジンの結果がある場合は、それを最重要の根拠として扱う
・baseBoard は指す前の基準盤面として扱う
・bestLine は最善手側の変化、playedLine は実際の手側の変化として扱う
・評価値だけでなく、変化マス・取得駒・王手の有無を根拠に説明してよい
・最善手側と実際の手側で何がどう変わるかを比較して説明する
・与えられた日本語ラベルと差分情報だけを使って説明し、座標やUSIを推測しない
`.trim()
}

const buildEngineSummary = (input: FullAiInput): string => {
  const maxSteps = input.pvDisplaySteps ?? 4
  const lines: string[] = []

  lines.push("基準盤面:")
  lines.push(buildBaseBoardSummary(input))
  lines.push("")
  lines.push(buildLineSummary("最善手側", input.bestLine, maxSteps))
  lines.push("")
  lines.push(buildLineSummary("実際の手側", input.playedLine, maxSteps))

  return lines.join("\n")
}

const buildMainTacticalFeatureSummary = (input: FullAiInput): string => {
  if (!input.mainTacticalFeature) {
    return "なし"
  }

  const feature = input.mainTacticalFeature
  const reasons =
    feature.reasons.length > 0
      ? ` (${feature.reasons.join(" / ")})`
      : ""

  return `${feature.name} [${feature.confidence}]${reasons}`
}

const buildSubTacticalFeaturesSummary = (input: FullAiInput): string => {
  if (!input.subTacticalFeatures || input.subTacticalFeatures.length === 0) {
    return "なし"
  }

  return input.subTacticalFeatures
    .map((feature, index) => {
      const reasons =
        feature.reasons.length > 0
          ? ` (${feature.reasons.join(" / ")})`
          : ""

      return `${index + 1}. ${feature.name} [${feature.confidence}]${reasons}`
    })
    .join("\n")
}

const buildEvaluationSeverityGuidance = (input: FullAiInput): string => {
  const bestLine = input.bestLine
  const playedLine = input.playedLine

  const bestMate = bestLine?.mate ?? null
  const playedMate = playedLine?.mate ?? null

  if (playedMate !== null && playedMate < 0) {
    return `
・実際の手の後は詰み筋に入っているため、決定的な悪手として扱う
・評価値よりも詰みの有無を優先して説明する
・「大きな見落とし」「詰みを許した」と明確に伝えてよい
・実際の手側の読み筋から、詰みに向かう手順を1〜3手は必ず説明する
・特に1手目、または決め手になる手を優先して示す
`.trim()
  }

  if (bestMate !== null && bestMate > 0) {
    return `
・最善手側には明確な勝ち筋または詰み筋があるため、それを逃した手として扱う
・評価値よりも詰み筋の有無を優先して説明する
・最善手側の読み筋から、詰みに向かう手順を1〜3手は必ず説明する
・特に1手目、または決め手になる手を優先して示す
`.trim()
  }

  const best = bestLine?.evaluationCp ?? null
  const current = playedLine?.evaluationCp ?? null

  if (best === null || current === null) {
    return `
・評価差の情報がない場合は、通常の説明でよい
`.trim()
  }

  const loss = best - current

  if (loss <= 0) {
    return `
・この手は最善手か、それに近い良い手として扱う
・無理に欠点を探さず、自然な良さを説明する
`.trim()
  }

  if (loss < 80) {
    return `
・評価差は小さいため、良し悪しはほぼ互角として扱う
・「自然な手」「大きな差はない」といった表現でよい
`.trim()
  }

  if (loss < 200) {
    return `
・やや評価を落としているため、「やや疑問手」や「少し損をしている」と表現する
・良い点だけでなく、評価が下がる理由にも軽く触れる
・どこで少し損をしているか、何が足りないかを1つ具体的に述べる
`.trim()
  }

  if (loss < 400) {
    return `
・明確に評価を落としているため、「疑問手」または「悪手寄り」として扱う
・手の意図が自然でも、評価を落としている点を優先して説明する
・どの一手で差がついたか、何が間に合っていないかを1つ具体的に述べる
・「この手では〜にならない」「この手だと〜される」という形で、不利な変化を1つ示す
`.trim()
  }

  if (loss < 1000) {
    return `
・大きく評価を落としているため、「悪手」として扱う
・まず評価を落としている事実を明確に述べ、その後に理由を説明する
・最善手ではどうなったかと、この手ではどうなったかを対比で説明する
・どの一手で差がついたかを必ず1つ示す
・「この手では〜される」「この手だと攻めが続かない」など、具体的な不利を1つ述べる
`.trim()
  }

  return `
・非常に大きく評価を落としているため、「大きな見落としがある手」や「決定的な悪手」として扱う
・この手によって局面が大きく悪化していることを明確に伝える
・最善手ではどうなったかと、この手ではどうなったかを対比で説明する
・どの一手で差がついたかを必ず1つ示す
・「この手では〜される」「この手だと受けが間に合わない」など、具体的な不利を1つ述べる
`.trim()
}

const getEvaluationLabelWithPlayer = (cp: number | null): string => {
  if (cp === null) return "不明"

  const abs = Math.abs(cp)

  let label = ""
  if (abs < 300) label = "互角"
  else if (abs < 800) label = "有利"
  else if (abs < 1500) label = "優勢"
  else label = "勝勢"

  if (label === "互角") return label

  return cp > 0
    ? `先手${label}`
    : `後手${label}`
}

const getMoveQualityLabel = (diff: number | null): string => {
  if (diff === null) return ""

  if (diff < 100) return "問題のない手"
  if (diff < 300) return "やや疑問のある手"
  if (diff < 600) return "疑問手"
  if (diff < 1000) return "悪手"
  return "大悪手"
}

const getMoveQualityTone = (diff: number | null): string => {
  if (diff === null) return ""

  if (diff < 100) return "good"
  if (diff < 300) return "slightly_bad"
  if (diff < 600) return "questionable"
  if (diff < 1000) return "bad"
  return "blunder"
}

const getMoveQualityPhrase = (
  diff: number | null,
  mainFeature: DetectionResult | null
): string => {
  const tone = getMoveQualityTone(diff)

  if (tone === "good") {
    switch (mainFeature?.key) {
      case "tarefu":
        return "狙いがはっきりした自然な手です。"
      case "tataki":
        return "形を動かしにいく、筋の良い手です。"
      case "fork":
        return "攻めが分かりやすく、厳しい手です。"
      case "block":
        return "受けとして自然で、手堅い手です。"
      case "check":
        return "分かりやすく迫る、自然な手です。"
      default:
        return "自然で問題のない手です。"
    }
  }

  if (tone === "slightly_bad") {
    return "狙いはありますが、少しもったいない面があります。"
  }

  if (tone === "questionable") {
    return "狙いは分かりますが、やや疑問の残る手です。"
  }

  if (tone === "bad") {
    return "意図はあっても、形勢を損ねやすい手です。"
  }

  if (tone === "blunder") {
    return "大きな見落としにつながる、かなり厳しい手です。"
  }

  return ""
}

const buildMainFeatureSentence = (
  main: DetectionResult | null,
  diff: number | null
): string => {
  if (!main) return ""

  let base = ""
  switch (main.key) {
    case "tarefu":
      base = "この手は垂れ歩で、拠点を作る狙いです。"
      break
    case "tataki":
      base = "この手は叩きの歩で、相手に取らせて形を崩す狙いです。"
      break
    case "fork":
      base = "この手は両取りで、複数の駒を同時に狙っています。"
      break
    case "block":
      base = "この手は相手の利きを遮る受けで、重要な駒を守っています。"
      break
    case "check":
      base = "この手は王手で、相手玉に直接迫る手です。"
      break
    default:
      base = ""
  }

  const qualityPhrase = getMoveQualityPhrase(diff, main)
  if (!qualityPhrase) return base

  return `${base} ${qualityPhrase}`
}

const buildInputSummary = (input: FullAiInput): string => {
  const lines: string[] = []

  const bestLine = input.bestLine
  const playedLine = input.playedLine

  const bestCp = bestLine?.evaluationCp ?? null
  const playedCp = playedLine?.evaluationCp ?? null

  let diff: number | null = null
  if (bestCp !== null && playedCp !== null) {
    diff = Math.max(0, bestCp - playedCp)
  }

  lines.push(`手数: ${input.moveIndex}`)
  lines.push(`系統: ${input.lineType}`)

  if (input.playedMoveLabel) {
    lines.push(`今回の手: ${input.playedMoveLabel}`)
  }

  if (diff !== null) {
    lines.push(`評価差: ${diff}cp`)
    lines.push(`指し手評価: ${getMoveQualityLabel(diff)}`)
  }

  if (bestLine && bestLine.evaluationCp !== null) {
    lines.push(`最善手評価: ${bestLine.evaluationCp}cp`)
    lines.push(`最善手側の評価状態: ${getEvaluationLabelWithPlayer(bestLine.rawEvaluationCp)}`)
  }

  if (playedLine && playedLine.evaluationCp !== null) {
    lines.push(`現在評価: ${playedLine.evaluationCp}cp`)
    lines.push(`評価状態: ${getEvaluationLabelWithPlayer(playedLine.rawEvaluationCp)}`)
  }

  if (bestLine && bestLine.mate !== null) {
    lines.push(`最善手詰み: ${bestLine.mate}`)
  }

  if (playedLine && playedLine.mate !== null) {
    lines.push(`現在の詰み: ${playedLine.mate}`)
  }

  if (input.threatInfo?.isHisshi) {
    lines.push("必至あり")
  } else if (input.threatInfo?.isTsumero) {
    lines.push("詰めろあり")
  }

  if (bestLine && bestLine.steps.length > 0) {
    lines.push(`最善手: ${bestLine.steps[0].moveLabel}`)
  }

  if (playedLine && playedLine.steps.length > 0) {
    lines.push(`実際の手順あり`)
  }

  if (input.openingInfo) {
    lines.push("戦型情報あり")
  }

  if (input.castleInfo) {
    lines.push("囲い情報あり")
  }

  if (input.mainTacticalFeature) {
    lines.push(`主な手筋: ${input.mainTacticalFeature.name}`)
  }

  if (input.subTacticalFeatures && input.subTacticalFeatures.length > 0) {
    lines.push(
      `補助特徴: ${input.subTacticalFeatures
        .map(feature => feature.name)
        .join(" / ")}`
    )
  }

  return lines.join("\n")
}

const buildThreatSummary = (input: FullAiInput): string => {
  const threat = input.threatInfo

  if (!threat) {
    return "なし"
  }

  if (threat.isHisshi) {
    return "必至あり（受けがない詰めろ）"
  }

  if (threat.isTsumero) {
    return `詰めろあり（放置すると次に詰み。例: ${threat.attackMove ?? "攻め筋"}）`
  }

  return "なし"
}

/**
 * ChatGPT に渡す解析用プロンプトを生成する
 */
export function buildAnalysisPrompt(
  input: FullAiInput,
  followupMode: FollowupMode = "none",
  conversationHistory: string = "",
  userQuestion: string = ""
): string {
  const historicalGuidance = buildHistoricalGuidance(input)
  const historyVsEvaluationHint = buildHistoryVsEvaluationHint(input)
  const historicalSummary = buildHistoricalSummary(input)
  const engineGuidance = buildEngineGuidance(input)
  const engineSummary = buildEngineSummary(input)
  const pvSequenceSummary = buildPvSequenceSummary(input)
  const evalSeverityGuidance = buildEvaluationSeverityGuidance(input)
  const inputSummary = buildInputSummary(input)
  const candidatesSummary = buildCandidatesSummary(input)
  const mainTacticalFeatureSummary = buildMainTacticalFeatureSummary(input)
  const subTacticalFeaturesSummary = buildSubTacticalFeaturesSummary(input)
  const threatSummary = buildThreatSummary(input)

  const bestCp = input.bestLine?.evaluationCp ?? null
  const playedCp = input.playedLine?.evaluationCp ?? null

  let diff: number | null = null
  if (bestCp !== null && playedCp !== null) {
    diff = Math.max(0, bestCp - playedCp)
  }

  const mainSentence = buildMainFeatureSentence(
    input.mainTacticalFeature,
    diff
  )

  return `
あなたは将棋の解説AIです。

以下のルールで回答してください。

〖基本ルール〗
・簡潔に答える
・局面に基づいて説明する
・「なぜ良いか」は、攻め・守り・駒の働き・形の良さで説明する
・明確で自明な情報を無駄に長く説明しない
・断定しすぎず、与えられた情報から言える範囲で述べる
・与えられた日本語ラベルだけを使って説明する
・座標、USI、盤面再構築の推測はしない
・評価値がある場合は、「互角」「やや有利」「有利」「優勢」「勝勢」など自然な日本語に言い換えてよい
・数値だけでなく、局面の意味と合わせて説明する
・良い手は自然に褒め、悪い手は必要以上に強すぎる言い方を避けつつ明確に伝える
・「問題のない手」は「自然な手」「着実な手」「手堅い手」など自然な言い換えをしてよい
・「やや疑問のある手」「疑問手」「悪手」は、手の狙いを認めつつ何が足りないかを補足するとよい

〖序盤の説明ルール〗
・序盤の手数が浅い局面では、戦型を断定しすぎない
・初手付近では、形の自然さや駒組みの自由度を優先して説明する
・初手や序盤の浅い局面では、「〜系になりやすい」といった戦型寄りの言い方は控えめにする

〖戦型・囲い・特徴の扱い〗
・戦型情報があれば、序盤の狙いや形の方向性の説明に使ってよい
・囲い情報があれば、守りの形との関係説明に使ってよい
・confidence が低い囲いは断定しすぎない
・局面特徴があれば、説明の補助根拠として使ってよい

〖手筋・局面特徴の扱い〗
・手筋・特徴情報があれば、その手の狙いや意味の説明に使ってよい
・主な手筋・特徴がある場合は、それをその手の中心的な意味として優先して説明する
・補助的な手筋・特徴は、必要に応じて補足として扱う
・複数ラベルがある場合でも、説明の中心は1つに絞り、残りは補助的に述べる
・confidence が low のものは断定しすぎず、「〜の可能性」「〜の狙いがありそう」程度にとどめる
・手筋名を挙げるだけでなく、何を狙っている手かを自然な日本語で補足する
・主な手筋・特徴がある場合は、その手の説明は必ずそこから始める
・最初の一文は、主な手筋に応じて以下の型に従う
・ただし詰みがある場合は、主な手筋より詰みの説明を優先する

【垂れ歩】
「この手は垂れ歩で、拠点を作る狙いです。」

【叩き】
「この手は叩きの歩で、相手に取らせて形を崩す狙いです。」

【両取り】
「この手は両取りで、複数の駒を同時に狙っています。」

【利き遮断】
「この手は相手の利きを遮る受けで、重要な駒を守っています。」

【王手】
「この手は王手で、相手玉に直接迫る手です。」

・説明の1文目は必ず「この手は〜」で始める
・主な手筋がある場合、1文目で必ずその名称を含める
・補助的な手筋・特徴がある場合は、2文目以降で補足として述べる

〖過去棋譜傾向の扱い〗
${historicalGuidance}

〖履歴と評価の関係〗
${historyVsEvaluationHint}

〖解析エンジン結果の扱い〗
${engineGuidance}

〖読み筋の扱い〗
・bestLine / playedLine に steps がある場合は、それを読み筋として扱う
・読み筋がある場合は、その手順を根拠に説明する
・詰みがある場合は、該当する側の読み筋から1〜3手を必ず本文で説明する
・最善手側と実際の手側の違いは、1手目の差とその後の進行差として説明する
・読み筋は長く並べすぎず、意味が分かる範囲で短く要約して使う
・読み筋は単なる手順の列ではなく、「何を狙っているか」「どのように局面が進むか」をまとめて説明する
・手順は「→」で並べるだけでなく、「〜して」「〜になるので」といった流れで説明する

〖評価差に基づく説明ルール〗
${evalSeverityGuidance}

〖必至の扱い〗
・必至とは、受けがない詰めろを指す
・非王手で mate がある局面は必至として扱う
・必至は詰みではない
・必至の場合は必ず「受けても次に詰む形」と表現する
・必至の場合は「受けなし」「詰み」という表現は使用しない
・必至の場合は評価で「詰み」「受けなし」とは書かない
・必至がある場合は、詰みより優先して必至として説明する

〖詰めろの扱い〗
・詰めろとは、次に詰みがある状態を指す
・詰めろがある場合は、「放置すると次に詰みがある」「受けを強いる形」「次に詰ませる狙いがある」などと表現する
・詰めろがあっても、必ずしも最優先で説明する必要はない
・詰みがある場合は、詰めろより詰みを優先する

〖詰みの扱い〗
・必至の局面は詰みとして扱わない
・mate があっても、その手が王手でない場合は現在の詰みとはみなさない
・非王手で mate がある場合は、現在詰みではなく必至として扱う
・「詰みに向かう」「詰み筋がある」「将来的に詰む」は現在の詰みとはみなさない
・評価で「詰み」と書いてよいのは、その手が王手であり、その時点で詰みが成立している場合に限る
・mate 情報がある場合は、evaluationCp より mate を優先して説明する
・実際の手の後に詰みがある場合は、「勝勢」「優勢」ではなく、必ず「詰み」「受けなし」「即詰み」などと表現する
・実際の手の後に詰みがある場合は、「まだ粘れる」「まだ難しい」「まだ勝負は続く」などの表現は禁止する
・最善手側に詰みがあるのに実際の手で逃している場合は、「詰みを逃した」と明確に述べる
・詰みがある場合は、必ず1〜3手程度の詰み筋を簡潔に述べる
・詰み筋は、読み筋（PV）に含まれる手順から選んで示す
・特に1手目、または決め手になる手を優先して示す
・一手詰めの場合は、その1手を必ず明示する
・詰み筋を述べる場合は、長く並べすぎず、決め手になる手順だけを短く示す
・詰みがある場合は、主な手筋よりも詰みの有無を優先して説明する
・詰みがある場合は、1文目から詰みの事実を優先して述べる。この場合は主な手筋から始めなくてよい

〖最重要ルール〗
・「最善手」と「実戦で多い手」は別物として扱う
・人気手だから最善とは限らない
・評価値が良い手と、過去に多い手が違う場合は、その違いを自然に説明する
・過去棋譜傾向は補助情報であり、局面評価そのものの代わりにはならない
・解析エンジン結果がある場合は、それを最優先の根拠として使う
・読み筋に指し手側が付いている場合は、先手と後手を取り違えずに説明する

〖followupMode〗
${followupMode}

〖followupModeごとの出力ルール〗

* none：
  必ず4行で出力
  ① 評価：良い / 普通 / 悪い
  ② 一言：この手の狙い
  ③ 理由：なぜそう言えるか
  ④ 比較：最善手との差

・followupMode が none でも、詰み（王手で詰みが成立している場合）がある場合は①評価の行で「詰み」と表現してよい
・「受けなし」という表現は、詰み（王手で詰みが成立している場合）にのみ使用する
・詰みがある場合は、4行の中でも詰みの事実を最優先で述べる
・詰みがある場合は、必ず1〜3手程度の詰み筋を簡潔に述べる
・詰み筋は④比較の行で示す
・詰み筋は、読み筋（PV）の1手目または決め手になる手を使って示す
・読み筋は「どういう流れになるか」を説明し、単なる手順の羅列にはしない
・差がない場合でも、「なぜその手が良いのか」「どこが優れているか」を1つ具体的に述べる
・比較では「どの一手がポイントか」「どの局面で差がつくか」を必ず1つ示す
・悪い手の場合は、「この手では〜にならない」「この手だと〜される」といった形で、具体的な不利な変化を1つ示す
・悪い手の場合は、「最善手ではどうなったか」と「実戦ではどうなったか」を対比で説明する
・詰めろがある場合は、②一言または③理由のどちらかで、「放置すると次に詰みがある」「受けを強いる形」などと必ず簡潔に述べる
・必至がある場合は、①評価で「詰み」とは書かず、②一言または③理由で「受けがない」「受けても次に詰む」と簡潔に述べる
・非王手で mate がある場合は、①評価で「詰み」とは書かない

* why：
  理由だけを2〜3文で説明
  見出しや番号は不要
  ・詰みがある場合は、理由の中で詰みの事実を最優先で述べる
  ・必要なら短い詰み筋を1つ示してよい
  ・詰めろがある場合は、理由の中で「次に詰みがある形」であることに触れてよい
  ・必至がある場合は、理由の中で「受けがない形」「受けても次に詰む形」であることを優先して述べる

* best：
  最善手を2〜3文で説明
  必要なら「実戦では別の手も多い」と補足してよい
  「最善手は〜」から始める
  ・最善手側に詰みがある場合は、その詰み筋を優先して説明する

* other：
  候補手の要約に含まれる手の中から、最善手以外を1〜2個だけ簡潔に説明
  最善との差が小さい手は有力候補として扱ってよい
  差が大きい手は無理に推さない
  必要なら実戦傾向にも軽く触れてよい
  見出しや番号は不要
  ・詰みが絡む場合は、詰みを逃す手かどうかを優先して述べる

* chat：
  今回のユーザー質問に自然な会話文で答える
  2〜4文程度で簡潔に答える
  ユーザーが「よく指される手」「実戦で多い手」を聞いているなら、過去棋譜傾向を優先して答えてよい
  ユーザーが「最善手」を聞いているなら、解析エンジン結果と評価を優先して答える
  必要なら「実戦では多いが最善とは限らない」と説明する
  見出しや番号は不要
  ・詰みがある場合は、その事実を曖昧にせず明確に答える
  ・必要なら短い詰み筋を1つ示してよい
  ・詰めろがある場合は、必要に応じて「次に詰みを狙っている形」と自然に答えてよい
  ・必至がある場合は、「受けがない」「受けても次に詰む形」と自然に答えてよい

〖これまでの会話履歴〗
${conversationHistory || "なし"}

〖今回のユーザー質問〗
${userQuestion || "なし"}

〖今回の局面要約〗
${inputSummary}

〖主な手筋・特徴〗
${mainTacticalFeatureSummary}

〖補助的な手筋・特徴〗
${subTacticalFeaturesSummary}

〖説明の中心としてまず意識すること〗
${mainSentence || "なし"}

〖候補手の要約〗
${candidatesSummary}

〖詰めろ情報〗
${threatSummary}

〖読み筋要約〗
${pvSequenceSummary}

〖解析エンジン結果の要約〗
${engineSummary}

〖過去棋譜傾向の要約〗
${historicalSummary}
`.trim()
}