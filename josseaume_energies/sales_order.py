# josseaume_energies/josseaume_energies/sales_order.py

import frappe
from josseaume_energies.api import create_event_from_sales_order

def on_submit(doc, method):
    """
    Fonction appelée automatiquement lorsqu'une commande client est soumise
    Crée un événement dans le calendrier
    """
    try:
        # Appeler la fonction qui crée l'événement
        result = create_event_from_sales_order(doc.name)
        
        # Journaliser le résultat
        if result and result.get("status") == "success":
            frappe.msgprint(f"Événement créé avec succès: {result.get('event_name')}")
        else:
            error_msg = result.get("message") if result and result.get("message") else "Erreur inconnue"
            frappe.log_error(f"Erreur lors de la création automatique de l'événement: {error_msg}", 
                           f"Event creation from {doc.name}")
            
    except Exception as e:
        frappe.log_error(f"Exception lors de la création automatique de l'événement: {str(e)}", 
                       f"Event creation from {doc.name}")