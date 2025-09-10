#!/usr/bin/env python3
"""
Script pour vérifier et créer les champs personnalisés d'adresse
"""

import frappe

def check_and_create_custom_fields():
    """
    Vérifie si les champs personnalisés d'adresse existent et les crée si nécessaire
    """
    
    # Liste des champs à vérifier
    required_fields = [
        "custom_street_address",
        "custom_postal_code", 
        "custom_city",
        "custom_full_address_display"
    ]
    
    print("Vérification des champs personnalisés Customer...")
    print("-" * 50)
    
    # Vérifier les champs existants
    existing_fields = []
    missing_fields = []
    
    for field in required_fields:
        if frappe.db.has_column("Customer", field):
            existing_fields.append(field)
            print(f"✅ {field} - EXISTE")
        else:
            missing_fields.append(field)
            print(f"❌ {field} - MANQUANT")
    
    print(f"\nRésumé:")
    print(f"Champs existants: {len(existing_fields)}")
    print(f"Champs manquants: {len(missing_fields)}")
    
    # Si des champs manquent, les créer
    if missing_fields:
        print("\nCréation des champs manquants...")
        
        try:
            from josseaume_energies.address_fields_setup import setup_address_fields
            result = setup_address_fields()
            print(f"✅ Résultat: {result}")
            
            # Vérifier à nouveau
            print("\nVérification après création:")
            for field in missing_fields:
                if frappe.db.has_column("Customer", field):
                    print(f"✅ {field} - CRÉÉ AVEC SUCCÈS")
                else:
                    print(f"❌ {field} - ÉCHEC DE CRÉATION")
                    
        except Exception as e:
            print(f"❌ Erreur lors de la création: {str(e)}")
            return False
    
    return len(missing_fields) == 0

def check_sample_customer_data():
    """
    Vérifie les données d'un échantillon de clients
    """
    print("\n" + "="*60)
    print("Vérification des données clients...")
    print("="*60)
    
    # Prendre 5 clients au hasard
    customers = frappe.get_all("Customer", 
        fields=["name", "customer_name", "customer_primary_address"],
        limit=5)
    
    for customer in customers:
        print(f"\n📋 Client: {customer.name} ({customer.customer_name})")
        
        try:
            customer_doc = frappe.get_doc("Customer", customer.name)
            
            # Vérifier les champs personnalisés
            print(f"  custom_street_address: '{customer_doc.get('custom_street_address') or ''}'")
            print(f"  custom_postal_code: '{customer_doc.get('custom_postal_code') or ''}'")
            print(f"  custom_city: '{customer_doc.get('custom_city') or ''}'")
            print(f"  custom_full_address_display: '{customer_doc.get('custom_full_address_display') or ''}'")
            
            # Vérifier l'adresse principale
            print(f"  customer_primary_address: '{customer.customer_primary_address or ''}'")
            
            if customer.customer_primary_address:
                try:
                    address_doc = frappe.get_doc("Address", customer.customer_primary_address)
                    print(f"  📍 Adresse liée:")
                    print(f"    address_line1: '{address_doc.address_line1 or ''}'")
                    print(f"    city: '{address_doc.city or ''}'")
                    print(f"    pincode: '{address_doc.pincode or ''}'")
                except Exception as e:
                    print(f"  ❌ Erreur lecture adresse: {str(e)}")
            else:
                print("  ⚠️  Pas d'adresse principale")
                
        except Exception as e:
            print(f"  ❌ Erreur lecture client: {str(e)}")

def fill_missing_custom_fields():
    """
    Remplit les champs personnalisés manquants
    """
    print("\n" + "="*60)
    print("Remplissage des champs personnalisés...")
    print("="*60)
    
    customers = frappe.get_all("Customer", 
        fields=["name", "customer_primary_address"])
    
    updated = 0
    errors = 0
    
    for customer in customers[:10]:  # Tester sur 10 clients d'abord
        try:
            customer_doc = frappe.get_doc("Customer", customer.name)
            
            # Si pas de champs custom mais une adresse principale
            if (customer.customer_primary_address and 
                not customer_doc.get("custom_postal_code")):
                
                address_doc = frappe.get_doc("Address", customer.customer_primary_address)
                
                # Remplir les champs
                updates_made = False
                
                if address_doc.address_line1:
                    customer_doc.custom_street_address = address_doc.address_line1
                    updates_made = True
                    
                if address_doc.pincode:
                    customer_doc.custom_postal_code = str(address_doc.pincode)
                    updates_made = True
                    
                if address_doc.city:
                    customer_doc.custom_city = address_doc.city
                    updates_made = True
                
                if updates_made:
                    # Construire l'affichage complet
                    address_parts = []
                    if customer_doc.custom_street_address:
                        address_parts.append(customer_doc.custom_street_address)
                    if customer_doc.custom_postal_code or customer_doc.custom_city:
                        city_line = []
                        if customer_doc.custom_postal_code:
                            city_line.append(customer_doc.custom_postal_code)
                        if customer_doc.custom_city:
                            city_line.append(customer_doc.custom_city)
                        address_parts.append(" ".join(city_line))
                    
                    customer_doc.custom_full_address_display = "\n".join(address_parts)
                    
                    customer_doc.flags.ignore_permissions = True
                    customer_doc.save()
                    
                    print(f"✅ {customer.name}: {customer_doc.custom_postal_code} {customer_doc.custom_city}")
                    updated += 1
                
        except Exception as e:
            print(f"❌ {customer.name}: {str(e)}")
            errors += 1
    
    frappe.db.commit()
    print(f"\nTest terminé - Mis à jour: {updated}, Erreurs: {errors}")

# Fonction principale
if __name__ == "__main__" or frappe.local.site:
    # 1. Vérifier et créer les champs
    fields_ok = check_and_create_custom_fields()
    
    # 2. Vérifier des données échantillon
    check_sample_customer_data()
    
    # 3. Remplir quelques champs pour tester
    if fields_ok:
        fill_missing_custom_fields()
    else:
        print("⚠️ Impossible de remplir les champs car ils n'existent pas")