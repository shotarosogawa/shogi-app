import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { PieceType, Player } from "../board/Piece"
import type { MoveAnalysisContext } from "./MoveAnalysisContext"
import type { CandidateMoveAnalysis } from "./analyzeCandidateMoves"
import type { MoveComparison } from "./compareWithBestMove"
import type { CastleInfo } from "./detectCastle"
import type { OpeningInfo } from "./detectOpening"
import type { PositionFeatures } from "./extractPositionFeatures"

type AiSquare = {
  x: number
  y: number
  label: string
}

type AiPieceState = {
  square: AiSquare
  owner: Player
  type: PieceType
}

type AiMoveState = {
  from: AiSquare | null
  to: AiSquare
  piece: PieceType
  drop: boolean
  promote: boolean
}

type AiBoardState = {
  turn: Player
  board: AiPieceState[]
  blackHand: PieceType[]
  whiteHand: PieceType[]
}

export type FullAiInput = {
  moveIndex: number
  lineType: "mainline" | "variation"
  move: AiMoveState | null
  moveContext: {
    player: Player
    isDrop: boolean
    isPromote: boolean
    capturedPieceType: PieceType | null
    givesCheck: boolean
  } | null
  beforeBoard: AiBoardState | null
  afterBoard: AiBoardState
  evaluation: {
    current: number
    best: number
    diff: number
    isBestMove: boolean
  } | null
  candidates: Array<{
    move: AiMoveState
    score: number
  }>
  openingInfo: OpeningInfo
  castleInfo: CastleInfo
  positionFeatures: PositionFeatures
}

/**
 * AI向けに盤面を完全な形でダンプする
 */
const squareToLabel = (x: number, y: number) => {
  const file = 9 - x
  const rank = y + 1
  return `${file}${rank}`
}

const toAiSquare = (x: number, y: number): AiSquare => {
  return {
    x,
    y,
    label: squareToLabel(x, y),
  }
}

const dumpBoard = (board: Board): AiBoardState => {
  const pieces: AiPieceState[] = []

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board.getPiece({ x, y })
      if (!piece) continue

      pieces.push({
        square: toAiSquare(x, y),
        owner: piece.owner,
        type: piece.type,
      })
    }
  }

  return {
    turn: board.getTurn(),
    board: pieces,
    blackHand: [...board.getHand("black")],
    whiteHand: [...board.getHand("white")],
  }
}

const moveToAiMove = (move: Move): AiMoveState => {
  return {
    from: move.from ? toAiSquare(move.from.x, move.from.y) : null,
    to: toAiSquare(move.to.x, move.to.y),
    piece: move.piece,
    drop: !!move.drop,
    promote: !!move.promote,
  }
}

/**
 * ChatGPTに渡すための完全入力を構築する
 *
 * まずは「重くても正確」を優先し、
 * before/after の全駒配置を含める
 */
export const buildFullAiInput = (
  ctx: MoveAnalysisContext | null,
  candidates: CandidateMoveAnalysis[],
  comparison: MoveComparison | null,
  currentBoard: Board,
  openingInfo: OpeningInfo,
  castleInfo: CastleInfo,
  positionFeatures: PositionFeatures
): FullAiInput => {
  return {
    moveIndex: ctx?.moveIndex ?? 0,
    lineType: ctx?.lineType ?? "mainline",
    move: ctx ? moveToAiMove(ctx.move) : null,
    moveContext: ctx
      ? {
          player: ctx.player,
          isDrop: ctx.isDrop,
          isPromote: ctx.isPromote,
          capturedPieceType: ctx.capturedPieceType,
          givesCheck: ctx.givesCheck,
        }
      : null,
    beforeBoard: ctx ? dumpBoard(ctx.beforeBoard) : null,
    afterBoard: dumpBoard(ctx ? ctx.afterBoard : currentBoard),
    evaluation: comparison
      ? {
          current: comparison.currentScore,
          best: comparison.bestScore,
          diff: comparison.scoreDiff,
          isBestMove: comparison.isBestMove,
        }
      : null,
    candidates: candidates.slice(0, 5).map(item => ({
      move: moveToAiMove(item.move),
      score: item.score,
    })),
    openingInfo,
    castleInfo,
    positionFeatures,
  }
}