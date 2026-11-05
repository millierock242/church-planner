import "./globals.css";
import Navbar from "./Components/navbar";

export const metadata = {
  title: "Church Planner",
  description: "Church volunteer and service scheduling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}