#!/usr/bin/env python3
"""
Script pour installer/mettre à jour le menu du calendrier
Exécuter avec : bench execute josseaume_energies.install_menu.install_calendar_menu
"""

import frappe

def install_calendar_menu():
    """
    Installe l'élément de menu pour le calendrier
    """
    try:
        # Vérifier si l'élément de menu existe déjà
        menu_exists = frappe.db.exists("Desktop Icon", {
            "module_name": "Josseaume Energies",
            "label": "Calendrier Interventions"
        })
        
        if menu_exists:
            print("Menu calendrier déjà existant")
            return
        
        # Créer l'élément de menu
        desktop_icon = frappe.get_doc({
            "doctype": "Desktop Icon",
            "module_name": "Josseaume Energies",
            "label": "Calendrier Interventions",
            "link": "two_column_calendar",
            "type": "page",
            "icon": "calendar",
            "color": "#1976D2",
            "standard": 1
        })
        
        desktop_icon.insert(ignore_permissions=True)
        frappe.db.commit()
        
        print("Menu calendrier installé avec succès !")
        
        return {
            "status": "success",
            "message": "Menu calendrier installé"
        }
        
    except Exception as e:
        print(f"Erreur lors de l'installation du menu : {str(e)}")
        return {
            "status": "error", 
            "message": str(e)
        }

def clear_cache_and_reload():
    """
    Vide le cache et recharge les modules
    """
    try:
        frappe.clear_cache()
        frappe.db.commit()
        print("Cache vidé et modules rechargés")
        
    except Exception as e:
        print(f"Erreur lors du rechargement : {str(e)}")

if __name__ == "__main__":
    install_calendar_menu()
    clear_cache_and_reload()