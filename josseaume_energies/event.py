# josseaume_energies/josseaume_energies/event.py

import frappe
from frappe.utils import get_datetime, add_to_date
from datetime import datetime

def on_update(doc, method):
    """
    Fonction appelée quand un événement est mis à jour
    Synchronise la date avec la commande client correspondante
    """
    try:
        # Vérifier si c'est un événement lié à une commande client
        sales_order_ref = get_linked_sales_order(doc)
        
        if not sales_order_ref:
            return
            
        # Récupérer la commande client
        sales_order = frappe.get_doc("Sales Order", sales_order_ref)
        
        # Vérifier si la date de début de l'événement a changé
        if has_date_changed(doc, sales_order):
            # Mettre à jour la date de livraison de la commande client
            update_sales_order_delivery_date(doc, sales_order)
            
            frappe.msgprint(f"Date de livraison mise à jour pour la commande {sales_order.name}")
            
    except Exception as e:
        frappe.log_error(f"Erreur lors de la synchronisation Event->Sales Order: {str(e)}", 
                       f"Event sync from {doc.name}")

def get_linked_sales_order(event_doc):
    """
    Trouve la commande client liée à cet événement
    """
    # Méthode 1: Chercher directement via le champ custom_calendar_event
    sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event_doc.name}, "name")
    
    if sales_order_ref:
        return sales_order_ref
    
    # Méthode 2: Fallback - chercher dans la description de l'événement
    if event_doc.description:
        import re
        ref_match = re.search(r'<strong>Référence:</strong>\s*([^<\s]+)', event_doc.description)
        if ref_match:
            potential_ref = ref_match.group(1).strip()
            # Vérifier que cette commande existe et qu'elle fait référence à cet événement
            if frappe.db.exists("Sales Order", potential_ref):
                return potential_ref
    
    return None

def has_date_changed(event_doc, sales_order_doc):
    """
    Vérifie si la date de l'événement a changé par rapport à la date de livraison
    """
    if not event_doc.starts_on or not sales_order_doc.delivery_date:
        return False
    
    # Convertir les dates pour comparaison (ignorer l'heure pour delivery_date)
    event_date = get_datetime(event_doc.starts_on).date()
    delivery_date = get_datetime(sales_order_doc.delivery_date).date()
    
    return event_date != delivery_date

def update_sales_order_delivery_date(event_doc, sales_order_doc):
    """
    Met à jour la date de livraison de la commande client ET de tous ses articles
    """
    # Extraire la date de l'événement (sans l'heure)
    new_delivery_date = get_datetime(event_doc.starts_on).date()
    
    # Mettre à jour la date de livraison principale de la commande
    frappe.db.set_value("Sales Order", sales_order_doc.name, "delivery_date", new_delivery_date, update_modified=False)
    
    # Mettre à jour la date de livraison de chaque article
    items_updated = update_sales_order_items_delivery_date(sales_order_doc.name, new_delivery_date)
    
    # Log de l'action
    frappe.log_error(f"Date de livraison mise à jour: {sales_order_doc.name} -> {new_delivery_date} ({items_updated} articles mis à jour)", 
                   f"Event sync update")

def update_sales_order_items_delivery_date(sales_order_name, new_delivery_date):
    """
    Met à jour la date de livraison de tous les articles d'une commande client
    """
    try:
        # Récupérer tous les articles de la commande
        items = frappe.get_all("Sales Order Item", 
            filters={"parent": sales_order_name},
            fields=["name", "delivery_date"]
        )
        
        items_updated = 0
        
        for item in items:
            # Mettre à jour chaque article individuellement
            frappe.db.set_value("Sales Order Item", item.name, "delivery_date", new_delivery_date, update_modified=False)
            items_updated += 1
        
        # Valider les changements
        frappe.db.commit()
        
        return items_updated
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la mise à jour des articles: {str(e)}", 
                       f"Items update for {sales_order_name}")
        return 0

def on_trash(doc, method):
    """
    Fonction appelée quand un événement est supprimé
    Nettoie la référence dans la commande client
    """
    try:
        sales_order_ref = get_linked_sales_order(doc)
        
        if sales_order_ref:
            # Nettoyer la référence dans la commande client
            frappe.db.set_value("Sales Order", sales_order_ref, "custom_calendar_event", "", update_modified=False)
            frappe.msgprint(f"Référence événement supprimée de la commande {sales_order_ref}")
            
    except Exception as e:
        frappe.log_error(f"Erreur lors du nettoyage Event->Sales Order: {str(e)}", 
                       f"Event cleanup from {doc.name}")