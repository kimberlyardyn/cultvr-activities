import Link from "next/link";

export function PublicNav() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link className="flex items-center gap-3" href="/">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#1F2433] font-serif text-xl text-[#ECE6E0]">
          c
        </span>
        <span className="hidden font-serif text-2xl text-[#1F2433] sm:inline">
          cultivr
        </span>
      </Link>

      <nav className="flex items-center gap-3 text-sm text-[#1F2433]/80 sm:gap-7">
        <Link className="transition hover:text-[#1F2433]" href="/about">
          Learn more
        </Link>
        <Link
          className="rounded-full border border-[#1F2433]/10 px-3 py-2 text-[#1F2433] sm:px-4"
          href="/login"
        >
          Sign in
        </Link>
      </nav>
    </header>
  );
}
