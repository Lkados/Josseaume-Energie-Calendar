#!/usr/bin/env python3
"""
Script pour mettre à jour les notes existantes avec le statut "Open"
Exécuter: bench execute josseaume_energies.update_existing_notes.update_notes
"""

import frappe

def update_notes():
    """Met à jour toutes les notes existantes pour avoir un statut Open par défaut"""
    
    try:
        # Vérifier si le champ custom_note_status existe
        if not frappe.db.has_column("Note", "custom_note_status"):
            print("Le champ custom_note_status n'existe pas encore. Exécutez d'abord setup_note_custom_fields.")
            return
        
        # Récupérer toutes les notes publiques qui n'ont pas de statut
        notes = frappe.get_all("Note", 
            filters={
                "public": 1,
                ["custom_note_status", "in", ["", None]]
            },
            fields=["name"]
        )
        
        updated_count = 0
        
        for note in notes:
            # Mettre à jour le statut à "Open"
            frappe.db.set_value("Note", note.name, "custom_note_status", "Open", update_modified=False)
            updated_count += 1
        
        frappe.db.commit()
        
        print(f"Mise à jour terminée: {updated_count} notes mises à jour avec le statut 'Open'")
        
        return {
            "status": "success",
            "updated_count": updated_count
        }
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour des notes: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    update_notes()