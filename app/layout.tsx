import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mark · the Name Maker",
  description:
    "Mark is an AI agent that invents creative business names and checks domain availability in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
