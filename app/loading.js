// app/loading.js
// Next.js App Router automatically shows this file while app/page.js
// is server-rendering (e.g. during pagination navigation).
// It reuses the existing .skeleton / .grid-container CSS classes.

export default function HomeLoading() {
  return (
    <>
      {/* ── Header skeleton ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px 24px",
          gap: "12px",
        }}
      >
        {/* Site title bar */}
        <div
          className="skeleton"
          style={{ width: "260px", height: "36px", borderRadius: "8px" }}
        />
        {/* Subtitle line */}
        <div
          className="skeleton"
          style={{ width: "340px", maxWidth: "90vw", height: "18px", borderRadius: "6px" }}
        />
      </div>

      {/* ── Search box skeleton ── */}
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto 32px",
          padding: "0 20px",
          width: "100%",
        }}
      >
        <div
          className="skeleton"
          style={{ width: "100%", height: "52px", borderRadius: "12px" }}
        />
      </div>

      {/* ── Novel cards grid skeleton ── */}
      <main className="app-main">
        <div className="grid-container">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--sn-paper-card)",
                borderRadius: "var(--radius)",
                padding: "20px 20px 18px 18px",
                boxShadow: "var(--sn-shadow)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "170px",
                border: "1px solid var(--sn-paper-line)",
                borderLeft: "5px solid var(--sn-paper-line)",
                gap: "14px",
              }}
            >
              {/* Title — 2 line area */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  className="skeleton"
                  style={{ height: "20px", borderRadius: "5px", width: "90%" }}
                />
                <div
                  className="skeleton"
                  style={{ height: "20px", borderRadius: "5px", width: "65%" }}
                />
              </div>

              {/* Action buttons row */}
              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <div
                  className="skeleton"
                  style={{ flex: 1, height: "46px", borderRadius: "9px" }}
                />
                <div
                  className="skeleton"
                  style={{ width: "46px", height: "46px", borderRadius: "9px", flexShrink: 0 }}
                />
                <div
                  className="skeleton"
                  style={{ width: "46px", height: "46px", borderRadius: "9px", flexShrink: 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
