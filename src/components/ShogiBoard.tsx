import { useEffect, useMemo, useState } from "react"
import type { Board } from "../core/board/Board"
import type { Move } from "../core/board/Move"
import type { Piece, PieceType } from "../core/board/Piece"
import type { Position } from "../core/board/Position"
import { AttackDetector } from "../core/rules/AttackDetector"
import { MoveApplier } from "../core/rules/MoveApplier"
import { MoveGenerator } from "../core/rules/MoveGenerator"
import { PromoteModal } from "./PromoteModal"

type Props = {
  board: Board
  onChangeBoard: (nextBoard: Board) => void
  lastMove: Move | null
  onMoveApplied: (move: Move) => void
  animatingMove: Move | null
  onAnimatingMoveChange: (move: Move | null) => void
  disabled: boolean
}

const PIECE_LABELS: Record<PieceType, string> = {
  FU: "歩",
  KY: "香",
  KE: "桂",
  GI: "銀",
  KI: "金",
  KA: "角",
  HI: "飛",
  OU: "玉",
  TO: "と",
  NY: "杏",
  NK: "圭",
  NG: "全",
  UM: "馬",
  RY: "龍",
}

const PROMOTED_TYPES = ["TO", "NG", "NK", "NY", "RY", "UM"]

const CELL_SIZE = 56
const ANIMATION_MS = 220

// レイアウト安定用の高さ定数
const TURN_INFO_HEIGHT = 28
const SELECT_INFO_HEIGHT = 28
const HAND_AREA_MIN_HEIGHT = 80
const HAND_LIST_MIN_HEIGHT = 46

function renderPiece(piece: Piece | null) {
  if (!piece) return null

  const prefix = piece.owner === "white" ? "▽" : "▲"
  const text = `${prefix}${PIECE_LABELS[piece.type]}`
  const isPromoted = PROMOTED_TYPES.includes(piece.type)

  return (
    <span
      style={{
        color: isPromoted ? "#c62828" : "#222",
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  )
}

function renderPieceLabel(owner: "black" | "white", piece: PieceType): string {
  const prefix = owner === "white" ? "▽" : "▲"
  return `${prefix}${PIECE_LABELS[piece]}`
}

function isSamePosition(a: Position | null, b: Position): boolean {
  return !!a && a.x === b.x && a.y === b.y
}

function groupHandPieces(hand: PieceType[]): { piece: PieceType; count: number }[] {
  const map = new Map<PieceType, number>()

  for (const piece of hand) {
    map.set(piece, (map.get(piece) ?? 0) + 1)
  }

  const order: PieceType[] = ["FU", "KY", "KE", "GI", "KI", "KA", "HI"]

  return order
    .map(piece => ({
      piece,
      count: map.get(piece) ?? 0,
    }))
    .filter(item => item.count > 0)
}

type HandPieceButtonProps = {
  piece: PieceType
  count: number
  selected: boolean
  disabled: boolean
  onClick: () => void
}

function HandPieceButton({
  piece,
  count,
  selected,
  disabled,
  onClick,
}: HandPieceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        width: 44,
        height: 46,
        padding: 0,
        border: selected ? "2px solid #ff6f00" : "1px solid #8d6e63",
        background: selected ? "#ffcc80" : "#f3d9a4",
        color: "#492346",
        cursor: disabled ? "default" : "pointer",
        clipPath: "polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)",
        boxShadow: selected
          ? "0 0 0 2px rgba(255, 111, 0, 0.25)"
          : "0 2px 4px rgba(0,0,0,0.15)",
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 14,
          lineHeight: 1,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {PIECE_LABELS[piece]}
      </div>

      {count > 1 && (
        <div
          style={{
            position: "absolute",
            right: 3,
            bottom: 2,
            minWidth: 14,
            height: 14,
            padding: "0 3px",
            borderRadius: 999,
            background: "#5d4037",
            color: "#fff",
            fontSize: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </div>
      )}
    </button>
  )
}

export function ShogiBoard({
  board,
  onChangeBoard,
  lastMove,
  onMoveApplied,
  animatingMove,
  onAnimatingMoveChange,
  disabled,
}: Props) {
  const [selected, setSelected] = useState<Position | null>(null)
  const [selectedHandPiece, setSelectedHandPiece] = useState<PieceType | null>(null)
  const [promotionChoices, setPromotionChoices] = useState<Move[] | null>(null)

  // アニメーション開始フラグ
  const [animationStarted, setAnimationStarted] = useState(false)

  const attackDetector = useMemo(() => new AttackDetector(), [])
  const applier = useMemo(() => new MoveApplier(), [])
  const generator = useMemo(() => new MoveGenerator(), [])

  // 現局面の合法手
  const legalMoves = useMemo(() => {
    return generator.generateLegalMoves(board)
  }, [board, generator])

  // 選択中の盤上駒に対する合法手
  const selectedPieceLegalMoves = useMemo(() => {
    if (!selected) return []

    const piece = board.getPiece(selected)
    if (!piece) return []
    if (piece.owner !== board.getTurn()) return []

    return legalMoves.filter(
      move =>
        move.from &&
        move.from.x === selected.x &&
        move.from.y === selected.y
    )
  }, [selected, board, legalMoves])

  const legalTargets = selectedPieceLegalMoves.map(move => move.to)

  // 選択中の持ち駒に対する合法手
  const selectedHandLegalMoves = useMemo(() => {
    if (!selectedHandPiece) return []

    return legalMoves.filter(
      move => move.drop && move.piece === selectedHandPiece
    )
  }, [selectedHandPiece, legalMoves])

  const dropTargets = selectedHandLegalMoves.map(move => move.to)

  // アニメーションの開始・終了管理
  useEffect(() => {
    if (!animatingMove?.from) {
      setAnimationStarted(false)
      return
    }

    setAnimationStarted(false)

    const startTimer = window.setTimeout(() => {
      setAnimationStarted(true)
    }, 10)

    const endTimer = window.setTimeout(() => {
      onAnimatingMoveChange(null)
      setAnimationStarted(false)
    }, ANIMATION_MS + 30)

    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(endTimer)
    }
  }, [animatingMove, onAnimatingMoveChange])

  // 指し手を適用する
  const applyMove = (move: Move) => {
    // 打ちでない通常移動だけアニメーション対象
    if (move.from) {
      onAnimatingMoveChange(move)
    } else {
      onAnimatingMoveChange(null)
    }

    const nextBoard = applier.apply(board, move)
    onChangeBoard(nextBoard)
    onMoveApplied(move)

    // 選択状態をリセット
    setSelected(null)
    setSelectedHandPiece(null)
    setPromotionChoices(null)
  }

  const handlePromote = () => {
    if (!promotionChoices) return
    const move = promotionChoices.find(m => m.promote)
    if (!move) return
    applyMove(move)
  }

  const handleNotPromote = () => {
    if (!promotionChoices) return
    const move = promotionChoices.find(m => !m.promote)
    if (!move) return
    applyMove(move)
  }

  const handleClosePromoteModal = () => {
    setPromotionChoices(null)
  }

  const handleClick = (pos: Position) => {
    if (disabled) return
    const piece = board.getPiece(pos)

    // 持ち駒選択中なら打てるマスを優先
    if (selectedHandPiece) {
      const dropMove = selectedHandLegalMoves.find(
        m => m.to.x === pos.x && m.to.y === pos.y
      )

      if (dropMove) {
        applyMove(dropMove)
        return
      }

      setSelectedHandPiece(null)
      return
    }

    // 自分の駒をクリックしたら選択
    if (piece && piece.owner === board.getTurn()) {
      if (isSamePosition(selected, pos)) {
        setSelected(null)
      } else {
        setSelected(pos)
      }

      setSelectedHandPiece(null)
      return
    }

    // すでに盤上の駒を選択しているなら移動先を判定
    if (selected) {
      const candidateMoves = selectedPieceLegalMoves.filter(
        m => m.to.x === pos.x && m.to.y === pos.y
      )

      if (candidateMoves.length > 0) {
        const promoteMove = candidateMoves.find(m => m.promote)
        const normalMove = candidateMoves.find(m => !m.promote)

        // 成る / 成らない の両方がある場合はモーダル表示
        if (promoteMove && normalMove) {
          setPromotionChoices(candidateMoves)
          return
        }

        applyMove(candidateMoves[0])
        return
      }
    }

    setSelected(null)
    setSelectedHandPiece(null)
  }

  const handleHandClick = (piece: PieceType) => {
    if (selectedHandPiece === piece) {
      setSelectedHandPiece(null)
      return
    }

    setSelected(null)
    setSelectedHandPiece(piece)
  }

  const currentTurn = board.getTurn()
  const blackHand = board.getHand("black")
  const whiteHand = board.getHand("white")

  const groupedBlackHand = groupHandPieces(blackHand)
  const groupedWhiteHand = groupHandPieces(whiteHand)

  // 王手中の玉表示判定
  const blackInCheck = useMemo(() => {
    return attackDetector.isKingInCheck(board, "black")
  }, [board, attackDetector])

  const whiteInCheck = useMemo(() => {
    return attackDetector.isKingInCheck(board, "white")
  }, [board, attackDetector])

  // 駒選択中 / 持ち駒選択中は他マスを少し暗くする
  const isRestrictMode = !!selected || !!selectedHandPiece

  const cells: React.ReactNode[] = []

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const pos = { x, y }
      const piece = board.getPiece(pos)

      const isCheckedKing =
        !!piece &&
        piece.type === "OU" &&
        (
          (piece.owner === "black" && blackInCheck) ||
          (piece.owner === "white" && whiteInCheck)
        )

      const isSelected = isSamePosition(selected, pos)
      const isLegalTarget = legalTargets.some(p => p.x === x && p.y === y)
      const isDropTarget = dropTargets.some(p => p.x === x && p.y === y)

      const isLastFrom =
        !!lastMove?.from &&
        lastMove.from.x === x &&
        lastMove.from.y === y

      const isLastTo =
        !!lastMove &&
        lastMove.to.x === x &&
        lastMove.to.y === y

      // アニメ中は元マスの駒を一旦隠す
      const isAnimatingFrom =
        !!animatingMove?.from &&
        animatingMove.from.x === x &&
        animatingMove.from.y === y

      // アニメ中は先マスの駒も一瞬隠す
      const isAnimatingTo =
        !!animatingMove &&
        animatingMove.to.x === x &&
        animatingMove.to.y === y

      let backgroundColor = "#f3d9a4"
      let border = "1px solid #333"
      let boxShadow = "none"

      if (isSelected) {
        backgroundColor = "#ffcc80"
        border = "2px solid #ef6c00"
      } else if (isRestrictMode && (isLegalTarget || isDropTarget)) {
        backgroundColor = "#f3d9a4"
      } else if (isRestrictMode) {
        backgroundColor = "#f3d9a4"
        boxShadow = "inset 0 0 0 9999px rgba(0,0,0,0.12)"
      }

      // 王手中の玉を赤くする
      if (isCheckedKing) {
        backgroundColor = "#ef9a9a"
        border = "2px solid #c62828"
      }

      // 最終手ハイライト
      if (!isRestrictMode && isLastFrom) {
        backgroundColor = "#ffe082"
      }
      if (!isRestrictMode && isLastTo) {
        backgroundColor = "#ffca28"
        border = "2px solid #f57f17"
      }

      const shouldHidePiece = isAnimatingFrom || isAnimatingTo

      cells.push(
        <div
          key={`${x}-${y}`}
          onClick={() => handleClick(pos)}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor,
            boxShadow,
            cursor: selectedHandPiece ? "crosshair" : "pointer",
            fontSize: 18,
            fontWeight: "bold",
            userSelect: "none",
            boxSizing: "border-box",
            transition: "background-color 0.15s ease, border 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          {shouldHidePiece ? "" : renderPiece(piece)}
        </div>
      )
    }
  }

  // アニメーション中に飛ばす駒ラベル
  const animatedPieceLabel =
    animatingMove?.from
      ? renderPieceLabel(
          board.getTurn() === "black" ? "white" : "black",
          animatingMove.promote
            ? (animatingMove.piece === "FU" ? "TO"
              : animatingMove.piece === "KY" ? "NY"
              : animatingMove.piece === "KE" ? "NK"
              : animatingMove.piece === "GI" ? "NG"
              : animatingMove.piece === "KA" ? "UM"
              : animatingMove.piece === "HI" ? "RY"
              : animatingMove.piece)
            : animatingMove.piece
        )
      : ""

  const overlayStyle =
    animatingMove?.from
      ? {
          position: "absolute" as const,
          left: animatingMove.from.x * CELL_SIZE,
          top: animatingMove.from.y * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: "bold",
          pointerEvents: "none" as const,
          transform: animationStarted
            ? `translate(${(animatingMove.to.x - animatingMove.from.x) * CELL_SIZE}px, ${(animatingMove.to.y - animatingMove.from.y) * CELL_SIZE}px)`
            : "translate(0px, 0px)",
          transition: `transform ${ANIMATION_MS}ms ease`,
          zIndex: 10,
        }
      : undefined

  return (
    <div>
      {/* 手番表示。内容が変わっても高さを固定する */}
      <div
        style={{
          marginBottom: 8,
          minHeight: TURN_INFO_HEIGHT,
          display: "flex",
          alignItems: "center",
        }}
      >
        手番: {currentTurn === "black" ? "先手" : "後手"}
      </div>

      {/* 持ち駒選択中表示。非表示でも高さを維持する */}
      <div
        style={{
          marginBottom: 12,
          minHeight: SELECT_INFO_HEIGHT,
          display: "flex",
          alignItems: "center",
        }}
      >
        {selectedHandPiece && (
          <span style={{ color: "#ff9800", fontWeight: "bold", fontSize: 16 }}>
            持ち駒選択中: {PIECE_LABELS[selectedHandPiece]}
          </span>
        )}
      </div>

      {/* 後手持ち駒エリア。持ち駒数で高さが変わらないようにする */}
      <div
        style={{
          marginBottom: 12,
          minHeight: HAND_AREA_MIN_HEIGHT,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: "bold" }}>後手持ち駒</div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            minHeight: HAND_LIST_MIN_HEIGHT,
            alignItems: "center",
          }}
        >
          {groupedWhiteHand.length === 0 && <span>なし</span>}

          {groupedWhiteHand.map(({ piece, count }) => {
            const isSelectedHand = selectedHandPiece === piece && currentTurn === "white"

            return (
              <HandPieceButton
                key={`white-${piece}`}
                piece={piece}
                count={count}
                selected={isSelectedHand}
                disabled={currentTurn !== "white" || disabled}
                onClick={() => handleHandClick(piece)}
              />
            )
          })}
        </div>
      </div>

      {/* 将棋盤本体。固定サイズで表示する */}
      <div
        style={{
          position: "relative",
          width: CELL_SIZE * 9,
          height: CELL_SIZE * 9,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(9, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(9, ${CELL_SIZE}px)`,
            width: "fit-content",
            border: "2px solid #333",
          }}
        >
          {cells}
        </div>

        {/* 駒移動アニメーション用オーバーレイ */}
        {animatingMove?.from && overlayStyle && (
          <div style={overlayStyle}>
            {animatedPieceLabel}
          </div>
        )}
      </div>

      {/* 先手持ち駒エリア。こちらも高さを固定する */}
      <div
        style={{
          marginTop: 12,
          minHeight: HAND_AREA_MIN_HEIGHT,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: "bold" }}>先手持ち駒</div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            minHeight: HAND_LIST_MIN_HEIGHT,
            alignItems: "center",
          }}
        >
          {groupedBlackHand.length === 0 && <span>なし</span>}

          {groupedBlackHand.map(({ piece, count }) => {
            const isSelectedHand = selectedHandPiece === piece && currentTurn === "black"

            return (
              <HandPieceButton
                key={`black-${piece}`}
                piece={piece}
                count={count}
                selected={isSelectedHand}
                disabled={currentTurn !== "black" || disabled}
                onClick={() => handleHandClick(piece)}
              />
            )
          })}
        </div>
      </div>

      <PromoteModal
        isOpen={promotionChoices !== null}
        onPromote={handlePromote}
        onNotPromote={handleNotPromote}
        onClose={handleClosePromoteModal}
      />
    </div>
  )
}