import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Topbar from "@/components/Topbar";
import Activity from "@/components/Activity";
import Sidebar from "@/components/Sidebar";
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MOCHA",
  description: "BROWSE, STREAM, DOWNLOAD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={`${jakarta.variable} font-sans`}
      >
<div className="flex h-screen w-full overflow-hidden bg-[#100e17]">
      
      {/* Sidebar: shrink-0 prevents it from getting smaller when content grows */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        
        {/* Only this section should scroll. 'no-scrollbar' utility used here */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6">
          {children}
        </main>
      </div>
    </div>
      </body>
    </html>
  );
}
