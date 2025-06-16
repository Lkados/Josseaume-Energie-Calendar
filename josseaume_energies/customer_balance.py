# josseaume_energies/customer_balance.py - VERSION SIMPLIFIÉE

import frappe
from frappe import _
from frappe.utils import flt

@frappe.whitelist()
def get_customer_balance(customer):
    """
    Version simplifiée pour calculer le solde client
    """
    try:
        if not customer:
            return {
                "status": "error",
                "message": "Nom du client requis"
            }
        
        # Vérifier que le client existe
        if not frappe.db.exists("Customer", customer):
            return {
                "status": "error",
                "message": f"Client '{customer}' non trouvé"
            }
        
        # Calcul simple via GL Entries
        balance = calculate_balance_simple(customer)
        
        # Devise par défaut
        currency = get_default_currency()
        
        # Formater le montant
        formatted_balance = f"{balance:.2f} {currency}"
        
        # Statut
        status_text = "Équilibré"
        if balance > 0:
            status_text = "Débiteur"
        elif balance < 0:
            status_text = "Créditeur"
        
        frappe.log_error(f"Solde calculé pour {customer}: {balance}", "Customer Balance Debug")
        
        return {
            "status": "success",
            "customer": customer,
            "balance": balance,
            "formatted_balance": formatted_balance,
            "currency": currency,
            "status_text": status_text,
            "calculation_method": "GL Entries Simple"
        }
        
    except Exception as e:
        error_msg = str(e)
        frappe.log_error(f"Erreur calcul solde {customer}: {error_msg}", "Customer Balance Error")
        
        return {
            "status": "error",
            "message": f"Erreur calcul solde: {error_msg}"
        }

def calculate_balance_simple(customer):
    """
    Calcul simple du solde via les écritures comptables
    """
    try:
        # Requête simple pour récupérer le solde
        result = frappe.db.sql("""
            SELECT 
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
        """, (customer,), as_dict=True)
        
        if result and len(result) > 0:
            total_debit = flt(result[0].total_debit or 0)
            total_credit = flt(result[0].total_credit or 0)
            balance = total_debit - total_credit
            
            frappe.log_error(f"Détail calcul {customer}: Débit={total_debit}, Crédit={total_credit}, Solde={balance}", "Balance Calculation")
            
            return balance
        
        return 0.0
        
    except Exception as e:
        frappe.log_error(f"Erreur calculate_balance_simple: {str(e)}")
        return 0.0

def get_default_currency():
    """
    Récupère la devise par défaut
    """
    try:
        # Essayer d'abord la devise de la société par défaut
        company = frappe.defaults.get_global_default("company")
        if company:
            currency = frappe.db.get_value("Company", company, "default_currency")
            if currency:
                return currency
        
        # Sinon, devise globale par défaut
        currency = frappe.defaults.get_global_default("currency")
        if currency:
            return currency
            
        # Fallback sur EUR
        return "EUR"
        
    except Exception as e:
        frappe.log_error(f"Erreur get_default_currency: {str(e)}")
        return "EUR"

@frappe.whitelist()
def test_customer_balance_simple(customer=None):
    """
    Fonction de test simple
    """
    try:
        if not customer:
            # Prendre le premier client actif
            customers = frappe.get_all("Customer", 
                                     filters={"disabled": 0}, 
                                     limit=1,
                                     fields=["name", "customer_name"])
            
            if not customers:
                return {
                    "status": "error",
                    "message": "Aucun client trouvé pour le test"
                }
            
            customer = customers[0].name
        
        # Tester le calcul
        result = get_customer_balance(customer)
        
        return {
            "status": "success",
            "test_customer": customer,
            "result": result
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Erreur test: {str(e)}"
        }

@frappe.whitelist()
def get_customer_transactions_simple(customer, limit=20):
    """
    Version simplifiée pour récupérer les transactions
    """
    try:
        if not customer:
            return {
                "status": "error",
                "message": "Nom du client requis"
            }
        
        # Récupérer les écritures comptables
        transactions = frappe.db.sql("""
            SELECT 
                posting_date,
                voucher_type,
                voucher_no,
                account,
                debit,
                credit,
                remarks
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            ORDER BY posting_date DESC, creation DESC
            LIMIT %s
        """, (customer, int(limit)), as_dict=True)
        
        return {
            "status": "success",
            "customer": customer,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur get_customer_transactions_simple: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur: {str(e)}"
        }

# Fonction de debug pour les logs
def log_customer_balance_debug(customer):
    """
    Log de debug pour comprendre les problèmes
    """
    try:
        frappe.log_error(f"=== DEBUG CUSTOMER BALANCE {customer} ===", "Customer Balance Debug")
        
        # Vérifier l'existence du client
        exists = frappe.db.exists("Customer", customer)
        frappe.log_error(f"Client existe: {exists}", "Customer Balance Debug")
        
        # Compter les GL Entries
        count = frappe.db.count("GL Entry", {
            "party_type": "Customer",
            "party": customer,
            "is_cancelled": 0
        })
        frappe.log_error(f"Nombre GL Entries: {count}", "Customer Balance Debug")
        
        # Détail des montants
        result = frappe.db.sql("""
            SELECT 
                voucher_type,
                COUNT(*) as count,
                SUM(debit) as total_debit,
                SUM(credit) as total_credit
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            GROUP BY voucher_type
        """, (customer,), as_dict=True)
        
        frappe.log_error(f"Détail par type: {result}", "Customer Balance Debug")
        
    except Exception as e:
        frappe.log_error(f"Erreur debug: {str(e)}", "Customer Balance Debug")

# Hook pour les mises à jour de client (optionnel)
def customer_on_update(doc, method):
    """
    Hook simple appelé lors de la mise à jour d'un client
    """
    try:
        frappe.log_error(f"Client {doc.name} mis à jour", "Customer Update")
    except Exception as e:
        frappe.log_error(f"Erreur hook customer_on_update: {str(e)}")