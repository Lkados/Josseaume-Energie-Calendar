#!/usr/bin/env python3
"""
Script pour effacer tous les filtres sauvegardés des clients
"""

import frappe

def clear_customer_list_settings():
    """
    Efface tous les paramètres de vue sauvegardés pour la liste des clients
    """
    
    print("🧹 Nettoyage des paramètres de liste des clients...")
    
    try:
        # Supprimer tous les DefaultValue pour la liste Customer
        frappe.db.sql("""
            DELETE FROM `tabDefaultValue` 
            WHERE parent = 'Customer' 
            AND defkey IN ('filters', 'sort_by', 'sort_order', 'columns')
        """)
        
        # Supprimer les UserSettings pour Customer
        frappe.db.sql("""
            DELETE FROM `tabUser Settings` 
            WHERE doctype = 'Customer'
        """)
        
        # Supprimer les List View Settings
        frappe.db.sql("""
            DELETE FROM `tabList View Settings`
            WHERE name LIKE 'Customer-%'
        """)
        
        # Supprimer les User Settings spécifiques à la liste
        user_settings = frappe.get_all("User Settings", 
            filters={"doctype": "Customer"})
        
        for setting in user_settings:
            frappe.delete_doc("User Settings", setting.name, ignore_permissions=True)
        
        # Commit les changements
        frappe.db.commit()
        
        print("✅ Paramètres de liste effacés avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage: {str(e)}")
        return False

def disable_filter_saving_for_all_users():
    """
    Configure les paramètres par défaut pour désactiver la sauvegarde des filtres
    """
    
    print("🔧 Configuration pour désactiver la sauvegarde des filtres...")
    
    try:
        # Créer un paramètre système pour désactiver la sauvegarde
        frappe.db.set_value("System Settings", None, "disable_list_view_settings", 1)
        
        # Ou créer un Property Setter pour Customer
        if not frappe.db.exists("Property Setter", {"doc_type": "Customer", "field_name": "list_view_settings", "property": "allow_user_settings"}):
            property_setter = frappe.get_doc({
                "doctype": "Property Setter",
                "doc_type": "Customer",
                "field_name": "list_view_settings",
                "property": "allow_user_settings",
                "value": "0",
                "property_type": "Check"
            })
            property_setter.insert(ignore_permissions=True)
        
        frappe.db.commit()
        print("✅ Configuration appliquée")
        
    except Exception as e:
        print(f"⚠️ Erreur configuration: {str(e)}")

def get_user_filter_stats():
    """
    Affiche les statistiques des filtres sauvegardés
    """
    
    print("📊 Statistiques des filtres sauvegardés:")
    
    # Compter les DefaultValue
    default_count = frappe.db.count("DefaultValue", 
        filters={"parent": "Customer"})
    print(f"  - DefaultValue Customer: {default_count}")
    
    # Compter les User Settings  
    settings_count = frappe.db.count("User Settings",
        filters={"doctype": "Customer"})
    print(f"  - User Settings Customer: {settings_count}")
    
    # Lister les utilisateurs ayant des paramètres sauvegardés
    users_with_settings = frappe.db.sql("""
        SELECT DISTINCT user 
        FROM `tabUser Settings` 
        WHERE doctype = 'Customer'
        LIMIT 10
    """, as_dict=True)
    
    if users_with_settings:
        print(f"  - Utilisateurs avec paramètres: {len(users_with_settings)}")
        for user in users_with_settings:
            print(f"    • {user.user}")

# Fonction principale
if __name__ == "__main__" or frappe.local.site:
    print("=" * 60)
    print("NETTOYAGE DES FILTRES SAUVEGARDÉS - LISTE CLIENTS")
    print("=" * 60)
    
    # 1. Afficher les stats actuelles
    get_user_filter_stats()
    
    print("\n" + "-" * 60)
    
    # 2. Effacer les paramètres existants
    success = clear_customer_list_settings()
    
    # 3. Configurer pour l'avenir
    if success:
        disable_filter_saving_for_all_users()
    
    print("\n" + "-" * 60)
    
    # 4. Afficher les stats après nettoyage
    print("📊 Après nettoyage:")
    get_user_filter_stats()
    
    print("\n✅ Nettoyage terminé!")
    print("💡 Redémarrez l'application pour appliquer les changements")
    print("💡 Les utilisateurs devront actualiser leur navigateur")