"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, Wallet, X } from "lucide-react";
import { useMockWallet } from "@/lib/wallet/useMockWallet";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/courses", label: "课程广场" },
  { href: "/teacher", label: "老师工作台" },
  { href: "/admin", label: "Owner 后台" },
];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TopNav() {
  const { connected, address, network, connect, disconnect } = useMockWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  const networkLabel =
    network === "sepolia" ? "Sepolia" : network === "mainnet" ? "Mainnet" : "错误网络";
  const networkShortLabel =
    network === "sepolia" ? "SEP" : network === "mainnet" ? "MAIN" : "!";

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-2">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 font-heading text-headline-md text-on-surface"
        >
          <GraduationCap className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Web3 University</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="主导航">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            className="shrink-0 rounded-full border border-outline-variant bg-surface-container px-2 py-1 font-mono text-label-md text-on-surface-variant sm:px-3"
            title={networkLabel}
          >
            <span className="hidden sm:inline">{networkLabel}</span>
            <span className="sm:hidden">{networkShortLabel}</span>
          </span>

          <button
            type="button"
            onClick={connected ? disconnect : connect}
            aria-label={connected ? `断开钱包连接 ${truncateAddress(address)}` : "连接钱包"}
            className="flex shrink-0 items-center gap-2 rounded-md border border-outline-variant bg-surface-container px-2 py-2 font-mono text-label-md text-on-surface transition-colors hover:bg-surface-container-high sm:px-3"
          >
            <span
              className={`size-2 shrink-0 rounded-full ${connected ? "bg-secondary" : "bg-error"}`}
              aria-hidden="true"
            />
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{connected ? truncateAddress(address) : "连接钱包"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-container p-2 text-on-surface md:hidden"
            aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          className="border-t border-outline-variant/40 bg-surface-container-lowest md:hidden"
          aria-label="移动端导航"
        >
          <div className="container-app flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
