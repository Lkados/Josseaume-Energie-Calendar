# josseaume_energies/customer_balance.py - API pour le calcul du solde client

import frappe
from frappe import _
from frappe.utils import flt, fmt_money, getdate, today
from erpnext.accounts.utils import get_balance_on

@frappe.whitelist()
def get_customer_balance(customer):
    """
    Récupère le solde d'un client avec plusieurs méthodes de calcul
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
        
        # Méthode 1: Utiliser la fonction ERPNext standard pour les comptes débiteurs
        balance = 0
        calculation_method = "Standard ERPNext"
        
        try:
            # Récupérer le compte débiteur du client
            customer_doc = frappe.get_doc("Customer", customer)
            
            # Essayer d'abord avec le compte de débiteur par défaut
            receivable_account = get_customer_receivable_account(customer)
            
            if receivable_account:
                balance = get_balance_on(
                    account=receivable_account,
                    date=today(),
                    party_type="Customer",
                    party=customer
                )
                calculation_method = f"Compte débiteur: {receivable_account}"
            else:
                # Fallback: calculer depuis les GL Entries directement
                balance = calculate_balance_from_gl_entries(customer)
                calculation_method = "Calcul GL Entries"
                
        except Exception as e:
            frappe.log_error(f"Erreur calcul solde standard pour {customer}: {str(e)}")
            # Fallback: calculer depuis les GL Entries
            balance = calculate_balance_from_gl_entries(customer)
            calculation_method = "Fallback GL Entries"
        
        # Récupérer la devise par défaut
        currency = get_customer_currency(customer)
        
        # Formater le montant
        formatted_balance = fmt_money(balance, currency=currency)
        
        # Déterminer le statut
        status_text = "Équilibré"
        if balance > 0:
            status_text = "Débiteur"
        elif balance < 0:
            status_text = "Créditeur"
        
        # Récupérer des statistiques supplémentaires
        stats = get_customer_payment_stats(customer)
        
        return {
            "status": "success",
            "customer": customer,
            "balance": balance,
            "formatted_balance": formatted_balance,
            "currency": currency,
            "status_text": status_text,
            "calculation_method": calculation_method,
            "calculation_date": today(),
            "stats": stats
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors du calcul du solde client {customer}: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur lors du calcul du solde: {str(e)}"
        }

def get_customer_receivable_account(customer):
    """
    Récupère le compte débiteur du client
    """
    try:
        customer_doc = frappe.get_doc("Customer", customer)
        
        # Essayer le compte par défaut du client
        if hasattr(customer_doc, 'default_receivable_account') and customer_doc.default_receivable_account:
            return customer_doc.default_receivable_account
        
        # Sinon, chercher dans les comptes de la société par défaut
        company = frappe.defaults.get_global_default("company")
        
        if company:
            # Récupérer le compte débiteur par défaut de la société
            receivable_account = frappe.db.get_value(
                "Company", 
                company, 
                "default_receivable_account"
            )
            
            if receivable_account:
                return receivable_account
        
        # Fallback: chercher un compte de type "Receivable"
        receivable_accounts = frappe.db.get_list(
            "Account",
            filters={
                "account_type": "Receivable",
                "is_group": 0,
                "disabled": 0
            },
            fields=["name"],
            limit=1
        )
        
        if receivable_accounts:
            return receivable_accounts[0].name
            
        return None
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération compte débiteur pour {customer}: {str(e)}")
        return None

def calculate_balance_from_gl_entries(customer):
    """
    Calcule le solde depuis les écritures comptables
    """
    try:
        # Récupérer toutes les écritures comptables pour ce client
        gl_entries = frappe.db.sql("""
            SELECT 
                SUM(debit) as total_debit,
                SUM(credit) as total_credit
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
        """, (customer,), as_dict=True)
        
        if gl_entries and gl_entries[0]:
            total_debit = flt(gl_entries[0].total_debit or 0)
            total_credit = flt(gl_entries[0].total_credit or 0)
            balance = total_debit - total_credit
            return balance
        
        return 0
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul GL Entries pour {customer}: {str(e)}")
        return 0

def get_customer_currency(customer):
    """
    Récupère la devise du client ou par défaut
    """
    try:
        customer_doc = frappe.get_doc("Customer", customer)
        
        if hasattr(customer_doc, 'default_currency') and customer_doc.default_currency:
            return customer_doc.default_currency
        
        # Devise par défaut de la société
        company = frappe.defaults.get_global_default("company")
        if company:
            default_currency = frappe.db.get_value("Company", company, "default_currency")
            if default_currency:
                return default_currency
        
        # Fallback sur EUR
        return "EUR"
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération devise pour {customer}: {str(e)}")
        return "EUR"

def get_customer_payment_stats(customer):
    """
    Récupère des statistiques de paiement pour le client
    """
    try:
        stats = {}
        
        # Nombre de factures impayées
        unpaid_invoices = frappe.db.count("Sales Invoice", {
            "customer": customer,
            "status": ["in", ["Unpaid", "Partly Paid", "Overdue"]],
            "docstatus": 1
        })
        stats["unpaid_invoices"] = unpaid_invoices
        
        # Montant total des factures impayées
        unpaid_amount = frappe.db.sql("""
            SELECT SUM(outstanding_amount)
            FROM `tabSales Invoice`
            WHERE customer = %s
            AND docstatus = 1
            AND status IN ('Unpaid', 'Partly Paid', 'Overdue')
        """, (customer,))
        
        stats["unpaid_amount"] = flt(unpaid_amount[0][0] if unpaid_amount and unpaid_amount[0][0] else 0)
        
        # Dernière facture
        last_invoice = frappe.db.get_value(
            "Sales Invoice",
            {"customer": customer, "docstatus": 1},
            ["name", "posting_date", "grand_total"],
            order_by="posting_date desc"
        )
        
        if last_invoice:
            stats["last_invoice"] = {
                "name": last_invoice[0],
                "date": last_invoice[1],
                "amount": last_invoice[2]
            }
        
        # Dernier paiement
        last_payment = frappe.db.get_value(
            "Payment Entry",
            {"party": customer, "party_type": "Customer", "docstatus": 1},
            ["name", "posting_date", "paid_amount"],
            order_by="posting_date desc"
        )
        
        if last_payment:
            stats["last_payment"] = {
                "name": last_payment[0],
                "date": last_payment[1],
                "amount": last_payment[2]
            }
        
        return stats
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération stats pour {customer}: {str(e)}")
        return {}

@frappe.whitelist()
def get_customer_transactions(customer, limit=50):
    """
    Récupère les dernières transactions d'un client
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
                against,
                remarks,
                creation
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            ORDER BY posting_date DESC, creation DESC
            LIMIT %s
        """, (customer, limit), as_dict=True)
        
        return {
            "status": "success",
            "customer": customer,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération transactions pour {customer}: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur lors de la récupération des transactions: {str(e)}"
        }

@frappe.whitelist()
def update_all_customer_balances():
    """
    Met à jour les soldes de tous les clients (fonction utilitaire)
    """
    try:
        customers = frappe.get_all("Customer", 
                                 filters={"disabled": 0}, 
                                 fields=["name"])
        
        updated_count = 0
        errors = []
        
        for customer in customers:
            try:
                balance_data = get_customer_balance(customer.name)
                if balance_data["status"] == "success":
                    updated_count += 1
                else:
                    errors.append(f"{customer.name}: {balance_data.get('message', 'Erreur inconnue')}")
            except Exception as e:
                errors.append(f"{customer.name}: {str(e)}")
        
        return {
            "status": "success",
            "updated_count": updated_count,
            "total_customers": len(customers),
            "errors": errors[:10]  # Limiter le nombre d'erreurs affichées
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur mise à jour en masse des soldes: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur lors de la mise à jour en masse: {str(e)}"
        }

@frappe.whitelist()
def get_customers_with_outstanding_balance(minimum_amount=1):
    """
    Récupère la liste des clients avec un solde impayé
    """
    try:
        minimum_amount = flt(minimum_amount)
        
        customers_with_balance = []
        
        # Récupérer tous les clients actifs
        customers = frappe.get_all("Customer", 
                                 filters={"disabled": 0}, 
                                 fields=["name", "customer_name"])
        
        for customer in customers:
            balance_data = get_customer_balance(customer.name)
            
            if (balance_data["status"] == "success" and 
                abs(balance_data["balance"]) >= minimum_amount):
                
                customers_with_balance.append({
                    "customer": customer.name,
                    "customer_name": customer.customer_name,
                    "balance": balance_data["balance"],
                    "formatted_balance": balance_data["formatted_balance"],
                    "status": balance_data["status_text"]
                })
        
        # Trier par montant décroissant (plus gros débiteurs en premier)
        customers_with_balance.sort(key=lambda x: x["balance"], reverse=True)
        
        return {
            "status": "success",
            "customers": customers_with_balance,
            "count": len(customers_with_balance)
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération clients avec solde: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur: {str(e)}"
        }

# Fonction utilitaire pour les hooks
def customer_on_update(doc, method):
    """
    Hook appelé lors de la mise à jour d'un client
    Peut être utilisé pour recalculer automatiquement le solde
    """
    try:
        # Log de l'événement
        frappe.log_error(f"Client {doc.name} mis à jour", "Customer Update")
        
        # Optionnel: Recalculer le solde immédiatement
        # get_customer_balance(doc.name)
        
    except Exception as e:
        frappe.log_error(f"Erreur hook customer_on_update: {str(e)}")

# Fonction de test
@frappe.whitelist()
def test_customer_balance(customer=None):
    """
    Fonction de test pour vérifier le calcul des soldes
    """
    try:
        test_customers = []
        
        if customer:
            test_customers = [customer]
        else:
            # Prendre les 5 premiers clients actifs
            test_customers = frappe.get_all("Customer", 
                                          filters={"disabled": 0}, 
                                          fields=["name"], 
                                          limit=5)
            test_customers = [c.name for c in test_customers]
        
        results = []
        
        for customer_name in test_customers:
            balance_data = get_customer_balance(customer_name)
            results.append(balance_data)
        
        return {
            "status": "success",
            "test_results": results,
            "tested_customers": len(results)
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Erreur test: {str(e)}"
        }