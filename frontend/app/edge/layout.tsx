import EdgeSidebar from '@/components/shared/EdgeSidebar';

export default function EdgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#000000] font-body text-[#dce2f8] overflow-hidden">
      <EdgeSidebar />
      <div className="ml-64 min-h-screen pt-16 bg-[#000000] relative">
        {children}
      </div>
    </div>
  );
}
