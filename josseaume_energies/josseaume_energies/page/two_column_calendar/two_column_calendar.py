# josseaume_energies/page/two_column_calendar/two_column_calendar.py
import frappe

def get_context(context):
    context.title = "Calendrier Interventions"
    return context