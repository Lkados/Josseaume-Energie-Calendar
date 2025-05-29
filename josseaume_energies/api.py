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

        # Créer une description détaillée
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