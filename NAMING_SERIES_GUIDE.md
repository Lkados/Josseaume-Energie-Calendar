# Guide de Configuration des Séries de Nommage

## Vue d'ensemble

Ce guide explique comment configurer et utiliser les nouvelles séries de nommage pour Josseaume Energies.

## Formats de nommage

Les documents seront nommés selon les formats suivants :

- **Devis** : `DEV-2025-00001`, `DEV-2025-00002`, etc.
- **Factures** : `FACT-2025-00001`, `FACT-2025-00002`, etc.
- **Écritures de stock** : `STOCK-2025-00001`, `STOCK-2025-00002`, etc.

## Installation

### Méthode 1 : Via la console Bench

```bash
cd /path/to/frappe-bench
bench execute josseaume_energies.naming_series_setup.setup_naming_series
```

### Méthode 2 : Via l'interface ERPNext

1. Aller dans **Paramètres** > **Personnalisation** > **Série de nommage**
2. Pour chaque type de document, ajouter la série correspondante :
   - **Quotation** : `DEV-.YYYY.-.#####`
   - **Sales Invoice** : `FACT-.YYYY.-.#####`
   - **Stock Entry** : `STOCK-.YYYY.-.#####`
3. Définir chaque série comme valeur par défaut

### Méthode 3 : Script Python

```bash
cd /path/to/josseaume-energies
python setup_naming_series.py
```

## Vérification

Pour vérifier que les séries sont bien configurées :

```python
bench execute josseaume_energies.naming_series_setup.get_current_naming_series
```

## Réinitialisation des compteurs

Si vous devez réinitialiser un compteur (par exemple au début d'une nouvelle année) :

```python
# Pour les devis
bench execute josseaume_energies.naming_series_setup.reset_naming_series_counter --args "['Quotation', 2025]"

# Pour les factures
bench execute josseaume_energies.naming_series_setup.reset_naming_series_counter --args "['Sales Invoice', 2025]"

# Pour les écritures de stock
bench execute josseaume_energies.naming_series_setup.reset_naming_series_counter --args "['Stock Entry', 2025]"
```

## Notes importantes

1. **Compteurs annuels** : Les compteurs se réinitialisent automatiquement chaque année grâce au format `.YYYY.`
2. **Zéros de padding** : Le format `.#####` garantit 5 chiffres avec des zéros devant (00001, 00002, etc.)
3. **Rétrocompatibilité** : Les anciens documents conservent leur numérotation existante

## Dépannage

### Problème : Les nouveaux documents n'utilisent pas le bon format

**Solution** : 
1. Vider le cache : `bench clear-cache`
2. Redémarrer : `bench restart`
3. Vérifier dans **Série de nommage** que la série est bien définie comme défaut

### Problème : Erreur de permission

**Solution** : Assurez-vous d'avoir les droits System Manager ou administrateur

### Problème : Compteur ne démarre pas à 00001

**Solution** : Utilisez la fonction `reset_naming_series_counter` pour réinitialiser

## Support

Pour toute question ou problème, consultez les logs :
```bash
bench --site [votre-site] console
frappe.get_doc("Error Log", {"method": "Naming Series Setup"})
```