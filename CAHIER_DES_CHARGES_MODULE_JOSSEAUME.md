# CAHIER DES CHARGES TECHNIQUE
## Module de Gestion Digitale Josseaume Énergies

---

**Version** : 1.0
**Date** : Octobre 2025
**Client** : Josseaume Énergies
**Projet** : Solution digitale intégrée de gestion commerciale et opérationnelle

---

## 1. CONTEXTE ET OBJECTIFS

### 1.1 Présentation du projet

Le présent cahier des charges définit les spécifications fonctionnelles et techniques d'un module de gestion digitale personnalisé pour l'entreprise Josseaume Énergies, spécialisée dans les domaines du chauffage, de l'entretien et de la livraison d'énergies.

### 1.2 Objectifs généraux

- **Digitaliser** l'ensemble des processus commerciaux et opérationnels
- **Automatiser** les tâches administratives répétitives
- **Optimiser** la planification et la coordination des équipes terrain
- **Améliorer** la rentabilité par un contrôle des marges en temps réel
- **Centraliser** les données clients et interventions dans un système unique

### 1.3 Périmètre fonctionnel

Le module couvre quatre domaines principaux :
1. Gestion du calendrier des interventions
2. Calcul et analyse des marges commerciales
3. Gestion de la base clients
4. Communications et logistique

---

## 2. SPÉCIFICATIONS FONCTIONNELLES

### 2.1 MODULE CALENDRIER DES INTERVENTIONS

#### 2.1.1 Exigences fonctionnelles générales

**REQ-CAL-001** : Le système doit permettre la visualisation de tous les rendez-vous planifiés dans une interface centralisée.

**REQ-CAL-002** : Le système doit supporter plusieurs modes de visualisation :
- Vue mensuelle pour vision globale
- Vue hebdomadaire pour détail semaine
- Vue journalière avec créneaux horaires
- Vue par employé avec organisation matin/après-midi/journée complète

#### 2.1.2 Codification visuelle

**REQ-CAL-010** : Le système doit appliquer un code couleur automatique par type d'intervention :
- **Bleu** : Installations
- **Vert** : Entretiens et ramonages
- **Orange** : Livraisons de granulés
- **Rouge** : Livraisons de fioul
- **Violet** : Autres interventions

#### 2.1.3 Système de filtrage

**REQ-CAL-020** : Le système doit proposer des filtres avancés :
- Par zone géographique (22 zones définies)
- Par employé individuel
- Par équipe/corps de métier
- Par type d'intervention
- Par commune

**REQ-CAL-021** : Les filtres doivent être cumulables et appliqués en temps réel.

#### 2.1.4 Création et synchronisation des événements

**REQ-CAL-030** : Les rendez-vous doivent se créer automatiquement lors de la validation d'une commande client.

**REQ-CAL-031** : Les informations suivantes doivent être automatiquement remplies :
- Date et horaire de livraison/intervention
- Type d'intervention
- Intervenant assigné
- Zone géographique
- Coordonnées complètes du client
- Équipements concernés

**REQ-CAL-032** : Le système doit assurer une synchronisation bidirectionnelle :
- Modification calendrier → mise à jour commande
- Modification commande → mise à jour calendrier
- Synchronisation automatique des articles d'une même commande

#### 2.1.5 Informations détaillées

**REQ-CAL-040** : Chaque carte de rendez-vous doit afficher :
- Type d'intervention et codes articles simplifiés
- Zone géographique
- Nom du client avec lien vers fiche complète
- Intervenant assigné
- Horaire (Matin 8h-12h / Après-midi 14h-18h)
- Adresse complète formatée
- Téléphone cliquable (fonction d'appel direct)
- Bouton d'accès à l'itinéraire Maps
- Commentaires et instructions spéciales
- Type d'appareil client
- Camion requis

#### 2.1.6 Gestion des annulations

**REQ-CAL-050** : Les commandes annulées doivent disparaître automatiquement du calendrier.

**REQ-CAL-051** : L'historique complet doit être conservé pour traçabilité.

**REQ-CAL-052** : Le système doit permettre la réactivation d'une commande annulée.

#### 2.1.7 Système de notes quotidiennes

**REQ-CAL-060** : Le système doit permettre la création de notes :
- Par employé spécifique
- Par créneau horaire (matin/après-midi/journée)

**REQ-CAL-061** : Les notes doivent supporter :
- Statuts multiples (ouvertes/fermées)
- Report automatique au lendemain si non traitées
- Archivage automatique des anciennes notes

#### 2.1.8 Export et impression

**REQ-CAL-070** : Le système doit permettre :
- Export PDF de la vue active
- Impression optimisée du planning
- Format adapté à l'affichage et à la distribution

---

### 2.2 MODULE CALCUL DE MARGES

#### 2.2.1 Calcul automatique

**REQ-MAR-001** : Le système doit calculer automatiquement les marges en temps réel lors de la création ou modification d'un devis.

**REQ-MAR-002** : Le calcul doit inclure :
- Marge par ligne d'article
- Marge globale du devis
- Pourcentage de marge commerciale
- Montant total du profit

#### 2.2.2 Gestion des remises

**REQ-MAR-010** : Le système doit gérer :
- Remises par ligne individuelle
- Remise globale sur l'ensemble du devis
- Cumul correct de remises multiples
- Visualisation de l'impact sur les marges

#### 2.2.3 Analyse des kits

**REQ-MAR-020** : Pour les articles de type kit/bundle :
- Décomposition automatique du coût réel
- Calcul de la marge par composant
- Identification des kits les plus rentables

#### 2.2.4 Prix de revient

**REQ-MAR-030** : Le système doit :
- Suivre le dernier prix d'achat fournisseur
- Mettre à jour automatiquement depuis les achats
- Conserver l'historique d'évolution des prix
- Émettre des alertes pour articles sans prix de revient

#### 2.2.5 Tableaux de bord

**REQ-MAR-040** : Fourniture d'indicateurs visuels :
- Codes couleur selon rentabilité
- Statistiques de marges moyennes
- Alertes pour articles vendus à perte
- Comparaisons périodiques

---

### 2.3 MODULE GESTION CLIENTS

#### 2.3.1 Attribution géographique

**REQ-CLI-001** : Le système doit intégrer une base de données de plus de 400 communes.

**REQ-CLI-002** : Attribution automatique parmi 22 zones géographiques définies.

**REQ-CLI-003** : Recherche intelligente par code postal et commune.

#### 2.3.2 Suivi financier

**REQ-CLI-010** : Le système doit afficher :
- Solde client en temps réel
- Historique des transactions (factures, paiements, avoirs)
- Alertes pour impayés
- Export des clients débiteurs

#### 2.3.3 Gestion des adresses

**REQ-CLI-020** : Structuration des adresses en champs séparés :
- Rue
- Code postal
- Ville

**REQ-CLI-021** : Synchronisation avec adresses de livraison et facturation.

**REQ-CLI-022** : Validation et contrôle de cohérence des adresses.

#### 2.3.4 Recherche avancée

**REQ-CLI-030** : Recherche multi-critères :
- Nom
- Zone géographique
- Commune
- Téléphone

**REQ-CLI-031** : Export des listes filtrées.

---

### 2.4 MODULE COMMUNICATIONS

#### 2.4.1 Templates d'emails

**REQ-COM-001** : Templates automatiques pour devis :
- Objet pré-rempli avec référence et nom client
- Corps de message professionnel
- Pièce jointe automatique du PDF
- Signature d'entreprise

**REQ-COM-002** : Templates automatiques pour factures :
- Message adapté au contexte
- Rappel des conditions de paiement
- Coordonnées bancaires
- Suivi automatique

#### 2.4.2 Numérotation

**REQ-COM-010** : Système de numérotation automatique :
- Séries personnalisées par type de document
- Compteurs séparés (devis, factures, commandes)
- Préfixes annuels (exemple : DV-2024-001)
- Continuité sans rupture

---

### 2.5 MODULE LOGISTIQUE

#### 2.5.1 Organisation territoriale

**REQ-LOG-001** : Organisation en 22 zones géographiques.

**REQ-LOG-002** : Optimisation des tournées par regroupement sectoriel.

**REQ-LOG-003** : Vue planning dédiée par territoire.

**REQ-LOG-004** : Statistiques du nombre d'interventions par zone.

#### 2.5.2 Gestion du matériel

**REQ-LOG-010** : Affichage des informations :
- Type de camion requis (visible sur planning)
- Équipements clients à entretenir
- Check-list matériel par type d'intervention

#### 2.5.3 Préparation des tournées

**REQ-LOG-020** : Fonctionnalités de préparation :
- Liste quotidienne des rendez-vous triés
- Export par équipe/intervenant
- Fiches d'intervention imprimables
- Suggestion d'ordre de passage optimisé

---

## 3. SPÉCIFICATIONS TECHNIQUES

### 3.1 Architecture générale

**REQ-TECH-001** : Architecture client-serveur avec base de données centralisée.

**REQ-TECH-002** : Interface web responsive accessible depuis ordinateur, tablette et smartphone.

**REQ-TECH-003** : Disponibilité 24/7 avec accès depuis tout appareil connecté.

### 3.2 Performance

**REQ-TECH-010** : Temps de réponse inférieur à 2 secondes pour les opérations courantes.

**REQ-TECH-011** : Synchronisation en temps réel des données entre modules.

**REQ-TECH-012** : Rafraîchissement automatique des vues sans rechargement de page.

### 3.3 Sécurité

**REQ-TECH-020** : Authentification sécurisée des utilisateurs.

**REQ-TECH-021** : Gestion des droits d'accès par profil utilisateur.

**REQ-TECH-022** : Sauvegarde automatique et régulière des données.

**REQ-TECH-023** : Traçabilité complète des modifications (qui, quand, quoi).

### 3.4 Intégration

**REQ-TECH-030** : Intégration avec services de cartographie (Google Maps).

**REQ-TECH-031** : Export PDF optimisé pour les documents.

**REQ-TECH-032** : API de téléphonie pour fonction d'appel direct.

### 3.5 Scalabilité

**REQ-TECH-040** : Support de plusieurs centaines d'utilisateurs simultanés.

**REQ-TECH-041** : Capacité de gestion de plusieurs milliers de clients.

**REQ-TECH-042** : Stockage extensible pour l'historique.

---

## 4. BÉNÉFICES ATTENDUS

### 4.1 Gains de temps

- **Réduction de 70%** des tâches administratives par automatisation
- **Zéro double saisie** grâce à la synchronisation
- **Accès mobile** pour consultation terrain

### 4.2 Amélioration du service client

- **Zéro oubli** : traçabilité complète des rendez-vous
- **Réactivité** : information client immédiate
- **Précision** : données toujours actualisées

### 4.3 Optimisation commerciale

- **Contrôle permanent** de la rentabilité
- **Tableaux de bord** en temps réel
- **Décisions éclairées** basées sur données fiables

### 4.4 Organisation

- **Coordination d'équipe** optimale
- **Vision claire** court et long terme
- **Mesure de performance** par zone et équipe

---

## 5. CONTRAINTES ET LIMITATIONS

### 5.1 Contraintes organisationnelles

**CONT-001** : Formation obligatoire de tous les utilisateurs avant déploiement.

**CONT-002** : Migration progressive des données existantes.

**CONT-003** : Adaptation des processus internes aux workflows du module.

### 5.2 Contraintes techniques

**CONT-010** : Connexion internet requise pour fonctionnement.

**CONT-011** : Navigateurs compatibles : Chrome, Firefox, Safari, Edge (versions récentes).

**CONT-012** : Base de données des communes à maintenir à jour.

### 5.3 Contraintes légales

**CONT-020** : Conformité RGPD pour les données personnelles.

**CONT-021** : Conservation des données selon obligations légales comptables.

---

## 6. ÉVOLUTIONS FUTURES ENVISAGÉES

### 6.1 Phase 2 - Court terme

- Application mobile dédiée aux techniciens
- Signature électronique des bons d'intervention
- Rappels automatiques par SMS

### 6.2 Phase 3 - Moyen terme

- Suivi GPS des véhicules
- Portail client pour prise de rendez-vous en ligne
- Intégration comptabilité avancée

### 6.3 Phase 4 - Long terme

- Statistiques prédictives et intelligence artificielle
- Gestion complète des stocks et réapprovisionnements automatiques
- Interconnexion avec systèmes fournisseurs

---

## 7. FORMATION ET SUPPORT

### 7.1 Formation

**FORM-001** : Formation complète prévue pour tous les utilisateurs.

**FORM-002** : Documentation utilisateur détaillée fournie.

**FORM-003** : Sessions de formation par profil d'utilisateur :
- Administrateurs
- Commerciaux
- Techniciens terrain
- Direction

### 7.2 Support

**SUPP-001** : Assistance disponible pour toute question.

**SUPP-002** : Maintenance corrective et évolutive.

**SUPP-003** : Hotline dédiée aux urgences.

---

## 8. PLANNING PRÉVISIONNEL

| Phase | Description | Durée estimée |
|-------|-------------|---------------|
| **Phase 1** | Analyse détaillée et validation des spécifications | 2 semaines |
| **Phase 2** | Développement du module calendrier | 4 semaines |
| **Phase 3** | Développement module marges et clients | 3 semaines |
| **Phase 4** | Développement modules communications et logistique | 2 semaines |
| **Phase 5** | Tests et validation | 2 semaines |
| **Phase 6** | Formation des utilisateurs | 1 semaine |
| **Phase 7** | Migration des données | 1 semaine |
| **Phase 8** | Mise en production | 1 semaine |

**Durée totale estimée** : 16 semaines

---

## 9. CRITÈRES D'ACCEPTATION

### 9.1 Critères fonctionnels

- ✅ Tous les rendez-vous se créent automatiquement depuis les commandes
- ✅ La synchronisation bidirectionnelle fonctionne sans erreur
- ✅ Les calculs de marges sont exacts à 100%
- ✅ Les filtres du calendrier sont opérationnels et performants
- ✅ L'export PDF est conforme aux attentes

### 9.2 Critères techniques

- ✅ Temps de réponse < 2 secondes pour 95% des opérations
- ✅ Disponibilité du système > 99%
- ✅ Compatibilité avec tous les navigateurs spécifiés
- ✅ Sécurité validée par audit

### 9.3 Critères utilisateurs

- ✅ Interface intuitive ne nécessitant pas plus d'1 heure de formation
- ✅ Satisfaction utilisateur > 80% (enquête post-déploiement)
- ✅ Réduction effective du temps administratif mesurable

---

## 10. GLOSSAIRE

| Terme | Définition |
|-------|------------|
| **Intervention** | Rendez-vous planifié chez un client (installation, entretien, livraison) |
| **Zone** | Secteur géographique regroupant plusieurs communes (22 zones définies) |
| **Marge** | Différence entre prix de vente et prix de revient |
| **Kit/Bundle** | Ensemble d'articles vendus groupés |
| **Synchronisation bidirectionnelle** | Mise à jour automatique dans les deux sens entre deux modules |
| **Tournée** | Ensemble des interventions planifiées pour un technicien sur une journée |
| **Prix de revient** | Coût d'achat d'un article auprès du fournisseur |

---

## 11. ANNEXES

### Annexe A : Liste des 22 zones géographiques
*(À compléter avec la liste détaillée des zones et communes)*

### Annexe B : Modèles de données
*(À compléter avec les schémas de base de données)*

### Annexe C : Maquettes d'interface
*(À compléter avec les captures d'écran et wireframes)*

### Annexe D : Matrice des rôles et droits
*(À compléter avec la définition des profils utilisateurs)*

---

**Fin du cahier des charges**

---

*Ce document constitue la base contractuelle du projet. Toute modification doit faire l'objet d'un avenant validé par les deux parties.*
