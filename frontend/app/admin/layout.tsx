import AdminSidebar from '@/components/shared/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      <AdminSidebar />
      <main className="ml-64 relative min-h-screen bg-surface">
        {children}
      </main>
    </div>
  );
}
