import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
