import "./globals.css";

export const metadata = {
  title: "Cloud Drive",
  description: "Cloud-based file storage service",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}