# Script simplifié pour créer les champs de marge
# Copier et exécuter ce script dans bench console

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# SCRIPT DIRECT - EXÉCUTION IMMÉDIATE
print("🚀 Création des champs personnalisés pour le calcul de marge...")

# Définition de tous les champs
margin_fields = {
    "Quotation": [
        # Section Break - Analyse des Marges
        {
            "fieldname": "margin_analysis_section",
            "label": "Analyse des Marges",
            "fieldtype": "Section Break",
            "insert_after": "taxes_and_charges",
            "collapsible": 1
        },
        
        # Coût Total
        {
            "fieldname": "custom_total_cost",
            "label": "Coût Total",
            "fieldtype": "Currency",
            "insert_after": "margin_analysis_section",
            "read_only": 1,
            "precision": 2
        },
        
        # Marge Globale (Montant)
        {
            "fieldname": "custom_margin_amount",
            "label": "Marge Globale (€)",
            "fieldtype": "Currency", 
            "insert_after": "custom_total_cost",
            "read_only": 1,
            "precision": 2
        },
        
        # Column Break
        {
            "fieldname": "margin_column_break",
            "label": "",
            "fieldtype": "Column Break",
            "insert_after": "custom_margin_amount"
        },
        
        # Marge Globale (%)
        {
            "fieldname": "custom_margin_percentage",
            "label": "Marge Globale (%)",
            "fieldtype": "Percent",
            "insert_after": "margin_column_break",
            "read_only": 1,
            "precision": 2
        },
        
        # Statut de Marge
        {
            "fieldname": "custom_margin_status",
            "label": "Statut de Marge",
            "fieldtype": "Select",
            "options": "\nexcellent\ngood\nacceptable\nlow\nnegative",
            "insert_after": "custom_margin_percentage",
            "read_only": 1
        },
        
        # Marge Calculée (Champ caché)
        {
            "fieldname": "custom_margin_calculated",
            "label": "Marge Calculée",
            "fieldtype": "Check",
            "insert_after": "custom_margin_status",
            "hidden": 1
        }
    ],
    
    "Quotation Item": [
        # Prix de Revient
        {
            "fieldname": "custom_cost_price",
            "label": "Prix de Revient",
            "fieldtype": "Currency",
            "insert_after": "rate",
            "read_only": 1,
            "precision": 2
        },
        
        # Marge (Montant)
        {
            "fieldname": "custom_margin_amount",
            "label": "Marge (€)",
            "fieldtype": "Currency",
            "insert_after": "custom_cost_price",
            "read_only": 1,
            "precision": 2
        },
        
        # Marge (%)
        {
            "fieldname": "custom_margin_percentage",
            "label": "Marge (%)",
            "fieldtype": "Percent",
            "insert_after": "custom_margin_amount",
            "read_only": 1,
            "precision": 2
        }
    ]
}

# CRÉATION DES CHAMPS
try:
    print("📋 Création des champs en cours...")
    create_custom_fields(margin_fields)
    
    # Valider les changements
    frappe.db.commit()
    
    print("✅ SUCCÈS! Tous les champs ont été créés")
    print("\n📊 Champs créés:")
    print("   Quotation: 7 champs (section + 6 champs de données)")
    print("   Quotation Item: 3 champs")
    
    print("\n🔄 Prochaines étapes:")
    print("   1. Actualiser votre navigateur (Ctrl+F5)")
    print("   2. Ouvrir un devis pour vérifier")
    print("   3. Chercher la section 'Analyse des Marges'")
    
except Exception as e:
    print(f"❌ ERREUR: {str(e)}")
    print("💡 Conseil: Vérifiez que vous êtes bien en mode administrateur")

# VÉRIFICATION IMMÉDIATE
print("\n🔍 Vérification des champs créés...")

quotation_fields_created = []
quotation_item_fields_created = []

# Vérifier les champs Quotation
quotation_fields_to_check = [
    "margin_analysis_section", "custom_total_cost", "custom_margin_amount",
    "margin_column_break", "custom_margin_percentage", "custom_margin_status", 
    "custom_margin_calculated"
]

for field in quotation_fields_to_check:
    if frappe.db.exists("Custom Field", f"Quotation-{field}"):
        quotation_fields_created.append(field)
        print(f"   ✅ Quotation-{field}")
    else:
        print(f"   ❌ Quotation-{field}")

# Vérifier les champs Quotation Item
quotation_item_fields_to_check = [
    "custom_cost_price", "custom_margin_amount", "custom_margin_percentage"
]

for field in quotation_item_fields_to_check:
    if frappe.db.exists("Custom Field", f"Quotation Item-{field}"):
        quotation_item_fields_created.append(field)
        print(f"   ✅ Quotation Item-{field}")
    else:
        print(f"   ❌ Quotation Item-{field}")

# Résumé final
total_expected = len(quotation_fields_to_check) + len(quotation_item_fields_to_check)
total_created = len(quotation_fields_created) + len(quotation_item_fields_created)

print(f"\n📈 RÉSUMÉ: {total_created}/{total_expected} champs créés")

if total_created == total_expected:
    print("🎉 PARFAIT! Tous les champs sont en place")
    print("Vous pouvez maintenant actualiser votre navigateur et tester!")
else:
    print("⚠️  Certains champs manquent. Vérifiez les erreurs ci-dessus.")

print("\n" + "="*60)
print("INSTALLATION DES CHAMPS TERMINÉE")
print("="*60)