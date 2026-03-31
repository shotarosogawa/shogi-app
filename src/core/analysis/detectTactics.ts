import type { Board } from "../board/Board"
import type { Move } from "../board/Move"
import type { Player } from "../board/Piece"

export type DetectionResult = {
  key: string
  name: string
  confidence: "high" | "medium" | "low"
  reasons: string[]
}

type DetectContext = {
  before: Board
  after: Board
  move: Move
  player: Player
}

export const detectTactics = (ctx: DetectContext): DetectionResult[] => {
  const results: DetectionResult[] = []

  const check = detectCheck(ctx)
  if (check) results.push(check)

  const capture = detectCapture(ctx)
  if (capture) results.push(capture)

  const fork = detectFork(ctx)
  if (fork) results.push(fork)

  const block = detectLineBlock(ctx)
  if (block) results.push(block)

  const tarefu = detectTarefu(ctx)
  if (tarefu) results.push(tarefu)

  const tataki = detectTataki(ctx)
  if (tataki) results.push(tataki)

  return results
}

//
// =========================
// 判定ロジック
// =========================
//

const detectLineBlock = (ctx: DetectContext): DetectionResult | null => {
  if (!ctx.move.drop) return null

  const opponent = ctx.player === "black" ? "white" : "black"
  const to = ctx.move.to

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ]

  let bestProtectedType: string | null = null
  let bestWeight = 0

  for (const d of directions) {
    let x = to.x + d.x
    let y = to.y + d.y

    let attacker: { type: string; owner: Player } | null = null

    while (isInsideBoard(x, y)) {
      const p = ctx.before.getPiece({ x, y })

      if (p) {
        if (!attacker) {
          if (p.owner !== opponent) break

          const dx = to.x - x
          const dy = to.y - y

          if (!isSlidingAttackerForDirection(p, dx, dy)) {
            break
          }

          if (!isClearPath(ctx.before, { x, y }, to)) {
            break
          }

          attacker = { type: p.type, owner: p.owner }
        } else {
          if (p.owner === ctx.player) {
            const weight = getProtectedPieceWeight(p.type)
            if (weight > bestWeight) {
              bestWeight = weight
              bestProtectedType = p.type
            }
          }
          break
        }
      }

      x += d.x
      y += d.y
    }
  }

  if (!bestProtectedType) return null

  let confidence: "high" | "medium" | "low" = "medium"
  const reasons = ["相手の長い利きを遮っている"]

  if (bestProtectedType === "OU") {
    confidence = "high"
    reasons.push("玉を守る意味が大きい")
  } else if (bestWeight >= 6) {
    confidence = "medium"
    reasons.push("重要な駒を守っている")
  } else {
    confidence = "low"
    reasons.push("比較的軽い駒を守っている")
  }

  return {
    key: "block",
    name: "利き遮断",
    confidence,
    reasons,
  }
}

// 王手（after盤面で相手玉に利きがあるか）
const detectCheck = (ctx: DetectContext): DetectionResult | null => {
  const opponent = ctx.player === "black" ? "white" : "black"
  const kingPos = findKing(ctx.after, opponent)

  if (!kingPos) return null

  if (isSquareAttacked(ctx.after, kingPos, ctx.player)) {
    return {
      key: "check",
      name: "王手",
      confidence: "high",
      reasons: ["相手玉に利きがかかっている"],
    }
  }

  return null
}

// 駒取り（beforeのtoに駒があるか）
const detectCapture = (ctx: DetectContext): DetectionResult | null => {
  const target = ctx.before.getPiece(ctx.move.to)

  if (!target) return null

  return {
    key: "capture",
    name: "駒取り",
    confidence: "high",
    reasons: ["相手の駒を取っている"],
  }
}

// 両取り
const detectFork = (ctx: DetectContext): DetectionResult | null => {
  const beforeTargets = getAttackedEnemyPieces(ctx.before, ctx.player)
    .filter(t => t.type !== "FU")
  const afterTargets = getAttackedEnemyPieces(ctx.after, ctx.player)
    .filter(t => t.type !== "FU")

  const newTargets = afterTargets.filter(after =>
    !beforeTargets.some(before =>
      before.x === after.x && before.y === after.y
    )
  )

  // 指した後に複数対象があり、なおかつ新しい攻撃対象が増えている
  if (afterTargets.length < 2) return null
  if (newTargets.length < 1) return null

  const hasKing = afterTargets.some(t => t.type === "OU")
  const sorted = [...afterTargets].sort((a, b) => b.value - a.value)
  const top2 = sorted.slice(0, 2)
  const totalValue = top2.reduce((sum, t) => sum + t.value, 0)

  let confidence: "high" | "medium" | "low" = "medium"
  const reasons: string[] = ["この手で攻撃対象が増え、複数の駒を同時に狙う形になっている"]

  if (hasKing) {
    confidence = "high"
    reasons.push("玉を含む両取りになっている")
  } else if (totalValue >= 12) {
    confidence = "high"
    reasons.push("価値の高い駒を同時に狙っている")
  } else if (totalValue <= 4) {
    confidence = "low"
    reasons.push("比較的軽い駒同士の両取り")
  }

  return {
    key: "fork",
    name: "両取り",
    confidence,
    reasons,
  }
}

// たたきの歩
const detectTataki = (ctx: DetectContext): DetectionResult | null => {
  // 歩打ち以外は対象外
  if (!ctx.move.drop) return null
  if (ctx.move.piece !== "FU") return null

  // 自陣は除外
  const zone = getBoardZone(ctx.move.to.y, ctx.player)
  if (zone === "ownCamp") return null

  const front1 = getFrontSquare(ctx.move.to, ctx.player)
  if (!front1) return null

  // 打った歩の真正面に相手駒がいるか
  const target = ctx.before.getPiece(front1)
  if (!target) return null
  if (target.owner === ctx.player) return null

  // 歩相手は除外
  if (target.type === "FU") return null

  const opponent = ctx.player === "black" ? "white" : "black"

  // 相手がその歩を取れることを叩きの前提にする
  const isAttacked = isSquareAttacked(ctx.after, ctx.move.to, opponent)
  if (!isAttacked) return null

  const reasons: string[] = [
    "相手駒の真正面に歩を打ち、取らせることで形を乱す狙いがある",
  ]

  let confidence: "high" | "medium" | "low" = "medium"

  const importantTargets = ["OU", "HI", "RY", "KA", "UM", "KI", "GI"]

  if (target.type === "OU") {
    confidence = "high"
    reasons.push("玉頭や玉周辺に圧力をかける叩きになっている")
  } else if (importantTargets.includes(target.type)) {
    confidence = "medium"
    reasons.push("重要な駒を動かしたり形を崩したりする狙いがある")
  } else {
    confidence = "low"
    reasons.push("比較的軽い駒への叩き")
  }

  return {
    key: "tataki",
    name: "たたきの歩",
    confidence,
    reasons,
  }
}

// 垂れ歩
const detectTarefu = (ctx: DetectContext): DetectionResult | null => {
  if (!ctx.move.drop) return null
  if (ctx.move.piece !== "FU") return null

  // 自陣は除外
  const zone = getBoardZone(ctx.move.to.y, ctx.player)
  if (zone === "ownCamp") return null

  const front1 = getFrontSquare(ctx.move.to, ctx.player)
  if (!front1) return null

  // 1マス前が埋まっていたら叩き寄り
  const piece1 = ctx.before.getPiece(front1)
  if (piece1) return null

  const front2 = getFrontSquare(front1, ctx.player)
  if (!front2) return null

  // 2マス前に相手駒がいないなら、いったん垂れ歩とはしない
  const piece2 = ctx.before.getPiece(front2)
  if (!piece2) return null
  if (piece2.owner === ctx.player) return null

  const opponent = ctx.player === "black" ? "white" : "black"

  const isAttacked = isSquareAttacked(ctx.after, ctx.move.to, opponent)
  const isDefended = isSquareAttacked(ctx.after, ctx.move.to, ctx.player)

  const reasons: string[] = [
    "1マス空けて歩を打ち、先の地点への圧力と拠点化を狙っている",
  ]

  if (!isAttacked) {
    reasons.push("この歩がすぐには取りにくく、拠点として残りやすい")
    return {
      key: "tarefu",
      name: "垂れ歩",
      confidence: "high",
      reasons,
    }
  }

  if (isAttacked && isDefended) {
    reasons.push("取られても取り返しが利くため、拠点としての意味を保ちやすい")
    return {
      key: "tarefu",
      name: "垂れ歩",
      confidence: "medium",
      reasons,
    }
  }

  return {
    key: "tarefu",
    name: "垂れ歩",
    confidence: "low",
    reasons: [
      ...reasons,
      "ただしこの歩自体は取りやすく、拠点としてはやや不安定",
    ],
  }
}

const doesPieceAttackSquare = (
  board: Board,
  from: { x: number; y: number },
  to: { x: number; y: number },
  piece: { type: string; owner: Player }
): boolean => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  switch (piece.type) {
    case "FU":
      return piece.owner === "black"
        ? isBlackForward(dx, dy)
        : isWhiteForward(dx, dy)

    case "KE":
      return piece.owner === "black"
        ? (dx === -1 && dy === -2) || (dx === 1 && dy === -2)
        : (dx === -1 && dy === 2) || (dx === 1 && dy === 2)

    case "GI":
      return isSilverLikeMove(dx, dy, piece.owner)

    case "KI":
      return isGoldLikeMove(dx, dy, piece.owner)

    case "OU":
      return isKingLikeMove(dx, dy)

    case "TO":
    case "NY":
    case "NK":
    case "NG":
      return isGoldLikeMove(dx, dy, piece.owner)

    case "HI":
      return (dx === 0 || dy === 0) && isClearPath(board, from, to)

    case "KA":
      return adx === ady && adx > 0 && isClearPath(board, from, to)

    case "KY":
      if (piece.owner === "black") {
        return dx === 0 && dy < 0 && isClearPath(board, from, to)
      }
      return dx === 0 && dy > 0 && isClearPath(board, from, to)

    case "UM":
      if (adx === ady && adx > 0) {
        return isClearPath(board, from, to)
      }
      return (adx === 1 && ady === 0) || (adx === 0 && ady === 1)

    case "RY":
      if ((dx === 0 || dy === 0) && !(dx === 0 && dy === 0)) {
        return isClearPath(board, from, to)
      }
      return adx === 1 && ady === 1

    default:
      return false
  }
}

//
// =========================
// ユーティリティ
// =========================
//

const findKing = (board: Board, owner: Player) => {
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

// 超簡易利き判定（まずはこれでOK）
const isInsideBoard = (x: number, y: number): boolean => {
  return x >= 0 && x < 9 && y >= 0 && y < 9
}

const isSquareAttacked = (
  board: Board,
  pos: { x: number; y: number },
  player: Player
): boolean => {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board.getPiece({ x, y })
      if (!p || p.owner !== player) continue

      if (
        doesPieceAttackSquare(
          board,
          { x, y },
          pos,
          { type: p.type, owner: p.owner }
        )
      ) {
        return true
      }
    }
  }

  return false
}

const isSlidingAttackerForDirection = (
  piece: { type: string; owner: Player },
  dx: number,
  dy: number
): boolean => {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  switch (piece.type) {
    case "HI":
    case "RY":
      return dx === 0 || dy === 0

    case "KA":
    case "UM":
      return adx === ady

    case "KY":
      if (dx !== 0) return false
      return piece.owner === "black" ? dy > 0 : dy < 0

    default:
      return false
  }
}

const getFrontSquare = (
  pos: { x: number; y: number },
  player: Player
) => {
  const next =
    player === "black"
      ? { x: pos.x, y: pos.y - 1 }
      : { x: pos.x, y: pos.y + 1 }

  if (!isInsideBoard(next.x, next.y)) {
    return null
  }

  return next
}

const getPieceValue = (type: string): number => {
  switch (type) {
    case "OU":
      return 100
    case "HI":
    case "RY":
      return 9
    case "KA":
    case "UM":
      return 8
    case "KI":
      return 6
    case "GI":
    case "NG":
      return 5
    case "KE":
    case "NK":
      return 4
    case "KY":
    case "NY":
      return 3
    case "TO":
      return 3
    case "FU":
      return 1
    default:
      return 1
  }
}

const getProtectedPieceWeight = (type: string): number => {
  switch (type) {
    case "OU":
      return 100
    case "HI":
    case "RY":
      return 9
    case "KA":
    case "UM":
      return 8
    case "KI":
      return 6
    case "GI":
    case "NG":
      return 5
    case "KE":
    case "NK":
      return 4
    case "KY":
    case "NY":
      return 3
    case "TO":
      return 3
    case "FU":
      return 1
    default:
      return 1
  }
}

const getAttackedEnemyPieces = (
  board: Board,
  player: Player
): { x: number; y: number; type: string; value: number }[] => {
  const targets: { x: number; y: number; type: string; value: number }[] = []

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board.getPiece({ x, y })
      if (!p || p.owner === player) continue

      if (isSquareAttacked(board, { x, y }, player)) {
        targets.push({
          x,
          y,
          type: p.type,
          value: getPieceValue(p.type),
        })
      }
    }
  }

  return targets
}

const getRelativeRank = (
  y: number,
  player: Player
): number => {
  // 1〜9（自分から見た段）
  return player === "black"
    ? 9 - y
    : y + 1
}

const getBoardZone = (
  y: number,
  player: Player
): "ownCamp" | "middle" | "enemyCamp" => {
  const rank = getRelativeRank(y, player)

  if (rank <= 3) return "ownCamp"
  if (rank <= 6) return "middle"
  return "enemyCamp"
}

const isBlackForward = (dx: number, dy: number) => {
  return dx === 0 && dy === -1
}

const isWhiteForward = (dx: number, dy: number) => {
  return dx === 0 && dy === 1
}

const isGoldLikeMove = (dx: number, dy: number, owner: Player): boolean => {
  if (owner === "black") {
    return (
      (dx === 0 && dy === -1) ||
      (dx === -1 && dy === -1) ||
      (dx === 1 && dy === -1) ||
      (dx === -1 && dy === 0) ||
      (dx === 1 && dy === 0) ||
      (dx === 0 && dy === 1)
    )
  }

  return (
    (dx === 0 && dy === 1) ||
    (dx === -1 && dy === 1) ||
    (dx === 1 && dy === 1) ||
    (dx === -1 && dy === 0) ||
    (dx === 1 && dy === 0) ||
    (dx === 0 && dy === -1)
  )
}

const isSilverLikeMove = (dx: number, dy: number, owner: Player): boolean => {
  if (owner === "black") {
    return (
      (dx === 0 && dy === -1) ||
      (dx === -1 && dy === -1) ||
      (dx === 1 && dy === -1) ||
      (dx === -1 && dy === 1) ||
      (dx === 1 && dy === 1)
    )
  }

  return (
    (dx === 0 && dy === 1) ||
    (dx === -1 && dy === 1) ||
    (dx === 1 && dy === 1) ||
    (dx === -1 && dy === -1) ||
    (dx === 1 && dy === -1)
  )
}

const isKingLikeMove = (dx: number, dy: number): boolean => {
  return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !(dx === 0 && dy === 0)
}

const isClearPath = (
  board: Board,
  from: { x: number; y: number },
  to: { x: number; y: number }
): boolean => {
  const dx = Math.sign(to.x - from.x)
  const dy = Math.sign(to.y - from.y)

  let x = from.x + dx
  let y = from.y + dy

  while (x !== to.x || y !== to.y) {
    if (board.getPiece({ x, y })) {
      return false
    }
    x += dx
    y += dy
  }

  return true
}
