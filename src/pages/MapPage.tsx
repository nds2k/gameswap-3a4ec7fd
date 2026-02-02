import { useEffect, useState, useCallback, useRef } from "react";
import { Map as MapIcon, Navigation, X, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from "react-map-gl";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Seller {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  location_lat: number;
  location_lng: number;
  game_count: number;
}

const MapPage = () => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [popupSeller, setPopupSeller] = useState<Seller | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 11
  });

  const fetchSellers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase.rpc("get_public_profiles");

      if (error) throw error;

      const profilesWithLocation = (profiles || []).filter(
        (p) => p.show_on_map && p.location_lat != null && p.location_lng != null
      );

      const sellersWithGames = await Promise.all(
        profilesWithLocation.map(async (profile) => {
          const { count } = await supabase
            .from("games")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", profile.user_id)
            .eq("status", "available");

          return {
            ...profile,
            location_lat: Number(profile.location_lat),
            location_lng: Number(profile.location_lng),
            game_count: count || 0,
          };
        })
      );

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
          setViewState(prev => ({
            ...prev,
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            zoom: 13
          }));

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
          {MAPBOX_TOKEN ? (
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              <NavigationControl position="top-right" />
              <GeolocateControl
                position="top-right"
                trackUserLocation
                onGeolocate={(e) => {
                  setUserLocation({
                    lat: e.coords.latitude,
                    lng: e.coords.longitude
                  });
                }}
              />

              {/* Seller markers */}
              {sellers.map((seller) => (
                <Marker
                  key={seller.id}
                  longitude={seller.location_lng}
                  latitude={seller.location_lat}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setPopupSeller(seller);
                  }}
                >
                  <div 
                    className="cursor-pointer transform transition-transform hover:scale-110"
                    onClick={() => setSelectedSeller(seller)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-3 border-white shadow-lg text-primary-foreground font-bold text-sm">
                      🎲
                    </div>
                  </div>
                </Marker>
              ))}

              {/* Popup for selected marker */}
              {popupSeller && (
                <Popup
                  longitude={popupSeller.location_lng}
                  latitude={popupSeller.location_lat}
                  anchor="bottom"
                  offset={25}
                  onClose={() => setPopupSeller(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="p-2 min-w-[150px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {popupSeller.avatar_url ? (
                          <img
                            src={popupSeller.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {popupSeller.full_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{popupSeller.full_name || "Vendeur"}</p>
                        <p className="text-xs text-primary">{popupSeller.game_count} jeu{popupSeller.game_count !== 1 ? "x" : ""}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setSelectedSeller(popupSeller)}
                    >
                      Voir profil
                    </Button>
                  </div>
                </Popup>
              )}

              {/* User location marker */}
              {userLocation && (
                <Marker
                  longitude={userLocation.lng}
                  latitude={userLocation.lat}
                  anchor="center"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-3 border-white shadow-lg animate-pulse" />
                </Marker>
              )}
            </Map>
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Token Mapbox non configuré</p>
              </div>
            </div>
          )}
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
                  onClick={() => {
                    setSelectedSeller(seller);
                    setViewState(prev => ({
                      ...prev,
                      latitude: seller.location_lat,
                      longitude: seller.location_lng,
                      zoom: 14
                    }));
                  }}
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
