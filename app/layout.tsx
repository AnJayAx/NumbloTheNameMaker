import type { Metadata } from "next";
import { AuthProvider } from "@/lib/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Namblo",
  description:
    "Namblo is an AI agent that invents creative business names and checks domain availability in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
