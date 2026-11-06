import "./globals.css";
import Navbar from "./Components/navbar";

// Every page reads live data, so never pre-build pages at deploy time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Christ Community Church’s Planner",
  description: "Volunteer and service scheduling for Christ Community Church",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-50 text-gray-900 antialiased min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
