# Copyright (c) 2023, Mohamed Kachtit and contributors
# For license information, please see license.txt

import frappe

def get_context(context):
    """Ajout de données contextuelles pour la page"""
    context.title = "Calendrier des Interventions"
    return context