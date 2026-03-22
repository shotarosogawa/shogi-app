import type { FullAiInput } from "./buildFullAiInput"

type FollowupMode = "none" | "why" | "best" | "other" | "chat"

const buildHistoricalGuidance = (input: FullAiInput): string => {
  const history = input.historicalContext

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
`.trim()
  }

  if (history.matchedCount <= 9) {
    return `
・過去棋譜傾向は一定数あるため、実戦傾向として軽く触れてよい
・ただし、評価値や候補手の比較より優先してはいけない
・「実戦では〜が比較的多い」「過去例では〜がよく指される」程度の表現にする
`.trim()
  }

  return `
・過去棋譜傾向は十分な一致件数があるため、実戦傾向として説明に含めてよい
・ただし、最善手と人気手は別物なので混同しない
・評価値や候補手比較と矛盾する場合は、局面評価を優先して説明する
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
    const winRatePercent = Math.round(move.movePlayerWinRate * 100)
    lines.push(
      `${index + 1}. ${move.moveText} (${move.count}件 / 指した側勝率 ${winRatePercent}%)`
    )
  })

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
  const historicalSummary = buildHistoricalSummary(input)

  return `
あなたは将棋の解説AIです。

以下のルールで回答してください。

〖基本ルール〗
・簡潔に答える
・専門用語は必要最小限にする
・局面に基づいて説明する
・「なぜ良いか」は、攻め・守り・駒の働き・形の良さで説明する
・明確で自明な情報を無駄に長く説明しない
・断定しすぎず、局面情報から言える範囲で述べる

〖戦型・囲い・特徴の扱い〗
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
`.trim()
}