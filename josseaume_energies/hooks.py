app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Application complète pour Josseaume Energies : calendrier des interventions, calcul de marges avec gestion des remises et bundles, affichage des soldes clients"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.5.0"

# ========================================
# CONFIGURATION DES PAGES
# ========================================

# Définir la page du calendrier des interventions
page_js = {
    "two_column_calendar": "page/two_column_calendar/two_column_calendar.js"
}

# ========================================
# RESSOURCES CSS ET JAVASCRIPT
# ========================================

# Fichiers CSS inclus dans toute l'application
app_include_css = [
    "/assets/josseaume_energies/css/two_column_calendar.css",      # Styles du calendrier
    "/assets/josseaume_energies/css/margin_styles.css",           # Styles pour les marges
    "/assets/josseaume_energies/css/customer_balance_styles.css"  # Styles pour les soldes clients
]

# Fichiers JavaScript inclus dans toute l'application
app_include_js = [
    "/assets/josseaume_energies/js/quotation_margin_simple.js",   # Script global pour les marges
    "/assets/josseaume_energies/js/common_customer_filter.js"     # Module de filtrage par commune
]

# ========================================
# CONFIGURATION DES ROUTES WEB
# ========================================

# Routes personnalisées pour les pages web
website_route_rules = [
    {"from_route": "/two-column-calendar", "to_route": "page/two_column_calendar"},
]

# ========================================
# API WHITELISTÉES (MÉTHODES PUBLIQUES)
# ========================================

# Toutes les méthodes API accessibles depuis le frontend
whitelist_methods = {
    # =====================================
    # API CALENDRIER DES INTERVENTIONS
    # =====================================
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
    
    # API pour la vue employés
    "josseaume_energies.api.get_employees_with_team_filter": True,
    "josseaume_energies.api.get_day_events_by_employees": True,
    "josseaume_energies.api.get_team_options": True,
    "josseaume_energies.api.get_employee_notes": True,
    "josseaume_energies.api.move_open_notes_to_today": True,
    "josseaume_energies.api.setup_note_auto_move_fields": True,
    "josseaume_energies.api.test_move_notes_manually": True,
    "josseaume_energies.api.cleanup_duplicate_notes": True,
    
    # =====================================
    # API CALCUL DE MARGES
    # =====================================
    # Calcul de marges de base
    "josseaume_energies.margin_calculation_simple.calculate_item_margin": True,
    "josseaume_energies.margin_calculation_simple.calculate_quotation_margin": True,
    
    # Gestion des prix de valorisation
    "josseaume_energies.margin_calculation_simple.update_item_valuation_rate": True,
    "josseaume_energies.margin_calculation_simple.bulk_update_valuation_rates": True,
    "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update": True,
    "josseaume_energies.margin_calculation_simple.sync_valuation_from_last_purchase": True,
    
    # Configuration et vérification
    "josseaume_energies.margin_calculation_simple.check_margin_setup": True,
    
    # Analyse des Bundle Items (kits)
    "josseaume_energies.margin_calculation_simple.analyze_bundle_item": True,
    "josseaume_energies.margin_calculation_simple.get_all_bundles_analysis": True,
    "josseaume_energies.margin_calculation_simple.debug_bundle_calculation": True,
    
    # Gestion des remises et articles sans coût
    "josseaume_energies.margin_calculation_simple.check_items_without_cost": True,
    "josseaume_energies.margin_calculation_simple.analyze_quotation_discounts": True,
    
    # Template d'email pour les devis et factures
    "josseaume_energies.quotation_email.get_email_defaults_for_quotation": True,
    "josseaume_energies.quotation_email.get_email_defaults_for_invoice": True,
    
    # Configuration des séries de nommage
    "josseaume_energies.naming_series_setup.setup_naming_series": True,
    "josseaume_energies.naming_series_setup.get_current_naming_series": True,
    "josseaume_energies.naming_series_setup.reset_naming_series_counter": True,
    
    # Gestion des champs d'adresse séparés
    "josseaume_energies.address_fields_setup.setup_address_fields": True,
    "josseaume_energies.address_fields_setup.sync_customer_address_fields": True,
    "josseaume_energies.address_fields_setup.parse_existing_address": True,
    "josseaume_energies.address_fields_setup.bulk_parse_addresses": True,
    
    # =====================================
    # API SOLDES CLIENTS
    # =====================================
    # Calcul et affichage des soldes
    "josseaume_energies.customer_balance.get_customer_balance": True,
    "josseaume_energies.customer_balance.get_customer_transactions": True,
    
    # Gestion en masse
    "josseaume_energies.customer_balance.update_all_customer_balances": True,
    "josseaume_energies.customer_balance.get_customers_with_outstanding_balance": True,
    
    # Tests et debug
    "josseaume_energies.customer_balance.test_customer_balance": True,

    # Recherche personnalisée
    "josseaume_energies.api.search_customers_by_commune": True,
    "josseaume_energies.api.get_communes_list": True,

    # Attribution automatique de zones
    "josseaume_energies.customer_zone_assignment.manual_assign_zone": True,
    "josseaume_energies.customer_zone_assignment.search_zone": True,
}

# ========================================
# SCRIPTS CLIENT (JAVASCRIPT)
# ========================================

# Scripts JavaScript spécifiques à chaque DocType
doctype_js = {
    # Calendrier et synchronisation
    "Sales Order": "public/js/sales_order.js",
    "Event": "public/js/event.js",
    
    # Affichage des soldes clients et gestion des adresses
    "Customer": [
        "public/js/customer.js",
        "public/js/customer_address.js",   # Gestion des champs d'adresse séparés
        "public/js/customer_list.js"       # Désactivation sauvegarde filtres liste
    ],
    
    # Calcul de marges pour les devis
    "Quotation": [
        "public/js/quotation_margin_simple.js",    # Calcul des marges avec remises
        "public/js/quotation_columns.js",          # Configuration des colonnes
        "public/js/quotation_email.js"             # Template d'email par défaut
    ],
    
    # Scripts pour les factures (template d'email + filtrage commune)
    "Sales Invoice": [
        "public/js/invoice_email.js",     # Template d'email par défaut
        "public/js/sales_invoice.js"      # Filtrage par commune
    ]
}

# ========================================
# HOOKS SUR LES DOCUMENTS
# ========================================

# Événements déclenchés lors des opérations sur les documents
doc_events = {
    # =====================================
    # COMMANDES CLIENTS (SALES ORDER)
    # =====================================
    "Sales Order": {
        # Création automatique d'événement lors de la soumission
        "on_submit": "josseaume_energies.sales_order.on_submit",
        # Synchronisation lors des modifications
        "on_update": "josseaume_energies.sales_order.on_update",
        # Fermeture de l'événement lors de l'annulation
        "on_cancel": "josseaume_energies.sales_order.on_cancel"
    },
    
    # =====================================
    # ÉVÉNEMENTS CALENDRIER (EVENT)
    # =====================================
    "Event": {
        # Synchronisation bidirectionnelle lors des modifications
        "on_update": "josseaume_energies.event.on_update",
        # Nettoyage des références lors de la suppression
        "on_trash": "josseaume_energies.event.on_trash"
    },
    
    # =====================================
    # DEVIS (QUOTATION)
    # =====================================
    "Quotation": {
        # Calcul automatique des marges lors de la validation
        "validate": "josseaume_energies.margin_calculation_simple.quotation_on_save",
        # Recalcul lors des modifications
        "on_update": "josseaume_energies.margin_calculation_simple.quotation_on_save"
    },
    
    # =====================================
    # CLIENTS (CUSTOMER)
    # =====================================
    "Customer": {
        # Attribution automatique de zone lors de la création/modification
        "after_insert": "josseaume_energies.customer_zone_assignment.auto_assign_zone_to_customer",
        "on_update": "josseaume_energies.customer_zone_assignment.auto_assign_zone_to_customer"
    }
}

# ========================================
# FIXTURES (DONNÉES INITIALES)
# ========================================

# Données à installer automatiquement
fixtures = [
    {
        "doctype": "Page",
        "filters": [
            ["name", "=", "two_column_calendar"]
        ]
    }
]

# ========================================
# MENU LATÉRAL ET NAVIGATION
# ========================================

# Configuration du module dans le Desk
# Les éléments de bureau sont définis dans config/desktop.py

# ========================================
# PERMISSIONS PERSONNALISÉES
# ========================================

# Configuration des permissions pour les fonctionnalités personnalisées
has_permission = {
    # Calendrier
    "create_event_from_sales_order": "all",
    
    # Marges
    "calculate_quotation_margin": "all",
    "analyze_bundle_item": "all",
    "check_items_without_cost": "all",
    "analyze_quotation_discounts": "all",
    
    # Soldes clients
    "get_customer_balance": "all",
    "get_customer_transactions": "all"
}

# ========================================
# TÂCHES PLANIFIÉES (SCHEDULER)
# ========================================

# Tâches exécutées automatiquement par le scheduler
scheduler_events = {
    # Tâches quotidiennes (exécutées à 00:01)
    "daily": [
        "josseaume_energies.api.move_open_notes_to_today"  # Déplacement automatique des notes ouvertes
    ]
}