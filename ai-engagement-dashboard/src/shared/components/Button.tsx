import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props) {
  const { className = "", ...rest } = props;

  return (
    <button
      {...rest}
      className={`px-6 py-2.5 rounded-full bg-primary text-white hover:bg-primary-light transition shadow-sm font-bold cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}
