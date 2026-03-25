import { MongoClient } from "mongodb"
import { parseKifDirectory } from "../core/history/parseKifFile"
import { buildGameDocument } from "../core/history/buildGameDocument"

const MONGO_URI = "mongodb://localhost:27017"
const DB_NAME = "shogi"

const main = async () => {
  const client = new MongoClient(MONGO_URI)
  await client.connect()

  const db = client.db(DB_NAME)

  const results = parseKifDirectory("./kif")

  const games = results.map(r =>
    buildGameDocument(r.game, "manual-kif")
  )

  const positions = results.flatMap(r => r.positions)

  console.log("games:", games.length)
  console.log("positions:", positions.length)

  // 重複回避
  await db.collection("games").insertMany(games, { ordered: false }).catch(() => {})
  await db.collection("positions").insertMany(positions, { ordered: false }).catch(() => {})

  console.log("import done")

  await client.close()
}

main()