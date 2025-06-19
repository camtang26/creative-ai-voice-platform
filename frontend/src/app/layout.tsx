import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./modern-globals.css";
import { Sidebar } from "@/components/sidebar";
import { SocketProvider } from "@/lib/socket-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>
            <div className="flex h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-800/20 rounded-full blur-3xl animate-float" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-700/10 rounded-full blur-3xl animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gray-600/5 rounded-full blur-3xl animate-pulse-slow" />
              </div>
              
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-6 relative z-10">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
