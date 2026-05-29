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

      <section className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-lg items-center justify-center py-8 lg:py-10">
        <LoginAuthCard message={message} />
      </section>
    </main>
  );
}
