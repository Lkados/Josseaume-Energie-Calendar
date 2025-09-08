# Configuration des templates d'email par défaut

DEVIS_EMAIL_TEMPLATE = """Bonjour,

Veuillez trouver ci-joint le document : Devis N° {devis_ref}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire."""

def get_devis_email_template(devis_ref=None):
    """
    Retourne le template d'email pour l'envoi d'un devis
    
    Args:
        devis_ref: Référence du devis (optionnel)
    
    Returns:
        str: Template d'email formaté
    """
    if devis_ref:
        return DEVIS_EMAIL_TEMPLATE.format(devis_ref=devis_ref)
    else:
        return DEVIS_EMAIL_TEMPLATE.format(devis_ref="[référence du devis]")

def get_email_subject_for_devis(devis_ref=None):
    """
    Retourne le sujet de l'email pour l'envoi d'un devis
    
    Args:
        devis_ref: Référence du devis (optionnel)
    
    Returns:
        str: Sujet de l'email
    """
    if devis_ref:
        return f"Devis N° {devis_ref} - JOSSEAUME ÉNERGIES"
    else:
        return "Devis - JOSSEAUME ÉNERGIES"