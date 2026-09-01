import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "AI PR Reviewer",
  description: "Automated AI code reviews tailored to your repository guidelines",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}