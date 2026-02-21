import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Automated 3-Statement Modeler",
  description: "Advanced financial statement aggregation and mapping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen antialiased flex flex-col md:flex-row h-screen overflow-hidden`}>
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
