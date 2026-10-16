
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "BlogPilot — AI Writing Workspace",
  description:
    "Research, plan, write, and manage thoughtful blog posts with BlogPilot.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
