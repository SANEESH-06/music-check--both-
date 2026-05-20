import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "EchoWave Music Studio",
  description: "Futuristic music player with admin uploads and theme controls",
  icons: {
    icon: "/icon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
