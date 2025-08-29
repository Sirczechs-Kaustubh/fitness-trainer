export const metadata = { title: "FormFit", description: "AI Fitness Coach" };

import "./globals.css";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="ring-gradient">
          <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-brand-primary">Form</span>
              <span className="text-brand-accent">Fit</span>
            </Link>
            <NavBar />
          </header>
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
