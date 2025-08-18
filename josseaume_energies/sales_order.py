# josseaume_energies/josseaume_energies/sales_order.py

import frappe
from frappe.utils import get_datetime, add_to_date
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

def on_update(doc, method):
    """
    Fonction appelée quand une commande client est mise à jour
    Synchronise les changements avec l'événement correspondant
    """
    try:
        # Vérifier si cette commande a un événement lié
        if not doc.custom_calendar_event:
            return
            
        # Vérifier si l'événement existe toujours
        if not frappe.db.exists("Event", doc.custom_calendar_event):
            # Nettoyer la référence si l'événement n'existe plus
            doc.db_set("custom_calendar_event", "")
            return
            
        # Récupérer l'événement
        event_doc = frappe.get_doc("Event", doc.custom_calendar_event)
        
        # Vérifier si des changements nécessitent une mise à jour de l'événement
        if should_update_event(doc, event_doc):
            update_event_from_sales_order(doc, event_doc)
            
    except Exception as e:
        frappe.log_error(f"Erreur lors de la synchronisation Sales Order->Event: {str(e)}", 
                       f"Sales Order sync from {doc.name}")

def should_update_event(sales_order_doc, event_doc):
    """
    Détermine si l'événement doit être mis à jour en fonction des changements
    """
    updates_needed = []
    
    # Vérifier la date de livraison
    if sales_order_doc.delivery_date:
        so_date = get_datetime(sales_order_doc.delivery_date).date()
        event_date = get_datetime(event_doc.starts_on).date()
        
        if so_date != event_date:
            updates_needed.append("date")
    
    # Vérifier l'horaire
    if hasattr(sales_order_doc, 'custom_horaire') and sales_order_doc.custom_horaire:
        # Comparer avec l'heure actuelle de l'événement
        event_hour = get_datetime(event_doc.starts_on).hour
        expected_hour = get_expected_hour_from_horaire(sales_order_doc.custom_horaire)
        
        if expected_hour and abs(event_hour - expected_hour) > 1:  # Tolérance d'1 heure
            updates_needed.append("time")
    
    # Vérifier le territoire (dans le sujet)
    if sales_order_doc.territory:
        if sales_order_doc.territory not in (event_doc.subject or ""):
            updates_needed.append("territory")
    
    return len(updates_needed) > 0

def get_expected_hour_from_horaire(horaire):
    """
    Retourne l'heure attendue selon l'horaire
    """
    if horaire == "Matin":
        return 8
    elif horaire == "Après-midi":
        return 14
    return None

def update_event_from_sales_order(sales_order_doc, event_doc):
    """
    Met à jour l'événement en fonction des changements de la commande client
    ET synchronise les dates des articles
    """
    updated_fields = []
    
    # Mettre à jour la date si nécessaire
    if sales_order_doc.delivery_date:
        new_start_time = get_datetime(sales_order_doc.delivery_date)
        
        # Conserver l'heure actuelle si possible
        current_time = get_datetime(event_doc.starts_on)
        new_start_time = new_start_time.replace(
            hour=current_time.hour,
            minute=current_time.minute,
            second=current_time.second
        )
        
        # Ajuster selon l'horaire si défini
        if hasattr(sales_order_doc, 'custom_horaire') and sales_order_doc.custom_horaire:
            if sales_order_doc.custom_horaire == "Matin":
                new_start_time = new_start_time.replace(hour=8, minute=0)
            elif sales_order_doc.custom_horaire == "Après-midi":
                new_start_time = new_start_time.replace(hour=14, minute=0)
        
        event_doc.starts_on = new_start_time
        event_doc.ends_on = add_to_date(new_start_time, hours=1)
        updated_fields.append("dates")
        
        # NOUVEAU: Synchroniser aussi les dates des articles
        items_updated = sync_sales_order_items_delivery_date(sales_order_doc)
        if items_updated > 0:
            updated_fields.append(f"items_dates({items_updated})")
    
    # Mettre à jour le sujet si le territoire a changé
    if sales_order_doc.territory:
        # Extraire la partie avant le territoire actuel
        subject_parts = (event_doc.subject or "").split(" - ")
        main_item = subject_parts[0] if subject_parts else "Service"
        
        new_subject = f"{main_item} - {sales_order_doc.territory}"
        if new_subject != event_doc.subject:
            event_doc.subject = new_subject
            updated_fields.append("subject")
    
    # Sauvegarder les modifications
    if updated_fields:
        # Désactiver temporairement les hooks pour éviter une boucle
        event_doc.flags.ignore_hooks = True
        event_doc.save()
        
        frappe.msgprint(f"Événement {event_doc.name} mis à jour: {', '.join(updated_fields)}")
        
        frappe.log_error(f"Événement mis à jour depuis Sales Order: {', '.join(updated_fields)}", 
                       f"Sales Order sync update {sales_order_doc.name}")

def sync_sales_order_items_delivery_date(sales_order_doc):
    """
    Synchronise les dates de livraison de tous les articles avec la date principale
    """
    try:
        if not sales_order_doc.delivery_date:
            return 0
            
        items_updated = 0
        main_delivery_date = sales_order_doc.delivery_date
        
        # Mettre à jour chaque article
        for item in sales_order_doc.items:
            if item.delivery_date != main_delivery_date:
                frappe.db.set_value("Sales Order Item", item.name, "delivery_date", main_delivery_date, update_modified=False)
                items_updated += 1
        
        if items_updated > 0:
            frappe.db.commit()
        
        return items_updated
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la sync des articles: {str(e)}", 
                       f"Items sync for {sales_order_doc.name}")
        return 0

# Fonction utilitaire pour désactiver temporairement la synchronisation
def disable_event_sync():
    """
    Désactive temporairement la synchronisation pour éviter les boucles
    """
    frappe.local.disable_event_sync = True

def enable_event_sync():
    """
    Réactive la synchronisation
    """
    frappe.local.disable_event_sync = False

def is_event_sync_enabled():
    """
    Vérifie si la synchronisation est activée
    """
    return not getattr(frappe.local, 'disable_event_sync', False)

def on_cancel(doc, method):
    """
    Fonction appelée automatiquement lorsqu'une commande client est annulée
    Ferme l'événement lié dans le calendrier
    """
    try:
        # Vérifier si cette commande a un événement lié
        if not doc.custom_calendar_event:
            return
            
        # Vérifier si l'événement existe toujours
        if not frappe.db.exists("Event", doc.custom_calendar_event):
            # Nettoyer la référence si l'événement n'existe plus
            doc.db_set("custom_calendar_event", "")
            return
            
        # Récupérer l'événement
        event_doc = frappe.get_doc("Event", doc.custom_calendar_event)
        
        # Fermer l'événement
        if event_doc.status != "Closed":
            event_doc.status = "Closed"
            
            # Ajouter un commentaire dans la description
            current_description = event_doc.description or ""
            cancel_note = f"\n\n---\n**Note:** Événement fermé automatiquement car la commande client {doc.name} a été annulée le {frappe.utils.now()}"
            event_doc.description = current_description + cancel_note
            
            # Désactiver temporairement les hooks pour éviter une boucle
            event_doc.flags.ignore_hooks = True
            event_doc.save()
            
            frappe.msgprint(f"L'événement {event_doc.name} a été fermé car la commande a été annulée", indicator="orange")
            
            frappe.log_error(f"Événement {event_doc.name} fermé suite à l'annulation de la commande {doc.name}", 
                           "Event closed on SO cancel")
            
    except Exception as e:
        frappe.log_error(f"Erreur lors de la fermeture de l'événement suite à l'annulation: {str(e)}", 
                       f"Event close error for {doc.name}")

def before_update_after_submit(doc, method):
    """
    Fonction appelée lorsqu'une commande client annulée est modifiée et resoumise
    Réouvre l'événement lié s'il était fermé
    """
    try:
        # Vérifier si la commande passe de l'état annulé à soumis
        if doc.docstatus == 1 and doc.custom_calendar_event:
            # Vérifier si l'événement existe
            if frappe.db.exists("Event", doc.custom_calendar_event):
                event_doc = frappe.get_doc("Event", doc.custom_calendar_event)
                
                # Réouvrir l'événement s'il était fermé
                if event_doc.status == "Closed":
                    event_doc.status = "Open"
                    
                    # Ajouter un commentaire dans la description
                    current_description = event_doc.description or ""
                    reopen_note = f"\n\n---\n**Note:** Événement réouvert automatiquement car la commande client {doc.name} a été réactivée le {frappe.utils.now()}"
                    event_doc.description = current_description + reopen_note
                    
                    # Désactiver temporairement les hooks pour éviter une boucle
                    event_doc.flags.ignore_hooks = True
                    event_doc.save()
                    
                    frappe.msgprint(f"L'événement {event_doc.name} a été réouvert", indicator="green")
                    
    except Exception as e:
        frappe.log_error(f"Erreur lors de la réouverture de l'événement: {str(e)}", 
                       f"Event reopen error for {doc.name}")