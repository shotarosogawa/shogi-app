// src/core/analysis/buildAnalysisPrompt.ts

import type { FullAiInput } from "./buildFullAiInput"

type FollowupMode = "none" | "why" | "best" | "other" | "chat"

const PV_DISPLAY_STEPS = 4

const buildHistoricalGuidance = (input: FullAiInput): string => {
  const history = input.historicalContext

  const winRateGuidance = `
・勝率が含まれる場合は、それも補足情報として自然に説明してよい
・ただし勝率だけで手の良し悪しを断定しない
・勝率は「安定している」「やや高め」「やや低め」など自然な表現で補足してよい
`.trim()

  const strengthGuidance = `
・数値（件数・勝率・占有率）を踏まえて、「はっきり多い」「やや多い」「分散している」など強弱を言い分ける
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
${winRateGuidance}
${strengthGuidance}
`.trim()
  }

  if (history.matchedCount <= 9) {
    return `
・過去棋譜傾向は一定数あるため、実戦傾向として軽く触れてよい
・ただし、評価値や候補手の比較より優先してはいけない
・「実戦では〜が比較的多い」「過去例では〜がよく指される」程度の表現にする
${winRateGuidance}
${strengthGuidance}
`.trim()
  }

  return `
・過去棋譜傾向は十分な一致件数があるため、実戦傾向として説明に含めてよい
・ただし、最善手と人気手は別物なので混同しない
・評価値や候補手比較と矛盾する場合は、局面評価を優先して説明する
${winRateGuidance}
${strengthGuidance}
`.trim()
}

const buildHistoricalConfidenceHint = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount === 0 || history.popularMoves.length === 0) {
    return `
・過去棋譜傾向はないため、履歴には触れなくてよい
`.trim()
  }

  if (history.matchedCount <= 2) {
    return `
・一致件数が少ないため、履歴は参考程度として扱う
・この情報だけで傾向を強く断定しない
`.trim()
  }

  if (history.matchedCount >= 5 && history.topMoveShare >= 0.6) {
    return `
・過去棋譜傾向は比較的はっきりしている
・最も多い手は実戦で目立って多いと言ってよい
・ただし最善手とは限らないので必要なら補足する
`.trim()
  }

  if (history.matchedCount >= 5 && history.topMoveShare < 0.6) {
    return `
・過去棋譜傾向はあるが、指し手はある程度分散している
・「最も多い手」ではあるが、はっきり多いとは言いすぎない
`.trim()
  }

  return `
・過去棋譜傾向は一定数あるため、実戦傾向として軽く触れてよい
・ただし、強い断定は避ける
`.trim()
}

const buildHistoryVsEvaluationHint = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount <= 0 || history.popularMoves.length === 0) {
    return `
・過去棋譜傾向がないため、履歴と評価の差は説明しなくてよい
`.trim()
  }

  return `
・多く指される手と評価上の最善手は一致しないことがある
・多く指されていても、勝率が低めなら「選ばれやすいが内容は別」と説明してよい
・多く指されていて勝率も高めなら、実戦的にも有力な手として説明してよい
・実戦例が少なくても、評価が高い手なら「実戦では少ないが有力」と説明してよい
・勝率と評価がズレる場合は、その違いを自然に説明してよい
・ただし、勝率だけで手の価値を断定せず、局面評価を主軸にする
`.trim()
}

const buildThreeAxisGuidance = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount <= 0) {
    return `
・履歴情報がないため、局面評価を中心に説明する
`.trim()
  }

  return `
・「実戦で多い手」「勝率」「評価」は別の軸として扱う
・多く指されていて勝率も高めなら、実戦的にも有力な手として説明してよい
・多く指されていても勝率が低めなら、「選ばれやすいが内容は別」と説明してよい
・実戦例が少なくても勝率が高めで評価も良い場合は、「実戦では少ないが内容の良い手」と説明してよい
・指し手が分散している場合は、「特定の手に偏らない」と説明してよい
・人気・勝率・評価がズレる場合は、その違いを自然に説明する
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
  line: FullAiInput["bestLine"] | FullAiInput["playedLine"]
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

  line.steps.slice(0, PV_DISPLAY_STEPS).forEach((step, index) => {
    lines.push(`${index + 1}手目: ${step.moveLabel}`)
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
  const lines: string[] = []

  lines.push("基準盤面:")
  lines.push(buildBaseBoardSummary(input))
  lines.push("")
  lines.push(buildLineSummary("最善手側", input.bestLine))
  lines.push("")
  lines.push(buildLineSummary("実際の手側", input.playedLine))

  return lines.join("\n")
}

const buildEvaluationSeverityGuidance = (input: FullAiInput): string => {
  const bestLine = input.bestLine
  const playedLine = input.playedLine

  const bestMate = bestLine?.mate ?? null
  const playedMate = playedLine?.mate ?? null

  // 実際の手で詰まされるなら最優先で悪手扱い
  if (playedMate !== null && playedMate < 0) {
    return `
・実際の手の後は詰み筋に入っているため、決定的な悪手として扱う
・評価値よりも詰みの有無を優先して説明する
・「大きな見落とし」「詰みを許した」と明確に伝えてよい
`.trim()
  }

  // 最善手側に詰みがあるのに逃している場合
  if (bestMate !== null && bestMate > 0) {
    return `
・最善手側には明確な勝ち筋または詰み筋があるため、それを逃した手として扱う
・評価値よりも詰み筋の有無を優先して説明する
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
`.trim()
  }

  if (loss < 400) {
    return `
・明確に評価を落としているため、「疑問手」または「悪手寄り」として扱う
・手の意図が自然でも、評価を落としている点を優先して説明する
`.trim()
  }

  if (loss < 1000) {
    return `
・大きく評価を落としているため、「悪手」として扱う
・まず評価を落としている事実を明確に述べ、その後に理由を説明する
`.trim()
  }

  return `
・非常に大きく評価を落としているため、「大きな見落としがある手」や「決定的な悪手」として扱う
・この手によって局面が大きく悪化していることを明確に伝える
`.trim()
}

const buildInputSummary = (input: FullAiInput): string => {
  const lines: string[] = []

  const bestLine = input.bestLine
  const playedLine = input.playedLine

  lines.push(`手数: ${input.moveIndex}`)
  lines.push(`系統: ${input.lineType}`)

  if (input.playedMoveLabel) {
    lines.push(`今回の手: ${input.playedMoveLabel}`)
  }

  if (bestLine && bestLine.evaluationCp !== null) {
    lines.push(`最善手評価: ${bestLine.evaluationCp}cp`)
  }

  if (playedLine && playedLine.evaluationCp !== null) {
    lines.push(`現在評価: ${playedLine.evaluationCp}cp`)
  }

  if (bestLine && bestLine.mate !== null) {
    lines.push(`最善手詰み: ${bestLine.mate}`)
  }

  if (playedLine && playedLine.mate !== null) {
    lines.push(`現在の詰み: ${playedLine.mate}`)
  }

  if (
    bestLine &&
    playedLine &&
    bestLine.evaluationCp !== null &&
    playedLine.evaluationCp !== null
  ) {
    lines.push(`評価差: ${Math.max(0, bestLine.evaluationCp - playedLine.evaluationCp)}cp`)
  }

  if (bestLine && bestLine.steps.length > 0) {
    lines.push(`最善手: ${bestLine.steps[0].moveLabel}`)
  }

  if (playedLine && playedLine.steps.length > 0) {
    lines.push(`最初の変化: ${playedLine.steps[0].moveLabel}`)
  }

  if (input.openingInfo) {
    lines.push(`戦型情報あり`)
  }

  if (input.castleInfo) {
    lines.push(`囲い情報あり`)
  }

  return lines.join("\n")
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
  const historicalConfidenceHint = buildHistoricalConfidenceHint(input)
  const historyVsEvaluationHint = buildHistoryVsEvaluationHint(input)
  const threeAxisGuidance = buildThreeAxisGuidance(input)
  const historicalSummary = buildHistoricalSummary(input)
  const engineGuidance = buildEngineGuidance(input)
  const engineSummary = buildEngineSummary(input)
  const evalSeverityGuidance = buildEvaluationSeverityGuidance(input)
  const inputSummary = buildInputSummary(input)
  const candidatesSummary = buildCandidatesSummary(input)

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

〖序盤の説明ルール〗
・序盤の手数が浅い局面では、戦型を断定しすぎない
・初手付近では、形の自然さや駒組みの自由度を優先して説明する
・初手や序盤の浅い局面では、「〜系になりやすい」といった戦型寄りの言い方は控えめにする

〖戦型・囲い・特徴の扱い〗
・戦型情報があれば、序盤の狙いや形の方向性の説明に使ってよい
・囲い情報があれば、守りの形との関係説明に使ってよい
・confidence が低い囲いは断定しすぎない
・局面特徴があれば、説明の補助根拠として使ってよい

〖過去棋譜傾向の扱い〗
${historicalGuidance}

〖過去棋譜傾向の信頼度〗
${historicalConfidenceHint}

〖履歴と評価の関係〗
${historyVsEvaluationHint}

〖3軸の統合ルール〗
${threeAxisGuidance}

〖解析エンジン結果の扱い〗
${engineGuidance}

〖評価差に基づく説明ルール〗
${evalSeverityGuidance}

〖最重要ルール〗
・「最善手」と「実戦で多い手」は別物として扱う
・人気手だから最善とは限らない
・評価値が良い手と、過去に多い手が違う場合は、その違いを自然に説明する
・過去棋譜傾向は補助情報であり、局面評価そのものの代わりにはならない
・解析エンジン結果がある場合は、それを最優先の根拠として使う

〖followupMode〗
${followupMode}

〖followupModeごとの出力ルール〗
- none：
必ず4行で出力
① 評価：良い / 普通 / 悪い
② 一言：この手の狙い
③ 理由：なぜそう言えるか
④ 比較：最善手との差

- why：
理由だけを2〜3文で説明
見出しや番号は不要

- best：
最善手を2〜3文で説明
必要なら「実戦では別の手も多い」と補足してよい
「最善手は〜」から始める

- other：
候補手の要約に含まれる手の中から、最善手以外を1〜2個だけ簡潔に説明
最善との差が小さい手は有力候補として扱ってよい
差が大きい手は無理に推さない
必要なら実戦傾向にも軽く触れてよい
見出しや番号は不要

- chat：
今回のユーザー質問に自然な会話文で答える
2〜4文程度で簡潔に答える
ユーザーが「よく指される手」「実戦で多い手」を聞いているなら、過去棋譜傾向を優先して答えてよい
ユーザーが「最善手」を聞いているなら、解析エンジン結果と評価を優先して答える
必要なら「実戦では多いが最善とは限らない」と説明する
見出しや番号は不要

〖これまでの会話履歴〗
${conversationHistory || "なし"}

〖今回のユーザー質問〗
${userQuestion || "なし"}

〖今回の局面要約〗
${inputSummary}

〖候補手の要約〗
${candidatesSummary}

〖解析エンジン結果の要約〗
${engineSummary}

〖過去棋譜傾向の要約〗
${historicalSummary}
`.trim()
}