#!/usr/bin/env python3
"""
Script pour remplir les champs custom_postal_code et custom_city 
à partir des adresses existantes
"""

import frappe
import re

def fill_custom_address_fields():
    """
    Remplit les champs personnalisés d'adresse (code postal, commune, rue)
    à partir des adresses principales existantes
    """
    
    # Récupérer tous les clients avec leur adresse principale
    customers = frappe.get_all("Customer", 
        fields=["name", "customer_name", "customer_primary_address", "primary_address"])
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"Traitement de {len(customers)} clients...")
    print("-" * 60)
    
    for customer in customers:
        try:
            customer_doc = frappe.get_doc("Customer", customer.name)
            
            # Vérifier si les champs personnalisés sont déjà remplis
            if (customer_doc.get("custom_postal_code") and 
                customer_doc.get("custom_city")):
                print(f"✓ {customer.name} - Champs déjà remplis")
                skipped_count += 1
                continue
            
            # Si le client a une adresse principale
            if customer.customer_primary_address:
                # Récupérer le document adresse
                try:
                    address_doc = frappe.get_doc("Address", customer.customer_primary_address)
                    
                    # Remplir les champs personnalisés
                    updated = False
                    
                    # Code postal
                    if address_doc.pincode and not customer_doc.get("custom_postal_code"):
                        customer_doc.custom_postal_code = str(address_doc.pincode)
                        updated = True
                    
                    # Ville/Commune
                    if address_doc.city and not customer_doc.get("custom_city"):
                        customer_doc.custom_city = address_doc.city
                        updated = True
                    
                    # Rue/Adresse
                    if address_doc.address_line1 and not customer_doc.get("custom_street_address"):
                        customer_doc.custom_street_address = address_doc.address_line1
                        updated = True
                    
                    if updated:
                        # Mettre à jour le champ d'affichage complet
                        address_parts = []
                        if customer_doc.get("custom_street_address"):
                            address_parts.append(customer_doc.custom_street_address)
                        if customer_doc.get("custom_postal_code") or customer_doc.get("custom_city"):
                            city_line = []
                            if customer_doc.get("custom_postal_code"):
                                city_line.append(customer_doc.custom_postal_code)
                            if customer_doc.get("custom_city"):
                                city_line.append(customer_doc.custom_city)
                            address_parts.append(" ".join(city_line))
                        
                        if frappe.db.has_column("Customer", "custom_full_address_display"):
                            customer_doc.custom_full_address_display = "\n".join(address_parts)
                        
                        customer_doc.save(ignore_permissions=True)
                        print(f"✅ {customer.name} - CP: {customer_doc.get('custom_postal_code')}, Ville: {customer_doc.get('custom_city')}")
                        updated_count += 1
                    else:
                        print(f"⚠️  {customer.name} - Pas de données à mettre à jour")
                        skipped_count += 1
                        
                except Exception as e:
                    print(f"⚠️  {customer.name} - Erreur lecture adresse: {str(e)}")
                    error_count += 1
                    
            # Sinon, essayer de parser l'adresse affichée (primary_address)
            elif customer.primary_address:
                parsed = parse_address_text(customer.primary_address)
                
                updated = False
                if parsed["postal_code"] and not customer_doc.get("custom_postal_code"):
                    customer_doc.custom_postal_code = parsed["postal_code"]
                    updated = True
                    
                if parsed["city"] and not customer_doc.get("custom_city"):
                    customer_doc.custom_city = parsed["city"]
                    updated = True
                    
                if parsed["street"] and not customer_doc.get("custom_street_address"):
                    customer_doc.custom_street_address = parsed["street"]
                    updated = True
                
                if updated:
                    # Mettre à jour le champ d'affichage complet
                    address_parts = []
                    if customer_doc.get("custom_street_address"):
                        address_parts.append(customer_doc.custom_street_address)
                    if customer_doc.get("custom_postal_code") or customer_doc.get("custom_city"):
                        city_line = []
                        if customer_doc.get("custom_postal_code"):
                            city_line.append(customer_doc.custom_postal_code)
                        if customer_doc.get("custom_city"):
                            city_line.append(customer_doc.custom_city)
                        address_parts.append(" ".join(city_line))
                    
                    if frappe.db.has_column("Customer", "custom_full_address_display"):
                        customer_doc.custom_full_address_display = "\n".join(address_parts)
                    
                    customer_doc.save(ignore_permissions=True)
                    print(f"📝 {customer.name} - Parsé - CP: {customer_doc.get('custom_postal_code')}, Ville: {customer_doc.get('custom_city')}")
                    updated_count += 1
                else:
                    print(f"⚠️  {customer.name} - Impossible de parser l'adresse")
                    skipped_count += 1
            else:
                print(f"⚠️  {customer.name} - Aucune adresse trouvée")
                skipped_count += 1
                
        except Exception as e:
            print(f"❌ {customer.name} - Erreur: {str(e)}")
            error_count += 1
            frappe.log_error(f"Erreur pour le client {customer.name}: {str(e)}", "Fill Custom Address Fields")
    
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

def parse_address_text(address_string):
    """
    Parse une adresse texte pour extraire rue, code postal et ville
    """
    if not address_string:
        return {"street": "", "postal_code": "", "city": ""}
    
    # Nettoyer l'adresse
    lines = address_string.strip().split('\n')
    
    result = {"street": "", "postal_code": "", "city": ""}
    
    # Pattern pour code postal français (5 chiffres)
    postal_pattern = r'\b(\d{5})\b'
    
    # Parcourir les lignes
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # Chercher le code postal
        match = re.search(postal_pattern, line)
        if match:
            result["postal_code"] = match.group(1)
            # La ville est généralement après le code postal
            city_part = line[match.end():].strip()
            if city_part:
                result["city"] = city_part
            # La rue est généralement avant (ou sur la ligne précédente)
            street_part = line[:match.start()].strip()
            if street_part:
                result["street"] = street_part
            elif i > 0 and not result["street"]:
                # Prendre la ligne précédente comme rue
                result["street"] = lines[i-1].strip()
        elif not result["street"] and i == 0:
            # Première ligne sans code postal = probablement la rue
            result["street"] = line
    
    return result

# Exécuter directement si appelé depuis bench execute
if __name__ == "__main__" or frappe.local.site:
    fill_custom_address_fields()