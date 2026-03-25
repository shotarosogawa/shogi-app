import { useEffect, useMemo, useRef, useState } from "react"
import "./App.css"
import { GameResultModal } from "./components/GameResultModal"
import { HistoryPanel } from "./components/HistoryPanel"
import { ShogiBoard } from "./components/ShogiBoard"
import type { AnalysisTarget } from "./core/analysis/AnalysisTarget"
import { analyzeCandidateMoves } from "./core/analysis/analyzeCandidateMoves"
import { buildAnalysisPrompt } from "./core/analysis/buildAnalysisPrompt"
import { buildFullAiInput } from "./core/analysis/buildFullAiInput"
import type { FullAiInput } from "./core/analysis/buildFullAiInput"
import { compareWithBestMove } from "./core/analysis/compareWithBestMove"
import { createAnalysisTarget } from "./core/analysis/createAnalysisTarget"
import { createMoveAnalysisContext } from "./core/analysis/createMoveAnalysisContext"
import { detectCastle } from "./core/analysis/detectCastle"
import { detectOpening } from "./core/analysis/detectOpening"
import { extractPositionFeatures } from "./core/analysis/extractPositionFeatures"
import type { MoveAnalysisContext } from "./core/analysis/MoveAnalysisContext"
import type { Board } from "./core/board/Board"
import { BoardFactory } from "./core/board/BoardFactory"
import type { Move } from "./core/board/Move"
import { buildPositionRecords } from "./core/history/buildPositionRecords"
import type { SimilarPositionResult } from "./core/history/findSimilarPositions"
import { sampleGameList } from "./core/history/sampleGameList"
import { AttackDetector } from "./core/rules/AttackDetector"
import { MoveApplier } from "./core/rules/MoveApplier"
import { MoveGenerator } from "./core/rules/MoveGenerator"
import { isPerpetualCheckSennichite } from "./core/rules/perpetualCheck"
import { serializeBoard } from "./core/utils/boardSerializer"

type ReviewTab = "mainline" | "variation"
type SideTab = "kifu" | "analysis"
type AnalysisTab = "explain" | "history"
type FollowupMode = "none" | "why" | "best" | "other" | "chat"

function App() {
  const initialBoard = useMemo(() => BoardFactory.createInitialBoard(), [])

  const numToKanji = (num: number) => {
    const map = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
    return map[num] ?? ""
  }

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

  const [board, setBoard] = useState<Board>(initialBoard)
  const [moveHistory, setMoveHistory] = useState<Move[]>([])
  const [boardHistory, setBoardHistory] = useState<Board[]>([initialBoard])
  const [moveChecks, setMoveChecks] = useState<boolean[]>([])
  const [boardKeys, setBoardKeys] = useState<string[]>([
    serializeBoard(initialBoard),
  ])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [lastMove, setLastMove] = useState<Move | null>(null)

  const [isReviewMode, setIsReviewMode] = useState(false)
  const [reviewTab, setReviewTab] = useState<ReviewTab>("mainline")
  const [reviewMoveIndex, setReviewMoveIndex] = useState(0)
  const [variationBoard, setVariationBoard] = useState<Board | null>(null)
  const [variationMoveHistory, setVariationMoveHistory] = useState<Move[]>([])
  const [variationBoardHistory, setVariationBoardHistory] = useState<Board[]>([])
  const [variationMoveIndex, setVariationMoveIndex] = useState(0)
  const [variationLastMove, setVariationLastMove] = useState<Move | null>(null)

  const [animatingMove, setAnimatingMove] = useState<Move | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)

  const [sideTab, setSideTab] = useState<SideTab>("kifu")
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("explain")

  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null)

  const generator = useMemo(() => new MoveGenerator(), [])
  const attackDetector = useMemo(() => new AttackDetector(), [])
  const moveApplier = useMemo(() => new MoveApplier(), [])

  const activeMoveRef = useRef<HTMLButtonElement | null>(null)

  const [analysisLogs, setAnalysisLogs] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState("")
  const [followupMode, setFollowupMode] = useState<FollowupMode>("none")
  const [chatInput, setChatInput] = useState("")

  const [historicalContext, setHistoricalContext] =
  useState<SimilarPositionResult | null>(null)

  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const currentTurn = board.getTurn()

  const legalMoves = useMemo(() => {
    return generator.generateLegalMoves(board)
  }, [board, generator])

  const inCheck = useMemo(() => {
    return attackDetector.isKingInCheck(board, currentTurn)
  }, [board, currentTurn, attackDetector])

  const currentBoardKey = boardKeys[currentMoveIndex]

  const sameBoardCount = boardKeys
    .slice(1)
    .filter(key => key === currentBoardKey)
    .length

  const isCheckmate = legalMoves.length === 0 && inCheck
  const isNoLegalMoves = legalMoves.length === 0 && !inCheck
  const isSennichite = sameBoardCount >= 4
  const isResign = isCheckmate || isNoLegalMoves
  const isGameOver = isCheckmate || isNoLegalMoves || isSennichite

  const isPerpetualCheck = isSennichite
    ? isPerpetualCheckSennichite(boardKeys, moveChecks, currentMoveIndex)
    : false

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

  useEffect(() => {
    if (!isReviewMode && isGameOver) {
      setShowResultModal(true)
    }
  }, [isGameOver, isReviewMode])

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

  const displayBoard = useMemo(() => {
    if (!isReviewMode) {
      return board
    }

    if (reviewTab === "mainline") {
      return boardHistory[reviewMoveIndex] ?? board
    }

    return variationBoard ?? boardHistory[reviewMoveIndex] ?? board
  }, [isReviewMode, reviewTab, board, boardHistory, reviewMoveIndex, variationBoard])

  const analysisLegalMoves = useMemo(() => {
    return generator.generateLegalMoves(displayBoard)
  }, [displayBoard, generator])

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

  const currentCandidateMoves = useMemo(() => {
    return analyzeCandidateMoves(displayBoard, analysisLegalMoves)
  }, [displayBoard, analysisLegalMoves])

  const analysisBoard = useMemo(() => {
    if (selectedCandidateIndex === null) {
      return displayBoard
    }

    const candidate = currentCandidateMoves[selectedCandidateIndex]
    if (!candidate) {
      return displayBoard
    }

    return moveApplier.apply(displayBoard, candidate.move)
  }, [selectedCandidateIndex, currentCandidateMoves, displayBoard, moveApplier])

  const selectedAnalysisTarget: AnalysisTarget = useMemo(() => {
    if (selectedCandidateIndex === null) {
      return currentAnalysisTarget
    }

    const candidate = currentCandidateMoves[selectedCandidateIndex]
    if (!candidate) {
      return currentAnalysisTarget
    }

    return {
      lineType: currentAnalysisTarget.lineType,
      moveIndex: currentAnalysisTarget.moveIndex + 1,
      move: candidate.move,
      beforeBoard: displayBoard,
      currentBoard: analysisBoard,
    }
  }, [
    selectedCandidateIndex,
    currentCandidateMoves,
    currentAnalysisTarget,
    displayBoard,
    analysisBoard,
  ])

  const targetMoveAnalysisContext: MoveAnalysisContext | null = useMemo(() => {
    return createMoveAnalysisContext(selectedAnalysisTarget)
  }, [selectedAnalysisTarget])

  const targetMoveComparison = useMemo(() => {
    return compareWithBestMove(
      targetMoveAnalysisContext,
      currentCandidateMoves
    )
  }, [targetMoveAnalysisContext, currentCandidateMoves])

  const openingInfo = useMemo(() => detectOpening(displayBoard), [displayBoard])
  const castleInfo = useMemo(() => detectCastle(displayBoard), [displayBoard])
  const positionFeatures = useMemo(() => extractPositionFeatures(displayBoard), [displayBoard])

  const positionRecords = useMemo(() => {
    return sampleGameList.flatMap(game => buildPositionRecords(game))
  }, [])
  
  const historyTargetBoard = targetMoveAnalysisContext
    ? targetMoveAnalysisContext.beforeBoard
    : analysisBoard

  const historyPositionKey = useMemo(() => {
    return serializeBoard(historyTargetBoard)
  }, [historyTargetBoard])

  const fullAiInput: FullAiInput = useMemo(() => {
    return buildFullAiInput(
      targetMoveAnalysisContext,
      currentCandidateMoves,
      targetMoveComparison,
      analysisBoard,
      openingInfo,
      castleInfo,
      positionFeatures,
      historicalContext
    )
  }, [
    targetMoveAnalysisContext,
    currentCandidateMoves,
    targetMoveComparison,
    analysisBoard,
    openingInfo,
    castleInfo,
    positionFeatures,
    historicalContext,
  ])

  const analysisPrompt = useMemo(() => {
    return buildAnalysisPrompt(fullAiInput, followupMode)
  }, [fullAiInput, followupMode])

  const displayLastMove = useMemo(() => {
    if (!isReviewMode) {
      return lastMove
    }

    if (reviewTab === "mainline") {
      return moveHistory[reviewMoveIndex - 1] ?? null
    }

    return variationLastMove
  }, [isReviewMode, reviewTab, lastMove, moveHistory, reviewMoveIndex, variationLastMove])

  const isBoardDisabled = useMemo(() => {
    if (!isReviewMode) {
      return isGameOver
    }

    if (reviewTab === "mainline") {
      return true
    }

    return false
  }, [isReviewMode, reviewTab, isGameOver])

  useEffect(() => {
    setSelectedCandidateIndex(null)
  }, [currentMoveIndex, reviewMoveIndex, variationMoveIndex, reviewTab, isReviewMode])

  useEffect(() => {
    if (!isReviewMode) {
      setAnalysisTab("explain")
      setSideTab("kifu")
    }
  }, [isReviewMode])

  const handleChangeBoard = (nextBoard: Board) => {
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

    setMoveChecks(prev => {
      const trimmed = prev.slice(0, currentMoveIndex)
      return [...trimmed, isCheckMove]
    })

    setCurrentMoveIndex(prev => prev + 1)
  }

  const handleMoveApplied = (move: Move) => {
    setLastMove(move)

    setMoveHistory(prev => {
      const trimmed = prev.slice(0, currentMoveIndex)
      return [...trimmed, move]
    })
  }

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
    setAnalysisTab("explain")
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
    setAnalysisTab("explain")
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
    setAnalysisTab("explain")
  }

  const backToMainlineReview = () => {
    setReviewTab("mainline")
    setAnimatingMove(null)
    setSideTab("kifu")
    setAnalysisTab("explain")
  }

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

  const formatPosition = (pos: { x: number; y: number }) => {
    const file = 9 - pos.x
    const rank = pos.y + 1
    return `${file}${numToKanji(rank)}`
  }

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

  const isMainlineView = !isReviewMode || reviewTab === "mainline"

  const activeMainlineIndex = !isReviewMode
    ? currentMoveIndex
    : reviewMoveIndex

  useEffect(() => {
    if (sideTab === "kifu") {
      activeMoveRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [isReviewMode, reviewTab, currentMoveIndex, reviewMoveIndex, variationMoveIndex, sideTab])

  const buildConversationHistory = (logs: string[]) => {
    return logs
      .map(log => {
        if (log.startsWith("👤 ")) {
          return `ユーザー: ${log.replace("👤 ", "")}`
        }
        return `AI: ${log}`
      })
      .join("\n")
  }

  const handleAnalyzeWithAi = async (
    mode: FollowupMode = "none",
    userQuestion: string = "",
    historyOverride?: string[]
  ) => {
    try {
      setFollowupMode(mode)
      setSideTab("analysis")
      setAnalysisTab("explain")
      setIsAnalyzing(true)
      setAnalysisError("")

      if (mode === "none" && !userQuestion) {
        setAnalysisLogs([])
      }

      const historySource = historyOverride ?? analysisLogs
      const conversationHistory = buildConversationHistory(historySource)

      const prompt = buildAnalysisPrompt(
        fullAiInput,
        mode,
        conversationHistory,
        userQuestion
      )

      const response = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      })

      if (!response.ok) {
        throw new Error("AI解析に失敗しました")
      }

      const data: { text?: string } = await response.json()

      setAnalysisLogs(prev => [
        ...prev,
        data.text ?? "",
      ])
    } catch (error) {
      console.error(error)
      setAnalysisError("AI解析に失敗しました")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFollowup = async (mode: FollowupMode) => {
    await handleAnalyzeWithAi(mode)
  }

  const handleSendMessage = async () => {
    const text = chatInput.trim()
    if (!text) return

    const mode: FollowupMode = "chat"
    const nextLogs = [...analysisLogs, `👤 ${text}`]

    setAnalysisLogs(nextLogs)
    setChatInput("")

    await handleAnalyzeWithAi(mode, text, nextLogs)
  }

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
    setAnalysisTab("explain")
    setAnalysisLogs([])
    setAnalysisError("")
    setIsAnalyzing(false)
    setSelectedCandidateIndex(null)
  }

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

  const mainTabButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: "8px 0",
    backgroundColor: active ? "#1976d2" : "#333",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  })

  const subTabButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: "6px 0",
    backgroundColor: active ? "#388e3c" : "#333",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  })

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsHistoryLoading(true)

        const res = await fetch(
          `http://localhost:3001/api/history?positionKey=${encodeURIComponent(historyPositionKey)}`
        )

        if (!res.ok) {
          setHistoricalContext(null)
          return
        }

        const data: SimilarPositionResult = await res.json()
        setHistoricalContext(data)
      } catch (error) {
        console.error("履歴取得失敗", error)
        setHistoricalContext(null)
      } finally {
        setIsHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [historyPositionKey])

  return (
    <div style={{ padding: 24 }}>
      <h1>将棋アプリ</h1>

      <div style={mainLayoutStyle}>
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

        <div style={sidePanelStyle}>
          <div style={sidePanelCardStyle}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setSideTab("kifu")}
                style={mainTabButtonStyle(sideTab === "kifu")}
              >
                棋譜
              </button>

              {isReviewMode && (
                <button
                  onClick={() => setSideTab("analysis")}
                  style={mainTabButtonStyle(sideTab === "analysis")}
                >
                  AI解説
                </button>
              )}
            </div>

            {sideTab === "kifu" && (
              <>
                <div style={{ fontWeight: "bold", fontSize: 18 }}>
                  {!isReviewMode && "対局中"}
                  {isReviewMode && reviewTab === "mainline" && "感想戦 / 本譜"}
                  {isReviewMode && reviewTab === "variation" && "感想戦 / 局面編集"}
                </div>

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

                      <button onClick={handleExitReviewMode}>
                        感想戦終了
                      </button>
                    </>
                  )}
                </div>

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

            {isReviewMode && sideTab === "analysis" && (
              <>
                <div style={{ fontWeight: "bold", fontSize: 18 }}>
                  AI解説
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setAnalysisTab("explain")}
                    style={subTabButtonStyle(analysisTab === "explain")}
                  >
                    解説
                  </button>

                  <button
                    onClick={() => setAnalysisTab("history")}
                    style={subTabButtonStyle(analysisTab === "history")}
                  >
                    実戦
                  </button>
                </div>

                {analysisTab === "history" && (
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    <HistoryPanel
                      historicalContext={historicalContext}
                      isLoading={isHistoryLoading}
                    />
                  </div>
                )}

                {analysisTab === "explain" && (
                  <>
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

                      <button
                        onClick={() => setSelectedCandidateIndex(null)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: selectedCandidateIndex === null ? "2px solid #81c784" : "1px solid #666",
                          background: selectedCandidateIndex === null ? "rgba(129,199,132,0.2)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        現在の手
                      </button>
                    </div>

                    <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                      <button onClick={() => handleFollowup("none")} disabled={isAnalyzing}>
                        {isAnalyzing ? "解析中..." : "AIで解説"}
                      </button>
                    </div>

                    {analysisError && (
                      <div style={{ color: "#ff6b6b" }}>
                        {analysisError}
                      </div>
                    )}

                    {!analysisError && analysisLogs.length === 0 && !isAnalyzing && (
                      <div style={{ opacity: 0.7, lineHeight: 1.8 }}>
                        棋譜タブで局面を選んでから「AIで解説」を押すと、ここに解説が表示されます。
                      </div>
                    )}

                    {isAnalyzing && (
                      <div style={{ opacity: 0.8 }}>
                        解析中...
                      </div>
                    )}

                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {analysisLogs.map((log, idx) => {
                        const isUser = log.startsWith("👤")

                        return (
                          <div
                            key={idx}
                            style={{
                              textAlign: isUser ? "right" : "left",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "inline-block",
                                padding: "8px 12px",
                                borderRadius: 12,
                                background: isUser ? "#1976d2" : "#333",
                                color: "#fff",
                                maxWidth: "90%",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {log.replace("👤 ", "")}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="例：なんでこの手悪い？"
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: 6,
                          border: "1px solid #666",
                          background: "#222",
                          color: "#fff",
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSendMessage()
                          }
                        }}
                      />

                      <button
                        onClick={handleSendMessage}
                        disabled={isAnalyzing}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "#1976d2",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        送信
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleFollowup("why")}>
                        なぜ？
                      </button>

                      <button onClick={() => handleFollowup("best")}>
                        最善手
                      </button>

                      <button onClick={() => handleFollowup("other")}>
                        他の手
                      </button>
                    </div>
                  </>
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