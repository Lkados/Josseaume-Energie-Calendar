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

# NOUVEAUX scheduler_events pour automatiser certaines tâches
scheduler_events = {
    # Vérification quotidienne des articles sans coût
    "daily": [
        "josseaume_energies.margin_calculation_simple.daily_cost_check"
    ],
    
    # Synchronisation hebdomadaire des prix d'achat depuis les derniers achats
    "weekly": [
        "josseaume_energies.margin_calculation_simple.weekly_valuation_sync"
    ]
}

# NOUVELLES fonctions d'installation et de mise à jour
after_install = "josseaume_energies.install.after_install"
after_migrate = "josseaume_energies.install.after_migrate"

# Configuration des jinja hooks pour les rapports
jinja = {
    "methods": [
        "josseaume_energies.margin_calculation_simple.get_margin_status",
        "josseaume_energies.margin_calculation_simple.format_currency"
    ]
}

# NOUVELLES Permissions par défaut pour les rôles
default_role_permissions = [
    {
        "role": "Sales User",
        "permissions": [
            "calculate_quotation_margin",
            "analyze_quotation_discounts",
            "check_items_without_cost"
        ]
    },
    {
        "role": "Sales Manager", 
        "permissions": [
            "calculate_quotation_margin",
            "analyze_quotation_discounts", 
            "check_items_without_cost",
            "analyze_bundle_item",
            "bulk_update_valuation_rates"
        ]
    },
    {
        "role": "Stock User",
        "permissions": [
            "update_item_valuation_rate",
            "bulk_update_valuation_rates",
            "sync_valuation_from_last_purchase"
        ]
    }
]

# NOUVEAU boot session pour configurer les paramètres globaux
boot_session = "josseaume_energies.boot.get_bootinfo"

# NOUVELLES validations globales
doc_events.update({
    # Validation pour s'assurer que les articles ont des prix cohérents
    "Item": {
        "validate": "josseaume_energies.validations.validate_item_pricing"
    },
    
    # Validation pour les bundles
    "Product Bundle": {
        "validate": "josseaume_energies.validations.validate_bundle_pricing"
    }
})

# NOUVEAUX standard_portal_menu_items pour l'accès client
standard_portal_menu_items = [
    {
        "title": _("Mes Devis"),
        "route": "/quotations", 
        "reference_doctype": "Quotation",
        "role": "Customer"
    }
]

# Configuration des notifications automatiques
notification_config = "josseaume_energies.notifications.get_notification_config"

# NOUVELLES configurations pour l'interface utilisateur
website_context = {
    "favicon": "/assets/josseaume_energies/images/favicon.ico",
    "splash_image": "/assets/josseaume_energies/images/splash.png"
}

# Override de méthodes ERPNext pour personnalisation
override_whitelisted_methods = {
    "frappe.desk.query_report.run": "josseaume_energies.overrides.run_custom_report"
}

# Configuration des domaines d'application
domains = {
    "Josseaume Energies": "josseaume_energies.config.josseaume_energies"
}

# Traductions personnalisées
user_data_fields = [
    {
        "doctype": "User",
        "fieldname": "custom_quotation_margin_preferences", 
        "label": "Préférences Calcul Marges",
        "fieldtype": "JSON"
    }
]

# NOUVELLES fonctions de migration des données
migrate_data = [
    "josseaume_energies.patches.migrate_margin_fields",
    "josseaume_energies.patches.update_existing_quotations",
    "josseaume_energies.patches.fix_bundle_costs"
]

# Configuration des logs personnalisés
log_settings = [
    {
        "doctype": "Error Log",
        "filters": {
            "error": ["like", "%margin_calculation%"]
        },
        "retention_days": 30
    }
]

# NOUVELLES métriques et rapports
dashboard_charts = [
    {
        "chart_name": "Marges par Mois",
        "chart_type": "line",
        "source": "josseaume_energies.dashboard.margin_trends"
    },
    {
        "chart_name": "Articles sans Coût", 
        "chart_type": "donut",
        "source": "josseaume_energies.dashboard.items_cost_coverage"
    }
]

# Intégration avec les workflows ERPNext
workflow_action_master = [
    {
        "workflow_action_name": "Valider Marges",
        "workflow_action": "validate_margins"
    }
]

# NOUVELLES fonctions de maintenance automatique
background_jobs = {
    "daily": [
        {
            "method": "josseaume_energies.maintenance.cleanup_margin_logs",
            "queue": "default"
        }
    ],
    "weekly": [
        {
            "method": "josseaume_energies.maintenance.update_bundle_costs",
            "queue": "long"
        }
    ]
}

# Configuration de sécurité renforcée
ignore_csrf = [
    "josseaume_energies.api.calculate_quotation_margin",
    "josseaume_energies.api.check_items_without_cost"
]

# NOUVELLES intégrations tierces
external_integrations = {
    "accounting_software": {
        "enabled": False,
        "sync_margins": True
    },
    "crm_system": {
        "enabled": False, 
        "share_quotation_margins": False
    }
}

# Configuration des tests automatisés
test_runner = "josseaume_energies.tests.run_margin_tests"

# NOUVEAUX paramètres par défaut pour le système
default_system_settings = {
    "josseaume_energies_margin_calculation": {
        "auto_calculate": True,
        "warning_threshold": 10.0,  # Seuil d'alerte pour marge faible (%)
        "zero_cost_allowed": True,   # Autoriser les articles avec coût = 0€
        "include_discounts": True,   # Inclure les remises dans les calculs
        "bundle_cost_method": "components_sum"  # Méthode de calcul pour les bundles
    }
}

# NOUVELLES permissions spéciales pour les API
api_permissions = {
    "josseaume_energies.margin_calculation_simple.*": ["Sales User", "Sales Manager", "Stock User"],
    "josseaume_energies.api.*": ["Sales User", "Sales Manager", "System Manager"]
}

# Configuration des tâches de fond pour performances
background_task_settings = {
    "margin_calculation": {
        "queue": "default",
        "timeout": 300,  # 5 minutes
        "retry": 3
    },
    "bundle_analysis": {
        "queue": "long", 
        "timeout": 600,  # 10 minutes
        "retry": 2
    }
}

# NOUVEAUX indicateurs de performance
performance_indicators = [
    {
        "name": "Quotations with Margins", 
        "query": "SELECT COUNT(*) FROM `tabQuotation` WHERE custom_margin_calculated = 1"
    },
    {
        "name": "Items without Cost",
        "query": "SELECT COUNT(*) FROM `tabItem` WHERE (valuation_rate IS NULL OR valuation_rate = 0) AND disabled = 0"
    }
]

# Configuration finale de compatibilité
compatibility_apps = ["erpnext", "frappe"]
required_apps = ["frappe", "erpnext"]

# Version minimale requise
min_frappe_version = "14.0.0"
min_erpnext_version = "14.0.0"

# NOUVELLES configurations d'email pour les alertes
email_config = {
    "margin_alerts": {
        "enabled": True,
        "recipients": ["sales@josseaume-energies.com"],
        "threshold": 5.0  # Envoyer un email si marge < 5%
    }
}