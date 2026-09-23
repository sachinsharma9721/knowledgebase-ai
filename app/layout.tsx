import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KnowledgeBase AI — Chat with Your Documents",
  description:
    "Create isolated knowledge bases, upload documents, and chat with an AI grounded strictly in your content. Embed a chat widget on any website.",
  keywords: [
    "AI",
    "knowledge base",
    "document chat",
    "RAG",
    "embeddable widget",
    "PDF chat",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
