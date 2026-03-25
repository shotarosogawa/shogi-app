// src/test/initMongoIndexes.ts

import { MongoClient } from "mongodb"

const MONGO_URI = "mongodb://localhost:27017"
const DB_NAME = "shogi"

const main = async () => {
  const client = new MongoClient(MONGO_URI)

  try {
    await client.connect()
    console.log("MongoDB connected")
  } catch (error) {
    console.error("MongoDBに接続できません")
    throw error
  }

  const db = client.db(DB_NAME)

  const games = db.collection("games")
  const positions = db.collection("positions")

  console.log("creating indexes...")

  // ------------------------
  // games
  // ------------------------
  await games.createIndex(
    { gameId: 1 },
    { unique: true, name: "uniq_gameId" }
  )

  // ------------------------
  // positions
  // ------------------------

  // 局面検索（最重要）
  await positions.createIndex(
    { positionKey: 1 },
    { name: "idx_positionKey" }
  )

  // ゲーム単位取得
  await positions.createIndex(
    { gameId: 1 },
    { name: "idx_gameId" }
  )

  // よく使う複合（おすすめ）
  await positions.createIndex(
    { positionKey: 1, nextMoveText: 1 },
    { name: "idx_positionKey_move" }
  )

  console.log("indexes created")

  await client.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})