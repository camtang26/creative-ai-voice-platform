import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SocketProvider } from "@/lib/socket-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Investor Signals AI Call Centre",
  description: "ElevenLabs AI Calling Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SocketProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </SocketProvider>
      </body>
    </html>
  );
}
