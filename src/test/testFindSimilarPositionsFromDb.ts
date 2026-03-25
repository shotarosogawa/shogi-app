// src/test/testFindSimilarPositionsFromDb.ts

import { MongoClient } from "mongodb"
import { findSimilarPositionsFromDb } from "../core/history/findSimilarPositionsFromDb"

const MONGO_URI = "mongodb://localhost:27017"
const DB_NAME = "shogi"

const main = async () => {
  const client = new MongoClient(MONGO_URI)
  await client.connect()

  const db = client.db(DB_NAME)

  // 先頭1件の局面キーを拾ってテスト
  const sample = await db.collection("positions").findOne({})

  if (!sample?.positionKey) {
    console.log("positions にデータがありません")
    await client.close()
    return
  }

  const result = await findSimilarPositionsFromDb(db, sample.positionKey, 5)

  console.log("positionKey:", sample.positionKey)
  console.log(JSON.stringify(result, null, 2))

  await client.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})