"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock, MailCheck } from "lucide-react";
import { establishmentApi } from "@/services/establishment-api";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["invite-token", token],
    queryFn: () => establishmentApi.validateInviteToken(token),
    enabled: Boolean(token),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: establishmentApi.acceptInvite,
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          "Nao foi possivel aceitar o convite.",
        ),
      );
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-slate-600">Token de convite não informado.</p>
          <Link href="/login" className="mt-6 inline-block text-primary-600 font-bold hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-xl bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-heading font-black text-3xl text-primary-600 mb-2">
            Confirmar acesso
          </h1>
          <p className="text-slate-500 text-sm">
            Você foi convidado para acessar <span className="font-semibold text-slate-700">{data?.establishment?.name || "um estabelecimento"}</span> como{" "}
            <span className="font-semibold text-slate-700">{data?.role || "usuário"}</span>.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            acceptInviteMutation.mutate({ token, password });
          }}
        >
          {error ? (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-4 text-sm text-primary-700">
            {data?.accountExists
              ? "Este e-mail já possui acesso à plataforma. Defina uma nova senha se quiser sincronizar o acesso entre as lojas."
              : "Defina sua senha para ativar o acesso ao estabelecimento."}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={acceptInviteMutation.isPending}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {acceptInviteMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : null}
            Confirmar acesso
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>}>
      <InvitePageContent />
    </Suspense>
  );
}
