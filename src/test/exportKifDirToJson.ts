import fs from "fs"
import path from "path"
import { parseKifDirectory } from "../core/history/parseKifFile"
import { buildGameDocument } from "../core/history/buildGameDocument"

const main = () => {
  const inputDir = "./kif"
  const outputDir = "./tmp"

  const results = parseKifDirectory(inputDir)

  const games = results.map(result =>
    buildGameDocument(result.game, "manual-kif")
  )

  const positions = results.flatMap(result => result.positions)

  fs.mkdirSync(outputDir, { recursive: true })

  fs.writeFileSync(
    path.join(outputDir, "games.json"),
    JSON.stringify(games, null, 2),
    "utf-8"
  )

  fs.writeFileSync(
    path.join(outputDir, "positions.json"),
    JSON.stringify(positions, null, 2),
    "utf-8"
  )

  console.log("games:", games.length)
  console.log("positions:", positions.length)
  console.log("output:", outputDir)
}

main()