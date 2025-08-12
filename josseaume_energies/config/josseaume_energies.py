"""
Configuration du module Josseaume Energies
Définit les éléments qui apparaissent dans le module et le menu de navigation
"""

from frappe import _

def get_data():
    return [
        {
            "module_name": "Josseaume Energies",
            "category": "Modules",
            "label": _("Josseaume Energies"),
            "color": "#3498db",
            "icon": "fa fa-calendar",
            "type": "module",
            "description": "Gestion des interventions, marges et soldes clients"
        }
    ]

def get_desktop_icons():
    return [
        {
            "module_name": "Josseaume Energies",
            "label": _("Calendrier Interventions"),
            "link": "two_column_calendar",
            "type": "page",
            "icon": "calendar",
            "color": "#3498db",
            "standard": 1,
            "description": "Planning des interventions par employé"
        },
        {
            "module_name": "Josseaume Energies", 
            "label": _("Calcul Marges"),
            "link": "Quotation",
            "type": "doctype",
            "icon": "fa fa-calculator",
            "color": "#e74c3c",
            "standard": 1,
            "description": "Gestion des marges sur devis"
        },
        {
            "module_name": "Josseaume Energies",
            "label": _("Soldes Clients"),
            "link": "Customer", 
            "type": "doctype",
            "icon": "fa fa-users",
            "color": "#2ecc71",
            "standard": 1,
            "description": "Suivi des soldes clients"
        }
    ]