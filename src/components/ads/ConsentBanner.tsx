import { useConsent } from "@/hooks/useConsent";
import { Button } from "@/components/ui/button";

export const ConsentBanner = () => {
  const { needsBanner, accept, refuse } = useConsent();

  if (!needsBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5">
        <p className="text-sm text-foreground mb-3">
          Nous utilisons des cookies et des publicités personnalisées pour financer ce service. Acceptez-vous ?
        </p>
        <div className="flex gap-2">
          <Button onClick={accept} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            Accepter
          </Button>
          <Button onClick={refuse} variant="secondary" className="flex-1">
            Refuser
          </Button>
        </div>
      </div>
    </div>
  );
};
