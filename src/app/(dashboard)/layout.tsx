import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <Suspense
        fallback={
          <div className="fixed left-0 top-0 h-screen w-64 border-r border-slate-800 bg-slate-900" />
        }
      >
        <Sidebar />
      </Suspense>
      <div className="ml-64 flex min-h-screen min-w-0 flex-col">
        <DashboardHeader />
        <main className="min-w-0 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
