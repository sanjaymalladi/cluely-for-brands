import { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export function Fieldset({ children, ...rest }: ComponentProps<"fieldset">) {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} {...rest}>
      {children}
    </fieldset>
  );
}
