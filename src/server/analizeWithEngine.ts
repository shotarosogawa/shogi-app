import "dotenv/config"
import { spawn } from "child_process"
import path from "path"
import type { EngineAnalysisResult } from "../core/engine/EngineAnalysisResult"

const ENGINE_PATH = process.env.ENGINE_PATH!
const MULTI_PV = 3
const DEPTH = 20
const TIMEOUT_MS = 15000

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
    let bestMate: number | null = null
    let bestPv: string[] = []

    const candidatesMap = new Map<
      number,
      {
        moveText: string
        evaluationCp: number | null
        mate: number | null
        pv: string[]
      }
    >()

    let state: "init" | "usi" | "ready" | "thinking" = "init"
    let stdoutBuffer = ""
    let settled = false

    const finishResolve = (result: EngineAnalysisResult) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve(result)
    }

    const finishReject = (error: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    }

    const send = (command: string) => {
      console.log("[engine-send]", command)
      engine.stdin.write(command + "\n")
    }

    const timeout = setTimeout(() => {
      try {
        engine.kill()
      } catch {
        // noop
      }
      finishReject(new Error("engine analysis timeout"))
    }, TIMEOUT_MS)

    engine.stdout.on("data", data => {
      stdoutBuffer += data.toString()

      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() ?? ""

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue

        console.log("[engine]", line)

        // -------------------------
        // 初期化
        // -------------------------
        if (line === "usiok" && state === "init") {
          state = "usi"
          send("isready")
          continue
        }

        if (line === "readyok" && state === "usi") {
          state = "ready"
          send(`setoption name MultiPV value ${MULTI_PV}`)
          send("isready")
          continue
        }

        if (line === "readyok" && state === "ready") {
          send("usinewgame")
          send(`position sfen ${sfen}`)
          send(`go depth ${DEPTH}`)
          state = "thinking"
          continue
        }

        // thinking 前の info は無視
        if (state !== "thinking") {
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
          const pvMoves = pvMatch[1].trim().split(/\s+/)

          let evalCp: number | null = null
          let mate: number | null = null

          if (cpMatch) {
            evalCp = Number(cpMatch[1])
          } else if (mateMatch) {
            mate = Number(mateMatch[1])
          }

          const moveText = pvMoves[0] ?? ""

          candidatesMap.set(rank, {
            moveText,
            evaluationCp: evalCp,
            mate,
            pv: pvMoves,
          })

          if (rank === 1) {
            bestEval = evalCp
            bestMate = mate
            bestPv = pvMoves
          }

          continue
        }

        // -------------------------
        // bestmove
        // -------------------------
        if (line.startsWith("bestmove")) {
          const parts = line.split(/\s+/)
          bestMove = parts[1] ?? null

          send("quit")

          const candidates = Array.from(candidatesMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([_, c]) => ({
              moveText: c.moveText,
              evaluationCp: c.evaluationCp,
              mate: c.mate,
              principalVariation: c.pv,
            }))

          finishResolve({
            bestMove,
            evaluationCp: bestEval,
            mate: bestMate,
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
      finishReject(err instanceof Error ? err : new Error(String(err)))
    })

    engine.on("close", code => {
      if (!settled) {
        finishReject(
          new Error(`engine process closed before bestmove. code=${code}`)
        )
      }
    })

    // -------------------------
    // スタート
    // -------------------------
    send("usi")
  })
}