export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            border: "1px solid #232326",
            background: "#111113",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          TC
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          TwinCore
        </h1>

        <p
          style={{
            marginTop: 10,
            color: "#A1A1AA",
            fontSize: 15,
          }}
        >
          Loading your crew...
        </p>
      </div>
    </main>
  );
}