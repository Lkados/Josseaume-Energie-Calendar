# josseaume_energies/hooks.py

app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Personnalisation du calendrier Event (vue jour bi-colonne)"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.1.0"

# Définir la page
page_js = {
    "two_column_calendar": "page/two_column_calendar/two_column_calendar.js"
}
app_include_css = [
    "/assets/josseaume_energies/css/two_column_calendar.css"
]

# Configuration des routes du site web
website_route_rules = [
    {"from_route": "/two-column-calendar", "to_route": "page/two_column_calendar"},
]

# Whitelist pour l'API
whitelist_methods = {
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
    # NOUVELLES MÉTHODES POUR LA VUE EMPLOYÉS
    "josseaume_energies.api.get_employees_with_team_filter": True,
    "josseaume_energies.api.get_day_events_by_employees": True,
    "josseaume_energies.api.get_team_options": True,
}

# Client scripts
doctype_js = {
    "Sales Order": "public/js/sales_order.js",
    "Event": "public/js/event.js"
}

# Whitelist pour l'API
has_permission = {
    "create_event_from_sales_order": "all"
}

# NOUVEAU: Événements de documents pour la synchronisation bidirectionnelle
doc_events = {
    "Sales Order": {
        "on_submit": "josseaume_energies.sales_order.on_submit",
        "on_update": "josseaume_energies.sales_order.on_update"
    },
    "Event": {
        "on_update": "josseaume_energies.event.on_update",
        "on_trash": "josseaume_energies.event.on_trash"
    }
}

# Fixtures - permet de sauvegarder l'état des documents de la base de données
fixtures = [
    {
        "doctype": "Page",
        "filters": [
            ["name", "=", "two_column_calendar"]
        ]
    }
]