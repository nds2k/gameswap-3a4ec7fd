import { Map as MapIcon, X, Navigation } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const MapPage = () => {
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  const mockSellers = [
    { id: "1", name: "Marie", games: 3, distance: "1.2 km", lat: 48.8566, lng: 2.3522 },
    { id: "2", name: "Pierre", games: 5, distance: "2.8 km", lat: 48.8600, lng: 2.3400 },
    { id: "3", name: "Sophie", games: 2, distance: "0.8 km", lat: 48.8530, lng: 2.3600 },
  ];

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">NearBuy</h1>
              <p className="text-muted-foreground">Vendeurs à proximité</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full">
            <Navigation className="h-4 w-4 mr-1" />
            Ma position
          </Button>
        </div>

        {/* Map Placeholder */}
        <div className="relative bg-card rounded-2xl border border-border overflow-hidden h-[60vh] mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Carte interactive</p>
              <p className="text-sm text-muted-foreground">Intégration Leaflet.js à venir</p>
            </div>
          </div>

          {/* Mock markers */}
          {mockSellers.map((seller, index) => (
            <button
              key={seller.id}
              onClick={() => setSelectedSeller(seller.id)}
              className="absolute w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"
              style={{
                left: `${30 + index * 20}%`,
                top: `${40 + index * 10}%`,
              }}
            >
              {seller.games}
            </button>
          ))}
        </div>

        {/* Nearby Sellers List */}
        <div>
          <h2 className="font-bold text-lg mb-4">Vendeurs proches</h2>
          <div className="space-y-3">
            {mockSellers.map((seller) => (
              <div
                key={seller.id}
                className={`bg-card rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all ${
                  selectedSeller === seller.id
                    ? "border-primary shadow-md"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedSeller(seller.id)}
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">{seller.name[0]}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{seller.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {seller.games} jeux disponibles
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-primary font-semibold">{seller.distance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MapPage;
