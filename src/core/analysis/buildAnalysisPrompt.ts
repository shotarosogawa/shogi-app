import type { FullAiInput } from "./buildFullAiInput"

type FollowupMode = "none" | "why" | "best" | "other" | "chat"

const detectQuestionIntent = (question: string) => {
  const q = question || ""

  if (q.includes("よく指され") || q.includes("多い手") || q.includes("実戦")) {
    return "history"
  }

  if (q.includes("最善") || q.includes("ベスト")) {
    return "best"
  }

  if (q.includes("なぜ") || q.includes("理由")) {
    return "why"
  }

  return "normal"
}

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

const buildHistoricalSummary = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount <= 0) {
    return "なし"
  }

  const lines: string[] = []
  lines.push(`一致件数: ${history.matchedCount}件`)

  history.popularMoves.slice(0, 3).forEach((move, index) => {
    const winRate = Math.round(move.movePlayerWinRate * 100)

    let label = ""
    if (winRate >= 80) label = "勝率高め"
    else if (winRate >= 60) label = "勝率やや高め"
    else if (winRate <= 20) label = "勝率低め"
    else if (winRate <= 40) label = "勝率やや低め"
    else label = "勝率は概ね平均的"

    lines.push(
      `${index + 1}. ${move.moveText} (${move.count}件 / 勝率 ${winRate}% / ${label})`
    )
  })

  return lines.join("\n")
}

const buildChatGuidance = (input: FullAiInput, userQuestion: string) => {
  const intent = detectQuestionIntent(userQuestion)
  const history = input.historicalContext

  if (!history || history.matchedCount === 0) {
    return "・過去棋譜傾向はないため、触れなくてよい"
  }

  switch (intent) {
    case "history":
      return `
・ユーザーは実戦傾向を知りたがっている
・過去棋譜傾向を優先して説明してよい
・最も多い手を中心に説明する
・ただし最善手とは限らないことも軽く触れる
`.trim()

    case "best":
      return `
・ユーザーは最善手を知りたがっている
・評価値や候補手を優先する
・過去棋譜傾向は補足としてのみ使う
・人気手と最善手が違う場合はその違いを説明する
`.trim()

    case "why":
      return `
・ユーザーは理由を知りたがっている
・局面の変化（攻め・守り・駒の働き）を優先する
・過去棋譜傾向は必要なら一言触れる程度にする
`.trim()

    default:
      return `
・局面説明を優先する
・過去棋譜傾向は補助的に使う
`.trim()
  }
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
  const historicalSummary = buildHistoricalSummary(input)
  const historicalConfidenceHint = buildHistoricalConfidenceHint(input)
  const historyVsEvaluationHint = buildHistoryVsEvaluationHint(input)
  const threeAxisGuidance = buildThreeAxisGuidance(input)

  const chatGuidance =
  followupMode === "chat"
    ? buildChatGuidance(input, userQuestion)
    : ""

  return `
あなたは将棋の解説AIです。

以下のルールで回答してください。

〖基本ルール〗
・簡潔に答える
・局面に基づいて説明する
・「なぜ良いか」は、攻め・守り・駒の働き・形の良さで説明する
・明確で自明な情報を無駄に長く説明しない
・断定しすぎず、局面情報から言える範囲で述べる
・初手付近では、形の自然さや駒組みの自由度を優先して説明する
・初手や序盤の浅い局面では、「〜系になりやすい」といった戦型寄りの言い方は控えめにする

〖戦型・囲い・特徴の扱い〗
・序盤の手数が浅い局面では、戦型を断定しすぎない
・戦型情報があれば、序盤の狙いや形の方向性の説明に使ってよい
・囲い情報があれば、守りの形との関係説明に使ってよい
・confidence が低い囲いは断定しすぎない
・局面特徴があれば、説明の補助根拠として使ってよい

〖過去棋譜傾向の扱い〗
${historicalGuidance}

〖最重要ルール〗
・「最善手」と「実戦で多い手」は別物として扱う
・人気手だから最善とは限らない
・評価値が良い手と、過去に多い手が違う場合は、その違いを自然に説明する
・過去棋譜傾向は補助情報であり、局面評価そのものの代わりにはならない

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
他の候補手を1〜2個だけ簡潔に説明
必要なら実戦傾向にも軽く触れてよい
見出しや番号は不要

- chat：
今回のユーザー質問に自然な会話文で答える
2〜4文程度で簡潔に答える
ユーザーが「よく指される手」「実戦で多い手」を聞いているなら、過去棋譜傾向を優先して答えてよい
ユーザーが「最善手」を聞いているなら、評価・候補手を優先して答える
必要なら「実戦では多いが最善とは限らない」と説明する
見出しや番号は不要

〖これまでの会話履歴〗
${conversationHistory || "なし"}

〖今回のユーザー質問〗
${userQuestion || "なし"}

〖質問意図に応じた方針〗
${chatGuidance}

〖過去棋譜傾向の要約〗
${historicalSummary}

〖局面データ〗
${JSON.stringify(input, null, 2)}

〖戦型情報〗
${JSON.stringify(input.openingInfo)}

〖囲い情報〗
${JSON.stringify(input.castleInfo)}

〖局面特徴〗
${JSON.stringify(input.positionFeatures)}

〖過去棋譜傾向の信頼度〗
${historicalConfidenceHint}

〖勝率と評価のズレの扱い〗
${historyVsEvaluationHint}

〖3軸の統合ルール〗
${threeAxisGuidance}
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

const buildHistoricalConfidenceHint = (input: FullAiInput): string => {
  const history = input.historicalContext

  if (!history || history.matchedCount === 0 || history.popularMoves.length === 0) {
    return `
・過去棋譜傾向はないため、履歴には触れなくてよい
`.trim()
  }

  // 一致件数が少なすぎる
  if (history.matchedCount <= 2) {
    return `
・一致件数が少ないため、履歴は参考程度として扱う
・「少数の実戦例では」「参考程度ですが」など弱い表現を使う
・この情報だけで傾向を強く断定しない
`.trim()
  }

  // 1位がかなり偏っている
  if (history.matchedCount >= 5 && history.topMoveShare >= 0.6) {
    return `
・過去棋譜傾向は比較的はっきりしている
・最も多い手は実戦で目立って多いと言ってよい
・ただし最善手とは限らないので必要なら補足する
`.trim()
  }

  // 件数はあるが割れている
  if (history.matchedCount >= 5 && history.topMoveShare < 0.6) {
    return `
・過去棋譜傾向はあるが、指し手はある程度分散している
・「最も多い手」ではあるが、はっきり多いとは言いすぎない
`.trim()
  }

  // 中間
  return `
・過去棋譜傾向は一定数あるため、実戦傾向として軽く触れてよい
・ただし、強い断定は避ける
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
