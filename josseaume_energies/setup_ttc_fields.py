# -*- coding: utf-8 -*-
# Copyright (c) 2024, Josseaume Energies
# License: MIT

"""
Script pour créer les champs personnalisés TTC (prix incluant taxes)
sur les items de Devis, Commandes et Factures

UTILISATION:
1. Copier ce script entier
2. Ouvrir bench console: bench --site [nom-du-site] console
3. Coller le script et appuyer sur Entrée
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

print("="*70)
print("🚀 CRÉATION DES CHAMPS TTC (PRIX AVEC TAXES)")
print("="*70)

# Définition des champs personnalisés
ttc_fields = {
    # Quotation Item - Items de Devis
    "Quotation Item": [
        {
            "fieldname": "custom_rate_ttc",
            "label": "Prix Unit. TTC",
            "fieldtype": "Currency",
            "insert_after": "rate",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Prix unitaire TTC (taxes incluses)"
        },
        {
            "fieldname": "custom_amount_ttc",
            "label": "Montant TTC",
            "fieldtype": "Currency",
            "insert_after": "amount",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Montant total TTC (taxes incluses)"
        }
    ],

    # Sales Order Item - Items de Commande
    "Sales Order Item": [
        {
            "fieldname": "custom_rate_ttc",
            "label": "Prix Unit. TTC",
            "fieldtype": "Currency",
            "insert_after": "rate",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Prix unitaire TTC (taxes incluses)"
        },
        {
            "fieldname": "custom_amount_ttc",
            "label": "Montant TTC",
            "fieldtype": "Currency",
            "insert_after": "amount",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Montant total TTC (taxes incluses)"
        }
    ],

    # Sales Invoice Item - Items de Facture
    "Sales Invoice Item": [
        {
            "fieldname": "custom_rate_ttc",
            "label": "Prix Unit. TTC",
            "fieldtype": "Currency",
            "insert_after": "rate",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Prix unitaire TTC (taxes incluses)"
        },
        {
            "fieldname": "custom_amount_ttc",
            "label": "Montant TTC",
            "fieldtype": "Currency",
            "insert_after": "amount",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2,
            "description": "Montant total TTC (taxes incluses)"
        }
    ]
}

# CRÉATION DES CHAMPS
try:
    print("\n📋 Création des champs en cours...")
    create_custom_fields(ttc_fields, update=True)

    # Valider les changements
    frappe.db.commit()

    print("✅ SUCCÈS! Tous les champs TTC ont été créés")
    print("\n📊 Champs créés:")
    print("   • Quotation Item: 2 champs (Prix Unit. TTC + Montant TTC)")
    print("   • Sales Order Item: 2 champs (Prix Unit. TTC + Montant TTC)")
    print("   • Sales Invoice Item: 2 champs (Prix Unit. TTC + Montant TTC)")

    print("\n🔄 Prochaines étapes:")
    print("   1. Redémarrer le serveur: bench restart")
    print("   2. Vider le cache: bench clear-cache")
    print("   3. Actualiser votre navigateur (Ctrl+F5 ou Cmd+Shift+R)")
    print("   4. Ouvrir un devis/commande/facture pour vérifier")

except Exception as e:
    print(f"❌ ERREUR: {str(e)}")
    print("💡 Conseil: Vérifiez que vous êtes bien en mode administrateur")
    import traceback
    traceback.print_exc()

# VÉRIFICATION IMMÉDIATE
print("\n🔍 Vérification des champs créés...")

doctypes = ["Quotation Item", "Sales Order Item", "Sales Invoice Item"]
fields_to_check = ["custom_rate_ttc", "custom_amount_ttc"]

all_created = True
for doctype in doctypes:
    print(f"\n   {doctype}:")
    for field in fields_to_check:
        field_name = f"{doctype}-{field}"
        if frappe.db.exists("Custom Field", field_name):
            print(f"      ✅ {field}")
        else:
            print(f"      ❌ {field}")
            all_created = False

# Résumé final
print("\n" + "="*70)
if all_created:
    print("🎉 PARFAIT! Tous les champs TTC sont en place")
    print("Les prix TTC seront calculés automatiquement dans les documents")
    print("\n⚠️  N'oubliez pas de:")
    print("   • Redémarrer le serveur: bench restart")
    print("   • Vider le cache: bench clear-cache")
else:
    print("⚠️  Certains champs manquent. Vérifiez les erreurs ci-dessus.")

print("="*70)
print("INSTALLATION DES CHAMPS TTC TERMINÉE")
print("="*70)
