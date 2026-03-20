import "dotenv/config"
import express from "express"
import cors from "cors"
import OpenAI from "openai"

const app = express()
app.use(cors())
app.use(express.json({ limit: "2mb" }))

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

app.post("/api/analyze-shogi", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string }

    if (!prompt) {
      return res.status(400).json({
        error: "prompt is required",
      })
    }

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
    })

    return res.json({
      text: response.output_text,
    })
  } catch (error) {
    console.error("analyze-shogi error:", error)
    return res.status(500).json({
      error: "failed to analyze shogi position",
    })
  }
})

app.listen(3001, () => {
  console.log("API server listening on http://localhost:3001")
})