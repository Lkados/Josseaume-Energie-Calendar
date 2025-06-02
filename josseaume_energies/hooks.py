# josseaume_energies/hooks.py - VERSION CORRIGÉE

app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Personnalisation du calendrier Event et calcul de marges (version simplifiée)"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.2.1"

# Définir la page du calendrier
page_js = {
    "two_column_calendar": "page/two_column_calendar/two_column_calendar.js"
}

# CSS et JS inclus
app_include_css = [
    "/assets/josseaume_energies/css/two_column_calendar.css",
    "/assets/josseaume_energies/css/margin_styles.css"
]

app_include_js = [
    "/assets/josseaume_energies/js/quotation_margin_simple.js"
]

# Configuration des routes du site web
website_route_rules = [
    {"from_route": "/two-column-calendar", "to_route": "page/two_column_calendar"},
]

# Whitelist pour l'API - VERSION SIMPLIFIÉE
whitelist_methods = {
    # API Calendrier existantes
    "josseaume_energies.api.create_event_from_sales_order": True,
    "josseaume_energies.api.get_day_events": True,
    "josseaume_energies.api.get_calendar_events": True,
    "josseaume_energies.api.get_week_events": True,
    "josseaume_energies.api.sync_event_to_sales_order": True,
    "josseaume_energies.api.sync_sales_order_to_event": True,
    "josseaume_energies.api.check_sync_status": True,
    "josseaume_energies.api.bulk_sync_events": True,
    "josseaume_energies.api.get_items_sync_report": True,
    "josseaume_energies.api.force_sync_all_items": True,
    "josseaume_energies.api.get_employees_with_team_filter": True,
    "josseaume_energies.api.get_day_events_by_employees": True,
    "josseaume_energies.api.get_team_options": True,
    
    # NOUVELLES API pour le calcul de marges SIMPLIFIÉ
    "josseaume_energies.margin_calculation_simple.calculate_item_margin": True,
    "josseaume_energies.margin_calculation_simple.calculate_quotation_margin": True,
    "josseaume_energies.margin_calculation_simple.update_item_valuation_rate": True,
    "josseaume_energies.margin_calculation_simple.bulk_update_valuation_rates": True,
    "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update": True,
    "josseaume_energies.margin_calculation_simple.sync_valuation_from_last_purchase": True,
    "josseaume_energies.margin_calculation_simple.check_margin_setup": True,
}

# Client scripts
doctype_js = {
    "Sales Order": "public/js/sales_order.js",
    "Event": "public/js/event.js",
    # NOUVEAU: Script simplifié pour les devis
    "Quotation": "public/js/quotation_margin_simple.js"
}

# Événements de documents - VERSION SIMPLIFIÉE
doc_events = {
    "Sales Order": {
        "on_submit": "josseaume_energies.sales_order.on_submit",
        "on_update": "josseaume_energies.sales_order.on_update"
    },
    "Event": {
        "on_update": "josseaume_energies.event.on_update",
        "on_trash": "josseaume_energies.event.on_trash"
    },
    # NOUVEAU: Hook simplifié pour le calcul automatique des marges
    "Quotation": {
        "validate": "josseaume_energies.margin_calculation_simple.quotation_on_save",
        "on_update": "josseaume_energies.margin_calculation_simple.quotation_on_save"
    }
}

# Fixtures
fixtures = [
    {
        "doctype": "Page",
        "filters": [
            ["name", "=", "two_column_calendar"]
        ]
    }
]

# Configuration minimale pour les permissions
has_permission = {
    "create_event_from_sales_order": "all",
    "calculate_quotation_margin": "all"
}

# SUPPRESSION DU CODE PROBLÉMATIQUE avec frappe.conf.get("developer_mode")
# Les hooks en mode développeur sont ajoutés dynamiquement si nécessaire

# Scheduler Events (optionnel)
scheduler_events = {
    # Une fois par jour, nettoyer les données obsolètes
    "daily": [
        "josseaume_energies.margin_calculation_simple.daily_cleanup"
    ]
}

# Boot session - pour charger les paramètres de base
boot_session = "josseaume_energies.boot.boot_session"

# Fonctions utilitaires définies ici (pas de frappe dans le scope global)
def daily_cleanup():
    """
    Nettoyage quotidien des données temporaires
    """
    try:
        import frappe  # Import ici quand la fonction est appelée
        # Nettoyer les anciens logs de calcul de marge
        frappe.db.sql("""
            DELETE FROM `tabError Log` 
            WHERE creation < DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND error LIKE '%Margin%'
        """)
        frappe.db.commit()
    except Exception as e:
        import frappe
        frappe.log_error(f"Erreur nettoyage quotidien: {str(e)}")

def debug_quotation(doc, method):
    """
    Fonction de debug pour tracer les calculs de marge
    """
    try:
        import frappe
        if frappe.conf.get("developer_mode"):
            frappe.log_error(f"Debug: Quotation {doc.name} - Total: {doc.grand_total}", "Margin Debug")
    except:
        pass

# Configuration pour les tests - pas de frappe dans le scope global
def get_test_config():
    """Retourne la configuration pour les tests"""
    return {
        "Quotation": {}
    }

# Points d'extension pour d'autres apps
# extend_bootinfo = ["josseaume_energies.boot.extend_bootinfo"]

# Configuration des websockets (optionnel)
# socketio_port = 9000

# Configuration pour la documentation
# website_context = {
#     "brand_html": "Josseaume Energies",
#     "top_bar_items": [
#         {"label": "Calendrier", "url": "/two-column-calendar"}
#     ]
# }

# Standard queries pour les rapports
# standard_queries = {
#     "Quotation": "josseaume_energies.queries.quotation_query"
# }

# Configuration des notifications
# notification_config = "josseaume_energies.notifications.get_notification_config"

# Configuration des dashboards
# dashboards = [
#     {
#         "module": "Josseaume Energies",
#         "color": "grey",
#         "icon": "octicon octicon-calculator",
#         "type": "module",
#         "label": "Marges & Calendrier"
#     }
# ]

# Configuration de sécurité
# ignore_links_on_delete = ["Quotation Item"]

# Configuration des migrations
# required_apps = ["erpnext"]

# Configuration des emails
# default_mail_footer = "Généré par Josseaume Energies"

# Configuration pour les rapports
# standard_portal_menu_items = []

# Configuration des workspaces (ERPNext v14+)
# workspaces = [
#     {
#         "name": "Josseaume Energies",
#         "label": "Josseaume Energies", 
#         "category": "Modules",
#         "public": 1,
#         "icon": "calculator",
#         "color": "grey",
#         "shortcuts": [
#             {
#                 "type": "DocType",
#                 "name": "Quotation",
#                 "label": "Devis avec Marges"
#             },
#             {
#                 "type": "Page",
#                 "name": "two_column_calendar",
#                 "label": "Calendrier Interventions"
#             }
#         ]
#     }
# ]

# Configuration des limites
# db_name = "josseaume_energies"
# api_rate_limit = {"limit": 1000, "window": 3600}

# Configuration du cache
# redis_cache = "redis://localhost:13000"

# Configuration du logging
# log_config = {
#     "loggers": {
#         "josseaume_energies": {
#             "level": "INFO",
#             "handlers": ["file"],
#             "propagate": False
#         }
#     }
# }

# Installation et mise à jour
# after_install = "josseaume_energies.install.after_install"
# after_migrate = "josseaume_energies.install.after_migrate"

# Gestion des erreurs
# on_session_creation = ["josseaume_energies.session.on_session_creation"]

# Translation
# get_translated_dict = "josseaume_energies.utils.get_translated_dict"