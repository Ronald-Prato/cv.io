import { cn } from "@/lib/utils";

function H1({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("text-3xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function H2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-2xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function P({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("leading-7 text-foreground/85", className)} {...props} />;
}

function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { H1, H2, Muted, P };
