"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FeatureUpgradeNotice from "@/components/dashboard/FeatureUpgradeNotice";
import { establishmentApi } from "@/services/establishment-api";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Search,
  Ticket,
  Users,
} from "lucide-react";

const PAGE_SIZE = 100;

interface ReportClient {
  id?: string;
  name?: string;
  instagramHandle?: string;
  avatarUrl?: string;
}

interface ReportCampaign {
  id?: string;
  title?: string;
}

interface ReportParticipation {
  id: string;
  userName?: string;
  userHandle?: string;
  likes?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  client?: ReportClient | null;
  campaign?: ReportCampaign | null;
}

interface ReportCoupon {
  id: string;
  code: string;
  status?: string;
  createdAt?: string;
  redeemedAt?: string;
  cancelledAt?: string;
  userName?: string;
  client?: ReportClient | null;
  campaign?: ReportCampaign | null;
  participation?: {
    userName?: string;
    userHandle?: string;
  } | null;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
}

interface ClientReportRow {
  key: string;
  name: string;
  handle: string;
  avatarUrl: string;
  campaigns: Set<string>;
  totalPosts: number;
  approvedPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  activeCoupons: number;
  usedCoupons: number;
  cancelledCoupons: number;
  expiredCoupons: number;
  totalLikes: number;
  lastActivityAt: string | null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getLastDate(current: string | null, next?: string | null) {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function normalizeHandle(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.startsWith("@") ? value : `@${value}`;
}

function buildClientFallback(name: string) {
  return `https://ui-avatars.com/api/?background=E2E8F0&color=0F172A&name=${encodeURIComponent(
    name,
  )}`;
}

function getClientIdentity(input: {
  client?: ReportClient | null;
  userName?: string;
  userHandle?: string;
}) {
  const handle = normalizeHandle(input.client?.instagramHandle || input.userHandle || "");
  const name =
    input.client?.name ||
    input.userName ||
    handle.replace(/^@/, "") ||
    "Cliente";
  const avatarUrl = input.client?.avatarUrl || buildClientFallback(name);
  const key = input.client?.id || handle || name;

  return { key, name, handle, avatarUrl };
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
) {
  const firstPage = await fetchPage(1);
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.total || firstPage.items.length) / PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
  );

  return [firstPage, ...otherPages].flatMap((page) => page.items);
}

async function getClientReportData() {
  const [participations, coupons] = await Promise.all([
    fetchAllPages<ReportParticipation>(
      (page) =>
        establishmentApi.getParticipations({
          page,
          limit: PAGE_SIZE,
        }) as Promise<PaginatedResult<ReportParticipation>>,
    ),
    fetchAllPages<ReportCoupon>(
      (page) =>
        establishmentApi.getCoupons({
          page,
          limit: PAGE_SIZE,
        }) as Promise<PaginatedResult<ReportCoupon>>,
    ),
  ]);

  return { participations, coupons };
}

export default function ClientesReportPage() {
  const [search, setSearch] = useState("");
  const { data: me, isLoading: isLoadingMe } = useQuery({
    queryKey: ["establishment-me"],
    queryFn: establishmentApi.getMe,
  });
  const canAccessClientRanking = Boolean(me?.planAccess?.features?.clientRanking);

  const { data, isLoading } = useQuery({
    queryKey: ["client-report-data"],
    queryFn: getClientReportData,
    enabled: canAccessClientRanking,
  });

  const reportRows = useMemo(() => {
    const rows = new Map<string, ClientReportRow>();

    for (const participation of data?.participations || []) {
      const identity = getClientIdentity({
        client: participation.client,
        userName: participation.userName,
        userHandle: participation.userHandle,
      });

      const existing = rows.get(identity.key) || {
        key: identity.key,
        name: identity.name,
        handle: identity.handle,
        avatarUrl: identity.avatarUrl,
        campaigns: new Set<string>(),
        totalPosts: 0,
        approvedPosts: 0,
        pendingPosts: 0,
        rejectedPosts: 0,
        activeCoupons: 0,
        usedCoupons: 0,
        cancelledCoupons: 0,
        expiredCoupons: 0,
        totalLikes: 0,
        lastActivityAt: null,
      };

      existing.name = existing.name || identity.name;
      existing.handle = existing.handle || identity.handle;
      existing.avatarUrl = existing.avatarUrl || identity.avatarUrl;
      existing.totalPosts += 1;
      existing.totalLikes += Number(participation.likes || 0);

      if (participation.campaign?.title) {
        existing.campaigns.add(participation.campaign.title);
      }

      switch (participation.status) {
        case "approved":
          existing.approvedPosts += 1;
          break;
        case "rejected":
          existing.rejectedPosts += 1;
          break;
        default:
          existing.pendingPosts += 1;
          break;
      }

      existing.lastActivityAt = getLastDate(
        existing.lastActivityAt,
        participation.updatedAt || participation.createdAt || null,
      );

      rows.set(identity.key, existing);
    }

    for (const coupon of data?.coupons || []) {
      const identity = getClientIdentity({
        client: coupon.client,
        userName: coupon.userName || coupon.participation?.userName,
        userHandle: coupon.client?.instagramHandle || coupon.participation?.userHandle,
      });

      const existing = rows.get(identity.key) || {
        key: identity.key,
        name: identity.name,
        handle: identity.handle,
        avatarUrl: identity.avatarUrl,
        campaigns: new Set<string>(),
        totalPosts: 0,
        approvedPosts: 0,
        pendingPosts: 0,
        rejectedPosts: 0,
        activeCoupons: 0,
        usedCoupons: 0,
        cancelledCoupons: 0,
        expiredCoupons: 0,
        totalLikes: 0,
        lastActivityAt: null,
      };

      if (coupon.campaign?.title) {
        existing.campaigns.add(coupon.campaign.title);
      }

      switch (coupon.status) {
        case "used":
          existing.usedCoupons += 1;
          break;
        case "cancelled":
          existing.cancelledCoupons += 1;
          break;
        case "expired":
          existing.expiredCoupons += 1;
          break;
        default:
          existing.activeCoupons += 1;
          break;
      }

      existing.lastActivityAt = getLastDate(
        existing.lastActivityAt,
        coupon.redeemedAt || coupon.cancelledAt || coupon.createdAt || null,
      );

      rows.set(identity.key, existing);
    }

    return Array.from(rows.values())
      .filter((row) => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) {
          return true;
        }

        return (
          row.name.toLowerCase().includes(normalizedSearch) ||
          row.handle.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        if (right.usedCoupons !== left.usedCoupons) {
          return right.usedCoupons - left.usedCoupons;
        }

        if (right.totalPosts !== left.totalPosts) {
          return right.totalPosts - left.totalPosts;
        }

        return right.totalLikes - left.totalLikes;
      });
  }, [data, search]);

  const summary = useMemo(() => {
    const uniqueCampaigns = new Set<string>();

    for (const row of reportRows) {
      for (const campaign of row.campaigns) {
        uniqueCampaigns.add(campaign);
      }
    }

    const clientsWithRedemption = reportRows.filter((row) => row.usedCoupons > 0)
      .length;
    const topPromoter = reportRows[0] || null;

    return {
      uniqueClients: reportRows.length,
      clientsWithRedemption,
      uniqueCampaigns: uniqueCampaigns.size,
      topPromoter,
    };
  }, [reportRows]);

  if (isLoadingMe || (canAccessClientRanking && isLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!canAccessClientRanking) {
    return (
      <FeatureUpgradeNotice
        badge="Ranking de clientes"
        title="Este relatorio esta disponivel no plano Pro"
        description="Desbloqueie ranking de clientes, postagens e acompanhamento aprofundado do engajamento com um upgrade de plano."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/resultados"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-slate-900">
            Relatório de Clientes
          </h1>
          <p className="mt-1 text-slate-500">
            Veja quem mais participa, aprovações e resgates por cliente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Users className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-slate-500">Clientes únicos</div>
          <div className="mt-1 text-3xl font-black text-slate-900">
            {summary.uniqueClients}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <Ticket className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Clientes com resgate
          </div>
          <div className="mt-1 text-3xl font-black text-slate-900">
            {summary.clientsWithRedemption}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Campanhas impactadas
          </div>
          <div className="mt-1 text-3xl font-black text-slate-900">
            {summary.uniqueCampaigns}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Top promotor</div>
          <div className="mt-3 line-clamp-1 text-lg font-black text-slate-900">
            {summary.topPromoter?.name || "Sem dados"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary.topPromoter
              ? `${summary.topPromoter.totalPosts} postagens e ${summary.topPromoter.usedCoupons} resgates`
              : "Ainda não há participações suficientes."}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou @handle..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {reportRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Nenhum cliente encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Campanhas</th>
                  <th className="px-6 py-4 font-semibold text-center">Posts</th>
                  <th className="px-6 py-4 font-semibold text-center">Aprovadas</th>
                  <th className="px-6 py-4 font-semibold text-center">Cupons ativos</th>
                  <th className="px-6 py-4 font-semibold text-center">Cupons usados</th>
                  <th className="px-6 py-4 font-semibold text-center">Likes</th>
                  <th className="px-6 py-4 font-semibold text-right">Última atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.avatarUrl}
                          alt={row.name}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{row.name}</div>
                          <div className="text-xs text-slate-500">
                            {row.handle || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {row.campaigns.size > 0
                        ? Array.from(row.campaigns).slice(0, 2).join(", ")
                        : "-"}
                      {row.campaigns.size > 2 ? "..." : ""}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      {row.totalPosts}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-green-700">
                      {row.approvedPosts}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-primary-700">
                      {row.activeCoupons}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-blue-700">
                      {row.usedCoupons}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      {row.totalLikes}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {formatDate(row.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
