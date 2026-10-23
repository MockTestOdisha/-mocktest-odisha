import "./globals.css";
import DeviceHeartbeat from "./DeviceHeartbeat";

export const metadata = {
  title: "Mock Test Odisha",
  description: "Online mock tests for Odisha students",
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
