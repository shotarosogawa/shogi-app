import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import { analyzeWithEngine } from "./analizeWithEngine"
import { findSimilarPositionsFromDb } from "../core/history/findSimilarPositionsFromDb"
import "dotenv/config"

// 既存の analyze 処理を移植
import OpenAI from "openai"

const app = express()
app.use(cors())
app.use(express.json({ limit: "1mb" }))

const MONGO_URI = "mongodb://localhost:27017"
const DB_NAME = "shogi"

const mongoClient = new MongoClient(MONGO_URI)
let db: ReturnType<MongoClient["db"]>

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const init = async () => {
  await mongoClient.connect()
  db = mongoClient.db(DB_NAME)
  console.log("Mongo connected")
}

// 履歴検索
app.get("/api/history", async (req, res) => {
  try {
    const positionKey = req.query.positionKey as string

    if (!positionKey) {
      return res.status(400).json({ error: "positionKey is required" })
    }

    const result = await findSimilarPositionsFromDb(db, positionKey, 5)
    res.json(result)
  } catch (error) {
    console.error("history api error:", error)
    res.status(500).json({ error: "history api error" })
  }
})

// AI解説
app.post("/api/analyze", async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" })
    }

    const response = await openai.responses.create({
      model: "gpt-5.4",
      input: prompt,
    })

    const text =
      response.output_text ??
      "解析結果を取得できませんでした。"

    res.json({ text })
  } catch (error) {
    console.error("analyze api error:", error)
    res.status(500).json({ error: "analyze api error" })
  }
})

// 棋譜解析
app.post("/api/engine/analyze", async (req, res) => {
  try {
    const { sfen } = req.body as { sfen?: string }

    if (!sfen) {
      return res.status(400).json({
        error: "sfen is required",
      })
    }

    const result = await analyzeWithEngine(sfen)

    return res.json(result)
  } catch (error) {
    console.error("engine analyze error:", error)
    return res.status(500).json({
      error: "failed to analyze with engine",
    })
  }
})

const PORT = 3001

init().then(() => {
  app.listen(PORT, () => {
    console.log(`server running: http://localhost:${PORT}`)
  })
})