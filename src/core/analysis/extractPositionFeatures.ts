import type { Board } from "../board/Board"

export type PositionFeatures = {
  kingSafety: "safe" | "normal" | "unsafe"
  pieceActivity: "low" | "normal" | "high"
  centerControl: "low" | "normal" | "high"
  notes: string[]
}

export const extractPositionFeatures = (board: Board): PositionFeatures => {
  const notes: string[] = []

  // =========================
  // 玉の安全度（超簡易）
  // =========================
  const kingPos = findKing(board, "black")

  let kingSafety: PositionFeatures["kingSafety"] = "normal"

  if (kingPos) {
    if (kingPos.y >= 7) {
      kingSafety = "safe"
      notes.push("玉が自陣深くで安定")
    } else if (kingPos.y <= 4) {
      kingSafety = "unsafe"
      notes.push("玉が前に出ていて危険")
    }
  }

  // =========================
  // 駒の活性度
  // =========================
  let activeCount = 0

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board.getPiece({ x, y })
      if (!p) continue

      if (p.owner === "black" && y <= 4) activeCount++
      if (p.owner === "white" && y >= 4) activeCount++
    }
  }

  let pieceActivity: PositionFeatures["pieceActivity"] = "normal"

  if (activeCount >= 8) {
    pieceActivity = "high"
    notes.push("駒が前に出ている")
  } else if (activeCount <= 3) {
    pieceActivity = "low"
    notes.push("駒が引き気味")
  }

  // =========================
  // 中央支配（超ざっくり）
  // =========================
  let centerCount = 0

  const centerSquares = [
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
  ]

  centerSquares.forEach(pos => {
    const p = board.getPiece(pos)
    if (p) centerCount++
  })

  let centerControl: PositionFeatures["centerControl"] = "normal"

  if (centerCount >= 4) {
    centerControl = "high"
    notes.push("中央に駒が集まっている")
  } else if (centerCount <= 1) {
    centerControl = "low"
    notes.push("中央が薄い")
  }

  return {
    kingSafety,
    pieceActivity,
    centerControl,
    notes,
  }
}

// =========================
// ユーティリティ
// =========================

const findKing = (board: Board, owner: "black" | "white") => {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board.getPiece({ x, y })
      if (p && p.owner === owner && p.type === "OU") {
        return { x, y }
      }
    }
  }
  return null
}