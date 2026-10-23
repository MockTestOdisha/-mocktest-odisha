import "./globals.css";
import DeviceHeartbeat from "./DeviceHeartbeat";

export const metadata = {
  title: "Mock Test Odisha",
  description: "Online mock tests for Odisha students",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mock Test Odisha",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DeviceHeartbeat />
        {children}
      </body>
    </html>
  );
}
