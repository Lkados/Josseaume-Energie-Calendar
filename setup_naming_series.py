#!/usr/bin/env python3
"""
Script d'installation des séries de nommage pour Josseaume Energies

Ce script configure les séries de nommage pour:
- Devis (Quotation): DEV-YYYY-#####
- Factures (Sales Invoice): FACT-YYYY-#####  
- Écritures de stock (Stock Entry): STOCK-YYYY-#####

Usage:
    bench execute josseaume_energies.naming_series_setup.setup_naming_series
    ou
    python setup_naming_series.py (depuis le répertoire du projet)
"""

import frappe

def main():
    """
    Fonction principale pour configurer les séries de nommage
    """
    # Initialiser Frappe si nécessaire
    try:
        if not frappe.db:
            frappe.init(site='josseaume-energies.com')  # Remplacer par votre site
            frappe.connect()
    except:
        pass
    
    print("=" * 60)
    print("Configuration des séries de nommage Josseaume Energies")
    print("=" * 60)
    
    # Importer et exécuter la configuration
    from josseaume_energies.naming_series_setup import setup_naming_series
    
    result = setup_naming_series()
    print(f"\n{result}")
    
    print("\n" + "=" * 60)
    print("Configuration terminée!")
    print("=" * 60)
    
    # Afficher les séries configurées
    from josseaume_energies.naming_series_setup import get_current_naming_series
    current = get_current_naming_series()
    
    print("\nSéries de nommage actuelles:")
    print("-" * 30)
    for doctype, config in current.items():
        print(f"\n{doctype.upper()}:")
        if isinstance(config, dict) and "error" not in config:
            print(f"  Options: {config.get('options', 'Non défini')}")
            print(f"  Par défaut: {config.get('default', 'Non défini')}")
        else:
            print(f"  {config}")

if __name__ == "__main__":
    main()