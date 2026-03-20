type Props = {
  isOpen: boolean
  onPromote: () => void
  onNotPromote: () => void
  onClose: () => void
}

export function PromoteModal({
  isOpen,
  onPromote,
  onNotPromote,
  onClose,
}: Props) {
  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 320,
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>成りますか？</h3>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <button
            onClick={onPromote}
            style={{
              padding: "10px 16px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            成る
          </button>

          <button
            onClick={onNotPromote}
            style={{
              padding: "10px 16px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            成らない
          </button>
        </div>
      </div>
    </div>
  )
}