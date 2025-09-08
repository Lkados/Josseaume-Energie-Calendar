# Configuration des séries de nommage pour Josseaume Energies

import frappe
from frappe import _

def setup_naming_series():
    """
    Configure les séries de nommage pour les différents types de documents
    """
    
    # Configuration pour les Devis (Quotation)
    setup_quotation_naming_series()
    
    # Configuration pour les Factures (Sales Invoice)
    setup_invoice_naming_series()
    
    # Configuration pour les Écritures de Stock (Stock Entry)
    setup_stock_entry_naming_series()
    
    frappe.db.commit()
    return "Séries de nommage configurées avec succès"

def setup_quotation_naming_series():
    """
    Configure la série de nommage pour les devis: DEV-YYYY-#####
    """
    try:
        # Mettre à jour les options de la série de nommage
        doc = frappe.get_doc("DocType", "Quotation")
        
        # Ajouter notre série personnalisée aux options
        naming_series = "DEV-.YYYY.-.#####"
        
        # Mettre à jour les Property Setter
        frappe.make_property_setter({
            "doctype": "Quotation",
            "fieldname": "naming_series",
            "property": "options",
            "value": naming_series,
            "property_type": "Text"
        })
        
        # Définir comme série par défaut
        frappe.make_property_setter({
            "doctype": "Quotation",
            "fieldname": "naming_series",
            "property": "default",
            "value": naming_series,
            "property_type": "Text"
        })
        
        print(f"✓ Série de nommage des devis configurée: {naming_series}")
        
    except Exception as e:
        frappe.log_error(f"Erreur configuration devis: {str(e)}", "Naming Series Setup")

def setup_invoice_naming_series():
    """
    Configure la série de nommage pour les factures: FACT-YYYY-#####
    """
    try:
        # Mettre à jour les options de la série de nommage
        doc = frappe.get_doc("DocType", "Sales Invoice")
        
        # Ajouter notre série personnalisée aux options
        naming_series = "FACT-.YYYY.-.#####"
        
        # Mettre à jour les Property Setter
        frappe.make_property_setter({
            "doctype": "Sales Invoice",
            "fieldname": "naming_series",
            "property": "options",
            "value": naming_series,
            "property_type": "Text"
        })
        
        # Définir comme série par défaut
        frappe.make_property_setter({
            "doctype": "Sales Invoice",
            "fieldname": "naming_series",
            "property": "default",
            "value": naming_series,
            "property_type": "Text"
        })
        
        print(f"✓ Série de nommage des factures configurée: {naming_series}")
        
    except Exception as e:
        frappe.log_error(f"Erreur configuration factures: {str(e)}", "Naming Series Setup")

def setup_stock_entry_naming_series():
    """
    Configure la série de nommage pour les écritures de stock: STOCK-YYYY-#####
    """
    try:
        # Mettre à jour les options de la série de nommage
        doc = frappe.get_doc("DocType", "Stock Entry")
        
        # Ajouter notre série personnalisée aux options
        naming_series = "STOCK-.YYYY.-.#####"
        
        # Mettre à jour les Property Setter
        frappe.make_property_setter({
            "doctype": "Stock Entry",
            "fieldname": "naming_series",
            "property": "options",
            "value": naming_series,
            "property_type": "Text"
        })
        
        # Définir comme série par défaut
        frappe.make_property_setter({
            "doctype": "Stock Entry",
            "fieldname": "naming_series",
            "property": "default",
            "value": naming_series,
            "property_type": "Text"
        })
        
        print(f"✓ Série de nommage des écritures de stock configurée: {naming_series}")
        
    except Exception as e:
        frappe.log_error(f"Erreur configuration stock: {str(e)}", "Naming Series Setup")

@frappe.whitelist()
def get_current_naming_series():
    """
    Récupère les séries de nommage actuelles pour vérification
    """
    result = {}
    
    # Devis
    try:
        quotation_series = frappe.get_meta("Quotation").get_field("naming_series")
        result["quotation"] = {
            "options": quotation_series.options if quotation_series else None,
            "default": quotation_series.default if quotation_series else None
        }
    except:
        result["quotation"] = {"error": "Non accessible"}
    
    # Factures
    try:
        invoice_series = frappe.get_meta("Sales Invoice").get_field("naming_series")
        result["invoice"] = {
            "options": invoice_series.options if invoice_series else None,
            "default": invoice_series.default if invoice_series else None
        }
    except:
        result["invoice"] = {"error": "Non accessible"}
    
    # Stock
    try:
        stock_series = frappe.get_meta("Stock Entry").get_field("naming_series")
        result["stock"] = {
            "options": stock_series.options if stock_series else None,
            "default": stock_series.default if stock_series else None
        }
    except:
        result["stock"] = {"error": "Non accessible"}
    
    return result

@frappe.whitelist()
def reset_naming_series_counter(doctype, year=None):
    """
    Réinitialise le compteur d'une série de nommage pour une année donnée
    
    Args:
        doctype: Type de document (Quotation, Sales Invoice, Stock Entry)
        year: Année (par défaut l'année courante)
    """
    from datetime import datetime
    
    if not year:
        year = datetime.now().year
    
    series_map = {
        "Quotation": f"DEV-{year}-",
        "Sales Invoice": f"FACT-{year}-",
        "Stock Entry": f"STOCK-{year}-"
    }
    
    if doctype not in series_map:
        frappe.throw(f"Type de document non supporté: {doctype}")
    
    series = series_map[doctype]
    
    # Réinitialiser le compteur
    frappe.db.sql("""
        UPDATE `tabSeries` 
        SET current = 0 
        WHERE name = %s
    """, series)
    
    frappe.db.commit()
    
    return f"Compteur réinitialisé pour {series}"