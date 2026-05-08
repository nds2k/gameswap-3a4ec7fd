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
            <AdBanner slot="8614839849" />
          </aside>
          <aside className="hidden lg:block fixed right-2 top-24 z-10 w-[160px]">
            <AdBanner slot="8614839849" />
          </aside>
        </>
      )}
      <main className="page-container">
        {children}
      </main>
      {isMobile && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border/50">
          <AdBanner slot="7301758172" />
        </div>
      )}
      <BottomNav />
    </div>
  );
};
