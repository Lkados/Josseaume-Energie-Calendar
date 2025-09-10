#!/usr/bin/env python3
"""
Script corrigé pour définir l'adresse principale de tous les clients
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
                    addr.pincode
                FROM `tabAddress` addr
                INNER JOIN `tabDynamic Link` dl ON dl.parent = addr.name
                WHERE 
                    dl.link_doctype = 'Customer' 
                    AND dl.link_name = %s
                    AND dl.parenttype = 'Address'
                ORDER BY 
                    addr.creation DESC
                LIMIT 1
            """, (customer.name,), as_dict=True)
            
            if addresses:
                address = addresses[0]
                
                # Mettre à jour le client avec l'adresse principale
                customer_doc.customer_primary_address = address.name
                
                # Construire l'adresse affichée manuellement
                address_display_parts = []
                if address.address_line1:
                    address_display_parts.append(address.address_line1)
                if address.pincode or address.city:
                    city_line = []
                    if address.pincode:
                        city_line.append(str(address.pincode))
                    if address.city:
                        city_line.append(address.city)
                    if city_line:
                        address_display_parts.append(" ".join(city_line))
                
                if address_display_parts:
                    customer_doc.primary_address = "\n".join(address_display_parts)
                
                customer_doc.save(ignore_permissions=True)
                
                print(f"✅ {customer.name} - Adresse principale définie: {address.name}")
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