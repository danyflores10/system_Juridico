import type { ReactNode } from "react";

import { AuthBrandPanel } from "../_components/auth-brand-panel";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <AuthBrandPanel />
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
