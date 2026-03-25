import { MongoClient, Db } from "mongodb"

const MONGO_URI = "mongodb://localhost:27017"
const DB_NAME = "shogi"

let db: Db

export const initMongo = async () => {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  db = client.db(DB_NAME)
  console.log("Mongo connected")
}

export const getDb = () => db