"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { toast } from "sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/lib/auth/auth-context";

type AdminShellUser = {
  name: string;
  email: string;
};

/**
 * The admin panel chrome: collapsible sidebar + top header + content area.
 * Server-authoritative access control already happened in `admin/layout.tsx`
 * (and before that, `src/proxy.ts`) — this component only renders.
 */
export function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
      // Leave /admin immediately — staying here signed-out would just bounce
      // off the server re-check on the next navigation anyway.
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out.");
      setSigningOut(false);
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />

          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {user.email}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Store />
                View store
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
