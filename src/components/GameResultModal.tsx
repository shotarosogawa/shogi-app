type Props = {
  isOpen: boolean
  title: string
  message: string

  // 感想戦モードへ入る（盤面を見る）
  onReview: () => void

  // 最初からやり直す
  onRestart: () => void
}

export function GameResultModal({
  isOpen,
  title,
  message,
  onReview,
  onRestart,
}: Props) {
  // モーダル非表示なら何も描画しない
  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: 380,
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        {/* タイトル */}
        <h2 style={{ marginTop: 0, marginBottom: 12, color: "black" }}>
          {title}
        </h2>

        {/* メッセージ */}
        <div style={{ marginBottom: 24, fontSize: 16, color: "black" }}>
          {message}
        </div>

        {/* 操作ボタン */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          {/* 感想戦モードへ移行 */}
          <button
            onClick={onReview}
            style={{
              padding: "10px 18px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            盤面を見る
          </button>

          {/* 対局をリセット */}
          <button
            onClick={onRestart}
            style={{
              padding: "10px 18px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            最初から
          </button>
        </div>
      </div>
    </div>
  )
}