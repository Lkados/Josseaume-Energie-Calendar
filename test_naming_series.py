#!/usr/bin/env python3
"""
Script pour tester les nouvelles séries de numérotation
"""

import frappe
from datetime import datetime

def test_naming_series():
    """
    Teste les nouvelles séries de numérotation
    """
    
    print("🧪 Test des séries de numérotation")
    print("-" * 50)
    
    # Test 1: Créer un devis test
    try:
        quotation = frappe.new_doc("Quotation")
        quotation.quotation_to = "Customer"
        quotation.party_name = frappe.get_all("Customer", limit=1)[0].name
        quotation.save()
        
        print(f"✅ Devis créé: {quotation.name}")
        
        # Supprimer le test
        quotation.delete()
        
    except Exception as e:
        print(f"❌ Erreur devis: {str(e)}")
    
    # Test 2: Vérifier les séries disponibles
    print("\n📊 Séries de nommage disponibles:")
    
    try:
        # Devis
        quotation_meta = frappe.get_meta("Quotation")
        naming_field = quotation_meta.get_field("naming_series")
        if naming_field and naming_field.options:
            print(f"Devis: {naming_field.options}")
        else:
            print("Devis: Pas de série configurée")
            
    except Exception as e:
        print(f"Devis: Erreur - {str(e)}")
    
    try:
        # Factures
        invoice_meta = frappe.get_meta("Sales Invoice")
        naming_field = invoice_meta.get_field("naming_series")
        if naming_field and naming_field.options:
            print(f"Factures: {naming_field.options}")
        else:
            print("Factures: Pas de série configurée")
            
    except Exception as e:
        print(f"Factures: Erreur - {str(e)}")
    
    try:
        # Stock
        stock_meta = frappe.get_meta("Stock Entry")
        naming_field = stock_meta.get_field("naming_series")
        if naming_field and naming_field.options:
            print(f"Stock: {naming_field.options}")
        else:
            print("Stock: Pas de série configurée")
            
    except Exception as e:
        print(f"Stock: Erreur - {str(e)}")
    
    # Test 3: Vérifier les compteurs actuels
    print("\n📈 Compteurs actuels:")
    
    year = datetime.now().year
    series_list = [
        f"DEV-{year}-",
        f"FACT-{year}-", 
        f"STOCK-{year}-"
    ]
    
    for series in series_list:
        try:
            counter = frappe.db.get_value("Series", series, "current") or 0
            print(f"{series}: {counter}")
        except:
            print(f"{series}: Non initialisé")

def reset_counters_for_2025():
    """
    Réinitialise les compteurs pour 2025
    """
    print("\n🔄 Réinitialisation des compteurs pour 2025")
    
    series_list = [
        "DEV-2025-",
        "FACT-2025-", 
        "STOCK-2025-"
    ]
    
    for series in series_list:
        try:
            # Créer ou mettre à jour la série
            if frappe.db.exists("Series", series):
                frappe.db.set_value("Series", series, "current", 0)
                print(f"✅ {series}: remis à 0")
            else:
                # Créer la série
                series_doc = frappe.new_doc("Series")
                series_doc.name = series
                series_doc.current = 0
                series_doc.insert()
                print(f"✅ {series}: créé avec valeur 0")
                
        except Exception as e:
            print(f"❌ {series}: Erreur - {str(e)}")
    
    frappe.db.commit()

# Exécuter les tests
if __name__ == "__main__" or frappe.local.site:
    test_naming_series()
    reset_counters_for_2025()