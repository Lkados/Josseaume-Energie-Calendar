# josseaume_energies/margin_calculation_simple.py - VERSION CORRIGÉE AVEC REMISES

import frappe
from frappe import _
from frappe.utils import flt, cstr

# ========================================
# FONCTIONS POUR LE CALCUL DES MARGES AVEC GESTION REMISES ET PRIX ZÉRO
# ========================================

@frappe.whitelist()
def calculate_item_margin(item_code, selling_price, qty=1, discount_percentage=0, discount_amount=0):
    """
    Calcule la marge pour un article donné (AMÉLIORÉ : gère remises et prix zéro)
    """
    try:
        # Récupérer le prix de revient de l'article (bundle ou normal)
        cost_price = get_item_cost_price_safe(item_code)
        
        # Vérifier si c'est un bundle pour fournir des détails supplémentaires
        is_bundle = is_bundle_item(item_code)
        bundle_details = None
        
        if is_bundle:
            bundle_details = get_bundle_details(item_code)
        
        # NOUVEAU : Calculer le prix de vente net après remise
        selling_price = flt(selling_price)
        qty = flt(qty) or 1
        discount_percentage = flt(discount_percentage)
        discount_amount = flt(discount_amount)
        
        # Calculer le prix de vente net
        net_selling_price = calculate_net_selling_price(selling_price, discount_percentage, discount_amount)
        
        # Log pour debug
        frappe.log_error(f"Calcul marge {item_code}: prix_brut={selling_price}, remise%={discount_percentage}, remise_montant={discount_amount}, prix_net={net_selling_price}, coût={cost_price}", "Margin Debug")
        
        # Calculer la marge
        cost_price = flt(cost_price)  # Garantit que c'est un nombre (0 si pas de prix)
        
        # Marge en montant (pour la quantité)
        margin_amount = (net_selling_price - cost_price) * qty
        
        # Marge en pourcentage
        margin_percentage = 0
        if net_selling_price > 0:
            margin_percentage = ((net_selling_price - cost_price) / net_selling_price) * 100
        
        # Déterminer le statut selon le taux de marge
        status = get_margin_status(margin_percentage)
        
        # NOUVEAU : Informations sur les remises
        discount_info = {
            "has_discount": discount_percentage > 0 or discount_amount > 0,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "gross_selling_price": selling_price,
            "net_selling_price": net_selling_price,
            "discount_total": selling_price - net_selling_price
        }
        
        # NOUVEAU : Alertes spéciales
        alerts = []
        if cost_price == 0:
            alerts.append("Prix de revient non défini (coût = 0€)")
        if net_selling_price <= cost_price and cost_price > 0:
            alerts.append("Vente à perte détectée")
        if discount_percentage > 50:
            alerts.append("Remise très importante (>50%)")
        
        return {
            "status": "success",
            "cost_price": cost_price,
            "selling_price": net_selling_price,  # Prix net utilisé pour les calculs
            "gross_selling_price": selling_price,  # Prix brut original
            "margin_amount": margin_amount,
            "margin_percentage": margin_percentage,
            "margin_status": status,
            "qty": qty,
            "is_bundle": is_bundle,
            "bundle_details": bundle_details,
            "discount_info": discount_info,
            "alerts": alerts
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul marge pour {item_code}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def get_item_cost_price_safe(item_code):
    """
    Version sécurisée de get_item_cost_price qui garantit un retour numérique
    AMÉLIORÉ : Garantit toujours un nombre (0 minimum)
    """
    try:
        cost_price = get_item_cost_price(item_code)
        
        # S'assurer qu'on a un nombre valide
        cost_price = flt(cost_price)
        
        # Si négatif ou NaN, forcer à 0
        if cost_price < 0 or not cost_price == cost_price:  # NaN check
            cost_price = 0
            
        frappe.log_error(f"Prix de revient pour {item_code}: {cost_price}", "Cost Price Debug")
        
        return cost_price
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération prix de revient {item_code}: {str(e)}")
        return 0  # Retourner 0 en cas d'erreur

def calculate_net_selling_price(gross_price, discount_percentage=0, discount_amount=0):
    """
    Calcule le prix de vente net après application des remises
    NOUVEAU : Gestion complète des remises
    """
    try:
        gross_price = flt(gross_price)
        discount_percentage = flt(discount_percentage)
        discount_amount = flt(discount_amount)
        
        # Appliquer d'abord la remise en pourcentage
        net_price = gross_price
        if discount_percentage > 0:
            net_price = gross_price * (1 - discount_percentage / 100)
        
        # Puis soustraire la remise en montant
        if discount_amount > 0:
            net_price = net_price - discount_amount
        
        # S'assurer que le prix ne devient pas négatif
        if net_price < 0:
            net_price = 0
            
        return net_price
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul prix net: {str(e)}")
        return flt(gross_price)  # Retourner le prix brut en cas d'erreur

@frappe.whitelist()
def calculate_quotation_margin(quotation_name):
    """
    Calcule la marge globale d'un devis (AMÉLIORÉ : avec remises)
    """
    try:
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        total_cost = 0
        total_selling_gross = 0
        total_selling_net = 0
        items_analysis = []
        total_discount = 0
        
        for item in quotation.items:
            # NOUVEAU : Récupérer les informations de remise de l'article
            discount_percentage = flt(getattr(item, 'discount_percentage', 0))
            discount_amount = flt(getattr(item, 'discount_amount', 0))
            
            # Calculer la marge pour chaque article avec remises
            item_margin = calculate_item_margin(
                item.item_code, 
                item.rate, 
                item.qty,
                discount_percentage,
                discount_amount
            )
            
            if item_margin["status"] == "success":
                item_cost = flt(item_margin["cost_price"]) * flt(item.qty)
                item_selling_gross = flt(item.rate) * flt(item.qty)
                item_selling_net = flt(item_margin["selling_price"]) * flt(item.qty)
                
                # CORRECTION : Utiliser le montant net réel de l'article
                # ERPNext calcule déjà le montant net dans item.amount
                item_amount_net = flt(item.amount)  # Montant déjà calculé par ERPNext
                
                total_cost += item_cost
                total_selling_gross += item_selling_gross
                total_selling_net += item_amount_net  # Utiliser le montant ERPNext
                total_discount += (item_selling_gross - item_amount_net)
                
                items_analysis.append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": item.qty,
                    "rate": item.rate,
                    "amount_gross": item_selling_gross,
                    "amount_net": item_amount_net,
                    "cost_price": item_margin["cost_price"],
                    "total_cost": item_cost,
                    "margin_amount": item_amount_net - item_cost,
                    "margin_percentage": item_margin["margin_percentage"],
                    "margin_status": item_margin["margin_status"],
                    "is_bundle": item_margin.get("is_bundle", False),
                    "bundle_details": item_margin.get("bundle_details"),
                    "discount_info": item_margin.get("discount_info", {}),
                    "alerts": item_margin.get("alerts", [])
                })
        
        # NOUVEAU : Appliquer les remises globales du devis
        additional_discount = flt(getattr(quotation, 'discount_amount', 0))
        if additional_discount > 0:
            total_selling_net -= additional_discount
            total_discount += additional_discount
        
        # Calculer la marge globale
        global_margin_amount = total_selling_net - total_cost
        global_margin_percentage = 0
        
        if total_selling_net > 0:
            global_margin_percentage = (global_margin_amount / total_selling_net) * 100
        
        global_status = get_margin_status(global_margin_percentage)
        
        # NOUVEAU : Statistiques sur les remises
        discount_stats = {
            "total_gross": total_selling_gross,
            "total_net": total_selling_net,
            "total_discount": total_discount,
            "discount_percentage_global": (total_discount / total_selling_gross * 100) if total_selling_gross > 0 else 0,
            "has_discounts": total_discount > 0
        }
        
        # NOUVEAU : Alertes globales
        global_alerts = []
        items_without_cost = len([item for item in items_analysis if item["cost_price"] == 0])
        if items_without_cost > 0:
            global_alerts.append(f"{items_without_cost} article(s) sans prix de revient")
        
        negative_margin_items = len([item for item in items_analysis if item["margin_percentage"] < 0])
        if negative_margin_items > 0:
            global_alerts.append(f"{negative_margin_items} article(s) en perte")
            
        if discount_stats["discount_percentage_global"] > 20:
            global_alerts.append(f"Remise globale importante ({discount_stats['discount_percentage_global']:.1f}%)")
        
        return {
            "status": "success",
            "quotation_name": quotation_name,
            "total_selling_gross": total_selling_gross,
            "total_selling_net": total_selling_net,
            "total_cost": total_cost,
            "global_margin_amount": global_margin_amount,
            "global_margin_percentage": global_margin_percentage,
            "global_margin_status": global_status,
            "items_count": len(items_analysis),
            "items_analysis": items_analysis,
            "discount_stats": discount_stats,
            "global_alerts": global_alerts
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul marge devis {quotation_name}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

# ========================================
# FONCTIONS EXISTANTES AMÉLIORÉES
# ========================================

def get_item_cost_price(item_code):
    """
    Récupère le prix de revient d'un article selon plusieurs méthodes
    INCLUT le support des bundle items (articles en kit)
    AMÉLIORÉ : Retourne toujours 0 minimum
    """
    try:
        # NOUVEAU: Vérifier si c'est un bundle item
        if is_bundle_item(item_code):
            bundle_cost = get_bundle_cost_price(item_code)
            frappe.log_error(f"Bundle {item_code} - Coût calculé: {bundle_cost}", "Bundle Cost Debug")
            return max(0, flt(bundle_cost))  # S'assurer que c'est >= 0
        
        # Méthode 1: Champ custom_standard_cost si il existe
        try:
            custom_cost = frappe.db.get_value("Item", item_code, "custom_standard_cost")
            if custom_cost and flt(custom_cost) > 0:
                return flt(custom_cost)
        except:
            pass  # Le champ n'existe pas encore
        
        # Méthode 2: Prix de valorisation standard (valuation_rate) - SOURCE PRINCIPALE
        valuation_rate = frappe.db.get_value("Item", item_code, "valuation_rate")
        if valuation_rate and flt(valuation_rate) > 0:
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
        
        if last_purchase_rate and flt(last_purchase_rate[0][0]) > 0:
            return flt(last_purchase_rate[0][0])
        
        # Méthode 4: Prix standard depuis Item Price (liste d'achat)
        standard_buying_price = frappe.db.get_value("Item Price", {
            "item_code": item_code,
            "price_list": "Standard Buying",
            "selling": 0
        }, "price_list_rate")
        
        if standard_buying_price and flt(standard_buying_price) > 0:
            return flt(standard_buying_price)
        
        # AMÉLIORÉ : Si aucune méthode ne fonctionne, retourner 0 (et non None)
        frappe.log_error(f"Aucun prix de revient trouvé pour {item_code}, coût = 0€", "Missing Cost Price")
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
    AMÉLIORÉ : Gestion des coûts zéro
    """
    try:
        total_cost = 0
        
        # Récupérer d'abord le nom du Product Bundle
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
            
            # Utiliser notre fonction sécurisée pour le coût
            component_cost = get_item_cost_price_safe(component_item_code)
            
            # Calculer le sous-total
            component_total = component_cost * component_qty
            total_cost += component_total
            
            # Log pour debug
            frappe.log_error(f"Bundle {item_code} - Composant {component_item_code}: "
                           f"coût={component_cost}, qté={component_qty}, sous-total={component_total}",
                           "Bundle Component Debug")
        
        frappe.log_error(f"Bundle {item_code} - Coût total final: {total_cost}", 
                       "Bundle Total Cost Debug")
        
        return max(0, total_cost)  # S'assurer que c'est >= 0
        
    except Exception as e:
        frappe.log_error(f"Erreur calcul coût bundle {item_code}: {str(e)}")
        return 0

def get_bundle_details(item_code):
    """
    Récupère les détails des composants d'un bundle pour l'affichage
    AMÉLIORÉ : Gestion des coûts zéro
    """
    try:
        if not is_bundle_item(item_code):
            return None
        
        # Récupérer d'abord le nom du Product Bundle
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
            
            # Utiliser notre fonction sécurisée
            component_cost = get_item_cost_price_safe(component_item_code)
            
            component_total = component_cost * component_qty
            
            components.append({
                "item_code": component_item_code,
                "item_name": item_name,
                "qty": component_qty,
                "cost_price": component_cost,
                "total_cost": component_total,
                "description": bundle_item.get("description") or "",
                "has_cost": component_cost > 0  # NOUVEAU : Indiquer si le composant a un coût
            })
            
            total_cost += component_total
        
        return {
            "components": components,
            "total_components": len(components),
            "total_cost": total_cost,
            "components_with_cost": len([c for c in components if c["has_cost"]]),
            "components_without_cost": len([c for c in components if not c["has_cost"]])
        }
        
    except Exception as e:
        frappe.log_error(f"Erreur récupération détails bundle {item_code}: {str(e)}")
        return None

def get_margin_status(margin_percentage):
    """
    Détermine le statut de la marge selon les seuils définis
    AMÉLIORÉ : Gestion des marges extrêmes
    """
    margin_percentage = flt(margin_percentage)
    
    if margin_percentage >= 50:
        return "exceptional"  # NOUVEAU : Marges exceptionnelles
    elif margin_percentage >= 30:
        return "excellent"
    elif margin_percentage >= 20:
        return "good"
    elif margin_percentage >= 10:
        return "acceptable"
    elif margin_percentage >= 0:
        return "low"
    else:
        return "negative"

# ========================================
# FONCTIONS UTILITAIRES AMÉLIORÉES
# ========================================

@frappe.whitelist()
def check_items_without_cost():
    """
    NOUVELLE FONCTION : Identifie tous les articles sans prix de revient
    """
    try:
        # Récupérer tous les articles actifs
        items = frappe.get_all("Item", 
            filters={"disabled": 0},
            fields=["item_code", "item_name", "valuation_rate", "item_group"]
        )
        
        items_without_cost = []
        items_with_cost = 0
        
        for item in items:
            cost_price = get_item_cost_price_safe(item.item_code)
            
            if cost_price == 0:
                items_without_cost.append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "item_group": item.item_group,
                    "valuation_rate": item.valuation_rate
                })
            else:
                items_with_cost += 1
        
        return {
            "status": "success",
            "total_items": len(items),
            "items_with_cost": items_with_cost,
            "items_without_cost": len(items_without_cost),
            "coverage_percentage": (items_with_cost / len(items) * 100) if len(items) > 0 else 0,
            "items_without_cost_details": items_without_cost
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def analyze_quotation_discounts(quotation_name):
    """
    NOUVELLE FONCTION : Analyse détaillée des remises d'un devis
    """
    try:
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        total_items = len(quotation.items)
        items_with_discount = 0
        total_discount_amount = 0
        discount_analysis = []
        
        for item in quotation.items:
            discount_percentage = flt(getattr(item, 'discount_percentage', 0))
            discount_amount = flt(getattr(item, 'discount_amount', 0))
            
            gross_amount = flt(item.rate) * flt(item.qty)
            net_amount = flt(item.amount)
            item_discount = gross_amount - net_amount
            
            if discount_percentage > 0 or discount_amount > 0 or item_discount > 0:
                items_with_discount += 1
                total_discount_amount += item_discount
                
                discount_analysis.append({
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "gross_amount": gross_amount,
                    "net_amount": net_amount,
                    "discount_amount": item_discount,
                    "discount_percentage": (item_discount / gross_amount * 100) if gross_amount > 0 else 0
                })
        
        # Remise globale du devis
        global_discount = flt(getattr(quotation, 'discount_amount', 0))
        total_discount_amount += global_discount
        
        total_gross = sum(flt(item.rate) * flt(item.qty) for item in quotation.items)
        total_net = flt(quotation.net_total)
        
        return {
            "status": "success",
            "quotation_name": quotation_name,
            "total_items": total_items,
            "items_with_discount": items_with_discount,
            "total_gross": total_gross,
            "total_net": total_net,
            "total_discount": total_discount_amount,
            "global_discount_percentage": (total_discount_amount / total_gross * 100) if total_gross > 0 else 0,
            "discount_analysis": discount_analysis,
            "global_discount": global_discount
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ========================================
# HOOKS AMÉLIORÉS
# ========================================

def quotation_on_save(doc, method):
    """
    Hook appelé lors de la sauvegarde d'un devis
    AMÉLIORÉ : Calcule automatiquement les marges avec remises
    """
    try:
        if not doc.get("custom_margin_calculated"):
            calculate_and_update_quotation_margins_with_discounts(doc)
    except Exception as e:
        frappe.log_error(f"Erreur calcul automatique marge devis {doc.name}: {str(e)}")

def calculate_and_update_quotation_margins_with_discounts(doc):
    """
    AMÉLIORÉ : Calcule et met à jour les champs de marge du devis avec remises
    """
    try:
        total_cost = 0
        total_selling_gross = 0
        total_selling_net = 0
        
        for item in doc.items:
            # Récupérer les informations de remise
            discount_percentage = flt(getattr(item, 'discount_percentage', 0))
            discount_amount = flt(getattr(item, 'discount_amount', 0))
            
            # Calculer le coût pour chaque article
            cost_price = get_item_cost_price_safe(item.item_code)
            item_cost = cost_price * flt(item.qty)
            
            # Calculs de vente
            item_selling_gross = flt(item.rate) * flt(item.qty)
            item_selling_net = flt(item.amount)  # ERPNext calcule déjà le net
            
            total_cost += item_cost
            total_selling_gross += item_selling_gross
            total_selling_net += item_selling_net
            
            # Mettre à jour les champs personnalisés de l'article si ils existent
            if hasattr(item, 'custom_cost_price'):
                item.custom_cost_price = cost_price
            if hasattr(item, 'custom_margin_amount'):
                item.custom_margin_amount = item_selling_net - item_cost
            if hasattr(item, 'custom_margin_percentage'):
                if item_selling_net > 0:
                    item.custom_margin_percentage = ((item_selling_net - item_cost) / item_selling_net) * 100
        
        # Appliquer les remises globales
        additional_discount = flt(getattr(doc, 'discount_amount', 0))
        if additional_discount > 0:
            total_selling_net -= additional_discount
        
        # Calculer la marge globale
        global_margin_amount = total_selling_net - total_cost
        global_margin_percentage = 0
        
        if total_selling_net > 0:
            global_margin_percentage = (global_margin_amount / total_selling_net) * 100
        
        # Mettre à jour les champs personnalisés du devis si ils existent
        if hasattr(doc, 'custom_total_cost'):
            doc.custom_total_cost = total_cost
        if hasattr(doc, 'custom_margin_amount'):
            doc.custom_margin_amount = global_margin_amount
        if hasattr(doc, 'custom_margin_percentage'):
            doc.custom_margin_percentage = global_margin_percentage
        if hasattr(doc, 'custom_margin_status'):
            doc.custom_margin_status = get_margin_status(global_margin_percentage)
        
        # NOUVEAU : Champs pour les remises
        if hasattr(doc, 'custom_total_gross'):
            doc.custom_total_gross = total_selling_gross
        if hasattr(doc, 'custom_total_discount'):
            doc.custom_total_discount = total_selling_gross - total_selling_net
        
        # Marquer comme calculé
        doc.custom_margin_calculated = 1
        
        frappe.log_error(f"Marges calculées pour {doc.name}: brut={total_selling_gross}, net={total_selling_net}, coût={total_cost}, marge={global_margin_percentage:.2f}%", "Margin Calculation")
        
    except Exception as e:
        frappe.log_error(f"Erreur mise à jour marges devis avec remises: {str(e)}")

# ========================================
# AUTRES FONCTIONS EXISTANTES (inchangées)
# ========================================

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
                
                if item_code and valuation_rate >= 0:  # AMÉLIORÉ : Accepter 0
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

@frappe.whitelist()
def check_margin_setup():
    """
    Vérifie que tous les champs nécessaires existent
    AMÉLIORÉ : Inclut les statistiques de remises et coûts zéro
    """
    try:
        # Vérifier les champs Quotation
        quotation_fields = [
            "custom_total_cost",
            "custom_margin_amount", 
            "custom_margin_percentage",
            "custom_margin_status",
            "custom_margin_calculated",
            "custom_total_gross",  # NOUVEAU
            "custom_total_discount"  # NOUVEAU
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
        
        # Statistiques des articles avec valorisation
        items_with_valuation = frappe.db.count("Item", {
            "valuation_rate": [">", 0],
            "disabled": 0
        })
        
        total_items = frappe.db.count("Item", {"disabled": 0})
        
        # NOUVEAU : Statistiques sur les bundles
        total_bundles = frappe.db.count("Product Bundle")
        bundles_with_cost = 0
        
        # Compter les bundles qui ont un coût calculable
        if total_bundles > 0:
            all_bundles = frappe.get_all("Product Bundle", fields=["new_item_code"])
            for bundle in all_bundles:
                if get_bundle_cost_price(bundle.new_item_code) > 0:
                    bundles_with_cost += 1
        
        # NOUVEAU : Vérifier des devis récents avec remises
        recent_quotations_with_discounts = frappe.db.count("Quotation", {
            "creation": [">=", "2024-01-01"],
            "discount_amount": [">", 0]
        })
        
        return {
            "status": "success",
            "quotation_fields_missing": missing_quotation_fields,
            "quotation_item_fields_missing": missing_item_fields,
            "items_with_valuation": items_with_valuation,
            "total_items": total_items,
            "items_without_valuation": total_items - items_with_valuation,
            "valuation_coverage": f"{(items_with_valuation/total_items)*100:.1f}%" if total_items > 0 else "0%",
            "total_bundles": total_bundles,
            "bundles_with_cost": bundles_with_cost,
            "bundle_coverage": f"{(bundles_with_cost/total_bundles)*100:.1f}%" if total_bundles > 0 else "0%",
            "recent_quotations_with_discounts": recent_quotations_with_discounts,
            "ready_for_use": len(missing_quotation_fields) == 0 and len(missing_item_fields) == 0,
            "improvements": [
                f"{total_items - items_with_valuation} articles sans prix de revient seront traités avec coût=0€",
                "Les remises sont maintenant incluses dans les calculs de marge",
                "Gestion améliorée des bundles avec composants sans coût"
            ]
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
            "total_cost": bundle_details["total_cost"],
            "components_with_cost": bundle_details["components_with_cost"],
            "components_without_cost": bundle_details["components_without_cost"]
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
                    "has_selling_price": analysis["standard_selling_price"] > 0,
                    "components_with_cost": analysis["components_with_cost"],
                    "components_without_cost": analysis["components_without_cost"]
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
                    
                    # Récupérer le coût du composant avec notre fonction sécurisée
                    component_cost = get_item_cost_price_safe(component_item_code)
                    component_total = component_cost * component_qty
                    total_cost += component_total
                    
                    components_detail.append({
                        "item_code": component_item_code,
                        "qty": component_qty,
                        "rate_in_bundle": bundle_item.get("rate", 0),  # Prix dans le bundle
                        "calculated_cost": component_cost,  # Coût calculé
                        "total_cost": component_total,
                        "has_cost": component_cost > 0  # NOUVEAU
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