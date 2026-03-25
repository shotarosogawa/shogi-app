import { spawn } from "child_process"
import type { EngineAnalysisResult } from "../core/engine/EngineAnalysisResult"

const ENGINE_PATH = "./engine/Suisho5-ZEN2.exe"

export const analyzeWithEngine = async (
  sfen: string
): Promise<EngineAnalysisResult> => {
  return new Promise((resolve, reject) => {
    const engine = spawn(ENGINE_PATH)

    let bestMove: string | null = null
    let evaluationCp: number | null = null
    let pv: string[] = []

    engine.stdout.on("data", (data) => {
      const text = data.toString()

      // デバッグ用
      console.log("[engine]", text)

      const lines = text.split("\n")

      for (const line of lines) {
        // 評価値
        if (line.startsWith("info")) {
          const cpMatch = line.match(/score cp (-?\d+)/)
          if (cpMatch) {
            evaluationCp = Number(cpMatch[1])
          }

          const pvMatch = line.match(/pv (.+)$/)
          if (pvMatch) {
            pv = pvMatch[1].split(" ")
          }
        }

        // bestmove
        if (line.startsWith("bestmove")) {
          const parts = line.split(" ")
          bestMove = parts[1]

          engine.stdin.write("quit\n")

          resolve({
            bestMove,
            evaluationCp,
            principalVariation: pv,
            candidates: [],
          })
        }
      }
    })

    engine.stderr.on("data", (data) => {
      console.error("[engine error]", data.toString())
    })

    engine.on("error", (err) => {
      reject(err)
    })

    // -------------------------
    // USIコマンド
    // -------------------------

    engine.stdin.write("usi\n")
    engine.stdin.write("isready\n")
    engine.stdin.write(`position sfen ${sfen}\n`)
    engine.stdin.write("go depth 10\n")
  })
}