# Module Calendrier pour Josseaume Energie

Ce module permet de créer automatiquement des événements dans le calendrier à partir des commandes clients.

## Fonctionnalités

- Création d'événements depuis les commandes clients
- Ajout automatique des participants (client et intervenant)
- Formatage de l'événement selon le type de commande (couleurs différentes)
- Horaires adaptés à la préférence (matin/après-midi)

## Comment utiliser

1. Ouvrez une commande client validée
2. Cliquez sur le bouton "Actions" puis "Créer Événement Calendrier"
3. L'événement sera créé automatiquement avec les informations de la commande
4. Un message apparaîtra avec un lien vers l'événement créé

## Notes techniques

- Les événements sont créés avec le type d'événement "Privé"
- Les participants (client et intervenant) sont ajoutés automatiquement
- La couleur de l'événement change selon le type de commande:
  - Installation: Bleu
  - Entretien: Vert
  - Livraison Granule: Ambre
  - Livraison Fuel: Rouge
  - Autres: Violet
