"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const resetMutation = useMutation({
    mutationFn: establishmentApi.resetPassword,
    onSuccess: (result) => {
      const message =
        typeof result === "object" &&
        result !== null &&
        "message" in result &&
        typeof (result as { message?: unknown }).message === "string"
          ? (result as { message: string }).message
          : "Senha atualizada com sucesso.";
      setError("");
      setSuccessMessage(message);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          "Nao foi possivel redefinir a senha.",
        ),
      );
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="font-heading font-black text-3xl text-primary-600 mb-2">
            Redefinir senha
          </h1>
          <p className="text-slate-500 text-sm">
            Defina uma nova senha para voltar a acessar o painel.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setSuccessMessage("");
            resetMutation.mutate({ token, password });
          }}
        >
          {error ? (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100">
              {successMessage}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending || !token}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-200 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {resetMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : null}
            Atualizar senha
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <Link href="/login" className="text-sm font-bold text-primary-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
