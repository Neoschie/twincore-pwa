export default function CarPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090B",
        color: "white",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Car Page
        </h1>
        <p style={{ color: "#A1A1AA" }}>
          This page is now using web components instead of React Native.
        </p>
      </div>
    </main>
  );
}