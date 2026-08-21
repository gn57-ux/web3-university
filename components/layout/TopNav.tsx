"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, GraduationCap, Loader2, Menu, Wallet, X } from "lucide-react";
import { useWallet } from "@/lib/wallet/useWallet";
import { TARGET_CHAIN } from "@/lib/contracts/chain";

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
  const {
    connected,
    loading,
    switchingNetwork,
    address,
    network,
    authError,
    login,
    logout,
    switchToTargetChain,
  } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  const statusDotClass =
    connected && network === "correct"
      ? "bg-secondary"
      : connected && network === "wrong-network"
        ? "bg-tertiary"
        : "bg-error";

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

        <nav className="hidden items-center gap-6 lg:flex" aria-label="主导航">
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
          {connected && network === "wrong-network" && (
            <button
              type="button"
              onClick={() => switchToTargetChain()}
              disabled={switchingNetwork}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-tertiary bg-tertiary-container px-2 py-1 font-mono text-label-md text-on-tertiary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
            >
              {switchingNetwork && (
                <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {switchingNetwork ? "切换中..." : `错误网络 · 切换到 ${TARGET_CHAIN.name}`}
              </span>
              <span className="sm:hidden">{switchingNetwork ? "切换中" : "切换网络"}</span>
            </button>
          )}
          {connected && network === "correct" && (
            <span
              className="flex shrink-0 items-center rounded-full border border-outline-variant bg-surface-container px-2 py-1 font-mono text-label-md text-on-surface-variant sm:px-3"
              title={TARGET_CHAIN.name}
            >
              <span className="hidden sm:inline">{TARGET_CHAIN.name}</span>
              <span className="sm:hidden">{TARGET_CHAIN.name.slice(0, 3).toUpperCase()}</span>
            </span>
          )}

          {authError && (
            <span
              role="alert"
              className="flex min-w-0 shrink items-center gap-1 text-error"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span className="max-w-24 truncate text-label-md sm:max-w-48" title={authError}>
                {authError}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={connected ? () => logout() : login}
            disabled={loading}
            aria-label={
              connected
                ? `退出登录 ${address ? truncateAddress(address) : ""}`
                : "登录"
            }
            className="flex shrink-0 items-center gap-2 rounded-md border border-outline-variant bg-surface-container px-2 py-2 font-mono text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
          >
            {loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <span
                className={`size-2 shrink-0 rounded-full ${statusDotClass}`}
                aria-hidden="true"
              />
            )}
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">
              {loading
                ? "加载中..."
                : connected
                  ? address
                    ? truncateAddress(address)
                    : "已登录"
                  : "登录"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-container p-2 text-on-surface lg:hidden"
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
          className="border-t border-outline-variant/40 bg-surface-container-lowest lg:hidden"
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
