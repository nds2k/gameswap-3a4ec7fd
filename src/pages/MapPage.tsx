import { useEffect, useState, useCallback } from "react";
import { Map as MapIcon, Navigation, X } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icon
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); color: white; font-weight: bold; font-size: 14px;">🎲</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface Seller {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  location_lat: number;
  location_lng: number;
  game_count: number;
}

// Component to recenter map
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

const MapPage = () => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Default to Paris
  const defaultCenter = { lat: 48.8566, lng: 2.3522 };
  const center = userLocation || defaultCenter;

  const fetchSellers = useCallback(async () => {
    try {
      // Get profiles with location
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, location_lat, location_lng")
        .eq("show_on_map", true)
        .not("location_lat", "is", null)
        .not("location_lng", "is", null);

      if (error) throw error;

      // Get game counts
      const sellersWithGames = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from("games")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", profile.user_id)
            .eq("status", "available");

          return {
            ...profile,
            location_lat: profile.location_lat!,
            location_lng: profile.location_lng!,
            game_count: count || 0,
          };
        })
      );

      // Filter out sellers with no games
      setSellers(sellersWithGames.filter((s) => s.game_count > 0));
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = () => {
    setLocationError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);

          // Update user's location in profile if logged in
          if (user) {
            await supabase
              .from("profiles")
              .update({
                location_lat: newLocation.lat,
                location_lng: newLocation.lng,
              })
              .eq("user_id", user.id);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Impossible d'obtenir votre position");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("La géolocalisation n'est pas supportée");
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

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
              <p className="text-muted-foreground">
                {sellers.length} vendeur{sellers.length !== 1 ? "s" : ""} à proximité
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={requestLocation}>
            <Navigation className="h-4 w-4 mr-1" />
            Ma position
          </Button>
        </div>

        {locationError && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-3 mb-4 text-sm">
            {locationError}
          </div>
        )}

        {/* Map */}
        <div className="relative bg-card rounded-2xl border border-border overflow-hidden h-[60vh] mb-6">
          <MapContainer
            key={`map-${center.lat}-${center.lng}`}
            center={[center.lat, center.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {userLocation && <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />}

            {/* User location marker */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: "custom-marker",
                  html: `<div style="background-color: #3B82F6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>Vous êtes ici</Popup>
              </Marker>
            )}

            {/* Seller markers */}
            {sellers.map((seller) => (
              <Marker
                key={seller.id}
                position={[seller.location_lat, seller.location_lng]}
                icon={createCustomIcon("hsl(30, 100%, 50%)")}
                eventHandlers={{
                  click: () => setSelectedSeller(seller),
                }}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{seller.full_name || "Vendeur"}</p>
                    <p className="text-sm text-muted-foreground">
                      {seller.game_count} jeu{seller.game_count !== 1 ? "x" : ""}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Seller detail sidebar */}
        {selectedSeller && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border shadow-xl z-50 animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Profil vendeur</h2>
                <button
                  onClick={() => setSelectedSeller(null)}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {selectedSeller.avatar_url ? (
                    <img
                      src={selectedSeller.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {selectedSeller.full_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {selectedSeller.full_name || "Vendeur"}
                  </h3>
                  <p className="text-primary font-semibold">
                    {selectedSeller.game_count} jeu{selectedSeller.game_count !== 1 ? "x" : ""} disponible{selectedSeller.game_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <Button variant="gameswap" className="w-full">
                Contacter
              </Button>
            </div>
          </div>
        )}

        {/* Nearby Sellers List */}
        <div>
          <h2 className="font-bold text-lg mb-4">Vendeurs proches</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl border p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Aucun vendeur à proximité</h3>
              <p className="text-muted-foreground">
                Activez votre position pour trouver des vendeurs
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellers.map((seller) => (
                <div
                  key={seller.id}
                  className={`bg-card rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    selectedSeller?.id === seller.id
                      ? "border-primary shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedSeller(seller)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {seller.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-primary">
                        {seller.full_name?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{seller.full_name || "Vendeur"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {seller.game_count} jeu{seller.game_count !== 1 ? "x" : ""} disponible{seller.game_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MapPage;
