import "./globals.css";

export const metadata = {
  title: "BlogPilot — AI Writing Workspace",
  description:
    "Research, plan, write, and manage thoughtful blog posts with BlogPilot.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}