import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "DebateLord - Pokemon-Style Debate Battle",
  description: "Challenge the DebateLord in a Pokemon-style debate battle!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pressStart2P.className}>
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
