import { MainLayout } from "@/components/layout/MainLayout";
import { Shield, Lock, Eye, Database, UserCheck, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { language } = useLanguage();
  
  const content = language === 'fr' ? {
    title: "Politique de confidentialité",
    subtitle: "Protection de vos données personnelles",
    lastUpdate: "Dernière mise à jour : Janvier 2026",
    sections: {
      intro: {
        title: "Introduction",
        content: "GameSwap s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos informations personnelles lorsque vous utilisez notre plateforme d'échange et de vente de jeux de société."
      },
      dataCollection: {
        title: "Données collectées",
        items: [
          "Informations d'identification : nom, prénom, adresse email, nom d'utilisateur",
          "Données de profil : photo de profil, biographie, préférences",
          "Données de localisation : coordonnées GPS (si autorisées) pour la fonctionnalité carte",
          "Données de transaction : historique des échanges et ventes",
          "Données de communication : messages échangés entre utilisateurs",
          "Données techniques : adresse IP, type de navigateur, appareil utilisé"
        ]
      },
      dataUse: {
        title: "Utilisation des données",
        items: [
          "Fournir et améliorer nos services de mise en relation",
          "Personnaliser votre expérience utilisateur",
          "Permettre la communication entre acheteurs et vendeurs",
          "Assurer la sécurité de la plateforme et prévenir les fraudes",
          "Envoyer des notifications relatives à vos activités",
          "Respecter nos obligations légales"
        ]
      },
      dataProtection: {
        title: "Protection des données",
        content: "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès, modification, divulgation ou destruction non autorisés. Cela inclut le chiffrement des données sensibles, l'utilisation de connexions sécurisées (HTTPS), et des contrôles d'accès stricts."
      },
      dataRetention: {
        title: "Conservation des données",
        content: "Vos données personnelles sont conservées pendant la durée de votre inscription sur la plateforme. En cas de suppression de compte, vos données seront effacées dans un délai de 30 jours, à l'exception des données que nous sommes légalement tenus de conserver."
      },
      userRights: {
        title: "Vos droits",
        items: [
          "Droit d'accès : obtenir une copie de vos données personnelles",
          "Droit de rectification : corriger des données inexactes",
          "Droit à l'effacement : demander la suppression de vos données",
          "Droit à la portabilité : recevoir vos données dans un format structuré",
          "Droit d'opposition : vous opposer au traitement de vos données",
          "Droit de limitation : restreindre le traitement de vos données"
        ]
      },
      cookies: {
        title: "Cookies",
        content: "GameSwap utilise uniquement des cookies essentiels au fonctionnement de l'application (authentification, préférences de langue et de thème). Aucun cookie publicitaire ou de tracking tiers n'est utilisé sur notre plateforme."
      },
      thirdParties: {
        title: "Partage avec des tiers",
        content: "Nous ne vendons jamais vos données personnelles. Nous pouvons partager certaines informations avec des prestataires de services de confiance qui nous aident à exploiter notre plateforme, sous réserve de contrats stricts de confidentialité."
      },
      changes: {
        title: "Modifications",
        content: "Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Les modifications entreront en vigueur dès leur publication sur cette page. Nous vous encourageons à consulter régulièrement cette politique."
      },
      contact: {
        title: "Contact",
        content: "Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, contactez-nous à : contact@gameswap.fr"
      }
    }
  } : {
    title: "Privacy Policy",
    subtitle: "Protection of your personal data",
    lastUpdate: "Last updated: January 2026",
    sections: {
      intro: {
        title: "Introduction",
        content: "GameSwap is committed to protecting the privacy of its users. This privacy policy explains how we collect, use, store, and protect your personal information when you use our board game trading and selling platform."
      },
      dataCollection: {
        title: "Data Collected",
        items: [
          "Identification information: name, email address, username",
          "Profile data: profile picture, biography, preferences",
          "Location data: GPS coordinates (if authorized) for map functionality",
          "Transaction data: exchange and sale history",
          "Communication data: messages exchanged between users",
          "Technical data: IP address, browser type, device used"
        ]
      },
      dataUse: {
        title: "Use of Data",
        items: [
          "Provide and improve our matchmaking services",
          "Personalize your user experience",
          "Enable communication between buyers and sellers",
          "Ensure platform security and prevent fraud",
          "Send notifications related to your activities",
          "Comply with our legal obligations"
        ]
      },
      dataProtection: {
        title: "Data Protection",
        content: "We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, modification, disclosure, or destruction. This includes encryption of sensitive data, use of secure connections (HTTPS), and strict access controls."
      },
      dataRetention: {
        title: "Data Retention",
        content: "Your personal data is retained for the duration of your registration on the platform. In case of account deletion, your data will be erased within 30 days, except for data we are legally required to retain."
      },
      userRights: {
        title: "Your Rights",
        items: [
          "Right of access: obtain a copy of your personal data",
          "Right to rectification: correct inaccurate data",
          "Right to erasure: request deletion of your data",
          "Right to data portability: receive your data in a structured format",
          "Right to object: object to the processing of your data",
          "Right to restriction: restrict the processing of your data"
        ]
      },
      cookies: {
        title: "Cookies",
        content: "GameSwap only uses cookies essential to the operation of the application (authentication, language and theme preferences). No advertising or third-party tracking cookies are used on our platform."
      },
      thirdParties: {
        title: "Third-Party Sharing",
        content: "We never sell your personal data. We may share certain information with trusted service providers who help us operate our platform, subject to strict confidentiality agreements."
      },
      changes: {
        title: "Changes",
        content: "We reserve the right to modify this privacy policy at any time. Changes will take effect immediately upon posting on this page. We encourage you to review this policy regularly."
      },
      contact: {
        title: "Contact",
        content: "For any questions regarding this privacy policy or to exercise your rights, contact us at: contact@gameswap.fr"
      }
    }
  };

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <p className="text-muted-foreground">{content.subtitle}</p>
          </div>
        </div>

        <div className="space-y-6 animate-fade-in">
          {/* Introduction */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.intro.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.intro.content}</p>
          </section>

          {/* Data Collection */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.dataCollection.title}</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              {content.sections.dataCollection.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Data Use */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.dataUse.title}</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              {content.sections.dataUse.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Data Protection */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.dataProtection.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.dataProtection.content}</p>
          </section>

          {/* Data Retention */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.dataRetention.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.dataRetention.content}</p>
          </section>

          {/* User Rights */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.userRights.title}</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              {content.sections.userRights.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cookies */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.cookies.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.cookies.content}</p>
          </section>

          {/* Third Parties */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.thirdParties.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.thirdParties.content}</p>
          </section>

          {/* Changes */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.changes.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.changes.content}</p>
          </section>

          {/* Contact */}
          <section className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{content.sections.contact.title}</h2>
            </div>
            <p className="text-muted-foreground">{content.sections.contact.content}</p>
          </section>

          {/* Last update */}
          <p className="text-center text-sm text-muted-foreground">
            {content.lastUpdate}
          </p>

          {/* Credits */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground">© 2026 GameSwap. All rights reserved.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'fr' 
                ? "Toute reproduction ou copie de ce site pourra et sera poursuivie en justice."
                : "Any reproduction or copy of this site may and will be prosecuted."}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Privacy;
