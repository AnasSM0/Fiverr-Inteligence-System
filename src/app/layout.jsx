import "./globals.css";

export const metadata = {
  title: "Fiverr Positioning Intelligence",
  description: "Local-first Fiverr dataset positioning dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
