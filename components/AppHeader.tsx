import Link from "next/link";
import { AdtLogo } from "@/components/Brand";
import { signOut } from "@/app/auth/actions";

export function AppHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-adt-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/">
          <AdtLogo />
        </Link>
        <form action={signOut}>
          <button className="text-sm font-semibold text-slate-500 hover:text-adt-navy">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
