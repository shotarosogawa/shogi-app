import { parseKifDirectory } from "../core/history/parseKifFile"

const main = () => {
  const records = parseKifDirectory("./kif")

  console.log("total records:", records.length)

  console.log(records.slice(0, 5))
}

main()