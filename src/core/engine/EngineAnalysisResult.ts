export type EngineCandidate = {
  moveText: string
  evaluationCp: number | null
  mate: number | null
  principalVariation: string[]
}

export type EngineAnalysisResult = {
  bestMove: string | null
  evaluationCp: number | null
  mate: number | null
  principalVariation: string[]
  candidates: EngineCandidate[]
}