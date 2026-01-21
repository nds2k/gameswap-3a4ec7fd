import { MainLayout } from "@/components/layout/MainLayout";
import { Scale, Shield, FileText, Mail, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Legal = () => {
  const { language } = useLanguage();

  const content = language === 'fr' ? {
    title: "Mentions légales",
    subtitle: "Informations juridiques",
    lastUpdate: "Dernière mise à jour : Janvier 2026",
    editor: {
      title: "Éditeur du site",
      company: "GameSwap SAS",
      address: "123 Rue des Jeux, 75001 Paris, France",
      siret: "123 456 789 00012",
      capital: "10 000 €",
      director: "Jean Dupont"
    },
    hosting: {
      title: "Hébergement",
      provider: "Infrastructure Cloud Européenne",
      address: "Services Cloud Européens",
      description: "L'application est hébergée sur une infrastructure sécurisée conforme aux normes européennes de protection des données."
    },
    dataProtection: {
      title: "Protection des données",
      intro: "Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.",
      collected: "Données collectées : Nom, prénom, adresse email, photo de profil, localisation (si autorisée), historique des transactions.",
      purpose: "Finalité : Les données sont utilisées exclusivement pour le fonctionnement de la plateforme GameSwap et la mise en relation entre acheteurs et vendeurs de jeux de société.",
      retention: "Durée de conservation : Les données sont conservées pendant la durée de votre inscription et 3 ans après votre dernière connexion.",
      privacyLink: "Consultez notre politique de confidentialité complète"
    },
    cookies: {
      title: "Cookies",
      description1: "Ce site utilise des cookies essentiels au fonctionnement de l'application (authentification, préférences utilisateur).",
      description2: "Aucun cookie publicitaire ou de tracking tiers n'est utilisé."
    },
    ip: {
      title: "Propriété intellectuelle",
      description1: "L'ensemble des éléments constituant ce site (textes, graphismes, logiciels, images, sons, plans, logos, marques, créations et œuvres protégeables diverses, bases de données) sont la propriété exclusive de GameSwap SAS.",
      description2: "Toute représentation, reproduction, adaptation ou exploitation partielle ou totale des contenus par quelque procédé que ce soit, sans l'autorisation préalable, expresse et écrite de GameSwap SAS est strictement interdite."
    },
    warning: {
      title: "Avertissement",
      description: "Toute reproduction ou copie de ce site pourra et sera poursuivie en justice. GameSwap se réserve le droit d'engager des poursuites judiciaires à l'encontre de toute personne ou entité qui violerait ces conditions."
    },
    contact: {
      title: "Contact",
      intro: "Pour toute question concernant vos données ou l'utilisation du site :",
      email: "contact@gameswap.fr"
    },
    credits: "© 2026 GameSwap. Tous droits réservés."
  } : {
    title: "Legal Notice",
    subtitle: "Legal information",
    lastUpdate: "Last updated: January 2026",
    editor: {
      title: "Site Publisher",
      company: "GameSwap SAS",
      address: "123 Rue des Jeux, 75001 Paris, France",
      siret: "123 456 789 00012",
      capital: "€10,000",
      director: "Jean Dupont"
    },
    hosting: {
      title: "Hosting",
      provider: "European Cloud Infrastructure",
      address: "European Cloud Services",
      description: "The application is hosted on a secure infrastructure compliant with European data protection standards."
    },
    dataProtection: {
      title: "Data Protection",
      intro: "In accordance with the General Data Protection Regulation (GDPR), you have the right to access, rectify, delete and transfer your personal data.",
      collected: "Data collected: Name, email address, profile picture, location (if authorized), transaction history.",
      purpose: "Purpose: Data is used exclusively for the operation of the GameSwap platform and connecting buyers and sellers of board games.",
      retention: "Retention period: Data is kept for the duration of your registration and 3 years after your last connection.",
      privacyLink: "View our complete privacy policy"
    },
    cookies: {
      title: "Cookies",
      description1: "This site uses cookies essential to the operation of the application (authentication, user preferences).",
      description2: "No advertising or third-party tracking cookies are used."
    },
    ip: {
      title: "Intellectual Property",
      description1: "All elements constituting this site (texts, graphics, software, images, sounds, plans, logos, brands, creations and various protectable works, databases) are the exclusive property of GameSwap SAS.",
      description2: "Any representation, reproduction, adaptation or partial or total exploitation of the content by any means, without the prior, express and written authorization of GameSwap SAS is strictly prohibited."
    },
    warning: {
      title: "Warning",
      description: "Any reproduction or copy of this site may and will be prosecuted. GameSwap reserves the right to take legal action against any person or entity that violates these conditions."
    },
    contact: {
      title: "Contact",
      intro: "For any questions regarding your data or use of the site:",
      email: "contact@gameswap.fr"
    },
    credits: "© 2026 GameSwap. All rights reserved."
  };

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <p className="text-muted-foreground">{content.subtitle}</p>
          </div>
        </div>

        <div className="space-y-8 animate-fade-in">
          {/* Éditeur */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.editor.title}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">{language === 'fr' ? 'Raison sociale' : 'Company'} :</strong> {content.editor.company}</p>
              <p><strong className="text-foreground">{language === 'fr' ? 'Siège social' : 'Headquarters'} :</strong> {content.editor.address}</p>
              <p><strong className="text-foreground">SIRET :</strong> {content.editor.siret}</p>
              <p><strong className="text-foreground">{language === 'fr' ? 'Capital social' : 'Share capital'} :</strong> {content.editor.capital}</p>
              <p><strong className="text-foreground">{language === 'fr' ? 'Directeur de la publication' : 'Publication Director'} :</strong> {content.editor.director}</p>
            </div>
          </section>

          {/* Hébergement */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.hosting.title}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">{language === 'fr' ? 'Hébergeur' : 'Host'} :</strong> {content.hosting.provider}</p>
              <p><strong className="text-foreground">{language === 'fr' ? 'Adresse' : 'Address'} :</strong> {content.hosting.address}</p>
              <p>{content.hosting.description}</p>
            </div>
          </section>

          {/* Données personnelles */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.dataProtection.title}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>{content.dataProtection.intro}</p>
              <p><strong className="text-foreground">{content.dataProtection.collected}</strong></p>
              <p><strong className="text-foreground">{content.dataProtection.purpose}</strong></p>
              <p><strong className="text-foreground">{content.dataProtection.retention}</strong></p>
              <Link to="/privacy" className="inline-flex items-center gap-1 text-primary hover:underline mt-2">
                {content.dataProtection.privacyLink} →
              </Link>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.cookies.title}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>{content.cookies.description1}</p>
              <p>{content.cookies.description2}</p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.ip.title}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>{content.ip.description1}</p>
              <p>{content.ip.description2}</p>
            </div>
          </section>

          {/* Avertissement */}
          <section className="bg-destructive/10 rounded-2xl border border-destructive/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-bold text-destructive">{content.warning.title}</h2>
            </div>
            <p className="text-destructive/90 font-medium">
              {content.warning.description}
            </p>
          </section>

          {/* Contact */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.contact.title}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>{content.contact.intro}</p>
              <p><strong className="text-foreground">Email :</strong> {content.contact.email}</p>
            </div>
          </section>

          {/* Dernière mise à jour */}
          <p className="text-center text-sm text-muted-foreground">
            {content.lastUpdate}
          </p>

          {/* Credits */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground">{content.credits}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Legal;
