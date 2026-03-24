import type { GameRecordInput } from "./buildPositionRecords"
import type { Move } from "../board/Move"

// 共通の1手目（7六歩）
const move_76FU: Move = {
  from: { x: 2, y: 6 },
  to: { x: 2, y: 5 },
  piece: "FU",
  promote: false,
  drop: false,
}

// 別の初手（2六歩）
const move_26FU: Move = {
  from: { x: 7, y: 6 },
  to: { x: 7, y: 5 },
  piece: "FU",
  promote: false,
  drop: false,
}

// 別の初手（5六歩）
const move_56FU: Move = {
  from: { x: 4, y: 6 },
  to: { x: 4, y: 5 },
  piece: "FU",
  promote: false,
  drop: false,
}

export const sampleGameList: GameRecordInput[] = [
  // 👇 偏りを作る（7六歩が多い）
  { gameId: "g1", winner: "black", moves: [move_76FU] },
  { gameId: "g2", winner: "black", moves: [move_76FU] },
  { gameId: "g3", winner: "white", moves: [move_76FU] },
  { gameId: "g4", winner: "black", moves: [move_76FU] },

  // 👇 他の手も少し混ぜる
  { gameId: "g5", winner: "white", moves: [move_26FU] },
  { gameId: "g6", winner: "black", moves: [move_56FU] },
]