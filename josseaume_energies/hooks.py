# josseaume_energies/hooks.py - VERSION MISE À JOUR AVEC NOUVELLES FONCTIONNALITÉS MARGES

app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Personnalisation du calendrier Event et calcul de marges avec support Bundle et gestion des remises (version améliorée)"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.4.0"

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

# Whitelist pour l'API - VERSION AMÉLIORÉE AVEC GESTION REMISES
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
    
    # API pour le calcul de marges AMÉLIORÉ AVEC GESTION REMISES ET COÛTS ZÉRO
    "josseaume_energies.margin_calculation_simple.calculate_item_margin": True,
    "josseaume_energies.margin_calculation_simple.calculate_quotation_margin": True,
    "josseaume_energies.margin_calculation_simple.update_item_valuation_rate": True,
    "josseaume_energies.margin_calculation_simple.bulk_update_valuation_rates": True,
    "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update": True,
    "josseaume_energies.margin_calculation_simple.sync_valuation_from_last_purchase": True,
    "josseaume_energies.margin_calculation_simple.check_margin_setup": True,
    
    # API pour les Bundle Items (existantes)
    "josseaume_energies.margin_calculation_simple.analyze_bundle_item": True,
    "josseaume_energies.margin_calculation_simple.get_all_bundles_analysis": True,
    "josseaume_energies.margin_calculation_simple.debug_bundle_calculation": True,
    
    # NOUVELLES API pour la gestion des remises et articles sans coût
    "josseaume_energies.margin_calculation_simple.check_items_without_cost": True,
    "josseaume_energies.margin_calculation_simple.analyze_quotation_discounts": True,
}

# Client scripts
doctype_js = {
    "Sales Order": "public/js/sales_order.js",
    "Event": "public/js/event.js",
    # Script amélioré pour les devis avec support remises et coûts zéro
    "Quotation": [
        "public/js/quotation_margin_simple.js",
        "public/js/quotation_columns.js"
    ]
}

# Événements de documents - VERSION AMÉLIORÉE
doc_events = {
    "Sales Order": {
        "on_submit": "josseaume_energies.sales_order.on_submit",
        "on_update": "josseaume_energies.sales_order.on_update"
    },
    "Event": {
        "on_update": "josseaume_energies.event.on_update",
        "on_trash": "josseaume_energies.event.on_trash"
    },
    # Hook amélioré pour le calcul automatique des marges avec remises
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
    "calculate_quotation_margin": "all",
    "analyze_bundle_item": "all",
    "check_items_without_cost": "all",
    "analyze_quotation_discounts": "all"
}
