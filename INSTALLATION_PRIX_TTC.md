# Installation du Module Prix TTC

Ce guide explique comment installer la fonctionnalité d'affichage des prix TTC (Toutes Taxes Comprises) dans les Devis, Commandes et Factures.

## 📋 Fonctionnalités

Une fois installé, le système affichera automatiquement :
- **Prix Unitaire TTC** : Prix avec taxes pour chaque ligne d'article
- **Montant TTC** : Montant total avec taxes pour chaque ligne d'article

Ces champs seront visibles sur :
- ✅ Devis (Quotation)
- ✅ Commandes clients (Sales Order)
- ✅ Factures (Sales Invoice)

## 🚀 Installation

### Étape 1 : Créer les champs personnalisés

1. Ouvrez un terminal sur votre serveur ERPNext
2. Accédez au répertoire bench :
   ```bash
   cd /path/to/frappe-bench
   ```

3. Ouvrez la console bench :
   ```bash
   bench --site josseaume-energie-calendar.devs.local console
   ```

4. Copiez et collez le contenu du fichier suivant :
   ```
   josseaume_energies/setup_ttc_fields.py
   ```

5. Le script créera automatiquement 6 champs personnalisés (2 par type de document)

### Étape 2 : Redémarrer le serveur

Après la création des champs, redémarrez les services :

```bash
bench restart
bench clear-cache
```

### Étape 3 : Vérifier l'installation

1. Actualisez votre navigateur (Ctrl+F5 ou Cmd+Shift+R)
2. Ouvrez un Devis existant ou créez-en un nouveau
3. Dans le tableau des articles, vous devriez voir les nouvelles colonnes :
   - **Prix Unit. TTC**
   - **Montant TTC**

## 💡 Comment ça marche ?

### Calcul automatique

Le système calcule automatiquement les prix TTC en fonction :
1. Du prix HT (rate)
2. Des taxes configurées sur le document
3. Des templates de taxes des articles

### Mise à jour automatique

Les prix TTC sont recalculés automatiquement quand :
- ✅ Vous modifiez le prix HT d'un article
- ✅ Vous modifiez la quantité
- ✅ Vous appliquez une remise
- ✅ Vous changez les taxes du document
- ✅ Vous changez le template de taxe d'un article

### Affichage

- Les champs sont **en lecture seule** (calculés automatiquement)
- Ils sont **visibles dans le tableau** des articles
- Ils sont **stockés en base de données** pour référence

## 🔧 Architecture technique

### Fichiers créés/modifiés

1. **setup_ttc_fields.py** : Script de création des champs personnalisés
2. **ttc_calculator.js** : Module JavaScript de calcul des prix TTC
3. **quotation_margin_simple.js** : Intégration pour les Devis
4. **sales_order.js** : Intégration pour les Commandes
5. **sales_invoice.js** : Intégration pour les Factures
6. **hooks.py** : Enregistrement du module JavaScript

### Custom Fields créés

Pour chaque DocType (Quotation Item, Sales Order Item, Sales Invoice Item) :

| Nom du champ | Label | Type | Description |
|--------------|-------|------|-------------|
| custom_rate_ttc | Prix Unit. TTC | Currency | Prix unitaire avec taxes |
| custom_amount_ttc | Montant TTC | Currency | Montant total avec taxes |

## 🎨 Personnalisation

### Modifier le taux de taxe par défaut

Si aucune taxe n'est définie, le système utilise 20% (TVA française standard).
Pour modifier ce taux, éditez le fichier `ttc_calculator.js` ligne 35 :

```javascript
if (tax_rate === 0 && frm.doc.taxes_and_charges) {
    tax_rate = 20; // Modifier ce taux si nécessaire
}
```

### Afficher/Masquer les colonnes

Les colonnes TTC sont visibles par défaut. Pour les masquer :
1. Allez dans le formulaire (Devis/Commande/Facture)
2. Cliquez sur l'icône de configuration de la grille
3. Décochez les colonnes "Prix Unit. TTC" et "Montant TTC"

## 🐛 Dépannage

### Les champs ne s'affichent pas

1. Vérifiez que les champs ont été créés :
   ```bash
   bench --site josseaume-energie-calendar.devs.local console
   ```
   ```python
   import frappe
   frappe.db.exists("Custom Field", "Quotation Item-custom_rate_ttc")
   ```

2. Videz le cache du navigateur (Ctrl+Shift+Delete)

3. Vérifiez la console JavaScript du navigateur (F12) pour les erreurs

### Les prix ne se calculent pas automatiquement

1. Vérifiez que le fichier `ttc_calculator.js` est chargé :
   - Ouvrez la console JavaScript (F12)
   - Vous devriez voir : "✓ Module TTC Calculator chargé"

2. Vérifiez que les taxes sont configurées sur le document

3. Vérifiez qu'il n'y a pas d'erreurs JavaScript dans la console

### Les calculs sont incorrects

1. Vérifiez les taux de taxe configurés dans votre système
2. Vérifiez si les articles ont des templates de taxe spécifiques
3. Testez avec un article simple sans template de taxe

## 📞 Support

Pour toute question ou problème :
1. Vérifiez d'abord la section Dépannage ci-dessus
2. Consultez les logs ERPNext : `bench --site [site] watch`
3. Consultez les logs du navigateur (F12 > Console)

## 📝 Notes importantes

- ⚠️ Les champs TTC sont calculés automatiquement et ne peuvent pas être modifiés manuellement
- ⚠️ Les calculs se basent sur les taxes configurées dans ERPNext
- ⚠️ Si aucune taxe n'est configurée, le taux par défaut de 20% est utilisé
- ✅ Les valeurs sont recalculées en temps réel lors de la saisie
- ✅ Les valeurs sont sauvegardées avec le document

## 🔄 Mise à jour

Si vous devez mettre à jour les champs, relancez simplement le script `setup_ttc_fields.py` avec l'option `update=True` (déjà activée par défaut).

## ✅ Compatibilité

- ERPNext Version 15
- Compatible avec le module de calcul de marges existant
- Compatible avec les Product Bundles
- Compatible avec les remises (discount_percentage et discount_amount)
