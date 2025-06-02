# josseaume_energies/margin_calculation_simple.py - VERSION CORRIGÉE BUNDLE

import frappe
from frappe import _
from frappe.utils import flt, cstr

# ========================================
# FONCTIONS POUR LE CALCUL DES MARGES SIMPLIFIÉ AVEC SUPPORT BUNDLE CORRIGÉ
# ========================================

@frappe.whitelist()
def calculate_item_margin(item_code, selling_price, qty=1):
    """
    Calcule la marge pour un article donné (inclut le support des bundle items)
    """
    try:
        # Récupérer le prix de revient de l'article (bundle ou normal)
        cost_price = get_item_cost_price(item_code)
        
        # Vérifier si c'est un bundle pour fournir des détails supplémentaires
        is_bundle = is_bundle_item(item_code)
        bundle_details = None
        
        if is_bundle:
            bundle_details = get_bundle_details(item_code)
        
        if not cost_price:
            return {
                "status": "warning",
                "message": f"Prix de revient non défini pour {item_code}" + (" (Bundle)" if is_bundle else ""),
                "cost_price": 0,
                "selling_price": flt(selling_price),
                "margin_amount": 0,
                "margin_percentage": 0,
                "is_bundle": is_bundle,
                "bundle_details": bundle_details
            }
        
        # Calculer la marge
        selling_price = flt(selling_price)
        cost_price = flt(cost_price)
        qty = flt(qty) or 1
        
        # Marge en montant (pour la quantité)
        margin_amount = (selling_price - cost_price) * qty
        
        # Marge en pourcentage
        margin_percentage = 0
        if selling_price > 0:
            margin_percentage = ((selling_price - cost_price) / selling_price) * 100
        
        # Déterminer le statut selon le taux de marge
        status = get_margin_status(margin_percentage)
        
        return {
            "status": "success",
            "cost_price": cost_price,
            "selling_price": selling_price,
            "margin_amount": margin_amount,
            "margin_percentage": margin_percentage,
            "margin_status": status,
            "qty": qty,
            "is_bundle": is_bundle,
            "bundle_details": bundle_details
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul marge pour {item_code}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def get_item_cost_price(item_code):
    """
    Récupère le prix de revient d'un article selon plusieurs méthodes
    INCLUT le support des bundle items (articles en kit)
    """
    try:
        # NOUVEAU: Vérifier si c'est un bundle item
        if is_bundle_item(item_code):
            bundle_cost = get_bundle_cost_price(item_code)
            frappe.log_error(f"Bundle {item_code} - Coût calculé: {bundle_cost}", "Bundle Cost Debug")
            return bundle_cost
        
        # Méthode 1: Champ custom_standard_cost si il existe
        try:
            custom_cost = frappe.db.get_value("Item", item_code, "custom_standard_cost")
            if custom_cost and custom_cost > 0:
                return flt(custom_cost)
        except:
            pass  # Le champ n'existe pas encore
        
        # Méthode 2: Prix de valorisation standard (valuation_rate) - SOURCE PRINCIPALE
        valuation_rate = frappe.db.get_value("Item", item_code, "valuation_rate")
        if valuation_rate and valuation_rate > 0:
            return flt(valuation_rate)
        
        # Méthode 3: Dernier prix d'achat (Purchase Receipt)
        last_purchase_rate = frappe.db.sql("""
            SELECT pr_item.rate
            FROM `tabPurchase Receipt Item` pr_item
            INNER JOIN `tabPurchase Receipt` pr ON pr.name = pr_item.parent
            WHERE pr_item.item_code = %s 
            AND pr.docstatus = 1
            AND pr_item.rate > 0
            ORDER BY pr.posting_date DESC, pr.creation DESC
            LIMIT 1
        """, item_code)
        
        if last_purchase_rate:
            return flt(last_purchase_rate[0][0])
        
        # Méthode 4: Prix standard depuis Item Price (liste d'achat)
        standard_buying_price = frappe.db.get_value("Item Price", {
            "item_code": item_code,
            "price_list": "Standard Buying",
            "selling": 0
        }, "price_list_rate")
        
        if standard_buying_price:
            return flt(standard_buying_price)
        
        # Si aucune méthode ne fonctionne, retourner 0
        return 0
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération prix de revient {item_code}: {str(e)}")
        return 0

def is_bundle_item(item_code):
    """
    Vérifie si un article est un bundle (contient d'autres articles)
    """
    try:
        # Vérifier s'il existe des entrées dans Product Bundle pour cet item
        bundle_exists = frappe.db.exists("Product Bundle", {"new_item_code": item_code})
        return bool(bundle_exists)
    except Exception as e:
        frappe.log_error(f"Erreur vérification bundle {item_code}: {str(e)}")
        return False

def get_bundle_cost_price(item_code):
    """
    Calcule le prix de revient d'un bundle en additionnant les coûts de ses composants
    VERSION CORRIGÉE
    """
    try:
        total_cost = 0
        
        # CORRECTION: Récupérer d'abord le nom du Product Bundle
        bundle_name = frappe.db.get_value("Product Bundle", {"new_item_code": item_code}, "name")
        
        if not bundle_name:
            frappe.log_error(f"Aucun Product Bundle trouvé pour {item_code}", "Bundle Debug")
            return 0
        
        # Récupérer tous les composants du bundle
        bundle_items = frappe.get_all("Product Bundle Item", 
            filters={"parent": bundle_name},
            fields=["item_code", "qty", "rate", "description"]
        )
        
        frappe.log_error(f"Bundle {item_code} - Trouvé {len(bundle_items)} composants", "Bundle Debug")
        
        for bundle_item in bundle_items:
            component_item_code = bundle_item.get("item_code")
            component_qty = flt(bundle_item.get("qty", 1))
            
            # CORRECTION: NE PAS utiliser le champ "rate" du Product Bundle Item
            # car il peut contenir le prix de vente. Utiliser notre fonction de calcul de coût
            component_cost = get_item_cost_price(component_item_code)
            
            # Si pas de coût trouvé, essayer d'utiliser le prix standard de l'item
            if not component_cost:
                item_standard_rate = frappe.db.get_value("Item", component_item_code, "standard_rate")
                if item_standard_rate:
                    component_cost = flt(item_standard_rate)
            
            # Calculer le sous-total
            component_total = component_cost * component_qty
            total_cost += component_total
            
            # Log pour debug
            frappe.log_error(f"Bundle {item_code} - Composant {component_item_code}: "
                           f"coût={component_cost}, qté={component_qty}, sous-total={component_total}",
                           "Bundle Component Debug")
        
        frappe.log_error(f"Bundle {item_code} - Coût total final: {total_cost}", 
                       "Bundle Total Cost Debug")
        
        return total_cost
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul coût bundle {item_code}: {str(e)}")
        return 0

def get_bundle_details(item_code):
    """
    Récupère les détails des composants d'un bundle pour l'affichage
    VERSION CORRIGÉE
    """
    try:
        if not is_bundle_item(item_code):
            return None
        
        # CORRECTION: Récupérer d'abord le nom du Product Bundle
        bundle_name = frappe.db.get_value("Product Bundle", {"new_item_code": item_code}, "name")
        
        if not bundle_name:
            return None
        
        # Récupérer tous les composants du bundle
        bundle_items = frappe.get_all("Product Bundle Item", 
            filters={"parent": bundle_name},
            fields=["item_code", "qty", "rate", "description"]
        )
        
        components = []
        total_cost = 0
        
        for bundle_item in bundle_items:
            component_item_code = bundle_item.get("item_code")
            component_qty = flt(bundle_item.get("qty", 1))
            
            # Récupérer le nom et le coût du composant
            item_name = frappe.db.get_value("Item", component_item_code, "item_name") or component_item_code
            
            # CORRECTION: Utiliser notre fonction de calcul de coût au lieu du rate
            component_cost = get_item_cost_price(component_item_code)
            
            # Si pas de coût trouvé, essayer le prix standard
            if not component_cost:
                item_standard_rate = frappe.db.get_value("Item", component_item_code, "standard_rate")
                if item_standard_rate:
                    component_cost = flt(item_standard_rate)
            
            component_total = component_cost * component_qty
            
            components.append({
                "item_code": component_item_code,
                "item_name": item_name,
                "qty": component_qty,
                "cost_price": component_cost,
                "total_cost": component_total,
                "description": bundle_item.get("description") or ""
            })
            
            total_cost += component_total
        
        return {
            "components": components,
            "total_components": len(components),
            "total_cost": total_cost
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération détails bundle {item_code}: {str(e)}")
        return None

def get_margin_status(margin_percentage):
    """
    Détermine le statut de la marge selon les seuils définis
    """
    margin_percentage = flt(margin_percentage)
    
    if margin_percentage >= 30:
        return "excellent"
    elif margin_percentage >= 20:
        return "good"
    elif margin_percentage >= 10:
        return "acceptable"
    elif margin_percentage >= 0:
        return "low"
    else:
        return "negative"

@frappe.whitelist()
def calculate_quotation_margin(quotation_name):
    """
    Calcule la marge globale d'un devis
    """
    try:
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        total_cost = 0
        total_selling = 0
        items_analysis = []
        
        for item in quotation.items:
            # Calculer la marge pour chaque article
            item_margin = calculate_item_margin(
                item.item_code, 
                item.rate, 
                item.qty
            )
            
            if item_margin["status"] == "success":
                item_cost = flt(item_margin["cost_price"]) * flt(item.qty)
                item_selling = flt(item.amount)
                
                total_cost += item_cost
                total_selling += item_selling
                
                items_analysis.append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": item.qty,
                    "rate": item.rate,
                    "amount": item.amount,
                    "cost_price": item_margin["cost_price"],
                    "total_cost": item_cost,
                    "margin_amount": item_selling - item_cost,
                    "margin_percentage": item_margin["margin_percentage"],
                    "margin_status": item_margin["margin_status"],
                    "is_bundle": item_margin.get("is_bundle", False),
                    "bundle_details": item_margin.get("bundle_details")
                })
        
        # Calculer la marge globale
        global_margin_amount = total_selling - total_cost
        global_margin_percentage = 0
        
        if total_selling > 0:
            global_margin_percentage = (global_margin_amount / total_selling) * 100
        
        global_status = get_margin_status(global_margin_percentage)
        
        return {
            "status": "success",
            "quotation_name": quotation_name,
            "total_selling": total_selling,
            "total_cost": total_cost,
            "global_margin_amount": global_margin_amount,
            "global_margin_percentage": global_margin_percentage,
            "global_margin_status": global_status,
            "items_count": len(items_analysis),
            "items_analysis": items_analysis
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul marge devis {quotation_name}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def update_item_valuation_rate(item_code, valuation_rate):
    """
    Met à jour le prix de valorisation d'un article
    """
    try:
        frappe.db.set_value("Item", item_code, "valuation_rate", flt(valuation_rate))
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"Prix de valorisation mis à jour pour {item_code}: {valuation_rate}"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ========================================
# HOOKS POUR CALCUL AUTOMATIQUE
# ========================================

def quotation_on_save(doc, method):
    """
    Hook appelé lors de la sauvegarde d'un devis
    Calcule automatiquement les marges
    """
    try:
        if not doc.get("custom_margin_calculated"):
            calculate_and_update_quotation_margins(doc)
    except Exception as e:
        frappe.log_error(f"Erreur calcul automatique marge devis {doc.name}: {str(e)}")

def calculate_and_update_quotation_margins(doc):
    """
    Calcule et met à jour les champs de marge du devis
    """
    try:
        total_cost = 0
        total_selling = 0
        
        for item in doc.items:
            # Calculer le coût pour chaque article
            cost_price = get_item_cost_price(item.item_code)
            item_cost = flt(cost_price) * flt(item.qty)
            item_selling = flt(item.amount)
            
            total_cost += item_cost
            total_selling += item_selling
            
            # Mettre à jour les champs personnalisés de l'article si ils existent
            if hasattr(item, 'custom_cost_price'):
                item.custom_cost_price = cost_price
            if hasattr(item, 'custom_margin_amount'):
                item.custom_margin_amount = item_selling - item_cost
            if hasattr(item, 'custom_margin_percentage'):
                if item_selling > 0:
                    item.custom_margin_percentage = ((item_selling - item_cost) / item_selling) * 100
        
        # Calculer la marge globale
        global_margin_amount = total_selling - total_cost
        global_margin_percentage = 0
        
        if total_selling > 0:
            global_margin_percentage = (global_margin_amount / total_selling) * 100
        
        # Mettre à jour les champs personnalisés du devis si ils existent
        if hasattr(doc, 'custom_total_cost'):
            doc.custom_total_cost = total_cost
        if hasattr(doc, 'custom_margin_amount'):
            doc.custom_margin_amount = global_margin_amount
        if hasattr(doc, 'custom_margin_percentage'):
            doc.custom_margin_percentage = global_margin_percentage
        if hasattr(doc, 'custom_margin_status'):
            doc.custom_margin_status = get_margin_status(global_margin_percentage)
        
        # Marquer comme calculé
        doc.custom_margin_calculated = 1
        
    except Exception as e:
        frappe.log_error(f"Erreur mise à jour marges devis: {str(e)}")

# ========================================
# FONCTIONS UTILITAIRES
# ========================================

@frappe.whitelist()
def bulk_update_valuation_rates(items_data):
    """
    Met à jour en masse les prix de valorisation
    """
    try:
        items_data = frappe.parse_json(items_data) if isinstance(items_data, str) else items_data
        
        updated_count = 0
        errors = []
        
        for item_data in items_data:
            try:
                item_code = item_data.get("item_code")
                valuation_rate = flt(item_data.get("valuation_rate"))
                
                if item_code and valuation_rate > 0:
                    frappe.db.set_value("Item", item_code, "valuation_rate", valuation_rate)
                    updated_count += 1
                    
            except Exception as e:
                errors.append(f"Erreur {item_code}: {str(e)}")
        
        frappe.db.commit()
        
        return {
            "status": "success",
            "updated_count": updated_count,
            "errors": errors
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def export_items_for_valuation_update():
    """
    Exporte la liste des articles pour mise à jour des prix de valorisation
    """
    try:
        items = frappe.db.sql("""
            SELECT 
                name as item_code,
                item_name,
                valuation_rate,
                standard_rate,
                item_group,
                disabled
            FROM `tabItem`
            WHERE disabled = 0
            ORDER BY item_name
        """, as_dict=True)
        
        return {
            "status": "success",
            "items": items
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def sync_valuation_from_last_purchase():
    """
    Synchronise les prix de valorisation depuis les derniers achats
    """
    try:
        # Récupérer les articles sans valorisation
        items = frappe.db.sql("""
            SELECT name as item_code
            FROM `tabItem`
            WHERE (valuation_rate IS NULL OR valuation_rate = 0)
            AND disabled = 0
            LIMIT 100
        """, as_dict=True)
        
        updated_count = 0
        
        for item in items:
            # Récupérer le dernier prix d'achat
            last_rate = frappe.db.sql("""
                SELECT pri.rate
                FROM `tabPurchase Receipt Item` pri
                INNER JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
                WHERE pri.item_code = %s AND pr.docstatus = 1 AND pri.rate > 0
                ORDER BY pr.posting_date DESC, pr.creation DESC
                LIMIT 1
            """, item.item_code)
            
            if last_rate:
                frappe.db.set_value("Item", item.item_code, "valuation_rate", last_rate[0][0])
                updated_count += 1
        
        frappe.db.commit()
        
        return {
            "status": "success",
            "message": f"{updated_count} prix de valorisation mis à jour",
            "updated_count": updated_count
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ========================================
# API pour vérifier la configuration avec support Bundle
# ========================================

@frappe.whitelist()
def check_margin_setup():
    """
    Vérifie que tous les champs nécessaires existent
    INCLUT la vérification des bundles
    """
    try:
        # Vérifier les champs Quotation
        quotation_fields = [
            "custom_total_cost",
            "custom_margin_amount", 
            "custom_margin_percentage",
            "custom_margin_status",
            "custom_margin_calculated"
        ]
        
        missing_quotation_fields = []
        for field in quotation_fields:
            if not frappe.db.has_column("Quotation", field):
                missing_quotation_fields.append(field)
        
        # Vérifier les champs Quotation Item
        quotation_item_fields = [
            "custom_cost_price",
            "custom_margin_amount",
            "custom_margin_percentage"
        ]
        
        missing_item_fields = []
        for field in quotation_item_fields:
            if not frappe.db.has_column("Quotation Item", field):
                missing_item_fields.append(field)
        
        # Vérifier quelques articles avec valuation_rate
        items_with_valuation = frappe.db.count("Item", {
            "valuation_rate": [">", 0],
            "disabled": 0
        })
        
        total_items = frappe.db.count("Item", {"disabled": 0})
        
        # NOUVEAU: Statistiques sur les bundles
        total_bundles = frappe.db.count("Product Bundle")
        bundles_with_cost = 0
        
        # Compter les bundles qui ont un coût calculable
        if total_bundles > 0:
            all_bundles = frappe.get_all("Product Bundle", fields=["new_item_code"])
            for bundle in all_bundles:
                if get_bundle_cost_price(bundle.new_item_code) > 0:
                    bundles_with_cost += 1
        
        return {
            "status": "success",
            "quotation_fields_missing": missing_quotation_fields,
            "quotation_item_fields_missing": missing_item_fields,
            "items_with_valuation": items_with_valuation,
            "total_items": total_items,
            "valuation_coverage": f"{(items_with_valuation/total_items)*100:.1f}%" if total_items > 0 else "0%",
            "total_bundles": total_bundles,
            "bundles_with_cost": bundles_with_cost,
            "bundle_coverage": f"{(bundles_with_cost/total_bundles)*100:.1f}%" if total_bundles > 0 else "0%",
            "ready_for_use": len(missing_quotation_fields) == 0 and len(missing_item_fields) == 0
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": str(e)
        }

@frappe.whitelist()
def analyze_bundle_item(item_code):
    """
    Analyse détaillée d'un bundle item avec tous ses composants
    """
    try:
        if not is_bundle_item(item_code):
            return {
                "status": "error",
                "message": f"{item_code} n'est pas un bundle item"
            }
        
        # Récupérer les détails du bundle
        bundle_details = get_bundle_details(item_code)
        
        if not bundle_details:
            return {
                "status": "error",
                "message": f"Impossible de récupérer les détails du bundle {item_code}"
            }
        
        # Récupérer le nom de l'article bundle
        item_name = frappe.db.get_value("Item", item_code, "item_name") or item_code
        
        # Récupérer le prix de vente du bundle s'il existe
        standard_selling_price = frappe.db.get_value("Item Price", {
            "item_code": item_code,
            "price_list": "Standard Selling",
            "selling": 1
        }, "price_list_rate") or 0
        
        # Calculer la marge si on a un prix de vente
        margin_info = None
        if standard_selling_price > 0:
            margin_result = calculate_item_margin(item_code, standard_selling_price, 1)
            if margin_result["status"] == "success":
                margin_info = margin_result
        
        return {
            "status": "success",
            "item_code": item_code,
            "item_name": item_name,
            "standard_selling_price": standard_selling_price,
            "bundle_details": bundle_details,
            "margin_info": margin_info,
            "components_count": len(bundle_details["components"]),
            "total_cost": bundle_details["total_cost"]
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur analyse bundle {item_code}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def get_all_bundles_analysis():
    """
    Analyse de tous les bundles du système
    """
    try:
        # Récupérer tous les bundles
        all_bundles = frappe.get_all("Product Bundle", 
            fields=["new_item_code", "name"],
            order_by="new_item_code"
        )
        
        bundles_analysis = []
        
        for bundle in all_bundles:
            item_code = bundle.new_item_code
            
            # Analyser chaque bundle
            analysis = analyze_bundle_item(item_code)
            
            if analysis["status"] == "success":
                bundles_analysis.append({
                    "item_code": item_code,
                    "item_name": analysis["item_name"],
                    "components_count": analysis["components_count"],
                    "total_cost": analysis["total_cost"],
                    "standard_selling_price": analysis["standard_selling_price"],
                    "margin_percentage": analysis["margin_info"]["margin_percentage"] if analysis["margin_info"] else 0,
                    "margin_status": analysis["margin_info"]["margin_status"] if analysis["margin_info"] else "unknown",
                    "has_selling_price": analysis["standard_selling_price"] > 0
                })
        
        # Statistiques globales
        total_bundles = len(bundles_analysis)
        bundles_with_price = len([b for b in bundles_analysis if b["has_selling_price"]])
        bundles_with_cost = len([b for b in bundles_analysis if b["total_cost"] > 0])
        
        return {
            "status": "success",
            "total_bundles": total_bundles,
            "bundles_with_price": bundles_with_price,
            "bundles_with_cost": bundles_with_cost,
            "bundles_analysis": bundles_analysis
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur analyse globale bundles: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

# ========================================
# FONCTION DEBUG POUR TESTER UN BUNDLE SPÉCIFIQUE
# ========================================

@frappe.whitelist()
def debug_bundle_calculation(item_code):
    """
    Fonction de debug pour analyser un bundle spécifique
    """
    try:
        result = {
            "item_code": item_code,
            "is_bundle": is_bundle_item(item_code),
            "bundle_exists": bool(frappe.db.exists("Product Bundle", {"new_item_code": item_code})),
            "steps": []
        }
        
        if result["is_bundle"]:
            # Étape 1: Trouver le Product Bundle
            bundle_name = frappe.db.get_value("Product Bundle", {"new_item_code": item_code}, "name")
            result["bundle_name"] = bundle_name
            result["steps"].append(f"Product Bundle trouvé: {bundle_name}")
            
            # Étape 2: Récupérer les composants
            if bundle_name:
                bundle_items = frappe.get_all("Product Bundle Item", 
                    filters={"parent": bundle_name},
                    fields=["item_code", "qty", "rate", "description"]
                )
                result["components_count"] = len(bundle_items)
                result["steps"].append(f"Composants trouvés: {len(bundle_items)}")
                
                # Étape 3: Calculer le coût de chaque composant
                total_cost = 0
                components_detail = []
                
                for bundle_item in bundle_items:
                    component_item_code = bundle_item.get("item_code")
                    component_qty = flt(bundle_item.get("qty", 1))
                    
                    # Récupérer le coût du composant
                    component_cost = get_item_cost_price(component_item_code)
                    component_total = component_cost * component_qty
                    total_cost += component_total
                    
                    components_detail.append({
                        "item_code": component_item_code,
                        "qty": component_qty,
                        "rate_in_bundle": bundle_item.get("rate", 0),  # Prix dans le bundle
                        "calculated_cost": component_cost,  # Coût calculé
                        "total_cost": component_total
                    })
                    
                    result["steps"].append(f"Composant {component_item_code}: qté={component_qty}, coût={component_cost}, total={component_total}")
                
                result["total_calculated_cost"] = total_cost
                result["components_detail"] = components_detail
                result["steps"].append(f"Coût total calculé: {total_cost}")
            
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "item_code": item_code
        }