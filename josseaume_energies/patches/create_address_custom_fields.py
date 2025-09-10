import frappe
from josseaume_energies.address_fields_setup import setup_address_fields

def execute():
    """
    Patch pour créer les champs personnalisés d'adresse
    """
    setup_address_fields()
    frappe.db.commit()