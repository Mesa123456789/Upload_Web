import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props) {
  return (
    <button
      {...props}
      className="px-6 py-2.5 rounded-full bg-primary text-white hover:bg-primary-light transition shadow-sm font-bold cursor-pointer active:scale-95"
    />
  );
}
