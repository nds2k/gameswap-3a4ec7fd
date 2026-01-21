import { MainLayout } from "@/components/layout/MainLayout";
import { Scale, Shield, FileText, Mail } from "lucide-react";

const Legal = () => {
  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mentions légales</h1>
            <p className="text-muted-foreground">Informations juridiques</p>
          </div>
        </div>

        <div className="space-y-8 animate-fade-in">
          {/* Éditeur */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Éditeur du site</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Raison sociale :</strong> GameSwap SAS</p>
              <p><strong className="text-foreground">Siège social :</strong> 123 Rue des Jeux, 75001 Paris, France</p>
              <p><strong className="text-foreground">SIRET :</strong> 123 456 789 00012</p>
              <p><strong className="text-foreground">Capital social :</strong> 10 000 €</p>
              <p><strong className="text-foreground">Directeur de la publication :</strong> Jean Dupont</p>
            </div>
          </section>

          {/* Hébergement */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Hébergement</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Hébergeur :</strong> Lovable Cloud</p>
              <p><strong className="text-foreground">Adresse :</strong> Services Cloud Européens</p>
              <p>L'application est hébergée sur une infrastructure sécurisée conforme aux normes européennes de protection des données.</p>
            </div>
          </section>

          {/* Données personnelles */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Protection des données</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD), 
                vous disposez d'un droit d'accès, de rectification, de suppression et de 
                portabilité de vos données personnelles.
              </p>
              <p>
                <strong className="text-foreground">Données collectées :</strong> Nom, prénom, 
                adresse email, photo de profil, localisation (si autorisée), historique des 
                transactions.
              </p>
              <p>
                <strong className="text-foreground">Finalité :</strong> Les données sont utilisées 
                exclusivement pour le fonctionnement de la plateforme GameSwap et la mise en 
                relation entre acheteurs et vendeurs de jeux de société.
              </p>
              <p>
                <strong className="text-foreground">Durée de conservation :</strong> Les données 
                sont conservées pendant la durée de votre inscription et 3 ans après votre 
                dernière connexion.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Cookies</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Ce site utilise des cookies essentiels au fonctionnement de l'application 
                (authentification, préférences utilisateur).
              </p>
              <p>
                Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
              </p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Propriété intellectuelle</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                L'ensemble des éléments constituant ce site (textes, graphismes, logiciels, 
                images, sons, plans, logos, marques, créations et œuvres protégeables 
                diverses, bases de données) sont la propriété exclusive de GameSwap SAS.
              </p>
              <p>
                Toute représentation, reproduction, adaptation ou exploitation partielle ou 
                totale des contenus par quelque procédé que ce soit, sans l'autorisation 
                préalable, expresse et écrite de GameSwap SAS est strictement interdite.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Contact</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>Pour toute question concernant vos données ou l'utilisation du site :</p>
              <p><strong className="text-foreground">Email :</strong> contact@gameswap.fr</p>
              <p><strong className="text-foreground">Téléphone :</strong> +33 1 23 45 67 89</p>
            </div>
          </section>

          {/* Dernière mise à jour */}
          <p className="text-center text-sm text-muted-foreground">
            Dernière mise à jour : Janvier 2026
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Legal;
