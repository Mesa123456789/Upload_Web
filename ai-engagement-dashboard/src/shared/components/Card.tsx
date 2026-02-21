import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function Card({ children }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      {children}
    </div>
  );
}
