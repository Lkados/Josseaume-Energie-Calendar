# josseaume_energie_calendar/hooks.py

app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Personnalisation du calendrier Event (vue jour bi-colonne)"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.1.0"

# Inclure notre JS/CSS personnalisé dans le Desk
#app_include_css = ["/assets/josseaume_energies/css/calendar_custom.css"]
#app_include_js = [
#    "/assets/josseaume_energies/js/vue_matin_apresmidi.js"
#]

# Définir la page
page_js = {
    "two_column_calendar": "josseaume_energies/page/two_column_calendar/two_column_calendar.js"
}

# Ajouter le fichier CSS
app_include_css = [
    "josseaume_energies/page/two_column_calendar/two_column_calendar.css"
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

