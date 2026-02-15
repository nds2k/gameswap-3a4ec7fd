import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DecorativeBlobs } from "./DecorativeBlobs";

interface MainLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
}

export const MainLayout = ({ children, showSearch = true, onSearch }: MainLayoutProps) => {
  return (
    <div className="min-h-screen">
      <DecorativeBlobs />
      <Header onSearch={showSearch ? onSearch : undefined} />
      <main className="page-container">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
