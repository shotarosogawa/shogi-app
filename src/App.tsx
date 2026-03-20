import { useEffect, useMemo, useRef, useState } from "react"
import "./App.css"
import { ShogiBoard } from "./components/ShogiBoard"
import type { AnalysisTarget } from "./core/analysis/AnalysisTarget"
import { analyzeCandidateMoves } from "./core/analysis/analyzeCandidateMoves"
import { buildAnalysisPrompt } from "./core/analysis/buildAnalysisPrompt"
import { buildFullAiInput } from "./core/analysis/buildFullAiInput"
import type { FullAiInput } from "./core/analysis/buildFullAiInput"
import { compareWithBestMove } from "./core/analysis/compareWithBestMove"
import { createAnalysisTarget } from "./core/analysis/createAnalysisTarget"
import { createMoveAnalysisContext } from "./core/analysis/createMoveAnalysisContext"
import type { MoveAnalysisContext } from "./core/analysis/MoveAnalysisContext"
import { BoardFactory } from "./core/board/BoardFactory"
import type { Board } from "./core/board/Board"
import type { Move } from "./core/board/Move"
import { AttackDetector } from "./core/rules/AttackDetector"
import { MoveGenerator } from "./core/rules/MoveGenerator"
import { isPerpetualCheckSennichite } from "./core/rules/perpetualCheck"
import { GameResultModal } from "./components/GameResultModal"
import { serializeBoard } from "./core/utils/boardSerializer"

type ReviewTab = "mainline" | "variation"
type SideTab = "kifu" | "analysis"

function App() {
  // 初期局面は初回だけ生成する
  const initialBoard = useMemo(() => BoardFactory.createInitialBoard(), [])

  // =========================
  // 通常対局用 state
  // =========================

  // 数字を漢数字に変換（段用）
  const numToKanji = (num: number) => {
    const map = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
    return map[num] ?? ""
  }

  // 駒名マップ（成りも含む）
  const PIECE_LABELS: Record<string, string> = {
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

  // 現在の対局盤面
  const [board, setBoard] = useState<Board>(initialBoard)

  // 本譜の棋譜
  const [moveHistory, setMoveHistory] = useState<Move[]>([])

  // 本譜の局面履歴
  const [boardHistory, setBoardHistory] = useState<Board[]>([initialBoard])

  // 各指し手が王手だったか
  const [moveChecks, setMoveChecks] = useState<boolean[]>([])

  // 局面キー履歴（千日手用）
  const [boardKeys, setBoardKeys] = useState<string[]>([
    serializeBoard(initialBoard),
  ])

  // 本譜の現在位置
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)

  // 本譜の最終手ハイライト用
  const [lastMove, setLastMove] = useState<Move | null>(null)

  // =========================
  // 感想戦用 state
  // =========================

  // 感想戦中かどうか
  const [isReviewMode, setIsReviewMode] = useState(false)

  // 感想戦の中で、本譜を見るか / 局面編集するか
  const [reviewTab, setReviewTab] = useState<ReviewTab>("mainline")

  // 感想戦で本譜を何手目として見ているか
  const [reviewMoveIndex, setReviewMoveIndex] = useState(0)

  // 局面編集用の盤面
  const [variationBoard, setVariationBoard] = useState<Board | null>(null)

  // 局面編集用の棋譜
  const [variationMoveHistory, setVariationMoveHistory] = useState<Move[]>([])

  // 局面編集用の局面履歴
  const [variationBoardHistory, setVariationBoardHistory] = useState<Board[]>([])

  // 局面編集用の現在位置
  const [variationMoveIndex, setVariationMoveIndex] = useState(0)

  // 局面編集用の最終手ハイライト
  const [variationLastMove, setVariationLastMove] = useState<Move | null>(null)

  // =========================
  // 共通 UI state
  // =========================

  // 駒移動アニメーション用
  const [animatingMove, setAnimatingMove] = useState<Move | null>(null)

  // 終局モーダル表示
  const [showResultModal, setShowResultModal] = useState(false)

  // 右パネルのタブ
  const [sideTab, setSideTab] = useState<SideTab>("kifu")

  // ルール関連クラスは使い回す
  const generator = useMemo(() => new MoveGenerator(), [])
  const attackDetector = useMemo(() => new AttackDetector(), [])

  // 棋譜リストの自動スクロール用
  const activeMoveRef = useRef<HTMLButtonElement | null>(null)

  const [analysisResult, setAnalysisResult] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState("")
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null)

  // =========================
  // 通常対局の終局判定
  // ※ 終局判定は本譜だけを対象にする
  // =========================

  const currentTurn = board.getTurn()

  const legalMoves = useMemo(() => {
    return generator.generateLegalMoves(board)
  }, [board, generator])

  const inCheck = useMemo(() => {
    return attackDetector.isKingInCheck(board, currentTurn)
  }, [board, currentTurn, attackDetector])

  // 現在局面のキー
  const currentBoardKey = boardKeys[currentMoveIndex]

  // 開始局面（index 0）は千日手カウントから除外する
  const sameBoardCount = boardKeys
    .slice(1)
    .filter(key => key === currentBoardKey)
    .length

  // 詰み / 合法手なし / 千日手
  const isCheckmate = legalMoves.length === 0 && inCheck
  const isNoLegalMoves = legalMoves.length === 0 && !inCheck
  const isSennichite = sameBoardCount >= 4

  // 詰み or 合法手なし → 投了扱い
  const isResign = isCheckmate || isNoLegalMoves

  // 終局扱い
  const isGameOver = isCheckmate || isNoLegalMoves || isSennichite

  // 連続王手千日手かどうか
  const isPerpetualCheck = isSennichite
    ? isPerpetualCheckSennichite(boardKeys, moveChecks, currentMoveIndex)
    : false

  // 終局行の表示内容をまとめる
  const gameResultItem = isPerpetualCheck
    ? {
        label: `${currentTurn === "black" ? "▲" : "△"}反則勝ち`,
        backgroundColor: "rgba(244, 67, 54, 0.12)",
      }
    : isSennichite
      ? {
          label: "千日手",
          backgroundColor: "rgba(255, 193, 7, 0.12)",
        }
      : isResign
        ? {
            label: `${currentTurn === "black" ? "▲" : "△"}投了`,
            backgroundColor: "rgba(244, 67, 54, 0.12)",
          }
        : null

  // 対局中のみ終局モーダルを表示する
  useEffect(() => {
    if (!isReviewMode && isGameOver) {
      setShowResultModal(true)
    }
  }, [isGameOver, isReviewMode])

  // 終局モーダル表示用メッセージ
  const resultTitle = isPerpetualCheck
    ? "反則勝ち"
    : isSennichite
      ? "千日手"
      : isResign
        ? "投了"
        : ""

  const resultMessage = isPerpetualCheck
    ? `${currentTurn === "black" ? "後手" : "先手"}の連続王手千日手により、${currentTurn === "black" ? "先手" : "後手"}の反則勝ちです。`
    : isSennichite
      ? "同一局面が4回出現したため千日手です。"
      : isResign
        ? `${currentTurn === "black" ? "後手" : "先手"}の勝ちです。`
        : ""

  // =========================
  // 表示用の盤面 / 最終手 / 操作可否
  // モードによって切り替える
  // =========================

  const displayBoard = useMemo(() => {
    // 通常対局中は対局盤面を表示
    if (!isReviewMode) {
      return board
    }

    // 感想戦の本譜閲覧中は、本譜履歴の指定局面を表示
    if (reviewTab === "mainline") {
      return boardHistory[reviewMoveIndex] ?? board
    }

    // 感想戦の局面編集中は、編集用盤面を表示
    return variationBoard ?? boardHistory[reviewMoveIndex] ?? board
  }, [isReviewMode, reviewTab, board, boardHistory, reviewMoveIndex, variationBoard])

  // 現在表示中の局面を、解析対象としてまとめる
  const currentAnalysisTarget: AnalysisTarget = useMemo(() => {
    if (!isReviewMode || reviewTab === "mainline") {
      return createAnalysisTarget({
        lineType: "mainline",
        moveIndex: !isReviewMode ? currentMoveIndex : reviewMoveIndex,
        boardHistory,
        moveHistory,
      })
    }

    return createAnalysisTarget({
      lineType: "variation",
      moveIndex: variationMoveIndex,
      boardHistory: variationBoardHistory,
      moveHistory: variationMoveHistory,
    })
  }, [
    isReviewMode,
    reviewTab,
    currentMoveIndex,
    reviewMoveIndex,
    variationMoveIndex,
    boardHistory,
    moveHistory,
    variationBoardHistory,
    variationMoveHistory,
  ])

  // 現在表示中の1手を、説明しやすい形へ変換する
  const currentMoveAnalysisContext: MoveAnalysisContext | null = useMemo(() => {
    return createMoveAnalysisContext(currentAnalysisTarget)
  }, [currentAnalysisTarget])

  // 現在局面の候補手を評価順に並べる
  const currentCandidateMoves = useMemo(() => {
    return analyzeCandidateMoves(displayBoard, legalMoves)
  }, [displayBoard, legalMoves])

  const currentMoveComparison = useMemo(() => {
    return compareWithBestMove(
      currentMoveAnalysisContext,
      currentCandidateMoves
    )
  }, [currentMoveAnalysisContext, currentCandidateMoves])

  const targetMoveContext = useMemo(() => {
    if (selectedCandidateIndex === null) {
      return currentMoveAnalysisContext
    }

    const candidate = currentCandidateMoves[selectedCandidateIndex]

    // 👇 ここが重要：仮想的にその手を適用した context を作る
    return createMoveAnalysisContext({
      ...currentAnalysisTarget,
      move: candidate.move,
    })
  }, [selectedCandidateIndex, currentMoveAnalysisContext, currentCandidateMoves, currentAnalysisTarget])

  // ChatGPTに渡すための完全入力
  const fullAiInput: FullAiInput = useMemo(() => {
    return buildFullAiInput(
      targetMoveContext,
      currentCandidateMoves,
      currentMoveComparison,
      displayBoard
    )
  }, [targetMoveContext, currentCandidateMoves, currentMoveComparison, displayBoard])

  // ChatGPT に渡す解析プロンプト
  const analysisPrompt = useMemo(() => {
    return buildAnalysisPrompt(fullAiInput)
  }, [fullAiInput])

  const analysisBoard = useMemo(() => {
    if (selectedCandidateIndex === null) {
      return displayBoard
    }

    const candidate = currentCandidateMoves[selectedCandidateIndex]

    const nextBoard = displayBoard.clone()
    nextBoard.applyMove(candidate.move)

    return nextBoard
  }, [selectedCandidateIndex, displayBoard, currentCandidateMoves])

  const displayLastMove = useMemo(() => {
    // 通常対局中は本譜の最終手を使う
    if (!isReviewMode) {
      return lastMove
    }

    // 感想戦の本譜閲覧中は、本譜の現在局面に対応する最終手を使う
    if (reviewTab === "mainline") {
      return moveHistory[reviewMoveIndex - 1] ?? null
    }

    // 感想戦の局面編集中は、変化手順の最終手を使う
    return variationLastMove
  }, [isReviewMode, reviewTab, lastMove, moveHistory, reviewMoveIndex, variationLastMove])

  const isBoardDisabled = useMemo(() => {
    // 通常対局中は終局時のみ操作不可
    if (!isReviewMode) {
      return isGameOver
    }

    // 感想戦の本譜閲覧中は操作不可
    if (reviewTab === "mainline") {
      return true
    }

    // 感想戦の局面編集中は自由に操作可能
    return false
  }, [isReviewMode, reviewTab, isGameOver])

  // =========================
  // 通常対局用ハンドラ
  // =========================

  // 本譜の盤面更新
  const handleChangeBoard = (nextBoard: Board) => {
    // 今指した手が王手だったか
    const isCheckMove = attackDetector.isKingInCheck(nextBoard, nextBoard.getTurn())

    setBoard(nextBoard)

    setBoardHistory(prev => {
      const trimmed = prev.slice(0, currentMoveIndex + 1)
      return [...trimmed, nextBoard]
    })

    setBoardKeys(prev => {
      const trimmed = prev.slice(0, currentMoveIndex + 1)
      return [...trimmed, serializeBoard(nextBoard)]
    })

    // 王手履歴も同じように管理する
    setMoveChecks(prev => {
      const trimmed = prev.slice(0, currentMoveIndex)
      return [...trimmed, isCheckMove]
    })

    setCurrentMoveIndex(prev => prev + 1)
  }

  // 本譜の指し手更新
  const handleMoveApplied = (move: Move) => {
    setLastMove(move)

    setMoveHistory(prev => {
      const trimmed = prev.slice(0, currentMoveIndex)
      return [...trimmed, move]
    })
  }

  // 待った：本譜を1手戻して、未来の履歴も削除する
  const handleTakeBack = () => {
    if (currentMoveIndex === 0) return

    const prevIndex = currentMoveIndex - 1
    const prevBoard = boardHistory[prevIndex]

    setBoard(prevBoard)
    setCurrentMoveIndex(prevIndex)

    setMoveHistory(prev => prev.slice(0, prevIndex))
    setBoardHistory(prev => prev.slice(0, prevIndex + 1))
    setBoardKeys(prev => prev.slice(0, prevIndex + 1))
    setMoveChecks(prev => prev.slice(0, prevIndex))

    setLastMove(moveHistory[prevIndex - 1] ?? null)

    setAnimatingMove(null)
    setShowResultModal(false)
  }

  // =========================
  // 感想戦：本譜閲覧ハンドラ
  // =========================

  const handleEnterReviewMode = () => {
    setShowResultModal(false)
    setIsReviewMode(true)
    setReviewTab("mainline")
    setReviewMoveIndex(currentMoveIndex)

    setVariationBoard(null)
    setVariationMoveHistory([])
    setVariationBoardHistory([])
    setVariationMoveIndex(0)
    setVariationLastMove(null)

    setAnimatingMove(null)
    setSideTab("kifu")
  }

  const handleExitReviewMode = () => {
    setIsReviewMode(false)
    setReviewTab("mainline")
    setReviewMoveIndex(currentMoveIndex)

    setVariationBoard(null)
    setVariationMoveHistory([])
    setVariationBoardHistory([])
    setVariationMoveIndex(0)
    setVariationLastMove(null)

    setAnimatingMove(null)
    setSideTab("kifu")
  }

  const goToReviewMove = (index: number) => {
    if (index < 0 || index > boardHistory.length - 1) return

    setReviewMoveIndex(index)
    setAnimatingMove(null)
  }

  const startVariationFromCurrentMainline = () => {
    const baseBoard = boardHistory[reviewMoveIndex]

    if (!baseBoard) return

    setVariationBoard(baseBoard)
    setVariationMoveHistory(moveHistory.slice(0, reviewMoveIndex))
    setVariationBoardHistory(boardHistory.slice(0, reviewMoveIndex + 1))
    setVariationMoveIndex(reviewMoveIndex)
    setVariationLastMove(moveHistory[reviewMoveIndex - 1] ?? null)

    setReviewTab("variation")
    setAnimatingMove(null)
    setSideTab("kifu")
  }

  const backToMainlineReview = () => {
    setReviewTab("mainline")
    setAnimatingMove(null)
    setSideTab("kifu")
  }

  // =========================
  // 感想戦：局面編集ハンドラ
  // =========================

  const handleVariationChangeBoard = (nextBoard: Board) => {
    setVariationBoard(nextBoard)

    setVariationBoardHistory(prev => {
      const trimmed = prev.slice(0, variationMoveIndex + 1)
      return [...trimmed, nextBoard]
    })

    setVariationMoveIndex(prev => prev + 1)
  }

  const handleVariationMoveApplied = (move: Move) => {
    setVariationLastMove(move)

    setVariationMoveHistory(prev => {
      const trimmed = prev.slice(0, variationMoveIndex)
      return [...trimmed, move]
    })
  }

  const goToVariationMove = (index: number) => {
    if (index < 0 || index > variationBoardHistory.length - 1) return

    setVariationBoard(variationBoardHistory[index])
    setVariationMoveIndex(index)
    setVariationLastMove(variationMoveHistory[index - 1] ?? null)
    setAnimatingMove(null)
  }

  // 座標を「７六」形式に変換
  const formatPosition = (pos: { x: number; y: number }) => {
    const file = 9 - pos.x
    const rank = pos.y + 1
    return `${file}${numToKanji(rank)}`
  }

  // 棋譜フォーマット本体
  const getMoveLabel = (move: Move, index: number, moves: Move[]) => {
    const turn = index % 2 === 0 ? "▲" : "△"
    const prevMove = moves[index - 1]

    const isSame =
      prevMove &&
      move.to.x === prevMove.to.x &&
      move.to.y === prevMove.to.y

    const destination = isSame ? "同　" : formatPosition(move.to)

    let pieceLabel = PIECE_LABELS[move.piece]

    if (move.promote) {
      pieceLabel += "成"
    }

    let fromLabel = ""

    if (!move.drop && move.from) {
      const file = 9 - move.from.x
      const rank = move.from.y + 1
      fromLabel = `(${file}${rank})`
    }

    if (move.drop) {
      return `${index + 1}: ${turn}${destination}${pieceLabel}打`
    }

    return `${index + 1}: ${turn}${destination}${pieceLabel}${fromLabel}`
  }

    // 候補手表示用の簡易ラベル
  const getCandidateMoveLabel = (move: Move) => {
    const destination = formatPosition(move.to)
    let pieceLabel = PIECE_LABELS[move.piece]

    if (move.promote) {
      pieceLabel += "成"
    }

    if (move.drop) {
      return `${destination}${pieceLabel}打`
    }

    if (move.from) {
      const file = 9 - move.from.x
      const rank = move.from.y + 1
      return `${destination}${pieceLabel}(${file}${rank})`
    }

    return `${destination}${pieceLabel}`
  }

  // 本譜一覧を見ている状態かどうか
  const isMainlineView = !isReviewMode || reviewTab === "mainline"

  // 本譜一覧で現在どの局面を見ているか
  const activeMainlineIndex = !isReviewMode
    ? currentMoveIndex
    : reviewMoveIndex

  // 現在の局面位置が変わったら、対応する棋譜行が見える位置まで自動スクロールする
  useEffect(() => {
    if (sideTab === "kifu") {
      activeMoveRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [isReviewMode, reviewTab, currentMoveIndex, reviewMoveIndex, variationMoveIndex, sideTab])

  const handleAnalyzeWithAi = async () => {
    try {
      setSideTab("analysis")
      setIsAnalyzing(true)
      setAnalysisError("")
      setAnalysisResult("")

      const response = await fetch("http://localhost:3001/api/analyze-shogi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error("AI解析に失敗しました")
      }

      const data: { text?: string } = await response.json()
      setAnalysisResult(data.text ?? "")
    } catch (error) {
      console.error(error)
      setAnalysisError("AI解析に失敗しました")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // =========================
  // リスタート
  // =========================

  const handleRestart = () => {
    const newInitialBoard = BoardFactory.createInitialBoard()

    setBoard(newInitialBoard)
    setMoveHistory([])
    setBoardHistory([newInitialBoard])
    setCurrentMoveIndex(0)
    setLastMove(null)
    setMoveChecks([])
    setBoardKeys([serializeBoard(newInitialBoard)])

    setIsReviewMode(false)
    setReviewTab("mainline")
    setReviewMoveIndex(0)
    setVariationBoard(null)
    setVariationMoveHistory([])
    setVariationBoardHistory([])
    setVariationMoveIndex(0)
    setVariationLastMove(null)

    setAnimatingMove(null)
    setShowResultModal(false)
    setSideTab("kifu")
    setAnalysisResult("")
    setAnalysisError("")
    setIsAnalyzing(false)
  }

  // =========================
  // レイアウト用の固定スタイル
  // =========================

  const mainLayoutStyle = {
    display: "grid",
    gridTemplateColumns: "560px 320px",
    gap: 24,
    alignItems: "start",
    width: 904,
    margin: "0 auto",
  }

  const boardColumnStyle = {
    width: 560,
  }

  const sidePanelStyle = {
    width: 320,
  }

  const sidePanelCardStyle = {
    minHeight: 720,
    height: 720,
    padding: 16,
    border: "1px solid #444",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>将棋アプリ</h1>

      <div style={mainLayoutStyle}>
        {/* 左側：将棋盤本体 */}
        <div style={boardColumnStyle}>
          <ShogiBoard
            board={displayBoard}
            onChangeBoard={
              isReviewMode && reviewTab === "variation"
                ? handleVariationChangeBoard
                : handleChangeBoard
            }
            lastMove={displayLastMove}
            onMoveApplied={
              isReviewMode && reviewTab === "variation"
                ? handleVariationMoveApplied
                : handleMoveApplied
            }
            animatingMove={animatingMove}
            onAnimatingMoveChange={setAnimatingMove}
            disabled={isBoardDisabled}
          />
        </div>

        {/* 右側：タブ切り替えパネル */}
        <div style={sidePanelStyle}>
          <div style={sidePanelCardStyle}>
            {/* タブボタン */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSideTab("kifu")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  backgroundColor: sideTab === "kifu" ? "#1976d2" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                棋譜
              </button>

              <button
                onClick={() => setSideTab("analysis")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  backgroundColor: sideTab === "analysis" ? "#1976d2" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                AI解説
              </button>
            </div>

            {/* 棋譜タブ */}
            {sideTab === "kifu" && (
              <>
                {/* パネル見出し */}
                <div style={{ fontWeight: "bold", fontSize: 18 }}>
                  {!isReviewMode && "対局中"}
                  {isReviewMode && reviewTab === "mainline" && "感想戦 / 本譜"}
                  {isReviewMode && reviewTab === "variation" && "感想戦 / 局面編集"}
                </div>

                {/* 棋譜リスト本体 */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    paddingRight: 4,
                  }}
                >
                  {isMainlineView && (
                    <>
                      <button
                        ref={isMainlineView && activeMainlineIndex === 0 ? activeMoveRef : null}
                        onClick={() => {
                          if (isReviewMode) {
                            goToReviewMove(0)
                          }
                        }}
                        disabled={!isReviewMode || activeMainlineIndex === 0}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          border: isMainlineView && activeMainlineIndex === 0
                            ? "2px solid #64b5f6"
                            : "1px solid #666",
                          borderRadius: 6,
                          backgroundColor: isMainlineView && activeMainlineIndex === 0
                            ? "rgba(100,181,246,0.18)"
                            : "transparent",
                          color: "inherit",
                          cursor: isReviewMode ? "pointer" : "default",
                        }}
                      >
                        === 初期局面 ===
                      </button>

                      {moveHistory.map((move, index) => {
                        const targetIndex = index + 1
                        const isActive = isMainlineView && activeMainlineIndex === targetIndex

                        return (
                          <button
                            key={`mainline-move-${index}`}
                            ref={isActive ? activeMoveRef : null}
                            onClick={() => {
                              if (isReviewMode) {
                                goToReviewMove(targetIndex)
                              }
                            }}
                            disabled={!isReviewMode}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              border: isActive ? "2px solid #64b5f6" : "1px solid #666",
                              borderRadius: 6,
                              backgroundColor: isActive ? "rgba(100,181,246,0.18)" : "transparent",
                              color: "inherit",
                              cursor: isReviewMode ? "pointer" : "default",
                            }}
                          >
                            {getMoveLabel(move, index, moveHistory)}
                          </button>
                        )
                      })}

                      {gameResultItem && (
                        <div
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            border: "1px solid #666",
                            borderRadius: 6,
                            backgroundColor: gameResultItem.backgroundColor,
                            fontWeight: "bold",
                          }}
                        >
                          {moveHistory.length + 1}: {gameResultItem.label}
                        </div>
                      )}
                    </>
                  )}

                  {isReviewMode && reviewTab === "variation" && (
                    <>
                      <button
                        ref={variationMoveIndex === 0 ? activeMoveRef : null}
                        onClick={() => goToVariationMove(0)}
                        disabled={variationMoveIndex === 0}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          border: variationMoveIndex === 0 ? "2px solid #64b5f6" : "1px solid #666",
                          borderRadius: 6,
                          backgroundColor: variationMoveIndex === 0 ? "rgba(100,181,246,0.18)" : "transparent",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        === 初期局面 ===
                      </button>

                      {variationMoveHistory.map((move, index) => {
                        const targetIndex = index + 1
                        const isActive = variationMoveIndex === targetIndex

                        return (
                          <button
                            key={`variation-move-${index}`}
                            ref={isActive ? activeMoveRef : null}
                            onClick={() => goToVariationMove(targetIndex)}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              border: isActive ? "2px solid #64b5f6" : "1px solid #666",
                              borderRadius: 6,
                              backgroundColor: isActive ? "rgba(100,181,246,0.18)" : "transparent",
                              color: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            {getMoveLabel(move, index, variationMoveHistory)}
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* スライダー */}
                <div style={{ minHeight: 40, display: "flex", alignItems: "center" }}>
                  {isReviewMode && reviewTab === "mainline" && (
                    <input
                      type="range"
                      min={0}
                      max={boardHistory.length - 1}
                      value={reviewMoveIndex}
                      onChange={(e) => goToReviewMove(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  )}

                  {isReviewMode && reviewTab === "variation" && (
                    <input
                      type="range"
                      min={0}
                      max={Math.max(variationBoardHistory.length - 1, 0)}
                      value={variationMoveIndex}
                      onChange={(e) => goToVariationMove(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>

                {/* 棋譜前後移動ボタン */}
                <div
                  style={{
                    minHeight: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {isReviewMode && reviewTab === "mainline" && (
                    <>
                      <button onClick={() => goToReviewMove(0)}>最初</button>
                      <button onClick={() => goToReviewMove(reviewMoveIndex - 1)}>←</button>
                      <button onClick={() => goToReviewMove(reviewMoveIndex + 1)}>→</button>
                      <button onClick={() => goToReviewMove(boardHistory.length - 1)}>最後</button>
                    </>
                  )}

                  {isReviewMode && reviewTab === "variation" && (
                    <>
                      <button onClick={() => goToVariationMove(0)}>最初</button>
                      <button onClick={() => goToVariationMove(variationMoveIndex - 1)}>←</button>
                      <button onClick={() => goToVariationMove(variationMoveIndex + 1)}>→</button>
                      <button onClick={() => goToVariationMove(variationBoardHistory.length - 1)}>最後</button>
                    </>
                  )}
                </div>

                {/* 下段操作ボタン */}
                <div
                  style={{
                    minHeight: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {!isReviewMode && (
                    <button onClick={handleTakeBack} disabled={currentMoveIndex === 0}>
                      待った
                    </button>
                  )}

                  {isReviewMode && (
                    <>
                      <button
                        onClick={backToMainlineReview}
                        disabled={reviewTab === "mainline"}
                      >
                        本譜に戻る
                      </button>

                      <button
                        onClick={startVariationFromCurrentMainline}
                        disabled={reviewTab === "variation"}
                      >
                        変化手順
                      </button>
                    </>
                  )}
                </div>

                {/* 補足情報 */}
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                    lineHeight: 1.6,
                  }}
                >
                  {!isReviewMode && (
                    <>
                      <div>手数: {moveHistory.length}</div>
                      <div>局面数: {boardHistory.length}</div>
                      <div>現在位置: {currentMoveIndex}</div>
                    </>
                  )}

                  {isReviewMode && reviewTab === "mainline" && (
                    <>
                      <div>手数: {moveHistory.length}</div>
                      <div>局面数: {boardHistory.length}</div>
                      <div>現在位置: {reviewMoveIndex}</div>
                    </>
                  )}

                  {isReviewMode && reviewTab === "variation" && (
                    <>
                      <div>手数: {variationMoveHistory.length}</div>
                      <div>局面数: {variationBoardHistory.length}</div>
                      <div>現在位置: {variationMoveIndex}</div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* AI解説タブ */}
            {sideTab === "analysis" && (
              <>
                <div style={{ fontWeight: "bold", fontSize: 18 }}>
                  AI解説
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {currentCandidateMoves.slice(0, 5).map((c, i) => {
                    const isActive = selectedCandidateIndex === i

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedCandidateIndex(i)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: isActive ? "2px solid #64b5f6" : "1px solid #666",
                          background: isActive ? "rgba(100,181,246,0.2)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        {getCandidateMoveLabel(c.move)}
                      </button>
                    )
                  })}

                  {/* 現在の手に戻る */}
                  <button
                    onClick={() => setSelectedCandidateIndex(null)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: selectedCandidateIndex === null ? "2px solid #81c784" : "1px solid #666",
                    }}
                  >
                    現在の手
                  </button>
                </div>

                <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                  <button onClick={handleAnalyzeWithAi} disabled={isAnalyzing}>
                    {isAnalyzing ? "解析中..." : "AIで解説"}
                  </button>
                </div>

                {analysisError && (
                  <div style={{ color: "#ff6b6b" }}>
                    {analysisError}
                  </div>
                )}

                {!analysisError && !analysisResult && !isAnalyzing && (
                  <div style={{ opacity: 0.7, lineHeight: 1.8 }}>
                    棋譜タブで局面を選んでから「AIで解説」を押すと、ここに解説が表示されます。
                  </div>
                )}

                {isAnalyzing && (
                  <div style={{ opacity: 0.8 }}>
                    解析中...
                  </div>
                )}

                {!!analysisResult && (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      paddingRight: 4,
                      lineHeight: 1.8,
                      fontSize: 14,
                    }}
                  >
                    {analysisResult.split("\n").map((line, i) => {
                      const isHeader = line.startsWith("【")

                      return (
                        <div
                          key={i}
                          style={{
                            fontWeight: isHeader ? "bold" : "normal",
                            marginTop: isHeader ? 12 : 4,
                          }}
                        >
                          {line}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <GameResultModal
        isOpen={showResultModal}
        title={resultTitle}
        message={resultMessage}
        onRestart={handleRestart}
        onReview={handleEnterReviewMode}
      />
    </div>
  )
}

export default App