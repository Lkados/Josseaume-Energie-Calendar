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
    "josseaume_energies.api.get_day_events": True
}

# Client scripts
doctype_js = {
    "Sales Order": "public/js/sales_order.js"
}

# Whitelist pour l'API
has_permission = {
    "create_event_from_sales_order": "all"
}

# Configuration des éléments du menu latéral
desk_sidebar_items = ["josseaume_energies.config.desk_sidebar_items"]

# Ajouter également l'entrée suivante pour que la page apparaisse dans le Bureau
desk_page_js = {"Accueil": "public/js/home.js"}

# Fixtures - permet de sauvegarder l'état des documents de la base de données
fixtures = [
    {
        "doctype": "Page",
        "filters": [
            ["name", "=", "two_column_calendar"]
        ]
    }
]
