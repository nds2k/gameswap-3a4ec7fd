import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { AdBanner } from "@/components/ads/AdBanner";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {!isMobile && (
        <>
          <aside className="hidden lg:block fixed left-2 top-24 z-10 w-[160px]">
            <AdBanner slot="1111111111" variant="sidebar" />
          </aside>
          <aside className="hidden lg:block fixed right-2 top-24 z-10 w-[160px]">
            <AdBanner slot="2222222222" variant="sidebar" />
          </aside>
        </>
      )}
      <main className="page-container">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
