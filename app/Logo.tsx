import { ComponentProps } from "react";

export function Logo(props: ComponentProps<"svg">) {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x={0.5}
        y={31.5}
        width={31}
        height={31}
        rx={15.5}
        transform="rotate(-90 .5 31.5)"
        fill="#171717"
        stroke="#262626"
      />
      <rect
        x={19.459}
        y={11.4169}
        width={1.91682}
        height={1.91682}
        rx={0.958408}
        transform="rotate(-90 19.459 11.417)"
        fill="#D4D4D4"
        stroke="#D4D4D4"
      />
      <path
        d="M19.606 19.628c-1.691-3.587-4.518-9.367-3.724-6.8.717 2.318-3.124 4.96-5.932 6.416-.284.147-.186.602.134.61l9.244.2a.299.299 0 00.278-.426z"
        fill="#D4D4D4"
        stroke="#D4D4D4"
      />
    </svg>
  );
}
