import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/terms", label: "服务条款" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/whitepaper", label: "白皮书" },
  { href: "/docs", label: "文档" },
];

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/40 bg-surface-container-lowest">
      <div className="container-app flex flex-col gap-4 py-10 text-body-md text-on-surface-variant md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-on-surface">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-code-sm font-mono md:items-end">
          <span>Built on Sepolia Testnet</span>
          <span>&copy; {new Date().getFullYear()} Web3 University. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
