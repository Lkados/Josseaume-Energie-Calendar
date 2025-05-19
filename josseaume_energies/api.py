# josseaume_energies/api.py

import frappe
from frappe import _

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
            if type_commande == "Installation":
                for item in doc.items:
                    desc = (item.description or "").lower()
                    if "poêle" in desc or "chaudière" in desc or "poele" in desc or "chaudiere" in desc:
                        main_item = item.item_name
                        break
            elif type_commande == "Entretien":
                for item in doc.items:
                    if item.item_code in ["EPG", "ECG", "ECFBT", "ECFC", "ECGAZBT", "ECGAZC", "RAMO"]:
                        main_item = item.item_name
                        break
            elif type_commande == "Livraison Granule":
                for item in doc.items:
                    if item.item_code in ["EO2", "BIOSYL"]:
                        main_item = item.item_name
                        break
            else:
                for item in doc.items:
                    if item.item_code == "Fuel" or item.item_name == "Fuel":
                        main_item = item.item_name
                        break

        # Créer le sujet de l'événement
        order_type = type_commande or "Livraison"
        subject = order_type + ": " + main_item
        if territory:
            subject = subject + " - " + territory

        # Obtenir les détails des participants
        customer_name = frappe.db.get_value("Customer", doc.customer, "customer_name") if doc.customer else ""
        tech_name = frappe.db.get_value("Employee", doc.custom_intervenant, "employee_name") if doc.custom_intervenant else ""

        # Créer une description détaillée
        description = "<p><strong>Client:</strong> " + (customer_name or doc.customer or "") + "</p>"
        description = description + "<p><strong>Référence:</strong> " + doc.name + "</p>"
        description = description + "<p><strong>Type:</strong> " + order_type + "</p>"
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
                customer_address = frappe.db.get_value("Address", doc.customer_address, "address_line1") or ""
                if customer_address:
                    description = description + "<p><strong>Adresse:</strong> " + customer_address + "</p>"

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
            "event_type": "Private",
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
                "reference_name": doc.customer,
                "reference_docname": doc.customer
            })
            participants_added += 1
            
        # Ajouter l'intervenant
        if doc.custom_intervenant and tech_name:
            event.append("event_participants", {
                "reference_doctype": "Employee",
                "reference_name": doc.custom_intervenant,
                "reference_docname": doc.custom_intervenant
            })
            participants_added += 1
            
        # Sauvegarder l'événement avec les participants
        if participants_added > 0:
            event.save(ignore_permissions=True)
            
        # Vérifier si un champ personnalisé existe pour stocker la référence
        # Si non, vous pourriez créer ce champ personnalisé plus tard
        has_calendar_field = False
        try:
            # Vérifier si le champ exist en l'utilisant
            doc.get("custom_calendar_event")
            has_calendar_field = True
        except:
            pass
        
        if has_calendar_field:
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