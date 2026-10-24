import type { ReactNode } from "react";

import { CartProviderConfig } from "@/src/features/cart/lib/cart-context";
import { Toaster } from "@/components/ui/sonner";
import type { AppConfig } from "@/lib/app-config";
import { AppConfigProvider } from "./app-config-provider";
import { QueryClientProviderConfig } from "./query-client-providers";
import { ThemeProviderConfig } from "./theme-provider";

interface AppProvidersProps {
  readonly config: AppConfig;
  readonly children: ReactNode;
}

export function Providers({ config, children }: AppProvidersProps) {
  return (
    <AppConfigProvider config={config}>
      <ThemeProviderConfig>
        <QueryClientProviderConfig>
          <CartProviderConfig>{children}</CartProviderConfig>
        </QueryClientProviderConfig>
        {/* Inside the theme provider: the toaster reads the portal's own theme context. */}
        <Toaster position="top-center" />
      </ThemeProviderConfig>
    </AppConfigProvider>
  );
}
