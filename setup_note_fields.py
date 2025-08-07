#!/usr/bin/env python3
"""
Script to set up custom fields for the Note DocType
Run this from your ERPNext site directory: bench execute josseaume_energies.setup_note_fields.setup_fields
"""

import frappe

def setup_fields():
    """Set up custom fields for Note DocType to work with employee calendar"""
    
    # Call the API function to set up the fields
    result = frappe.call("josseaume_energies.api.setup_note_custom_fields")
    
    print("Setup result:", result)
    
    return result

if __name__ == "__main__":
    setup_fields()