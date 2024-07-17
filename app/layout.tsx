import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TopBar } from "./ui/top-bar";
import { Providers } from "./provider"
import './colors.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <TopBar></TopBar>
          {children}
        </Providers>
      </body>
    </html>
  );
}
