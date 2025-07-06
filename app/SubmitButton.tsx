import { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

export function SubmitButton({
  children,
  disabled,
  ...props
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} {...props}>
      <Spinner loading={pending}>{children}</Spinner>
    </button>
  );
}
