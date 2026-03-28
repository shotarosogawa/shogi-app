import type { MoveAnalysisContext } from "./MoveAnalysisContext"
import type { EngineAnalysisResult } from "../engine/EngineAnalysisResult"

export type MoveComparison = {
  currentScore: number
  bestScore: number
  scoreDiff: number
  isBestMove: boolean
}

/**
 * Move を USI に変換
 * 例:
 * - 通常手: 2b5e
 * - 成り:   2b5e+
 * - 打ち:   B*5e
 */
const moveToUsi = (ctx: MoveAnalysisContext): string => {
  const move = ctx.move

  // 打ち
  if (move.drop) {
    const pieceLetterMap = {
      FU: "P",
      KY: "L",
      KE: "N",
      GI: "S",
      KI: "G",
      KA: "B",
      HI: "R",
    } as const

    const pieceLetter = pieceLetterMap[move.piece as keyof typeof pieceLetterMap]
    if (!pieceLetter) {
      return ""
    }

    const toFile = 9 - move.to.x
    const toRank = String.fromCharCode("a".charCodeAt(0) + move.to.y)

    return `${pieceLetter}*${toFile}${toRank}`
  }

  // 通常手
  if (!move.from) {
    return ""
  }

  const fromFile = 9 - move.from.x
  const fromRank = String.fromCharCode("a".charCodeAt(0) + move.from.y)
  const toFile = 9 - move.to.x
  const toRank = String.fromCharCode("a".charCodeAt(0) + move.to.y)
  const promote = move.promote ? "+" : ""

  return `${fromFile}${fromRank}${toFile}${toRank}${promote}`
}

/**
 * 現在の手とエンジン最善手を比較する
 *
 * 注意:
 * - currentScore は、現在の手が MultiPV 候補に含まれている場合のみ取得できる
 * - 候補外の手は、この時点では正確な cp が分からないため null 扱いにしたいが、
 *   既存型に合わせて comparison 自体を null 返却にしている
 */
export const compareWithBestMove = (
  ctx: MoveAnalysisContext | null,
  engineAnalysis: EngineAnalysisResult | null
): MoveComparison | null => {
  if (!ctx || !engineAnalysis || !engineAnalysis.bestMove) {
    return null
  }

  const bestScore = engineAnalysis.evaluationCp
  if (bestScore === null) {
    return null
  }

  const currentUsi = moveToUsi(ctx)
  if (!currentUsi) {
    return null
  }

  const bestUsi = engineAnalysis.bestMove
  const isBestMove = currentUsi === bestUsi

  // 最善手そのものなら current = best
  if (isBestMove) {
    return {
      currentScore: bestScore,
      bestScore,
      scoreDiff: 0,
      isBestMove: true,
    }
  }

  // MultiPV 候補内にあるなら、その評価値を使用
  const currentCandidate = engineAnalysis.candidates.find(candidate => {
    return candidate.moveText === currentUsi
  })

  if (!currentCandidate || currentCandidate.evaluationCp === null) {
    // 候補外の手は、この比較だけでは正確な currentScore が取れない
    // ここで適当な値を入れると、また「互角」事故が起きるので null を返す
    return null
  }

  const currentScore = currentCandidate.evaluationCp

  return {
    currentScore,
    bestScore,
    scoreDiff: currentScore - bestScore,
    isBestMove: false,
  }
}