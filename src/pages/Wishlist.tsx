import { Heart, Trash2, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WishlistItem {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  distance: string;
  addedAt: string;
}

const mockWishlist: WishlistItem[] = [
  {
    id: "1",
    title: "Catan",
    price: 25,
    image: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400",
    seller: "Marie",
    distance: "2.3 km",
    addedAt: "Il y a 2 jours",
  },
  {
    id: "2",
    title: "Ticket to Ride",
    price: 35,
    image: "https://images.unsplash.com/photo-1606503153255-59d7088e26c4?w=400",
    seller: "Pierre",
    distance: "1.8 km",
    addedAt: "Il y a 1 semaine",
  },
  {
    id: "3",
    title: "Azul",
    price: 28,
    image: "https://images.unsplash.com/photo-1563941402830-3a422052096b?w=400",
    seller: "Hugo",
    distance: "0.8 km",
    addedAt: "Aujourd'hui",
  },
];

const Wishlist = () => {
  const [items, setItems] = useState(mockWishlist);

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ma Wishlist</h1>
            <p className="text-muted-foreground">{items.length} jeux sauvegardés</p>
          </div>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Votre wishlist est vide</h3>
            <p className="text-muted-foreground mb-4">Explorez les jeux et ajoutez vos favoris</p>
            <Button variant="gameswap">Découvrir des jeux</Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-2xl border border-border p-4 flex gap-4 items-center transition-all hover:shadow-md"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-primary font-semibold">{item.price}€</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{item.seller}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.distance}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">{item.addedAt}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Wishlist;
