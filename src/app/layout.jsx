import "./globals.css";

export const metadata = {
  title: "Lukreative Solutions — Task Tracker",
  description: "Client task tracking and approvals for Lukreative Solutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
