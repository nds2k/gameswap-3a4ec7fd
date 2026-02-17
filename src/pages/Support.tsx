import { HelpCircle, CreditCard, MessageCircle, Shield, Mail, Users, AlertTriangle, Banknote } from "lucide-react";
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
      icon: Users,
      question: "Qui sommes-nous ?",
      answer: "GameSwap est une plateforme communautaire dédiée aux passionnés de jeux de société. Notre mission : faciliter l'échange, la vente et la découverte de jeux entre joueurs, en toute confiance. Nous croyons que chaque jeu mérite une seconde vie et que la communauté est au cœur de l'expérience ludique."
    },
    {
      icon: CreditCard,
      question: "Frais de plateforme",
      answer: "Pour les paiements par carte, GameSwap prélève une commission de 7% sur le montant de la transaction. Cette commission couvre les frais de traitement des paiements, l'infrastructure et les améliorations continues de la plateforme. Pour les ventes en espèces en main propre, un frais fixe de 0,99€ est appliqué au vendeur pour l'enregistrement de la transaction."
    },
    {
      icon: Banknote,
      question: "Paiement en espèces en main propre",
      answer: "Vous pouvez enregistrer une vente en espèces en main propre moyennant un frais de service de 0,99€. Cela vous permet de garder une trace de la transaction sur la plateforme."
    },
    {
      icon: AlertTriangle,
      question: "Avertissement – Transactions en personne",
      answer: "GameSwap n'est pas responsable des transactions effectuées en personne. Les utilisateurs échangent et vendent à leurs propres risques. Nous vous recommandons de vous rencontrer dans un lieu public et de vérifier l'état des jeux avant de finaliser l'échange."
    },
    {
      icon: MessageCircle,
      question: "Comment contacter un vendeur ?",
      answer: "Vous pouvez contacter un vendeur en cliquant sur le bouton 'Contacter' visible sur la fiche d'un jeu. Cela ouvrira une conversation privée avec le propriétaire du jeu."
    },
    {
      icon: Shield,
      question: "Comment signaler un problème ?",
      answer: "Si vous rencontrez un comportement inapproprié ou un contenu problématique, vous pouvez signaler un message en cliquant sur l'icône de signalement. Après plusieurs signalements, des mesures automatiques peuvent être prises."
    },
    {
      icon: HelpCircle,
      question: "Comment fonctionne l'échange de jeux ?",
      answer: "Publiez vos jeux disponibles à l'échange, parcourez les annonces des autres utilisateurs, et contactez-les pour proposer un échange. Une fois d'accord, les deux participants confirment la complétion de l'échange. Vous pouvez ensuite évaluer votre partenaire d'échange."
    },
    {
      icon: HelpCircle,
      question: "Comment fonctionne la réputation ?",
      answer: "Votre réputation est basée sur vos échanges réussis et les évaluations de vos partenaires. Progressez de Bronze à Diamant en accumulant des échanges positifs. Les vendeurs vérifiés (3+ échanges, note ≥ 4.0) obtiennent un badge de confiance."
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