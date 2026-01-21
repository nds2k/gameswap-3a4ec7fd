import { HelpCircle, CreditCard, MessageCircle, Shield, Mail } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Support = () => {
  const faqItems = [
    {
      icon: CreditCard,
      question: "Frais de plateforme",
      answer: "Pour chaque transaction réalisée sur GameSwap, une petite commission de service est appliquée. Ces frais nous permettent de couvrir les coûts d'infrastructure, le traitement des paiements et les améliorations continues de la plateforme."
    },
    {
      icon: MessageCircle,
      question: "Comment contacter un vendeur ?",
      answer: "Vous pouvez contacter un vendeur en cliquant sur le bouton 'Message' visible sur la fiche d'un jeu. Cela ouvrira une conversation privée avec le propriétaire du jeu."
    },
    {
      icon: Shield,
      question: "Comment signaler un problème ?",
      answer: "Si vous rencontrez un comportement inapproprié ou un contenu problématique, vous pouvez signaler un message en cliquant sur l'icône de signalement. Après plusieurs signalements, des mesures automatiques peuvent être prises."
    },
    {
      icon: HelpCircle,
      question: "Comment fonctionne l'échange de jeux ?",
      answer: "Publiez vos jeux disponibles à l'échange, parcourez les annonces des autres utilisateurs, et contactez-les pour proposer un échange. Vous pouvez aussi utiliser la carte pour trouver des joueurs près de chez vous."
    },
  ];

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Aide et FAQ</h1>
            <p className="text-muted-foreground">Questions fréquentes</p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border last:border-0">
                  <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-left">{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <p className="text-muted-foreground pl-8">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Contact Section */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
            Besoin d'aide supplémentaire ?
          </h2>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Contactez-nous</p>
                <p className="text-sm text-muted-foreground">gameswapcontact@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Support;
