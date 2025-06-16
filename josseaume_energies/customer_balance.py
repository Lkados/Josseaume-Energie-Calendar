# josseaume_energies/customer_balance.py - API optimisée pour le calcul du solde client

import frappe
from frappe import _
from frappe.utils import flt, fmt_money, getdate, today, nowdate, add_days
from erpnext.accounts.utils import get_balance_on
import json
from datetime import datetime

@frappe.whitelist()
def get_customer_balance(customer):
    """
    Récupère le solde d'un client avec calcul optimisé et données complètes
    """
    try:
        if not customer:
            return create_error_response("Nom du client requis")
        
        # Vérifier que le client existe
        if not frappe.db.exists("Customer", customer):
            return create_error_response(f"Client '{customer}' non trouvé")
        
        # Récupérer les informations du client
        customer_doc = frappe.get_doc("Customer", customer)
        
        # Calcul du solde avec plusieurs méthodes de fallback
        balance_result = calculate_customer_balance(customer)
        
        if not balance_result["success"]:
            return create_error_response(balance_result["error"])
        
        balance = balance_result["balance"]
        calculation_method = balance_result["method"]
        
        # Récupérer la devise
        currency = get_customer_currency(customer)
        
        # Formater le montant selon les paramètres régionaux
        formatted_balance = format_currency_amount(balance, currency)
        
        # Déterminer le statut du solde
        status_info = determine_balance_status(balance)
        
        # Récupérer des statistiques détaillées
        stats = get_comprehensive_customer_stats(customer)
        
        # Récupérer l'historique des soldes si demandé
        balance_history = get_balance_trend(customer, days=30)
        
        return {
            "status": "success",
            "customer": customer,
            "customer_name": customer_doc.customer_name or customer,
            "balance": balance,
            "formatted_balance": formatted_balance,
            "currency": currency,
            "status_text": status_info["text"],
            "status_color": status_info["color"],
            "status_icon": status_info["icon"],
            "calculation_method": calculation_method,
            "calculation_date": nowdate(),
            "calculation_time": datetime.now().strftime("%H:%M:%S"),
            "stats": stats,
            "balance_history": balance_history,
            "customer_info": {
                "type": customer_doc.customer_type,
                "group": customer_doc.customer_group,
                "territory": customer_doc.territory,
                "default_currency": getattr(customer_doc, 'default_currency', None),
                "credit_limit": getattr(customer_doc, 'credit_limit', 0),
                "payment_terms": getattr(customer_doc, 'payment_terms', None)
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur lors du calcul du solde client {customer}: {str(e)}", "Customer Balance Error")
        return create_error_response(f"Erreur lors du calcul du solde: {str(e)}")

def calculate_customer_balance(customer):
    """
    Calcule le solde client avec méthodes de fallback optimisées
    """
    try:
        # Méthode 1: Utiliser get_balance_on avec compte débiteur
        receivable_account = get_customer_receivable_account(customer)
        
        if receivable_account:
            try:
                balance = get_balance_on(
                    account=receivable_account,
                    date=nowdate(),
                    party_type="Customer",
                    party=customer,
                    ignore_account_permission=True
                )
                return {
                    "success": True,
                    "balance": balance,
                    "method": f"Compte débiteur: {receivable_account}"
                }
            except Exception as e:
                frappe.log_error(f"Erreur méthode 1 pour {customer}: {str(e)}")
        
        # Méthode 2: Calculer depuis GL Entries avec optimisation
        balance = calculate_optimized_gl_balance(customer)
        return {
            "success": True,
            "balance": balance,
            "method": "Calcul optimisé GL Entries"
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul solde pour {customer}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def calculate_optimized_gl_balance(customer):
    """
    Calcul optimisé du solde depuis les GL Entries
    """
    try:
        # Requête optimisée avec index sur party et party_type
        result = frappe.db.sql("""
            SELECT 
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit,
                COUNT(*) as entry_count
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            AND docstatus = 1
        """, (customer,), as_dict=True)
        
        if result and result[0]:
            total_debit = flt(result[0].total_debit)
            total_credit = flt(result[0].total_credit)
            balance = total_debit - total_credit
            
            # Log pour debug si nécessaire
            if result[0].entry_count == 0:
                frappe.log_error(f"Aucune écriture GL trouvée pour {customer}", "Customer Balance Debug")
            
            return balance
        
        return 0
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul GL optimisé pour {customer}: {str(e)}")
        return 0

def get_customer_receivable_account(customer):
    """
    Récupère le compte débiteur du client avec fallbacks intelligents
    """
    try:
        # 1. Compte par défaut du client
        customer_account = frappe.db.get_value(
            "Customer", 
            customer, 
            "default_receivable_account"
        )
        
        if customer_account:
            return customer_account
        
        # 2. Compte par défaut de la société du client
        company = get_customer_company(customer)
        if company:
            company_account = frappe.db.get_value(
                "Company", 
                company, 
                "default_receivable_account"
            )
            if company_account:
                return company_account
        
        # 3. Premier compte de type "Receivable" actif
        receivable_account = frappe.db.get_value(
            "Account",
            {
                "account_type": "Receivable",
                "is_group": 0,
                "disabled": 0
            },
            "name",
            order_by="creation"
        )
        
        return receivable_account
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération compte débiteur pour {customer}: {str(e)}")
        return None

def get_customer_company(customer):
    """
    Récupère la société associée au client
    """
    try:
        # Chercher dans les factures récentes
        company = frappe.db.get_value(
            "Sales Invoice",
            {"customer": customer, "docstatus": 1},
            "company",
            order_by="creation desc"
        )
        
        if company:
            return company
        
        # Fallback sur la société par défaut
        return frappe.defaults.get_global_default("company")
        
    except Exception as e:
        return frappe.defaults.get_global_default("company")

def get_customer_currency(customer):
    """
    Récupère la devise du client avec fallbacks
    """
    try:
        # 1. Devise par défaut du client
        customer_currency = frappe.db.get_value("Customer", customer, "default_currency")
        if customer_currency:
            return customer_currency
        
        # 2. Devise de la dernière facture
        invoice_currency = frappe.db.get_value(
            "Sales Invoice",
            {"customer": customer, "docstatus": 1},
            "currency",
            order_by="creation desc"
        )
        if invoice_currency:
            return invoice_currency
        
        # 3. Devise par défaut de la société
        company = get_customer_company(customer)
        if company:
            company_currency = frappe.db.get_value("Company", company, "default_currency")
            if company_currency:
                return company_currency
        
        # 4. Fallback EUR
        return "EUR"
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération devise pour {customer}: {str(e)}")
        return "EUR"

def format_currency_amount(amount, currency="EUR"):
    """
    Formate le montant selon la devise et les paramètres régionaux
    """
    try:
        # Utiliser la fonction Frappe pour le formatage
        formatted = fmt_money(amount, currency=currency)
        return formatted
        
    except Exception as e:
        # Fallback simple
        return f"{amount:.2f} {currency}"

def determine_balance_status(balance):
    """
    Détermine le statut du solde avec seuils configurables
    """
    try:
        # Seuil configurable (peut être mis en paramètres système)
        threshold = flt(frappe.db.get_single_value("Accounts Settings", "credit_limit") or 0.01)
        
        if balance > threshold:
            return {
                "text": "Débiteur",
                "color": "red",
                "icon": "⚠️",
                "css_class": "customer-balance-debiteur"
            }
        elif balance < -threshold:
            return {
                "text": "Créditeur", 
                "color": "green",
                "icon": "💰",
                "css_class": "customer-balance-crediteur"
            }
        else:
            return {
                "text": "Équilibré",
                "color": "blue", 
                "icon": "⚖️",
                "css_class": "customer-balance-equilibre"
            }
            
    except Exception as e:
        return {
            "text": "Inconnu",
            "color": "gray",
            "icon": "❓",
            "css_class": "customer-balance-unknown"
        }

def get_comprehensive_customer_stats(customer):
    """
    Récupère des statistiques complètes sur le client
    """
    try:
        stats = {}
        
        # Statistiques des factures
        invoice_stats = frappe.db.sql("""
            SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(CASE WHEN status IN ('Unpaid', 'Partly Paid', 'Overdue') THEN 1 ELSE 0 END), 0) as unpaid_invoices,
                COALESCE(SUM(CASE WHEN status IN ('Unpaid', 'Partly Paid', 'Overdue') THEN outstanding_amount ELSE 0 END), 0) as unpaid_amount,
                COALESCE(SUM(grand_total), 0) as total_invoiced,
                COALESCE(AVG(grand_total), 0) as avg_invoice_amount,
                MAX(posting_date) as last_invoice_date
            FROM `tabSales Invoice`
            WHERE customer = %s AND docstatus = 1
        """, (customer,), as_dict=True)
        
        if invoice_stats and invoice_stats[0]:
            stats.update(invoice_stats[0])
        
        # Statistiques des paiements
        payment_stats = frappe.db.sql("""
            SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(paid_amount), 0) as total_paid,
                COALESCE(AVG(paid_amount), 0) as avg_payment_amount,
                MAX(posting_date) as last_payment_date
            FROM `tabPayment Entry`
            WHERE party = %s AND party_type = 'Customer' AND docstatus = 1
        """, (customer,), as_dict=True)
        
        if payment_stats and payment_stats[0]:
            stats.update(payment_stats[0])
        
        # Calculs dérivés
        stats["payment_ratio"] = (
            flt(stats.get("total_paid", 0)) / flt(stats.get("total_invoiced", 1)) * 100
            if stats.get("total_invoiced", 0) > 0 else 0
        )
        
        # Ancienneté du solde (factures en retard)
        overdue_stats = frappe.db.sql("""
            SELECT 
                COUNT(*) as overdue_count,
                COALESCE(SUM(outstanding_amount), 0) as overdue_amount,
                MAX(DATEDIFF(CURDATE(), due_date)) as max_overdue_days,
                AVG(DATEDIFF(CURDATE(), due_date)) as avg_overdue_days
            FROM `tabSales Invoice`
            WHERE customer = %s 
            AND docstatus = 1 
            AND status = 'Overdue'
            AND due_date < CURDATE()
        """, (customer,), as_dict=True)
        
        if overdue_stats and overdue_stats[0]:
            stats["overdue"] = overdue_stats[0]
        
        # Formatage des dates
        for date_field in ["last_invoice_date", "last_payment_date"]:
            if stats.get(date_field):
                stats[date_field] = str(stats[date_field])
        
        return stats
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération stats pour {customer}: {str(e)}")
        return {}

def get_balance_trend(customer, days=30):
    """
    Récupère l'évolution du solde sur une période
    """
    try:
        # Calculer les soldes sur les X derniers jours
        trends = []
        
        for i in range(days, 0, -5):  # Tous les 5 jours
            date = add_days(nowdate(), -i)
            
            # Calculer le solde à cette date
            balance = calculate_balance_at_date(customer, date)
            
            trends.append({
                "date": str(date),
                "balance": balance,
                "formatted_balance": format_currency_amount(balance)
            })
        
        return trends
        
    except Exception as e:
        frappe.log_error(f"Erreur trend solde pour {customer}: {str(e)}")
        return []

def calculate_balance_at_date(customer, date):
    """
    Calcule le solde à une date donnée
    """
    try:
        receivable_account = get_customer_receivable_account(customer)
        
        if receivable_account:
            balance = get_balance_on(
                account=receivable_account,
                date=date,
                party_type="Customer",
                party=customer,
                ignore_account_permission=True
            )
            return balance
        
        # Fallback: calcul manuel
        result = frappe.db.sql("""
            SELECT 
                COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND posting_date <= %s
            AND is_cancelled = 0
            AND docstatus = 1
        """, (customer, date))
        
        return flt(result[0][0]) if result and result[0] else 0
        
    except Exception as e:
        return 0

def create_error_response(message):
    """
    Crée une réponse d'erreur standardisée
    """
    return {
        "status": "error",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }

@frappe.whitelist()
def get_customer_transactions(customer, limit=100, offset=0):
    """
    Récupère les transactions d'un client avec pagination optimisée
    """
    try:
        if not customer:
            return create_error_response("Nom du client requis")
        
        limit = int(limit)
        offset = int(offset)
        
        # Requête optimisée avec pagination
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
                creation,
                company
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            AND docstatus = 1
            ORDER BY posting_date DESC, creation DESC
            LIMIT %s OFFSET %s
        """, (customer, limit, offset), as_dict=True)
        
        # Compter le total pour la pagination
        total_count = frappe.db.sql("""
            SELECT COUNT(*)
            FROM `tabGL Entry`
            WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            AND docstatus = 1
        """, (customer,))[0][0]
        
        # Formater les montants
        for transaction in transactions:
            if transaction.debit:
                transaction.formatted_debit = format_currency_amount(transaction.debit)
            if transaction.credit:
                transaction.formatted_credit = format_currency_amount(transaction.credit)
            
            # Formater la date
            transaction.formatted_date = frappe.utils.formatdate(transaction.posting_date)
        
        return {
            "status": "success",
            "customer": customer,
            "transactions": transactions,
            "count": len(transactions),
            "total_count": total_count,
            "has_more": (offset + limit) < total_count,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total_count,
                "page": (offset // limit) + 1,
                "pages": (total_count // limit) + (1 if total_count % limit > 0 else 0)
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération transactions pour {customer}: {str(e)}")
        return create_error_response(f"Erreur lors de la récupération des transactions: {str(e)}")

@frappe.whitelist()
def get_customers_with_outstanding_balance(minimum_amount=1, limit=50):
    """
    Récupère les clients avec un solde significatif
    """
    try:
        minimum_amount = flt(minimum_amount)
        limit = int(limit)
        
        customers_with_balance = []
        
        # Requête optimisée pour récupérer les clients avec solde
        customers_data = frappe.db.sql("""
            SELECT DISTINCT
                gl.party as customer,
                c.customer_name,
                c.customer_group,
                c.territory
            FROM `tabGL Entry` gl
            INNER JOIN `tabCustomer` c ON gl.party = c.name
            WHERE gl.party_type = 'Customer'
            AND gl.is_cancelled = 0
            AND gl.docstatus = 1
            AND c.disabled = 0
            GROUP BY gl.party
            HAVING ABS(SUM(gl.debit) - SUM(gl.credit)) >= %s
            ORDER BY ABS(SUM(gl.debit) - SUM(gl.credit)) DESC
            LIMIT %s
        """, (minimum_amount, limit), as_dict=True)
        
        # Calculer le solde exact pour chaque client
        for customer_data in customers_data:
            balance_result = calculate_customer_balance(customer_data.customer)
            
            if balance_result["success"] and abs(balance_result["balance"]) >= minimum_amount:
                status_info = determine_balance_status(balance_result["balance"])
                
                customers_with_balance.append({
                    "customer": customer_data.customer,
                    "customer_name": customer_data.customer_name,
                    "customer_group": customer_data.customer_group,
                    "territory": customer_data.territory,
                    "balance": balance_result["balance"],
                    "formatted_balance": format_currency_amount(balance_result["balance"]),
                    "status": status_info["text"],
                    "status_color": status_info["color"],
                    "status_icon": status_info["icon"]
                })
        
        return {
            "status": "success",
            "customers": customers_with_balance,
            "count": len(customers_with_balance),
            "minimum_amount": minimum_amount
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération clients avec solde: {str(e)}")
        return create_error_response(f"Erreur: {str(e)}")

@frappe.whitelist()
def update_customer_balance_cache(customer):
    """
    Met à jour le cache du solde client (si implémenté)
    """
    try:
        # Calculer le nouveau solde
        balance_data = get_customer_balance(customer)
        
        if balance_data["status"] == "success":
            # Optionnel: stocker en cache ou dans un champ personnalisé
            cache_key = f"customer_balance_{customer}"
            frappe.cache().set_value(cache_key, balance_data, expires_in_sec=3600)  # 1 heure
            
            return {
                "status": "success",
                "message": f"Cache mis à jour pour {customer}",
                "balance": balance_data["formatted_balance"]
            }
        else:
            return balance_data
            
    except Exception as e:
        return create_error_response(f"Erreur mise à jour cache: {str(e)}")

@frappe.whitelist()
def get_balance_summary_report():
    """
    Génère un rapport de synthèse des soldes clients
    """
    try:
        # Statistiques globales
        summary = frappe.db.sql("""
            SELECT 
                COUNT(DISTINCT gl.party) as total_customers,
                COUNT(DISTINCT CASE WHEN (SUM(gl.debit) - SUM(gl.credit)) > 0 THEN gl.party END) as debtors_count,
                COUNT(DISTINCT CASE WHEN (SUM(gl.debit) - SUM(gl.credit)) < 0 THEN gl.party END) as creditors_count,
                COALESCE(SUM(CASE WHEN (SUM(gl.debit) - SUM(gl.credit)) > 0 THEN (SUM(gl.debit) - SUM(gl.credit)) END), 0) as total_receivables,
                COALESCE(SUM(CASE WHEN (SUM(gl.debit) - SUM(gl.credit)) < 0 THEN ABS(SUM(gl.debit) - SUM(gl.credit)) END), 0) as total_payables
            FROM `tabGL Entry` gl
            INNER JOIN `tabCustomer` c ON gl.party = c.name
            WHERE gl.party_type = 'Customer'
            AND gl.is_cancelled = 0
            AND gl.docstatus = 1
            AND c.disabled = 0
            GROUP BY gl.party
        """, as_dict=True)
        
        result = summary[0] if summary else {}
        
        # Formater les montants
        for key in ["total_receivables", "total_payables"]:
            if result.get(key):
                result[f"formatted_{key}"] = format_currency_amount(result[key])
        
        result["net_position"] = flt(result.get("total_receivables", 0)) - flt(result.get("total_payables", 0))
        result["formatted_net_position"] = format_currency_amount(result["net_position"])
        
        return {
            "status": "success",
            "summary": result,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur rapport synthèse: {str(e)}")
        return create_error_response(f"Erreur génération rapport: {str(e)}")

# Fonction de test complète
@frappe.whitelist()
def test_customer_balance_system(customer=None):
    """
    Teste toutes les fonctionnalités du système de solde
    """
    try:
        results = {
            "test_timestamp": datetime.now().isoformat(),
            "tests": []
        }
        
        # Test 1: Récupération de solde
        if customer:
            test_customers = [customer]
        else:
            test_customers = frappe.get_all(
                "Customer", 
                filters={"disabled": 0}, 
                fields=["name"], 
                limit=3
            )
            test_customers = [c.name for c in test_customers]
        
        for customer_name in test_customers:
            test_result = {
                "customer": customer_name,
                "tests": {}
            }
            
            # Test balance
            balance_data = get_customer_balance(customer_name)
            test_result["tests"]["balance"] = {
                "success": balance_data["status"] == "success",
                "data": balance_data
            }
            
            # Test transactions
            if balance_data["status"] == "success":
                transactions_data = get_customer_transactions(customer_name, limit=5)
                test_result["tests"]["transactions"] = {
                    "success": transactions_data["status"] == "success",
                    "count": transactions_data.get("count", 0)
                }
            
            results["tests"].append(test_result)
        
        # Test global
        summary_data = get_balance_summary_report()
        results["summary_test"] = {
            "success": summary_data["status"] == "success",
            "data": summary_data
        }
        
        return {
            "status": "success",
            "results": results
        }
        
    except Exception as e:
        return create_error_response(f"Erreur test système: {str(e)}")

# Hook pour les événements de documents
def on_customer_update(doc, method):
    """
    Hook appelé lors de la mise à jour d'un client
    """
    try:
        # Effacer le cache pour ce client
        cache_key = f"customer_balance_{doc.name}"
        frappe.cache().delete_value(cache_key)
        
        # Log optionnel
        frappe.log_error(
            f"Cache solde effacé pour client {doc.name} après mise à jour", 
            "Customer Cache Clear"
        )
        
    except Exception as e:
        frappe.log_error(f"Erreur hook customer update: {str(e)}")

def on_gl_entry_submit(doc, method):
    """
    Hook appelé lors de la soumission d'une GL Entry
    """
    try:
        if doc.party_type == "Customer" and doc.party:
            # Effacer le cache pour ce client
            cache_key = f"customer_balance_{doc.party}"
            frappe.cache().delete_value(cache_key)
            
    except Exception as e:
        frappe.log_error(f"Erreur hook GL Entry: {str(e)}")

# Commandes de console pour administration
def clear_all_balance_cache():
    """
    Efface tout le cache des soldes clients
    """
    try:
        customers = frappe.get_all("Customer", fields=["name"])
        cleared_count = 0
        
        for customer in customers:
            cache_key = f"customer_balance_{customer.name}"
            frappe.cache().delete_value(cache_key)
            cleared_count += 1
        
        print(f"Cache effacé pour {cleared_count} clients")
        
    except Exception as e:
        print(f"Erreur effacement cache: {str(e)}")

def recalculate_all_balances():
    """
    Recalcule tous les soldes clients (commande administrative)
    """
    try:
        customers = frappe.get_all("Customer", filters={"disabled": 0}, fields=["name"])
        results = {"success": 0, "errors": 0, "errors_list": []}
        
        for customer in customers:
            try:
                balance_data = get_customer_balance(customer.name)
                if balance_data["status"] == "success":
                    results["success"] += 1
                else:
                    results["errors"] += 1
                    results["errors_list"].append(f"{customer.name}: {balance_data.get('message', 'Erreur inconnue')}")
            except Exception as e:
                results["errors"] += 1
                results["errors_list"].append(f"{customer.name}: {str(e)}")
        
        print(f"Recalcul terminé: {results['success']} succès, {results['errors']} erreurs")
        if results["errors_list"]:
            print("Erreurs:", results["errors_list"][:10])  # Afficher les 10 premières erreurs
        
        return results
        
    except Exception as e:
        print(f"Erreur recalcul global: {str(e)}")
        return {"error": str(e)}