import "dotenv/config"
import { spawn } from "child_process"
import path from "path"
import type { EngineAnalysisResult } from "../core/engine/EngineAnalysisResult"

const ENGINE_PATH = process.env.ENGINE_PATH!
const MULTI_PV = 3
const DEPTH = 10

export const analyzeWithEngine = async (
  sfen: string
): Promise<EngineAnalysisResult> => {
  return new Promise((resolve, reject) => {
    const engine = spawn(ENGINE_PATH, [], {
      cwd: path.dirname(ENGINE_PATH),
      stdio: "pipe",
    })

    let bestMove: string | null = null
    let bestEval: number | null = null
    let bestPv: string[] = []

    // multipv格納
    const candidatesMap = new Map<
      number,
      {
        moveText: string
        evaluationCp: number | null
        pv: string[]
      }
    >()

    let state: "init" | "usi" | "ready" | "thinking" = "init"

    engine.stdout.on("data", data => {
      const text = data.toString()
      const lines = text.split(/\r?\n/)

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue

        console.log("[engine]", line)

        // -------------------------
        // 初期化
        // -------------------------
        if (line === "usiok" && state === "init") {
          state = "usi"
          engine.stdin.write("isready\n")
          continue
        }

        if (line === "readyok" && state === "usi") {
          state = "ready"

          // multipv設定
          engine.stdin.write(`setoption name MultiPV value ${MULTI_PV}\n`)
          engine.stdin.write("isready\n")
          continue
        }

        if (line === "readyok" && state === "ready") {
          engine.stdin.write("usinewgame\n")
          engine.stdin.write(`position sfen ${sfen}\n`)
          engine.stdin.write(`go depth ${DEPTH}\n`)

          state = "thinking"
          continue
        }

        // -------------------------
        // info解析
        // -------------------------
        if (line.startsWith("info")) {
          const multipvMatch = line.match(/multipv (\d+)/)
          const pvMatch = line.match(/\spv\s+(.+)$/)
          const cpMatch = line.match(/score cp (-?\d+)/)
          const mateMatch = line.match(/score mate (-?\d+)/)

          if (!multipvMatch || !pvMatch) continue

          const rank = Number(multipvMatch[1])
          const pvMoves = pvMatch[1].split(" ")

          let evalCp: number | null = null

          if (cpMatch) {
            evalCp = Number(cpMatch[1])
          } else if (mateMatch) {
            const mate = Number(mateMatch[1])
            evalCp = mate > 0 ? 30000 : -30000
          }

          const moveText = pvMoves[0]

          candidatesMap.set(rank, {
            moveText,
            evaluationCp: evalCp,
            pv: pvMoves,
          })

          // multipv1をbestとして扱う
          if (rank === 1) {
            bestEval = evalCp
            bestPv = pvMoves
          }
        }

        // -------------------------
        // bestmove
        // -------------------------
        if (line.startsWith("bestmove")) {
          const parts = line.split(" ")
          bestMove = parts[1] ?? null

          engine.stdin.write("quit\n")

          // candidates整形
          const candidates = Array.from(candidatesMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([_, c]) => ({
              moveText: c.moveText,
              evaluationCp: c.evaluationCp,
              principalVariation: c.pv,
            }))

          resolve({
            bestMove,
            evaluationCp: bestEval,
            principalVariation: bestPv,
            candidates,
          })

          return
        }
      }
    })

    engine.stderr.on("data", data => {
      console.error("[engine error]", data.toString())
    })

    engine.on("error", err => {
      reject(err)
    })

    // -------------------------
    // スタート
    // -------------------------
    engine.stdin.write("usi\n")
  })
}