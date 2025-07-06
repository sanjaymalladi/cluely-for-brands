import { ComponentProps } from "react";

export function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6 1v10M1 6h10"
        stroke="#E5E5E5"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
