"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  ShoppingCart,
  Heart,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { mainNav, ageNav, categoryNav, type NavLink } from "@/lib/mock/nav";
import { BRAND_NAME } from "@/lib/config";

function SearchBox({ className }: { className?: string }) {
  return (
    <form action="/search" className={className} role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <Input
          name="q"
          placeholder="Search toys…"
          aria-label="Search"
          className="h-9 bg-cream-50 pl-8"
        />
      </div>
    </form>
  );
}

function NavDropdown({ label, links }: { label: string; links: NavLink[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm font-medium text-ink outline-none hover:text-neem-deep data-[state=open]:text-neem-deep">
        {label}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>{l.labelBn}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DrawerSection({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: NavLink[];
  onNavigate: () => void;
}) {
  return (
    <div className="py-2">
      <p className="px-1 pb-1 font-display text-sm font-semibold text-wood-deep">
        {title}
      </p>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className="block rounded-md px-1 py-1.5 text-ink-muted hover:bg-cream-200 hover:text-ink"
            >
              {l.labelBn}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* top bar */}
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6">
        {/* left: hamburger (mobile) / search (desktop) */}
        <div className="flex items-center justify-start">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="border-b border-cream-300">
                <SheetTitle className="font-display text-xl text-ink">
                  {BRAND_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-8">
                <SearchBox className="py-3" />
                <DrawerSection title="By Age" links={ageNav} onNavigate={close} />
                <Separator className="my-1" />
                <DrawerSection
                  title="By Category"
                  links={categoryNav}
                  onNavigate={close}
                />
                <Separator className="my-1" />
                <DrawerSection title="More" links={mainNav} onNavigate={close} />
              </div>
            </SheetContent>
          </Sheet>

          <SearchBox className="hidden w-full max-w-xs md:block" />
        </div>

        {/* center: logo */}
        <Link
          href="/"
          className="justify-self-center font-display text-2xl font-bold tracking-tight text-ink"
        >
          {BRAND_NAME}
        </Link>

        {/* right: wishlist (desktop) + cart */}
        <div className="flex items-center justify-end gap-0.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
          >
            <Link href="/search">
              <Search className="size-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label="Wishlist"
          >
            <Link href="/wishlist">
              <Heart className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Cart" className="relative">
            <Link href="/cart">
              <ShoppingCart className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-neem text-[10px] font-semibold text-paper">
                0
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* desktop nav row */}
      <nav className="hidden border-t border-cream-300 md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-2.5">
          <Link href="/" className="text-sm font-medium text-ink hover:text-neem-deep">
            Home
          </Link>
          <Link
            href="/collections/all"
            className="text-sm font-medium text-ink hover:text-neem-deep"
          >
            All Products
          </Link>
          <NavDropdown label="By Age" links={ageNav} />
          <NavDropdown label="By Category" links={categoryNav} />
          {mainNav.slice(2).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink hover:text-neem-deep"
            >
              {l.labelBn}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
