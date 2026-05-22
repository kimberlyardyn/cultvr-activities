import { LoginAuthCard } from "@/components/login-auth-card";
import { PublicNav } from "@/components/public-nav";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <main
      className="min-h-[100dvh] overflow-x-hidden bg-[#ECE6E0] px-5 py-6 text-[#1F2433] md:px-10 md:py-7"
      style={{
        backgroundImage:
          "radial-gradient(rgba(31,36,51,0.18) 0.6px, transparent 0.6px), radial-gradient(rgba(31,36,51,0.18) 0.5px, transparent 0.5px)",
        backgroundPosition: "0 0, 7px 11px",
        backgroundSize: "14px 14px, 22px 22px",
      }}
    >
      <PublicNav />

      <section className="mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-6xl items-start gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-10">
        <div className="flex flex-col justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#1F2433]/60">
            Secure student workspace
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-4xl leading-none tracking-tight text-[#1F2433] sm:text-5xl">
            Continue your college planning.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[#1F2433]/65">
            Sign in to review notes, organize activities and awards, prepare
            essay work, and keep next steps clear.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm text-[#1F2433]/62">
            <div className="border-l border-[#1F2433]/14 pl-3">
              <p className="font-serif text-xl text-[#1F2433]">Voice</p>
              <p className="mt-1">Resume reflections</p>
            </div>
            <div className="border-l border-[#1F2433]/14 pl-3">
              <p className="font-serif text-xl text-[#1F2433]">Plan</p>
              <p className="mt-1">Track next steps</p>
            </div>
            <div className="border-l border-[#1F2433]/14 pl-3">
              <p className="font-serif text-xl text-[#1F2433]">Story</p>
              <p className="mt-1">Shape material</p>
            </div>
          </div>
        </div>

        <LoginAuthCard message={message} />
      </section>
    </main>
  );
}
