import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function Card({ children }: Props) {
  return (
    <div className="bg-background-card rounded-2xl shadow-sm border border-black/5 p-6">
      {children}
    </div>
  );
}
