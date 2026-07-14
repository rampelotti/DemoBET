"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/features/auth/actions/register";

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await registerUser({ username, email, password });

    if (!result.success) {
      setError(result.message ?? "Não foi possível criar sua conta.");
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-card">
      <CardHeader className="gap-2 text-center">
        <CardTitle className="text-2xl">Crie sua conta grátis</CardTitle>
        <CardDescription>Ganhe 10.000 Coins e comece a apostar sem risco.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="usuario"
                className="pl-7 lowercase"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
                title="3–20 caracteres: comece com letra; use letras, números ou _"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sua tag no site. Única, sem espaços. Ex.: @usuario
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="voce@email.com" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Ao criar uma conta, você concorda com os{" "}
            <Link href="#" className="font-medium text-primary hover:underline">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="#" className="font-medium text-primary hover:underline">
              Política de privacidade
            </Link>
            .
          </p>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
