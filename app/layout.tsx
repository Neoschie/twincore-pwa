import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TwinCore",
  description: "Your social, safety, and identity hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0B] text-white">
        <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-24">
          {children}
        </div>
      </body>
    </html>
  );
}