import type { ReactNode } from "react";
import Header from "./Header";

interface Props {
  children: ReactNode;
}

export default function PageContainer({ children }: Props) {
  return (
    <div className="min-h-screen bg-background-main">
      <Header />
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
