#!/usr/bin/env python3
"""
Script pour définir l'adresse principale de tous les clients
"""

import frappe
from frappe import _

def set_all_primary_addresses():
    """
    Définit l'adresse principale pour tous les clients qui ont une adresse
    """
    
    # Récupérer tous les clients
    customers = frappe.get_all("Customer", fields=["name", "customer_name"])
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"Traitement de {len(customers)} clients...")
    print("-" * 60)
    
    for customer in customers:
        try:
            # Récupérer le document client
            customer_doc = frappe.get_doc("Customer", customer.name)
            
            # Vérifier si le client a déjà une adresse principale
            if customer_doc.customer_primary_address:
                print(f"✓ {customer.name} - A déjà une adresse principale: {customer_doc.customer_primary_address}")
                skipped_count += 1
                continue
            
            # Rechercher les adresses liées à ce client
            addresses = frappe.db.sql("""
                SELECT 
                    addr.name,
                    addr.address_line1,
                    addr.city,
                    addr.pincode,
                    addr.is_primary_address,
                    addr.is_shipping_address
                FROM `tabAddress` addr
                INNER JOIN `tabDynamic Link` dl ON dl.parent = addr.name
                WHERE 
                    dl.link_doctype = 'Customer' 
                    AND dl.link_name = %s
                    AND dl.parenttype = 'Address'
                ORDER BY 
                    addr.is_primary_address DESC,
                    addr.is_shipping_address DESC,
                    addr.creation DESC
                LIMIT 1
            """, (customer.name,), as_dict=True)
            
            if addresses:
                address = addresses[0]
                
                # Mettre à jour l'adresse pour la définir comme principale
                address_doc = frappe.get_doc("Address", address.name)
                address_doc.is_primary_address = 1
                address_doc.save(ignore_permissions=True)
                
                # Mettre à jour le client avec l'adresse principale
                customer_doc.customer_primary_address = address.name
                
                # Construire l'adresse affichée
                address_display_parts = []
                if address.address_line1:
                    address_display_parts.append(address.address_line1)
                if address.pincode or address.city:
                    city_line = []
                    if address.pincode:
                        city_line.append(address.pincode)
                    if address.city:
                        city_line.append(address.city)
                    address_display_parts.append(" ".join(city_line))
                
                customer_doc.primary_address = "\n".join(address_display_parts)
                customer_doc.save(ignore_permissions=True)
                
                print(f"✅ {customer.name} - Adresse principale définie: {address.name}")
                updated_count += 1
            else:
                # Si le client a des champs d'adresse personnalisés, créer une adresse
                if (customer_doc.get("custom_street_address") or 
                    customer_doc.get("custom_postal_code") or 
                    customer_doc.get("custom_city")):
                    
                    # Créer une nouvelle adresse
                    new_address = frappe.new_doc("Address")
                    new_address.address_title = customer_doc.customer_name
                    new_address.address_type = "Billing"
                    new_address.address_line1 = customer_doc.get("custom_street_address") or ""
                    new_address.city = customer_doc.get("custom_city") or ""
                    new_address.pincode = customer_doc.get("custom_postal_code") or ""
                    new_address.country = "France"
                    new_address.is_primary_address = 1
                    new_address.is_shipping_address = 1
                    
                    # Ajouter les champs personnalisés si ils existent
                    if frappe.db.has_column("Address", "custom_street"):
                        new_address.custom_street = customer_doc.get("custom_street_address") or ""
                    if frappe.db.has_column("Address", "custom_postal_code"):
                        new_address.custom_postal_code = customer_doc.get("custom_postal_code") or ""
                    if frappe.db.has_column("Address", "custom_city"):
                        new_address.custom_city = customer_doc.get("custom_city") or ""
                    
                    # Lier au client
                    new_address.append("links", {
                        "link_doctype": "Customer",
                        "link_name": customer.name
                    })
                    
                    new_address.insert(ignore_permissions=True)
                    
                    # Mettre à jour le client
                    customer_doc.customer_primary_address = new_address.name
                    
                    # Construire l'adresse affichée
                    address_display_parts = []
                    if new_address.address_line1:
                        address_display_parts.append(new_address.address_line1)
                    if new_address.pincode or new_address.city:
                        city_line = []
                        if new_address.pincode:
                            city_line.append(new_address.pincode)
                        if new_address.city:
                            city_line.append(new_address.city)
                        address_display_parts.append(" ".join(city_line))
                    
                    customer_doc.primary_address = "\n".join(address_display_parts)
                    customer_doc.save(ignore_permissions=True)
                    
                    print(f"🆕 {customer.name} - Nouvelle adresse créée et définie comme principale: {new_address.name}")
                    updated_count += 1
                else:
                    print(f"⚠️  {customer.name} - Aucune adresse trouvée")
                    skipped_count += 1
                    
        except Exception as e:
            print(f"❌ {customer.name} - Erreur: {str(e)}")
            error_count += 1
            frappe.log_error(f"Erreur pour le client {customer.name}: {str(e)}", "Set Primary Address")
    
    # Commit les changements
    frappe.db.commit()
    
    print("-" * 60)
    print(f"Résumé:")
    print(f"  ✅ Mis à jour: {updated_count}")
    print(f"  ⏭️  Ignorés: {skipped_count}")
    print(f"  ❌ Erreurs: {error_count}")
    print(f"  📊 Total traité: {len(customers)}")
    
    return {
        "updated": updated_count,
        "skipped": skipped_count,
        "errors": error_count,
        "total": len(customers)
    }

# Exécuter directement si appelé depuis bench execute
if __name__ == "__main__" or frappe.local.site:
    set_all_primary_addresses()