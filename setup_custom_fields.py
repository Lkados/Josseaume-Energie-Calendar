#!/usr/bin/env python3
"""
Script pour créer les champs personnalisés d'adresse dans ERPNext
"""

import sys
import os

# Ajouter le chemin vers frappe-bench
sys.path.insert(0, '/Users/mohamedkachtit/Desktop/Bureau - MacBook Pro de Mohamed/Josseaume/Josseaume-Energie-Calendar')

# Importer les modules nécessaires
from josseaume_energies.address_fields_setup import setup_address_fields

if __name__ == "__main__":
    print("Création des champs personnalisés d'adresse...")
    result = setup_address_fields()
    print(result)