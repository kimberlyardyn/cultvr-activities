import Link from "next/link";

import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/login/actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
      <section className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <Link className="text-sm font-semibold text-[#355c46]" href="/">
            Cultvr
          </Link>
          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-[#17201b]">
            Start a private workspace for college planning.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[#55615b]">
            Sign in to capture reflections, organize activities, set goals, and
            use the AI counselor in chat or voice mode.
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
            className="rounded-lg border border-black/10 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#17201b]">Sign in</h2>
            <div className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>
            <button className="mt-4 h-11 w-full rounded-md bg-[#2f5d46] px-4 font-semibold text-white hover:bg-[#264b39]">
              Sign in
            </button>
          </form>

          <form
            action={signUpWithPassword}
            className="rounded-lg border border-black/10 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#17201b]">
              Create account
            </h2>
            <div className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                name="fullName"
                placeholder="Student name"
                required
              />
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="h-11 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                minLength={8}
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>
            <button className="mt-4 h-11 w-full rounded-md border border-[#2f5d46] px-4 font-semibold text-[#2f5d46] hover:bg-[#edf4ef]">
              Create account
            </button>
          </form>

          <form
            action={signInWithMagicLink}
            className="rounded-lg border border-black/10 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[#17201b]">Magic link</h2>
            <div className="mt-5 flex gap-3">
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-black/15 px-3 outline-none focus:border-[#355c46]"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <button className="h-11 rounded-md bg-[#17201b] px-4 font-semibold text-white hover:bg-black">
                Send
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
