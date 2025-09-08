# josseaume_energies/quotation_email.py

import frappe
from frappe import _

def before_send_email_for_quotation(doc, method=None):
    """
    Hook appelé avant l'envoi d'un email pour un devis
    Définit le message par défaut
    """
    return get_quotation_email_template(doc.name)

def get_quotation_email_template(quotation_name):
    """
    Retourne le template d'email par défaut pour l'envoi d'un devis
    
    Args:
        quotation_name: Nom/référence du devis
    
    Returns:
        dict: Contient le sujet et le message
    """
    return {
        "subject": f"Devis N° {quotation_name} - JOSSEAUME ÉNERGIES",
        "message": f"""Bonjour,

Veuillez trouver ci-joint le document : Devis N° {quotation_name}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire."""
    }

@frappe.whitelist()
def get_email_defaults_for_quotation(quotation):
    """
    API pour récupérer les valeurs par défaut de l'email
    Peut être appelée depuis le frontend
    
    Args:
        quotation: Nom du devis
    
    Returns:
        dict: Template d'email avec sujet et message
    """
    return get_quotation_email_template(quotation)