import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "BlindProcure — Confidential sealed-bid procurement",
    template: "%s · BlindProcure",
  },
  description:
    "Sealed-bid procurement on Ethereum. Suppliers submit encrypted prices, the contract selects the lowest valid bid with Zama FHE, and only the right result is revealed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${archivo.variable} ${geistMono.variable}`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
