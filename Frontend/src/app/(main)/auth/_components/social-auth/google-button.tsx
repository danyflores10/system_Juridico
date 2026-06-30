"use client";

import { useRouter } from "next/navigation";

import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleButton({
  className,
  onClick,
  type = "button",
  variant = "secondary",
  ...props
}: React.ComponentProps<typeof Button>) {
  const router = useRouter();

  return (
    <Button
      {...props}
      type={type}
      variant={variant}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          router.replace("/dashboard/default");
        }
      }}
    >
      <SimpleIcon icon={siGoogle} className="size-4" />
      Continuar con Google
    </Button>
  );
}
