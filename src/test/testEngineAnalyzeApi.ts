import { BoardFactory } from "../core/board/BoardFactory"
import { boardToSfen } from "../core/utils/boardToSfen"

const main = async () => {
  const board = BoardFactory.createInitialBoard()
  const sfen = boardToSfen(board)

  const res = await fetch("http://localhost:3001/api/engine/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sfen }),
  })

  const data = await res.json()
  console.log(JSON.stringify(data, null, 2))
}

main()