"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Search,
  UserCog,
  Users,
  X,
} from "lucide-react";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { establishmentApi } from "@/services/establishment-api";

type TeamFormState = {
  name: string;
  email: string;
  role: "owner" | "manager" | "viewer";
};

const defaultTeamForm: TeamFormState = {
  name: "",
  email: "",
  role: "manager",
};

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

function roleLabel(role?: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "viewer":
      return "Viewer";
    default:
      return role || "Usuário";
  }
}

export default function TeamManagementSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<TeamFormState>(defaultTeamForm);
  const [error, setError] = useState("");

  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });

  const currentUserRole = me?.currentUser?.role || "owner";
  const canViewTeam = currentUserRole === "owner" || currentUserRole === "manager";
  const canManageTeam = currentUserRole === "owner";

  const { data: teamUsers, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["team-users"],
    queryFn: establishmentApi.getTeamUsers,
    enabled: canViewTeam,
  });

  const createMutation = useMutation({
    mutationFn: establishmentApi.createTeamUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team-users"] });
      setIsCreateModalOpen(false);
      setFormData(defaultTeamForm);
      setError("");
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError, "Nao foi possivel criar o usuario."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        role?: "owner" | "manager" | "viewer";
        isActive?: boolean;
      };
    }) => establishmentApi.updateTeamUser(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team-users"] });
    },
    onError: (mutationError) => {
      window.alert(
        getErrorMessage(mutationError, "Nao foi possivel atualizar o usuario."),
      );
    },
  });

  const filteredUsers = useMemo(() => {
    const items = teamUsers || [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.email, item.role]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [teamUsers, search]);

  if (isLoadingMe || (canViewTeam && isLoadingTeam)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!canViewTeam) {
    return (
      <FeatureUpgradeNotice
        badge="Equipe"
        title="Apenas owner ou manager podem visualizar a equipe"
        description="Seu perfil atual não possui acesso à gestão de usuários do estabelecimento."
        ctaLabel="Voltar ao dashboard"
        ctaHref="/dashboard"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
              <Users className="h-3.5 w-3.5" />
              Equipe do estabelecimento
            </div>
            <h2 className="mt-4 font-heading font-bold text-2xl text-slate-900">
              Usuários com acesso à mesma loja
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Perfil atual: <span className="font-semibold text-slate-700">{roleLabel(currentUserRole)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuário..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {canManageTeam ? (
              <button
                type="button"
                onClick={() => {
                  setFormData(defaultTeamForm);
                  setError("");
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Novo usuário
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">Usuário</th>
                <th className="px-4 py-4 font-semibold">Papel</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Último acesso</th>
                {canManageTeam ? (
                  <th className="px-4 py-4 font-semibold text-right">Ações</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      <UserCog className="h-3.5 w-3.5" />
                      {roleLabel(item.role)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        !item.invitationAcceptedAt
                          ? "bg-blue-50 text-blue-700"
                          : item.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {!item.invitationAcceptedAt
                        ? "Convite pendente"
                        : item.isActive
                          ? "Ativo"
                          : "Inativo"}
                    </span>
                    {item.superAdmin ? (
                      <span className="ml-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                        Super admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.lastLoginAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.lastLoginAt))
                      : "Nunca acessou"}
                  </td>
                  {canManageTeam ? (
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={item.role}
                          onChange={(event) =>
                            updateMutation.mutate({
                              id: item.id,
                              payload: {
                                role: event.target.value as "owner" | "manager" | "viewer",
                              },
                            })
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              payload: { isActive: !item.isActive },
                            })
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                        >
                          {item.isActive ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900">
                  Novo usuário da equipe
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crie acessos adicionais para a mesma conta do estabelecimento. O usuário receberá um e-mail para confirmar o acesso e definir a senha.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                createMutation.mutate(formData);
              }}
              className="space-y-6 p-6"
            >
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Nome
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Papel
                  </label>
                  <select
                    value={formData.role}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        role: event.target.value as "owner" | "manager" | "viewer",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-4 text-sm text-primary-700">
                  Após criar, enviaremos um link por e-mail para o usuário confirmar a conta e definir a senha.
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Criar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
