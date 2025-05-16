# josseaume_energie_calendar/hooks.py

app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Mohamed Kachtit"
app_description = "Personnalisation du calendrier Event (vue jour bi-colonne)"
app_icon = "octicon octicon-calendar"
app_color = "grey"
app_version = "0.1.0"

# Inclure notre JS/CSS personnalisé dans le Desk
app_include_js = ["/assets/josseaume_energies/js/event_calendar.js"]
app_include_css = ["/assets/josseaume_energies/css/event_calendar.css"]

# Optionnel : utiliser le hook doctype_calendar_js pour cibler spécifiquement Event
doctype_calendar_js = {
    "Event": "public/js/event_calendar.js"
}
