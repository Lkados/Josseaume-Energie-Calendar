# Configuration des champs d'adresse personnalisés pour les clients

import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup_address_fields():
    """
    Crée les champs personnalisés pour séparer l'adresse en composants
    """
    
    # Définir les champs personnalisés pour Customer
    customer_fields = {
        "Customer": [
            {
                "fieldname": "custom_address_section",
                "label": "Adresse détaillée",
                "fieldtype": "Section Break",
                "insert_after": "customer_primary_address",
                "collapsible": 0
            },
            {
                "fieldname": "custom_street_address",
                "label": "Adresse (Rue et numéro)",
                "fieldtype": "Data",
                "insert_after": "custom_address_section",
                "translatable": 0,
                "description": "Ex: 210 Impasse des Tuileries"
            },
            {
                "fieldname": "custom_postal_code",
                "label": "Code Postal",
                "fieldtype": "Data",
                "insert_after": "custom_street_address",
                "length": 5,
                "description": "Ex: 60650"
            },
            {
                "fieldname": "custom_city",
                "label": "Commune",
                "fieldtype": "Data",
                "insert_after": "custom_postal_code",
                "description": "Ex: ONS EN BRAY"
            },
            {
                "fieldname": "custom_column_break_address",
                "fieldtype": "Column Break",
                "insert_after": "custom_city"
            },
            {
                "fieldname": "custom_full_address_display",
                "label": "Adresse complète",
                "fieldtype": "Small Text",
                "insert_after": "custom_column_break_address",
                "read_only": 1,
                "description": "Adresse complète générée automatiquement"
            },
            {
                "fieldname": "custom_sync_to_address",
                "label": "Synchroniser avec l'adresse principale",
                "fieldtype": "Button",
                "insert_after": "custom_full_address_display",
                "description": "Cliquez pour mettre à jour l'adresse principale"
            }
        ]
    }
    
    # Définir les champs personnalisés pour Address (le DocType d'adresse ERPNext)
    address_fields = {
        "Address": [
            {
                "fieldname": "custom_separated_section",
                "label": "Composants d'adresse",
                "fieldtype": "Section Break",
                "insert_after": "address_line2",
                "collapsible": 1
            },
            {
                "fieldname": "custom_street",
                "label": "Rue",
                "fieldtype": "Data",
                "insert_after": "custom_separated_section"
            },
            {
                "fieldname": "custom_postal_code",
                "label": "Code Postal",
                "fieldtype": "Data",
                "insert_after": "custom_street",
                "length": 5
            },
            {
                "fieldname": "custom_city",
                "label": "Commune",
                "fieldtype": "Data",
                "insert_after": "custom_postal_code"
            }
        ]
    }
    
    # Créer les champs personnalisés
    try:
        create_custom_fields(customer_fields)
        print("✓ Champs personnalisés créés pour Customer")
        
        create_custom_fields(address_fields)
        print("✓ Champs personnalisés créés pour Address")
        
        frappe.db.commit()
        return "Champs d'adresse personnalisés créés avec succès"
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la création des champs: {str(e)}", "Address Fields Setup")
        return f"Erreur: {str(e)}"

def parse_address(address_string):
    """
    Parse une adresse complète en ses composants
    Essaie d'extraire intelligemment rue, code postal et ville
    """
    import re
    
    if not address_string:
        return {
            "street": "",
            "postal_code": "",
            "city": ""
        }
    
    # Nettoyer l'adresse des balises HTML
    address = address_string.strip()
    # Supprimer les balises HTML
    address = re.sub(r'<br\s*/?>', '\n', address, flags=re.IGNORECASE)  # Remplacer <br> par newline
    address = re.sub(r'<[^>]+>', '', address)  # Supprimer toutes les autres balises
    address = address.replace('&nbsp;', ' ')  # Remplacer les espaces insécables
    address = address.replace('&amp;', '&')
    address = address.replace('&lt;', '<')
    address = address.replace('&gt;', '>')
    address = address.replace('&quot;', '"')
    address = address.replace('&#39;', "'")
    address = address.strip()
    lines = address.split('\n')
    
    result = {
        "street": "",
        "postal_code": "",
        "city": ""
    }
    
    # Pattern pour code postal français (5 chiffres)
    postal_pattern = r'\b(\d{5})\b'
    
    # Chercher le code postal et la ville (généralement sur la même ligne)
    for line in lines:
        match = re.search(postal_pattern, line)
        if match:
            result["postal_code"] = match.group(1)
            # La ville est généralement après le code postal
            city_part = line[match.end():].strip()
            if city_part:
                result["city"] = city_part
            # Tout ce qui précède est probablement la rue
            street_part = line[:match.start()].strip()
            if street_part and not result["street"]:
                result["street"] = street_part
        elif not result["street"] and line.strip():
            # Si pas de code postal trouvé et pas encore de rue, c'est probablement la rue
            result["street"] = line.strip()
    
    # Si on a plusieurs lignes sans code postal, les joindre pour la rue
    if not result["postal_code"] and len(lines) > 1:
        result["street"] = lines[0].strip()
        if len(lines) > 1:
            # Essayer de parser la dernière ligne pour code postal et ville
            last_line = lines[-1].strip()
            match = re.search(postal_pattern, last_line)
            if match:
                result["postal_code"] = match.group(1)
                result["city"] = last_line[match.end():].strip()
            else:
                # Peut-être que le code postal et la ville sont séparés
                parts = last_line.split()
                if parts and parts[0].isdigit() and len(parts[0]) == 5:
                    result["postal_code"] = parts[0]
                    result["city"] = ' '.join(parts[1:])
                else:
                    result["city"] = last_line
    
    return result

@frappe.whitelist()
def sync_customer_address_fields(customer_name):
    """
    Synchronise les champs d'adresse séparés avec l'adresse principale
    """
    try:
        customer = frappe.get_doc("Customer", customer_name)
        
        # Récupérer les valeurs des champs personnalisés
        street = customer.get("custom_street_address") or ""
        postal_code = customer.get("custom_postal_code") or ""
        city = customer.get("custom_city") or ""
        
        # Construire l'adresse complète
        address_parts = []
        if street:
            address_parts.append(street)
        if postal_code or city:
            city_line = []
            if postal_code:
                city_line.append(postal_code)
            if city:
                city_line.append(city)
            address_parts.append(" ".join(city_line))
        
        full_address = "\n".join(address_parts)
        
        # Mettre à jour le champ d'affichage
        customer.custom_full_address_display = full_address
        
        # Si le client a une adresse principale, la mettre à jour
        if customer.customer_primary_address:
            # Récupérer l'adresse liée
            address_name = frappe.db.get_value("Dynamic Link", 
                {
                    "link_doctype": "Customer",
                    "link_name": customer_name,
                    "parenttype": "Address"
                }, "parent")
            
            if address_name:
                address_doc = frappe.get_doc("Address", address_name)
                address_doc.address_line1 = street
                address_doc.city = city
                address_doc.pincode = postal_code
                # Mettre à jour les champs personnalisés de l'adresse aussi
                address_doc.custom_street = street
                address_doc.custom_postal_code = postal_code
                address_doc.custom_city = city
                address_doc.save()
        else:
            # Créer une nouvelle adresse si elle n'existe pas
            if street or city:
                address_doc = frappe.new_doc("Address")
                address_doc.address_title = customer.customer_name
                address_doc.address_type = "Billing"
                address_doc.address_line1 = street
                address_doc.city = city
                address_doc.pincode = postal_code
                address_doc.country = "France"
                address_doc.custom_street = street
                address_doc.custom_postal_code = postal_code
                address_doc.custom_city = city
                
                # Lier au client
                address_doc.append("links", {
                    "link_doctype": "Customer",
                    "link_name": customer_name
                })
                
                address_doc.insert()
                
                # Mettre à jour la référence dans le client
                customer.customer_primary_address = address_doc.name
        
        customer.save()
        
        return {
            "status": "success",
            "message": "Adresse synchronisée avec succès",
            "full_address": full_address
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur sync adresse: {str(e)}", "Address Sync Error")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def parse_existing_address(customer_name):
    """
    Parse l'adresse existante d'un client et remplit les champs séparés
    """
    try:
        customer = frappe.get_doc("Customer", customer_name)
        
        # Récupérer l'adresse principale si elle existe
        if customer.primary_address:
            parsed = parse_address(customer.primary_address)
            
            # Mettre à jour les champs personnalisés
            customer.custom_street_address = parsed["street"]
            customer.custom_postal_code = parsed["postal_code"]
            customer.custom_city = parsed["city"]
            customer.save()
            
            return {
                "status": "success",
                "parsed": parsed,
                "message": "Adresse analysée et champs mis à jour"
            }
        
        return {
            "status": "info",
            "message": "Pas d'adresse principale à analyser"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def bulk_parse_addresses():
    """
    Parse toutes les adresses existantes pour tous les clients
    """
    customers = frappe.get_all("Customer", 
        filters={"primary_address": ["!=", ""]},
        fields=["name", "primary_address"])
    
    results = []
    for customer in customers:
        result = parse_existing_address(customer.name)
        results.append({
            "customer": customer.name,
            "result": result
        })
    
    return results