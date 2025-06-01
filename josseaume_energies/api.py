# josseaume_energies/api.py

import frappe
from frappe import _
import calendar
from datetime import datetime, timedelta

@frappe.whitelist()
def create_event_from_sales_order(docname):
    """Crée un événement à partir d'une commande client avec des participants"""
    if not docname:
        return {"status": "error", "message": "ID de document manquant"}
    
    try:
        # Récupérer le document source
        doc = frappe.get_doc("Sales Order", docname)
        
        # Vérifier la date de livraison
        if not doc.delivery_date:
            return {"status": "error", "message": "La date de livraison n'est pas définie"}
            
        # Récupérer le territoire
        territory = ""
        if doc.territory:
            territory = doc.territory
        
        # Définir l'horaire
        horaire = doc.custom_horaire
        all_day = False

        # Obtenir la date de base à partir de la date de livraison
        start_time = frappe.utils.get_datetime(doc.delivery_date)
        end_time = frappe.utils.get_datetime(doc.delivery_date)

        # Définir l'heure en fonction de la préférence d'horaire
        if horaire == "Matin":
            hour = 8 + (frappe.utils.now_datetime().second % 4)
            minute = 15 * ((frappe.utils.now_datetime().second // 15) % 4)
            
            start_time = frappe.utils.add_to_date(start_time, hours=hour, minutes=minute)
            end_time = frappe.utils.add_to_date(start_time, hours=1)
        elif horaire == "Après-midi":
            hour = 14 + (frappe.utils.now_datetime().second % 5)
            minute = 15 * ((frappe.utils.now_datetime().second // 15) % 4)
            
            start_time = frappe.utils.add_to_date(start_time, hours=hour, minutes=minute)
            end_time = frappe.utils.add_to_date(start_time, hours=1)
        else:
            all_day = True
            end_time = frappe.utils.add_to_date(end_time, days=1)

        # Trouver l'article principal
        main_item = "Service"
        type_commande = doc.custom_type_de_commande

        # Vérifier les articles en fonction du type de commande
        if doc.items:
            if type_commande == "Entretien":
                # Pour les entretiens, chercher les codes spécifiques
                entretien_codes = ["EPG", "ECG", "ECFBT", "ECFC", "ECGAZBT", "ECGAZC", "RAMO"]
                
                for item in doc.items:
                    item_code = item.item_code or ""
                    # Vérifier si le code d'article commence par l'un des codes d'entretien
                    for code in entretien_codes:
                        if item_code.startswith(code):
                            main_item = item.item_code
                            break
                    if main_item != "Service":
                        break
            
            elif type_commande == "Installation":
                # Pour les installations, chercher des articles contenant POELE ou CHAUDIERE
                for item in doc.items:
                    item_name_upper = (item.item_name or "").upper()
                    desc_upper = (item.description or "").upper()
                    
                    if "POELE" in item_name_upper or "POELE" in desc_upper:
                        main_item = item.item_code or item.item_name
                        break
                    elif "CHAUDIERE" in item_name_upper or "CHAUDIERE" in desc_upper:
                        main_item = item.item_code or item.item_name
                        break
            
            elif type_commande == "Livraison Granule":
                # Pour les livraisons de granulés
                granule_codes = ["EO2", "BIOSYL", "PELLET", "GRANULE"]
                for item in doc.items:
                    item_code_upper = (item.item_code or "").upper()
                    item_name_upper = (item.item_name or "").upper()
                    
                    if any(code in item_code_upper or code in item_name_upper for code in granule_codes):
                        main_item = item.item_code or item.item_name
                        break
            
            else:
                # Pour les autres types (comme Livraison Fuel)
                fuel_keywords = ["FUEL", "FIOUL", "GASOIL"]
                for item in doc.items:
                    item_name_upper = (item.item_name or "").upper()
                    item_code_upper = (item.item_code or "").upper()
                    
                    if any(keyword in item_name_upper or keyword in item_code_upper for keyword in fuel_keywords):
                        main_item = item.item_code or item.item_name
                        break

        # Si aucun article principal n'a été trouvé, utiliser le premier article de la commande
        if main_item == "Service" and doc.items:
            main_item = doc.items[0].item_code or doc.items[0].item_name

        # Créer le sujet de l'événement
        # Format simplifié comme demandé: "EPG - ZONE 103"
        subject = main_item
        if territory:
            subject = subject + " - " + territory

        # Obtenir les détails des participants
        customer_name = frappe.db.get_value("Customer", doc.customer, "customer_name") if doc.customer else ""
        tech_name = frappe.db.get_value("Employee", doc.custom_intervenant, "employee_name") if doc.custom_intervenant else ""

        # Créer une description détaillée avec commentaires
        description = "<p><strong>Client:</strong> " + (customer_name or doc.customer or "") + "</p>"
        description = description + "<p><strong>Référence:</strong> " + doc.name + "</p>"
        description = description + "<p><strong>Type:</strong> " + type_commande + "</p>"
        description = description + "<p><strong>Article:</strong> " + main_item + "</p>"

        if tech_name:
            description = description + "<p><strong>Intervenant:</strong> " + tech_name + "</p>"

        # Ajouter les coordonnées
        if doc.customer:
            customer_email = frappe.db.get_value("Customer", doc.customer, "email_id") or ""
            customer_phone = frappe.db.get_value("Customer", doc.customer, "mobile_no") or ""
            
            if customer_phone:
                description = description + "<p><strong>Tél client:</strong> " + customer_phone + "</p>"
            if customer_email:
                description = description + "<p><strong>Email client:</strong> " + customer_email + "</p>"
            
            # Ajouter l'adresse si elle existe
            if doc.customer_address:
                address = frappe.get_doc("Address", doc.customer_address)
                if address:
                    formatted_address = address.address_line1
                    if address.address_line2:
                        formatted_address += ", " + address.address_line2
                    if address.city:
                        formatted_address += ", " + address.city
                    if address.pincode:
                        formatted_address += " " + address.pincode
                    
                    description = description + "<p><strong>Adresse:</strong> " + formatted_address + "</p>"

        if doc.custom_intervenant:
            tech_email = frappe.db.get_value("Employee", doc.custom_intervenant, "personal_email") or ""
            tech_phone = frappe.db.get_value("Employee", doc.custom_intervenant, "cell_number") or ""
            
            if tech_phone:
                description = description + "<p><strong>Tél intervenant:</strong> " + tech_phone + "</p>"
            if tech_email:
                description = description + "<p><strong>Email intervenant:</strong> " + tech_email + "</p>"

        # AMÉLIORATION: Ajouter les commentaires dans la description
        if doc.custom_commentaire:
            description = description + "<p><strong>Commentaires:</strong> " + doc.custom_commentaire + "</p>"

        # Définir la couleur en fonction du type de commande
        color = "#7E57C2"  # Violet par défaut
        if type_commande == "Installation":
            color = "#1E88E5"  # Bleu
        elif type_commande == "Entretien":
            color = "#43A047"  # Vert
        elif type_commande == "Livraison Granule":
            color = "#FFA000"  # Ambre
        elif "fuel" in (type_commande or "").lower() or "fioul" in (type_commande or "").lower():
            color = "#E53935"  # Rouge

        # Créer l'événement
        event = frappe.get_doc({
            "doctype": "Event",
            "subject": subject,
            "event_type": "Public",
            "starts_on": start_time,
            "ends_on": end_time,
            "all_day": all_day,
            "description": description,
            "color": color
        })

        # Insérer l'événement
        event.insert(ignore_permissions=True)
        
        # Ajouter des participants à l'événement
        participants_added = 0
        
        # Ajouter le client
        if doc.customer and customer_name:
            event.append("event_participants", {
                "reference_doctype": "Customer",
                "reference_docname": doc.customer
            })
            participants_added += 1
            
        # Ajouter l'intervenant
        if doc.custom_intervenant and tech_name:
            event.append("event_participants", {
                "reference_doctype": "Employee",
                "reference_docname": doc.custom_intervenant
            })
            participants_added += 1
            
        # Sauvegarder l'événement avec les participants
        if participants_added > 0:
            event.save(ignore_permissions=True)
            
        # Vérifier si un champ personnalisé existe pour stocker la référence
        custom_field_exists = frappe.db.exists("Custom Field", {
            "dt": doc.doctype,
            "fieldname": "custom_calendar_event"
        })
        
        if custom_field_exists:
            doc.db_set("custom_calendar_event", event.name)
        
        # Retourner le succès et l'ID de l'événement
        return {
            "status": "success", 
            "message": "Événement créé avec " + str(participants_added) + " participant(s)", 
            "event_name": event.name
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la création de l'événement: {str(e)}", 
                       f"Event creation from {docname}")
        return {"status": "error", "message": str(e)}

def get_sales_order_info_from_event(event_description):
    """Extrait la référence de commande client depuis la description de l'événement"""
    if not event_description:
        return None
    
    # Chercher le pattern <strong>Référence:</strong> suivi de l'ID
    import re
    ref_match = re.search(r'<strong>Référence:</strong>\s*([^<\s]+)', event_description)
    if ref_match:
        return ref_match.group(1).strip()
    return None

def enrich_event_with_comments(event):
    """Enrichit un événement avec les commentaires de la commande client"""
    try:
        # Si l'événement a déjà des sales_order_info, vérifier les commentaires
        if not event.get("sales_order_info") or not event["sales_order_info"].get("comments"):
            
            # Récupérer la commande client liée
            sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event["name"]}, "name")
            
            if not sales_order_ref:
                # Fallback: essayer d'extraire depuis la description
                sales_order_ref = get_sales_order_info_from_event(event.get("description"))
            
            if sales_order_ref:
                try:
                    # Récupérer TOUS les champs nécessaires de la commande client
                    sales_order_data = frappe.db.get_value("Sales Order", sales_order_ref, [
                        "name", 
                        "customer", 
                        "custom_intervenant", 
                        "custom_commentaire", 
                        "custom_type_de_commande", 
                        "territory"
                    ], as_dict=True)
                    
                    if sales_order_data:
                        # Récupérer les noms complets
                        customer_name = ""
                        if sales_order_data.customer:
                            customer_name = frappe.db.get_value("Customer", sales_order_data.customer, "customer_name") or ""
                        
                        employee_name = ""
                        if sales_order_data.custom_intervenant:
                            employee_name = frappe.db.get_value("Employee", sales_order_data.custom_intervenant, "employee_name") or ""
                        
                        # Mettre à jour ou créer sales_order_info
                        event["sales_order_info"] = {
                            "name": sales_order_data.name,
                            "customer_name": customer_name,
                            "employee_name": employee_name,
                            "comments": sales_order_data.custom_commentaire or "",
                            "custom_commentaire": sales_order_data.custom_commentaire or "",  # Champ supplémentaire pour debug
                            "type": sales_order_data.custom_type_de_commande or "",
                            "territory": sales_order_data.territory or ""
                        }
                        
                        # Log pour debug
                        frappe.log_error(f"Event {event['name']} enrichi avec commentaires: '{sales_order_data.custom_commentaire}'", 
                                       "Event enrichment debug")
                
                except Exception as e:
                    frappe.log_error(f"Erreur lors de l'enrichissement de l'événement {event['name']}: {str(e)}", 
                                   "Event enrichment error")
        
        return event
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de l'enrichissement général: {str(e)}", "General enrichment error")
        return event

@frappe.whitelist()
def get_day_events(date, territory=None, employee=None, event_type=None):
    """Récupère les événements pour une journée donnée, filtrés par territoire, employé et/ou type d'intervention"""
    
    # Convertir la date en datetime
    start_date = frappe.utils.get_datetime(date)
    end_date = frappe.utils.add_days(start_date, 1)
    
    # Construire les filtres
    filters = [
        ["starts_on", ">=", start_date],
        ["starts_on", "<", end_date]
    ]
    
    # Ajouter des filtres optionnels
    if territory:
        # Pour le territoire, on cherche dans le sujet de l'événement
        filters.append(["subject", "like", f"%{territory}%"])
    
    # Récupérer les événements avec les champs nécessaires
    events = frappe.get_all(
        "Event",
        filters=filters,
        fields=["name", "subject", "starts_on", "ends_on", "color", "all_day", "description"]
    )
    
    # Filtrer par employé si spécifié
    if employee:
        filtered_events = []
        for event in events:
            participants = frappe.get_all(
                "Event Participants",
                filters={
                    "parent": event.name,
                    "reference_doctype": "Employee",
                    "reference_docname": employee
                },
                fields=["name"]
            )
            if participants:
                filtered_events.append(event)
        events = filtered_events
    
    # Filtrer par type d'intervention si spécifié
    if event_type:
        filtered_events = []
        for event in events:
            # Chercher le type dans la description de l'événement
            if event.description and f"<strong>Type:</strong> {event_type}" in event.description:
                filtered_events.append(event)
        events = filtered_events
    
    # Enrichir chaque événement avec les informations de la commande client
    for event in events:
        # Récupérer les participants
        event_participants = frappe.get_all(
            "Event Participants",
            filters={"parent": event.name},
            fields=["reference_doctype", "reference_docname"]
        )
        
        # Ajouter les noms complets
        for participant in event_participants:
            try:
                if participant["reference_doctype"] == "Customer":
                    participant["full_name"] = frappe.db.get_value("Customer", 
                        participant["reference_docname"], "customer_name") or participant["reference_docname"]
                elif participant["reference_doctype"] == "Employee":
                    participant["full_name"] = frappe.db.get_value("Employee", 
                        participant["reference_docname"], "employee_name") or participant["reference_docname"]
            except Exception:
                # En cas d'erreur, utiliser l'ID comme fallback
                participant["full_name"] = participant["reference_docname"]
        
        event["event_participants"] = event_participants
        
        # AMÉLIORATION: Récupération enrichie des informations de la commande client
        # Utiliser la relation inverse : chercher la Sales Order qui référence cet événement
        sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event.name}, "name")
        
        if not sales_order_ref:
            # Fallback: essayer d'extraire depuis la description
            sales_order_ref = get_sales_order_info_from_event(event.description)
        
        if sales_order_ref:
            try:
                # AMÉLIORATION: Récupérer plus de champs et gérer les erreurs
                sales_order_data = frappe.db.get_value("Sales Order", sales_order_ref, [
                    "name", 
                    "customer", 
                    "custom_intervenant", 
                    "custom_commentaire", 
                    "custom_type_de_commande", 
                    "territory"
                ], as_dict=True)
                
                if sales_order_data:
                    # Récupérer les noms complets avec gestion d'erreur
                    customer_name = ""
                    try:
                        if sales_order_data.customer:
                            customer_name = frappe.db.get_value("Customer", sales_order_data.customer, "customer_name") or ""
                    except Exception:
                        pass
                    
                    employee_name = ""
                    try:
                        if sales_order_data.custom_intervenant:
                            employee_name = frappe.db.get_value("Employee", sales_order_data.custom_intervenant, "employee_name") or ""
                    except Exception:
                        pass
                    
                    event["sales_order_info"] = {
                        "name": sales_order_data.name,
                        "customer_name": customer_name,
                        "employee_name": employee_name,
                        "comments": sales_order_data.custom_commentaire or "",
                        "custom_commentaire": sales_order_data.custom_commentaire or "",  # Redondance pour debug
                        "type": sales_order_data.custom_type_de_commande or "",
                        "territory": sales_order_data.territory or ""
                    }
                    
                    # Debug log pour les commentaires
                    if sales_order_data.custom_commentaire:
                        frappe.log_error(f"Commentaires trouvés pour event {event.name}: '{sales_order_data.custom_commentaire}'", 
                                       "Comments debug")
                else:
                    event["sales_order_info"] = None
                    
            except Exception as e:
                # Si la commande n'existe plus ou erreur, continuer sans les infos
                frappe.log_error(f"Erreur lors de la récupération des infos SO pour {sales_order_ref}: {str(e)}", 
                               "Sales Order info error")
                event["sales_order_info"] = None
        else:
            event["sales_order_info"] = None
    
    return events

@frappe.whitelist()
def get_calendar_events(year, month, territory=None, employee=None, event_type=None):
    """Récupère tous les événements pour un mois donné"""
    
    # Convertir en entiers
    year = int(year)
    month = int(month)
    
    # Obtenir le nombre de jours dans le mois
    _, num_days = calendar.monthrange(year, month)
    
    # Créer les dates de début et fin
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{num_days}"
    
    # Construire les filtres
    filters = [
        ["starts_on", ">=", start_date],
        ["starts_on", "<=", end_date]
    ]
    
    # Ajouter le filtre de territoire si spécifié
    if territory:
        filters.append(["subject", "like", f"%{territory}%"])
    
    # Récupérer les événements
    events = frappe.get_all(
        "Event",
        filters=filters,
        fields=["name", "subject", "starts_on", "ends_on", "color", "all_day", "description"]
    )
    
    # Filtrer par employé si spécifié
    if employee:
        filtered_events = []
        for event in events:
            participants = frappe.get_all(
                "Event Participants",
                filters={
                    "parent": event.name,
                    "reference_doctype": "Employee",
                    "reference_docname": employee
                },
                fields=["name"]
            )
            if participants:
                filtered_events.append(event)
        events = filtered_events
    
    # Filtrer par type d'intervention si spécifié
    if event_type:
        filtered_events = []
        for event in events:
            # Chercher le type dans la description de l'événement
            if event.description and f"<strong>Type:</strong> {event_type}" in event.description:
                filtered_events.append(event)
        events = filtered_events
    
    # Enrichir chaque événement avec les informations de la commande client
    for event in events:
        # Récupérer les participants
        event_participants = frappe.get_all(
            "Event Participants",
            filters={"parent": event.name},
            fields=["reference_doctype", "reference_docname"]
        )
        
        # Ajouter les noms complets (méthode simplifiée)
        for participant in event_participants:
            try:
                if participant["reference_doctype"] == "Customer":
                    participant["full_name"] = frappe.db.get_value("Customer", 
                        participant["reference_docname"], "customer_name") or participant["reference_docname"]
                elif participant["reference_doctype"] == "Employee":
                    participant["full_name"] = frappe.db.get_value("Employee", 
                        participant["reference_docname"], "employee_name") or participant["reference_docname"]
            except Exception:
                # En cas d'erreur, utiliser l'ID comme fallback
                participant["full_name"] = participant["reference_docname"]
        
        event["event_participants"] = event_participants
        
        # NOUVEAU: Récupérer les informations de la commande client directement
        # Utiliser la relation inverse : chercher la Sales Order qui référence cet événement
        sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event.name}, "name")
        
        if not sales_order_ref:
            # Fallback: essayer d'extraire depuis la description
            sales_order_ref = get_sales_order_info_from_event(event.description)
        
        if sales_order_ref:
            try:
                sales_order = frappe.get_doc("Sales Order", sales_order_ref)
                event["sales_order_info"] = {
                    "name": sales_order.name,
                    "customer_name": frappe.db.get_value("Customer", sales_order.customer, "customer_name") if sales_order.customer else "",
                    "employee_name": frappe.db.get_value("Employee", sales_order.custom_intervenant, "employee_name") if sales_order.custom_intervenant else "",
                    "comments": sales_order.custom_commentaire or "",
                    "type": sales_order.custom_type_de_commande or "",
                    "territory": sales_order.territory or ""
                }
            except Exception as e:
                # Si la commande n'existe plus ou erreur, continuer sans les infos
                event["sales_order_info"] = None
        else:
            event["sales_order_info"] = None
    
    return events

@frappe.whitelist()
def get_week_events(start_date, end_date, territory=None, employee=None, event_type=None):
    """Récupère les événements pour une semaine donnée"""
    
    # Construire les filtres
    filters = [
        ["starts_on", ">=", start_date],
        ["starts_on", "<=", end_date]
    ]
    
    # Ajouter le filtre de territoire si spécifié
    if territory:
        filters.append(["subject", "like", f"%{territory}%"])
    
    # Récupérer les événements
    events = frappe.get_all(
        "Event",
        filters=filters,
        fields=["name", "subject", "starts_on", "ends_on", "color", "all_day", "description"]
    )
    
    # Filtrer par employé si spécifié
    if employee:
        filtered_events = []
        for event in events:
            participants = frappe.get_all(
                "Event Participants",
                filters={
                    "parent": event.name,
                    "reference_doctype": "Employee",
                    "reference_docname": employee
                },
                fields=["name"]
            )
            if participants:
                filtered_events.append(event)
        events = filtered_events
    
    # Filtrer par type d'intervention si spécifié
    if event_type:
        filtered_events = []
        for event in events:
            # Chercher le type dans la description de l'événement
            if event.description and f"<strong>Type:</strong> {event_type}" in event.description:
                filtered_events.append(event)
        events = filtered_events
    
    # Enrichir chaque événement avec les informations de la commande client
    for event in events:
        # Récupérer les participants
        event_participants = frappe.get_all(
            "Event Participants",
            filters={"parent": event.name},
            fields=["reference_doctype", "reference_docname"]
        )
        
        # Ajouter les noms complets (méthode simplifiée)
        for participant in event_participants:
            try:
                if participant["reference_doctype"] == "Customer":
                    participant["full_name"] = frappe.db.get_value("Customer", 
                        participant["reference_docname"], "customer_name") or participant["reference_docname"]
                elif participant["reference_doctype"] == "Employee":
                    participant["full_name"] = frappe.db.get_value("Employee", 
                        participant["reference_docname"], "employee_name") or participant["reference_docname"]
            except Exception:
                # En cas d'erreur, utiliser l'ID comme fallback
                participant["full_name"] = participant["reference_docname"]
        
        event["event_participants"] = event_participants
        
        # NOUVEAU: Récupérer les informations de la commande client directement
        # Utiliser la relation inverse : chercher la Sales Order qui référence cet événement
        sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event.name}, "name")
        
        if not sales_order_ref:
            # Fallback: essayer d'extraire depuis la description
            sales_order_ref = get_sales_order_info_from_event(event.description)
        
        if sales_order_ref:
            try:
                sales_order = frappe.get_doc("Sales Order", sales_order_ref)
                event["sales_order_info"] = {
                    "name": sales_order.name,
                    "customer_name": frappe.db.get_value("Customer", sales_order.customer, "customer_name") if sales_order.customer else "",
                    "employee_name": frappe.db.get_value("Employee", sales_order.custom_intervenant, "employee_name") if sales_order.custom_intervenant else "",
                    "comments": sales_order.custom_commentaire or "",
                    "type": sales_order.custom_type_de_commande or "",
                    "territory": sales_order.territory or ""
                }
            except Exception as e:
                # Si la commande n'existe plus ou erreur, continuer sans les infos
                event["sales_order_info"] = None
        else:
            event["sales_order_info"] = None
    
    return events

@frappe.whitelist()
def sync_event_to_sales_order(event_name):
    """
    Synchronisation manuelle: Event -> Sales Order (avec articles)
    """
    try:
        if not event_name:
            return {"status": "error", "message": "ID d'événement manquant"}
        
        # Récupérer l'événement
        event_doc = frappe.get_doc("Event", event_name)
        
        # Trouver la commande client liée
        sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": event_name}, "name")
        
        if not sales_order_ref:
            # Fallback: chercher dans la description
            sales_order_ref = get_sales_order_info_from_event(event_doc.description)
        
        if not sales_order_ref:
            return {"status": "error", "message": "Aucune commande client liée trouvée"}
        
        # Récupérer la commande client
        sales_order_doc = frappe.get_doc("Sales Order", sales_order_ref)
        
        # Extraire la date de l'événement
        new_delivery_date = frappe.utils.get_datetime(event_doc.starts_on).date()
        
        # Sauvegarder l'ancienne date pour le rapport
        old_delivery_date = sales_order_doc.delivery_date
        
        # Mettre à jour la commande client
        sales_order_doc.delivery_date = new_delivery_date
        
        # Désactiver les hooks pour éviter une boucle
        sales_order_doc.flags.ignore_hooks = True
        sales_order_doc.save()
        
        # NOUVEAU: Mettre à jour aussi tous les articles
        items_updated = update_sales_order_items_delivery_date(sales_order_ref, new_delivery_date)
        
        return {
            "status": "success",
            "message": f"Date de livraison mise à jour pour {sales_order_ref} ({items_updated} articles)",
            "old_date": str(old_delivery_date),
            "new_date": str(new_delivery_date),
            "items_updated": items_updated
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la sync manuelle Event->Sales Order: {str(e)}", 
                       f"Manual sync from event {event_name}")
        return {"status": "error", "message": str(e)}

def sync_all_items_to_main_delivery_date(sales_order_doc):
    """
    Synchronise tous les articles avec la date de livraison principale
    """
    try:
        if not sales_order_doc.delivery_date:
            return 0
            
        items_updated = 0
        main_delivery_date = sales_order_doc.delivery_date
        
        # Mettre à jour chaque article qui a une date différente
        for item in sales_order_doc.items:
            current_item_date = frappe.utils.get_datetime(item.delivery_date).date() if item.delivery_date else None
            main_date = frappe.utils.get_datetime(main_delivery_date).date()
            
            if current_item_date != main_date:
                frappe.db.set_value("Sales Order Item", item.name, "delivery_date", main_delivery_date, update_modified=False)
                items_updated += 1
        
        if items_updated > 0:
            frappe.db.commit()
        
        return items_updated
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la sync des articles vers date principale: {str(e)}", 
                       f"Items sync for {sales_order_doc.name}")
        return 0

def update_sales_order_items_delivery_date(sales_order_name, new_delivery_date):
    """
    Met à jour la date de livraison de tous les articles d'une commande client
    (Fonction utilitaire pour l'API)
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
        frappe.log_error(f"Erreur lors de la mise à jour des articles via API: {str(e)}", 
                       f"API Items update for {sales_order_name}")
        return 0

@frappe.whitelist()
def sync_sales_order_to_event(sales_order_name):
    """
    Synchronisation manuelle: Sales Order -> Event (avec articles)
    """
    try:
        if not sales_order_name:
            return {"status": "error", "message": "ID de commande client manquant"}
        
        # Récupérer la commande client
        sales_order_doc = frappe.get_doc("Sales Order", sales_order_name)
        
        # Vérifier s'il y a un événement lié
        if not sales_order_doc.custom_calendar_event:
            return {"status": "error", "message": "Aucun événement lié à cette commande"}
        
        # Récupérer l'événement
        event_doc = frappe.get_doc("Event", sales_order_doc.custom_calendar_event)
        
        # Calculer la nouvelle date/heure pour l'événement
        if not sales_order_doc.delivery_date:
            return {"status": "error", "message": "Date de livraison non définie"}
        
        # Sauvegarder l'ancienne date pour le rapport
        old_start = event_doc.starts_on
        
        new_start_time = frappe.utils.get_datetime(sales_order_doc.delivery_date)
        
        # Ajuster l'heure selon l'horaire
        if hasattr(sales_order_doc, 'custom_horaire') and sales_order_doc.custom_horaire:
            if sales_order_doc.custom_horaire == "Matin":
                new_start_time = new_start_time.replace(hour=8, minute=0)
            elif sales_order_doc.custom_horaire == "Après-midi":
                new_start_time = new_start_time.replace(hour=14, minute=0)
            elif sales_order_doc.custom_horaire == "Journée complète":
                # Pour les événements toute la journée, garder le début de journée
                new_start_time = new_start_time.replace(hour=0, minute=0)
                event_doc.all_day = True
        
        # Mettre à jour l'événement
        event_doc.starts_on = new_start_time
        event_doc.ends_on = frappe.utils.add_to_date(new_start_time, hours=1)
        
        # Désactiver les hooks pour éviter une boucle
        event_doc.flags.ignore_hooks = True
        event_doc.save()
        
        # NOUVEAU: Synchroniser aussi les dates des articles
        items_updated = sync_all_items_to_main_delivery_date(sales_order_doc)
        
        return {
            "status": "success",
            "message": f"Événement {event_doc.name} mis à jour ({items_updated} articles synchronisés)",
            "old_date": str(old_start),
            "new_date": str(new_start_time),
            "items_updated": items_updated
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la sync manuelle Sales Order->Event: {str(e)}", 
                       f"Manual sync from sales order {sales_order_name}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def get_items_sync_report(sales_order_name):
    """
    Génère un rapport détaillé de synchronisation des articles
    """
    try:
        if not sales_order_name:
            return {"status": "error", "message": "ID de commande client manquant"}
        
        # Récupérer la commande client
        sales_order = frappe.get_doc("Sales Order", sales_order_name)
        
        report = {
            "status": "success",
            "sales_order": sales_order_name,
            "main_delivery_date": str(sales_order.delivery_date) if sales_order.delivery_date else None,
            "total_items": len(sales_order.items),
            "items_details": [],
            "synchronized_items": 0,
            "out_of_sync_items": 0
        }
        
        main_date = frappe.utils.get_datetime(sales_order.delivery_date).date() if sales_order.delivery_date else None
        
        for item in sales_order.items:
            item_date = frappe.utils.get_datetime(item.delivery_date).date() if item.delivery_date else None
            is_synchronized = item_date == main_date if (item_date and main_date) else False
            
            item_info = {
                "item_code": item.item_code,
                "item_name": item.item_name,
                "delivery_date": str(item.delivery_date) if item.delivery_date else None,
                "is_synchronized": is_synchronized,
                "date_difference": None
            }
            
            if item_date and main_date:
                diff = (item_date - main_date).days
                if diff != 0:
                    item_info["date_difference"] = f"{diff:+d} jour(s)"
                    report["out_of_sync_items"] += 1
                else:
                    report["synchronized_items"] += 1
            
            report["items_details"].append(item_info)
        
        # Statut global
        if report["out_of_sync_items"] == 0:
            report["sync_status"] = "all_synchronized"
        elif report["synchronized_items"] == 0:
            report["sync_status"] = "all_out_of_sync"
        else:
            report["sync_status"] = "partially_synchronized"
        
        return report
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la génération du rapport d'articles: {str(e)}", 
                       f"Items sync report for {sales_order_name}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def force_sync_all_items(sales_order_name):
    """
    Force la synchronisation de tous les articles avec la date principale
    """
    try:
        if not sales_order_name:
            return {"status": "error", "message": "ID de commande client manquant"}
        
        # Récupérer la commande client
        sales_order = frappe.get_doc("Sales Order", sales_order_name)
        
        if not sales_order.delivery_date:
            return {"status": "error", "message": "Date de livraison principale non définie"}
        
        main_delivery_date = sales_order.delivery_date
        items_updated = 0
        updates_details = []
        
        for item in sales_order.items:
            current_date = item.delivery_date
            
            if frappe.utils.get_datetime(current_date).date() != frappe.utils.get_datetime(main_delivery_date).date():
                # Mettre à jour l'article
                frappe.db.set_value("Sales Order Item", item.name, "delivery_date", main_delivery_date, update_modified=False)
                
                updates_details.append({
                    "item_code": item.item_code,
                    "old_date": str(current_date),
                    "new_date": str(main_delivery_date)
                })
                
                items_updated += 1
        
        if items_updated > 0:
            frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"{items_updated} article(s) synchronisé(s)",
            "items_updated": items_updated,
            "total_items": len(sales_order.items),
            "updates_details": updates_details
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la synchronisation forcée des articles: {str(e)}", 
                       f"Force sync items for {sales_order_name}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def check_sync_status(doctype, docname):
    """
    Vérifie le statut de synchronisation entre une commande et son événement
    """
    try:
        if doctype == "Sales Order":
            sales_order = frappe.get_doc("Sales Order", docname)
            
            if not sales_order.custom_calendar_event:
                return {
                    "status": "no_event",
                    "message": "Aucun événement lié à cette commande"
                }
            
            # Vérifier si l'événement existe
            if not frappe.db.exists("Event", sales_order.custom_calendar_event):
                return {
                    "status": "event_missing",
                    "message": "L'événement lié n'existe plus"
                }
            
            event = frappe.get_doc("Event", sales_order.custom_calendar_event)
            
            # Comparer les dates
            so_date = frappe.utils.get_datetime(sales_order.delivery_date).date()
            event_date = frappe.utils.get_datetime(event.starts_on).date()
            
            if so_date == event_date:
                return {
                    "status": "synchronized",
                    "message": "Les dates sont synchronisées",
                    "sales_order_date": str(so_date),
                    "event_date": str(event_date)
                }
            else:
                return {
                    "status": "out_of_sync",
                    "message": "Les dates ne sont pas synchronisées",
                    "sales_order_date": str(so_date),
                    "event_date": str(event_date)
                }
        
        elif doctype == "Event":
            # Logique similaire mais dans l'autre sens
            event = frappe.get_doc("Event", docname)
            
            # Trouver la commande liée
            sales_order_ref = frappe.db.get_value("Sales Order", {"custom_calendar_event": docname}, "name")
            
            if not sales_order_ref:
                return {
                    "status": "no_sales_order",
                    "message": "Aucune commande liée à cet événement"
                }
            
            sales_order = frappe.get_doc("Sales Order", sales_order_ref)
            
            # Comparer les dates
            so_date = frappe.utils.get_datetime(sales_order.delivery_date).date()
            event_date = frappe.utils.get_datetime(event.starts_on).date()
            
            if so_date == event_date:
                return {
                    "status": "synchronized",
                    "message": "Les dates sont synchronisées",
                    "sales_order_date": str(so_date),
                    "event_date": str(event_date)
                }
            else:
                return {
                    "status": "out_of_sync",
                    "message": "Les dates ne sont pas synchronisées",
                    "sales_order_date": str(so_date),
                    "event_date": str(event_date)
                }
        
        else:
            return {"status": "error", "message": "Type de document non supporté"}
            
    except Exception as e:
        frappe.log_error(f"Erreur lors de la vérification du statut de sync: {str(e)}", 
                       f"Sync status check {doctype} {docname}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def bulk_sync_events(direction="event_to_sales_order", filters=None):
    """
    Synchronisation en masse
    direction: "event_to_sales_order" ou "sales_order_to_event"
    """
    try:
        results = []
        
        if direction == "event_to_sales_order":
            # Trouver tous les événements avec des commandes liées
            events = frappe.get_all("Event", 
                filters={"name": ["in", 
                    frappe.get_all("Sales Order", 
                        filters={"custom_calendar_event": ["!=", ""]}, 
                        pluck="custom_calendar_event")
                ]},
                fields=["name", "subject", "starts_on"]
            )
            
            for event in events:
                result = sync_event_to_sales_order(event.name)
                results.append({
                    "event": event.name,
                    "result": result
                })
                
        else:  # sales_order_to_event
            # Trouver toutes les commandes avec des événements liés
            sales_orders = frappe.get_all("Sales Order",
                filters={"custom_calendar_event": ["!=", ""]},
                fields=["name", "delivery_date", "custom_calendar_event"]
            )
            
            for so in sales_orders:
                result = sync_sales_order_to_event(so.name)
                results.append({
                    "sales_order": so.name,
                    "result": result
                })
        
        success_count = len([r for r in results if r.get("result", {}).get("status") == "success"])
        
        return {
            "status": "completed",
            "message": f"Synchronisation terminée: {success_count}/{len(results)} réussies",
            "details": results
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la synchronisation en masse: {str(e)}", 
                       f"Bulk sync {direction}")
        return {"status": "error", "message": str(e)}

# ========================================
# NOUVELLES FONCTIONS POUR LA VUE EMPLOYÉS
# ========================================

@frappe.whitelist()
def get_employees_with_team_filter(team_filter=None):
    """Récupère la liste des employés avec filtre par équipe"""
    try:
        # Définir les champs d'équipe disponibles
        team_fields = {
            "Livraisons": "custom_livraisons",
            "Installations": "custom_installations", 
            "Entretiens/Ramonages": "custom_entretiensramonages",
            "Dépannages Poêles": "custom_depannages_poeles",
            "Dépannages Chauffage": "custom_depannages_chauffage",
            "Électricité": "custom_electricite",
            "Photovoltaïque": "custom_photovoltaique",
            "Bureau": "custom_bureau",
            "Commercial": "custom_commercial",
            "Rénovation": "custom_renovation"
        }
        
        # Construire les filtres
        filters = [["status", "=", "Active"]]
        
        if team_filter and team_filter in team_fields:
            field_name = team_fields[team_filter]
            filters.append([field_name, "=", 1])
        
        # Récupérer les employés
        employees = frappe.get_all(
            "Employee",
            filters=filters,
            fields=["name", "employee_name", "designation"] + list(team_fields.values()),
            order_by="employee_name"
        )
        
        # Enrichir avec les informations d'équipe
        for emp in employees:
            emp["teams"] = []
            for team_name, field_name in team_fields.items():
                if emp.get(field_name):
                    emp["teams"].append(team_name)
        
        return {
            "status": "success",
            "employees": employees,
            "total": len(employees)
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la récupération des employés: {str(e)}", 
                       "Employee team filter")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def get_day_events_by_employees(date, team_filter=None, territory=None, event_type=None):
    """Récupère les événements d'une journée organisés par employé avec commentaires améliorés"""
    try:
        # Récupérer les employés filtrés
        employees_result = get_employees_with_team_filter(team_filter)
        
        if employees_result["status"] != "success":
            return employees_result
        
        employees = employees_result["employees"]
        
        # Récupérer tous les événements du jour
        events = get_day_events(date, territory, None, event_type)
        
        # AMÉLIORATION: Enrichir chaque événement avec les commentaires
        for event in events:
            event = enrich_event_with_comments(event)
        
        # Organiser les événements par employé
        events_by_employee = {}
        
        # Initialiser la structure pour chaque employé
        for emp in employees:
            events_by_employee[emp["name"]] = {
                "employee_info": emp,
                "all_day": [],
                "morning": [],
                "afternoon": []
            }
        
        # Répartir les événements par employé
        for event in events:
            employee_id = None
            
            # Trouver l'employé assigné à cet événement
            if event.get("event_participants"):
                for participant in event["event_participants"]:
                    if participant["reference_doctype"] == "Employee":
                        employee_id = participant["reference_docname"]
                        break
            
            # Si pas trouvé dans les participants, chercher dans sales_order_info
            if not employee_id and event.get("sales_order_info") and event["sales_order_info"].get("employee_name"):
                # Trouver l'employé par nom
                for emp in employees:
                    if emp["employee_name"] == event["sales_order_info"]["employee_name"]:
                        employee_id = emp["name"]
                        break
            
            # Ajouter l'événement à l'employé correspondant
            if employee_id and employee_id in events_by_employee:
                # Déterminer la période
                if event.get("all_day"):
                    events_by_employee[employee_id]["all_day"].append(event)
                else:
                    event_time = frappe.utils.get_datetime(event["starts_on"])
                    if event_time.hour < 12:
                        events_by_employee[employee_id]["morning"].append(event)
                    else:
                        events_by_employee[employee_id]["afternoon"].append(event)
        
        # Trier les événements par heure dans chaque catégorie
        for emp_id in events_by_employee:
            events_by_employee[emp_id]["morning"].sort(
                key=lambda x: frappe.utils.get_datetime(x["starts_on"])
            )
            events_by_employee[emp_id]["afternoon"].sort(
                key=lambda x: frappe.utils.get_datetime(x["starts_on"])
            )
        
        return {
            "status": "success",
            "date": date,
            "team_filter": team_filter,
            "events_by_employee": events_by_employee,
            "employees": employees
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la récupération des événements par employé: {str(e)}", 
                       f"Employee events for {date}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def get_team_options():
    """Retourne la liste des équipes disponibles"""
    return [
        "Livraisons",
        "Installations", 
        "Entretiens/Ramonages",
        "Dépannages Poêles",
        "Dépannages Chauffage",
        "Électricité",
        "Photovoltaïque",
        "Bureau",
        "Commercial",
        "Rénovation"
    ]