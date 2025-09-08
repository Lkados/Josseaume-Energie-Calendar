#!/usr/bin/env python3
"""
Script d'installation des champs d'adresse séparés pour les clients

Ce script ajoute les champs personnalisés suivants sur les fiches clients:
- Adresse (Rue et numéro)
- Code Postal
- Commune

Usage:
    bench execute josseaume_energies.address_fields_setup.setup_address_fields
"""

import frappe

def main():
    """
    Fonction principale pour configurer les champs d'adresse
    """
    print("=" * 60)
    print("Configuration des champs d'adresse séparés")
    print("=" * 60)
    
    # Importer et exécuter la configuration
    from josseaume_energies.address_fields_setup import setup_address_fields
    
    result = setup_address_fields()
    print(f"\n{result}")
    
    print("\n" + "=" * 60)
    print("Configuration terminée!")
    print("=" * 60)
    
    print("\nPour migrer les adresses existantes:")
    print("bench execute josseaume_energies.address_fields_setup.bulk_parse_addresses")

if __name__ == "__main__":
    main()