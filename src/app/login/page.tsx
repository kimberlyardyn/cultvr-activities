import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/login/actions";
import { PublicNav } from "@/components/public-nav";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <main
      className="min-h-screen bg-[#ECE6E0] px-5 py-6 text-[#1F2433] md:px-10 md:py-7"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
      }}
    >
      <PublicNav />

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            Secure student workspace
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl leading-none tracking-tight text-[#1F2433]">
            Continue your college planning.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[#1F2433]/65">
            Sign in to review notes, organize activities and awards, prepare
            essay work, and keep next steps clear.
          </p>
        </div>

        <div className="grid gap-4">
          {message ? (
            <div className="rounded-md border border-[#cdd8c9] bg-white/80 px-4 py-3 text-sm text-[#355c46]">
              {message}
            </div>
          ) : null}

          <form
            action={signInWithPassword}
            className="rounded-2xl border border-[#1F2433]/10 bg-[#F6F0E8]/90 p-6 shadow-sm"
          >
            <h2 className="font-serif text-2xl text-[#1F2433]">Sign in</h2>
            <div className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="h-11 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>
            <button className="mt-4 h-11 w-full rounded-full bg-[#1F2433] px-4 font-medium text-[#ECE6E0] hover:bg-[#0F1322]">
              Sign in
            </button>
          </form>

          <form
            action={signUpWithPassword}
            className="rounded-2xl border border-[#1F2433]/10 bg-[#F6F0E8]/90 p-6 shadow-sm"
          >
            <h2 className="font-serif text-2xl text-[#1F2433]">
              Create account
            </h2>
            <div className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                name="fullName"
                placeholder="Student name"
                required
              />
              <input
                className="h-11 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="h-11 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                minLength={8}
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>
            <button className="mt-4 h-11 w-full rounded-full border border-[#3F4A66] px-4 font-medium text-[#3F4A66] hover:bg-[#3F4A66]/5">
              Create account
            </button>
          </form>

          <form
            action={signInWithMagicLink}
            className="rounded-2xl border border-[#1F2433]/10 bg-[#F6F0E8]/90 p-6 shadow-sm"
          >
            <h2 className="font-serif text-2xl text-[#1F2433]">Magic link</h2>
            <div className="mt-5 flex gap-3">
              <input
                className="h-11 min-w-0 flex-1 rounded-lg border border-[#1F2433]/15 bg-white/70 px-3 outline-none focus:border-[#3F4A66]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <button className="h-11 rounded-full bg-[#1F2433] px-5 font-medium text-[#ECE6E0] hover:bg-[#0F1322]">
                Send
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
