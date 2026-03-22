import type { FullAiInput } from "./buildFullAiInput"

type FollowupMode = "none" | "why" | "best" | "other" | "chat"

/**
 * ChatGPT に渡す解析用プロンプトを生成する
 */
export function buildAnalysisPrompt(
  input: FullAiInput,
  followupMode: FollowupMode = "none",
  conversationHistory: string = "",
  userQuestion: string = ""
): string {
  return `
あなたは将棋の解説AIです。

以下のルールで回答してください。

【ルール】
・簡潔に
・専門用語は最小限
・明確な情報（王手など）は説明しない
・与えられた局面情報だけを根拠にする
・「なぜ良いか」は局面の変化（攻め・守り・駒の働き）で説明する
・序盤なら予想される戦型を添える
・戦型情報や囲い情報がある場合は、その手が形作りにどう関係するかを説明してよい
・ただし、confidence が低い囲いは断定しすぎない
・会話履歴がある場合は、その流れを踏まえて答える
・ただし、局面根拠のない断定はしない

【現在の followupMode】
${followupMode}

【followupModeごとの出力ルール】
- none：
  必ず4行で出力
  ① 評価：良い / 普通 / 悪い
  ② 一言：この手の狙い
  ③ 理由：なぜ良い/悪いか
  ④ 比較：最善手との差

- why：
  理由だけを2〜3行で説明
  見出しや番号は不要

- best：
  最善手だけを2〜3行で説明
  「最善手は〜」から始める

- other：
  他の候補手を1〜2個だけ簡潔に説明
  見出しや番号は不要

- chat：
  今回のユーザー質問に自然な会話文で答える
  2〜4文程度で簡潔に答える
  必要なら「この局面データからは断定できない」と述べる
  見出しや番号は不要

【これまでの会話履歴】
${conversationHistory || "なし"}

【今回のユーザー質問】
${userQuestion || "なし"}

【局面データ】
${JSON.stringify(input, null, 2)}

【戦型情報】
${JSON.stringify(input.openingInfo)}

【囲い情報】
${JSON.stringify(input.castleInfo)}

【局面特徴】
${JSON.stringify(input.positionFeatures)}
`.trim()
}