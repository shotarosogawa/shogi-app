// src/core/analysis/buildFullAiInput.ts

import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { PieceType, Player } from "../board/Piece"
import type { MoveAnalysisContext } from "./MoveAnalysisContext"
import type { CandidateMoveAnalysis } from "./analyzeCandidateMoves"
import type { OpeningInfo } from "./detectOpening"
import type { CastleInfo } from "./detectCastle"
import type { PositionFeatures } from "./extractPositionFeatures"
import type { SimilarPositionResult } from "../history/findSimilarPositions"
import type { EngineAnalysisResult } from "../engine/EngineAnalysisResult"
import { MoveApplier } from "../rules/MoveApplier"
import { AttackDetector } from "../rules/AttackDetector"
import { usiToJapanese } from "../utils/usiToJapanese"

type AiSquareState = {
  owner: Player
  piece: PieceType
} | null

type AiBoardState = Record<string, AiSquareState>

type AiPvStepDelta = {
  moveLabel: string
  changedSquares: Record<string, AiSquareState>
  capturedPiece: AiSquareState
  isPromote: boolean
  isDrop: boolean
  givesCheck: boolean
}

type AiLineInfo = {
  /**
   * 指した側視点に正規化済みの評価値
   * 良いほど大きい
   */
  evaluationCp: number | null

  /**
   * 指した側視点の mate 情報
   * 正: 指した側に詰みあり
   * 負: 指した側が詰まされる
   * null: mate 情報なし
   */
  mate: number | null

  steps: AiPvStepDelta[]
}

type AiCandidateSummary = {
  moveLabel: string
  score: number | null
  scoreDiff: number | null
  isBest: boolean
}

export type FullAiInput = {
  moveIndex: number
  lineType: "mainline" | "variation"

  playedMoveLabel: string | null

  baseBoard: AiBoardState | null

  bestLine: AiLineInfo | null
  playedLine: AiLineInfo | null

  openingInfo: OpeningInfo
  castleInfo: CastleInfo
  positionFeatures: PositionFeatures
  historicalContext: SimilarPositionResult | null

  candidates: AiCandidateSummary[]
}

// =========================
// PV設定（ここだけ変えればOK）
// =========================
const PV_MAX_STEPS = 4
const PLAYED_FIRST_STEP_WEIGHT = 1 // 実際の手分

const moveApplier = new MoveApplier()
const attackDetector = new AttackDetector()

const squareKey = (x: number, y: number) => `${x},${y}`

const boardToAiBoardState = (board: Board): AiBoardState => {
  const result: AiBoardState = {}

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })
      if (!piece) continue

      result[squareKey(x, y)] = {
        owner: piece.owner,
        piece: piece.type,
      }
    }
  }

  return result
}

const pieceToAiSquareState = (
  piece: ReturnType<Board["getPiece"]>
): AiSquareState => {
  if (!piece) return null

  return {
    owner: piece.owner,
    piece: piece.type,
  }
}

const moveToJapaneseLabel = (
  move: Move,
  beforeBoard: Board
): string => {
  if (move.drop) {
    const pieceLetterMap: Partial<Record<PieceType, string>> = {
      FU: "P",
      KY: "L",
      KE: "N",
      GI: "S",
      KI: "G",
      KA: "B",
      HI: "R",
    }

    const pieceLetter = pieceLetterMap[move.piece]
    if (!pieceLetter) return "不明な手"

    const toFile = 9 - move.to.x
    const toRank = String.fromCharCode("a".charCodeAt(0) + move.to.y)

    return usiToJapanese(`${pieceLetter}*${toFile}${toRank}`, beforeBoard)
  }

  if (!move.from) return "不明な手"

  const fromFile = 9 - move.from.x
  const fromRank = String.fromCharCode("a".charCodeAt(0) + move.from.y)
  const toFile = 9 - move.to.x
  const toRank = String.fromCharCode("a".charCodeAt(0) + move.to.y)
  const promote = move.promote ? "+" : ""

  return usiToJapanese(
    `${fromFile}${fromRank}${toFile}${toRank}${promote}`,
    beforeBoard
  )
}

const buildChangedSquares = (
  beforeBoard: Board,
  afterBoard: Board
): Record<string, AiSquareState> => {
  const changed: Record<string, AiSquareState> = {}

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const before = beforeBoard.getPiece({ x, y })
      const after = afterBoard.getPiece({ x, y })

      const beforeOwner = before?.owner ?? null
      const beforeType = before?.type ?? null
      const afterOwner = after?.owner ?? null
      const afterType = after?.type ?? null

      if (beforeOwner !== afterOwner || beforeType !== afterType) {
        changed[squareKey(x, y)] = pieceToAiSquareState(after)
      }
    }
  }

  return changed
}

const buildCapturedPiece = (
  beforeBoard: Board,
  move: Move
): AiSquareState => {
  if (move.drop) return null

  const target = beforeBoard.getPiece(move.to)
  return pieceToAiSquareState(target)
}

const buildStepDelta = (
  beforeBoard: Board,
  move: Move
): AiPvStepDelta => {
  const afterBoard = moveApplier.apply(beforeBoard, move)

  // apply後は手番が反転しているので、afterBoard.getTurn() 側が「王手されている側」
  const givesCheck = attackDetector.isKingInCheck(afterBoard, afterBoard.getTurn())

  return {
    moveLabel: moveToJapaneseLabel(move, beforeBoard),
    changedSquares: buildChangedSquares(beforeBoard, afterBoard),
    capturedPiece: buildCapturedPiece(beforeBoard, move),
    isPromote: !!move.promote,
    isDrop: !!move.drop,
    givesCheck,
  }
}

const parseUsiToMove = (usi: string, board: Board): Move | null => {
  try {
    // 打ち（例: P*5e）
    if (usi.includes("*")) {
      const [pieceLetter, to] = usi.split("*")

      const pieceMap: Record<string, PieceType> = {
        P: "FU",
        L: "KY",
        N: "KE",
        S: "GI",
        G: "KI",
        B: "KA",
        R: "HI",
      }

      const piece = pieceMap[pieceLetter]
      if (!piece) return null

      const file = Number(to[0])
      const rank = to[1].charCodeAt(0) - "a".charCodeAt(0)

      const move: Move = {
        piece,
        to: {
          x: 9 - file,
          y: rank,
        },
        drop: true,
        promote: false,
      }

      return move
    }

    // 通常手（例: 2b5e, 2b5e+）
    const fromFile = Number(usi[0])
    const fromRank = usi[1].charCodeAt(0) - "a".charCodeAt(0)
    const toFile = Number(usi[2])
    const toRank = usi[3].charCodeAt(0) - "a".charCodeAt(0)

    const promote = usi.length === 5 && usi[4] === "+"

    const from = {
      x: 9 - fromFile,
      y: fromRank,
    }

    const to = {
      x: 9 - toFile,
      y: toRank,
    }

    const pieceOnBoard = board.getPiece(from)
    if (!pieceOnBoard) return null

    const move: Move = {
      piece: pieceOnBoard.type,
      from,
      to,
      drop: false,
      promote,
    }

    return move
  } catch {
    return null
  }
}

const appendMoveIfMissing = (
  firstMoveUsi: string | null,
  pv: string[]
): string[] => {
  if (!firstMoveUsi) return pv

  if (pv.length === 0) {
    return [firstMoveUsi]
  }

  if (pv[0] === firstMoveUsi) {
    return pv
  }

  return [firstMoveUsi, ...pv]
}

const buildPvSteps = (
  startBoard: Board,
  usiMoves: string[],
  maxSteps = 4
): AiPvStepDelta[] => {
  const steps: AiPvStepDelta[] = []
  let currentBoard = startBoard

  for (const usi of usiMoves.slice(0, maxSteps)) {
    const move = parseUsiToMove(usi, currentBoard)
    if (!move) {
      break
    }

    const step = buildStepDelta(currentBoard, move)
    steps.push(step)

    currentBoard = moveApplier.apply(currentBoard, move)
  }

  return steps
}

/**
 * 先手視点cpを、指した側視点cpに正規化する
 * 正規化後は「良いほど大きい」
 */
const normalizeCpForPlayer = (
  cp: number | null,
  player: Player
): number | null => {
  if (cp === null) return null

  // evaluationCp は先手視点:
  // black(先手) はそのまま
  // white(後手) は反転
  return player === "black" ? cp : -cp
}

const buildCandidateSummaries = (
  candidates: CandidateMoveAnalysis[],
  beforeBoard: Board | null,
  player: Player | null
): AiCandidateSummary[] => {
  if (!beforeBoard || candidates.length === 0) return []

  const bestScore = candidates[0]?.score ?? null

  return candidates.slice(0, 3).map((candidate, index) => {
    const moveLabel = moveToJapaneseLabel(candidate.move, beforeBoard)

    const normalizedScore =
      player !== null
        ? normalizeCpForPlayer(candidate.score, player)
        : candidate.score

    const normalizedBestScore =
      player !== null && bestScore !== null
        ? normalizeCpForPlayer(bestScore, player)
        : bestScore

    const scoreDiff =
      normalizedScore !== null && normalizedBestScore !== null
        ? normalizedBestScore - normalizedScore
        : null

    return {
      moveLabel,
      score: normalizedScore,
      scoreDiff,
      isBest: index === 0,
    }
  })
}

/**
 * mate代用値をmate情報に変換する
 *
 * 前提:
 * - evaluationCp に 30000 / -30000 のような値が入ることがある
 * - 正負は先手視点
 *
 * 返り値:
 * - 指した側にとって良いmateなら正
 * - 指した側が詰まされるなら負
 */
const extractMateFromCp = (
  cp: number | null,
  player: Player
): number | null => {
  if (cp === null) return null

  // 代用値閾値。必要なら後で調整
  if (Math.abs(cp) < 20000) {
    return null
  }

  const normalized = normalizeCpForPlayer(cp, player)
  if (normalized === null) return null

  // 手数不明なので符号だけ残す
  return normalized > 0 ? 1 : -1
}

/**
 * mate代用値なら cp 表示は捨てる
 */
const sanitizeCp = (cp: number | null): number | null => {
  if (cp === null) return null
  if (Math.abs(cp) >= 20000) return null
  return cp
}

const buildBestLine = (
  beforeBoard: Board | null,
  engineAnalysis: EngineAnalysisResult | null,
  player: Player | null
): AiLineInfo | null => {
  if (!beforeBoard || !engineAnalysis) return null

  const rawCp = engineAnalysis.evaluationCp
  const normalizedCp =
    player !== null
      ? normalizeCpForPlayer(sanitizeCp(rawCp), player)
      : sanitizeCp(rawCp)

  const mate =
    player !== null
      ? extractMateFromCp(rawCp, player)
      : null

  const pvUsi = appendMoveIfMissing(
    engineAnalysis.bestMove,
    engineAnalysis.principalVariation
  )

  return {
    evaluationCp: normalizedCp,
    mate,
    steps: buildPvSteps(beforeBoard, pvUsi, PV_MAX_STEPS),
  }
}

const buildPlayedLine = (
  ctx: MoveAnalysisContext | null,
  afterEngineAnalysis: EngineAnalysisResult | null,
  player: Player | null
): AiLineInfo | null => {
  if (!ctx) return null

  const rawCp = afterEngineAnalysis?.evaluationCp ?? null
  const normalizedCp =
    player !== null
      ? normalizeCpForPlayer(sanitizeCp(rawCp), player)
      : sanitizeCp(rawCp)

  const mate =
    player !== null
      ? extractMateFromCp(rawCp, player)
      : null

  const firstStep = buildStepDelta(ctx.beforeBoard, ctx.move)
  const afterBoard = moveApplier.apply(ctx.beforeBoard, ctx.move)

  const remainingSteps = Math.max(
    PV_MAX_STEPS - PLAYED_FIRST_STEP_WEIGHT,
    0
  )

  const pvSteps = afterEngineAnalysis
    ? buildPvSteps(afterBoard, afterEngineAnalysis.principalVariation, remainingSteps)
    : []

  return {
    evaluationCp: normalizedCp,
    mate,
    steps: [firstStep, ...pvSteps],
  }
}

export const buildFullAiInput = (
  ctx: MoveAnalysisContext | null,
  _candidates: CandidateMoveAnalysis[],
  openingInfo: OpeningInfo,
  castleInfo: CastleInfo,
  positionFeatures: PositionFeatures,
  historicalContext: SimilarPositionResult | null = null,
  beforeEngineAnalysis: EngineAnalysisResult | null = null,
  afterEngineAnalysis: EngineAnalysisResult | null = null
): FullAiInput => {
  const player = ctx?.player ?? null

  return {
    moveIndex: ctx?.moveIndex ?? 0,
    lineType: ctx?.lineType ?? "mainline",

    playedMoveLabel: ctx ? moveToJapaneseLabel(ctx.move, ctx.beforeBoard) : null,

    baseBoard: ctx ? boardToAiBoardState(ctx.beforeBoard) : null,

    bestLine: buildBestLine(
      ctx?.beforeBoard ?? null,
      beforeEngineAnalysis,
      player
    ),

    playedLine: buildPlayedLine(
      ctx,
      afterEngineAnalysis,
      player
    ),

    openingInfo,
    castleInfo,
    positionFeatures,
    historicalContext,

    candidates: buildCandidateSummaries(
      _candidates,
      ctx?.beforeBoard ?? null,
      player
    ),
  }
}