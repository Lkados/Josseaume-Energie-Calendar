# josseaume_energies/install.py - CONFIGURATION AUTOMATIQUE DES CHAMPS

import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
    """
    Fonction appelée après l'installation de l'app
    Configure tous les champs personnalisés nécessaires
    """
    try:
        print("🚀 Configuration de Josseaume Energies - Calcul de marges amélioré...")
        
        # Créer les champs personnalisés
        create_custom_fields_for_margins()
        
        # Configurer les paramètres par défaut
        setup_default_settings()
        
        # Créer les rôles et permissions
        setup_roles_and_permissions()
        
        # Importer les données de base
        import_master_data()
        
        print("✅ Installation terminée avec succès!")
        
        frappe.msgprint(
            title=_("Installation réussie"),
            msg=_("""
                <h4>Josseaume Energies - Calcul de marges installé!</h4>
                <p><strong>Nouvelles fonctionnalités disponibles:</strong></p>
                <ul>
                    <li>✅ Calcul automatique des marges avec remises</li>
                    <li>✅ Gestion des articles sans prix de revient (coût = 0€)</li>
                    <li>✅ Support amélioré des bundles/kits</li>
                    <li>✅ Analyses détaillées des remises</li>
                    <li>✅ Calendrier des interventions (vue employés)</li>
                </ul>
                <p><strong>Prochaines étapes:</strong></p>
                <ol>
                    <li>Vérifiez les prix de revient de vos articles</li>
                    <li>Testez le calcul des marges sur un devis</li>
                    <li>Configurez le calendrier des interventions</li>
                </ol>
            """),
            indicator="green"
        )
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de l'installation: {str(e)}", "Installation Error")
        print(f"❌ Erreur installation: {str(e)}")

def after_migrate():
    """
    Fonction appelée après une migration/mise à jour
    """
    try:
        print("🔄 Mise à jour de Josseaume Energies...")
        
        # Vérifier et créer les champs manquants
        create_custom_fields_for_margins()
        
        # Mettre à jour les paramètres
        setup_default_settings()
        
        # Recalculer les marges existantes si nécessaire
        migrate_existing_quotations()
        
        print("✅ Mise à jour terminée!")
        
    except Exception as e:
        frappe.log_error(f"Erreur lors de la migration: {str(e)}", "Migration Error")
        print(f"❌ Erreur migration: {str(e)}")

def create_custom_fields_for_margins():
    """
    Crée tous les champs personnalisés nécessaires pour le calcul des marges
    """
    print("📋 Création des champs personnalisés...")
    
    # Champs pour Quotation (devis)
    quotation_fields = {
        "Quotation": [
            {
                "fieldname": "margin_calculation_section",
                "label": "Calcul des Marges",
                "fieldtype": "Section Break",
                "insert_after": "terms",
                "collapsible": 1,
                "description": "Analyse automatique des marges avec prise en compte des remises"
            },
            {
                "fieldname": "custom_margin_calculated",
                "label": "Marges Calculées",
                "fieldtype": "Check",
                "insert_after": "margin_calculation_section",
                "default": 0,
                "read_only": 1,
                "description": "Indique si les marges ont été calculées automatiquement"
            },
            {
                "fieldname": "custom_total_gross",
                "label": "Total Brut (avant remises)",
                "fieldtype": "Currency",
                "insert_after": "custom_margin_calculated",
                "read_only": 1,
                "precision": 2,
                "description": "Montant total avant application des remises"
            },
            {
                "fieldname": "custom_total_discount",
                "label": "Total Remises",
                "fieldtype": "Currency", 
                "insert_after": "custom_total_gross",
                "read_only": 1,
                "precision": 2,
                "description": "Montant total des remises appliquées"
            },
            {
                "fieldname": "custom_total_cost",
                "label": "Coût Total",
                "fieldtype": "Currency",
                "insert_after": "custom_total_discount", 
                "read_only": 1,
                "precision": 2,
                "description": "Coût total calculé (bundles inclus, articles sans coût = 0€)"
            },
            {
                "fieldname": "custom_margin_amount",
                "label": "Marge (Montant)",
                "fieldtype": "Currency",
                "insert_after": "custom_total_cost",
                "read_only": 1,
                "precision": 2,
                "description": "Marge en euros (prix net - coût total)"
            },
            {
                "fieldname": "margin_details_column",
                "label": "",
                "fieldtype": "Column Break",
                "insert_after": "custom_margin_amount"
            },
            {
                "fieldname": "custom_margin_percentage",
                "label": "Marge (%)",
                "fieldtype": "Percent",
                "insert_after": "margin_details_column",
                "read_only": 1,
                "precision": 2,
                "description": "Taux de marge calculé sur le prix net"
            },
            {
                "fieldname": "custom_margin_status",
                "label": "Statut Marge",
                "fieldtype": "Select",
                "insert_after": "custom_margin_percentage",
                "options": "\nExceptionnel\nExcellent\nBon\nAcceptable\nFaible\nNégatif",
                "read_only": 1,
                "description": "Évaluation qualitative de la marge"
            },
            {
                "fieldname": "custom_items_without_cost",
                "label": "Articles sans coût",
                "fieldtype": "Int",
                "insert_after": "custom_margin_status",
                "read_only": 1,
                "default": 0,
                "description": "Nombre d'articles sans prix de revient (coût = 0€)"
            },
            {
                "fieldname": "custom_discount_percentage_global",
                "label": "Taux remise global (%)",
                "fieldtype": "Percent",
                "insert_after": "custom_items_without_cost",
                "read_only": 1,
                "precision": 2,
                "description": "Pourcentage de remise total appliqué"
            }
        ]
    }
    
    # Champs pour Quotation Item (articles de devis)
    quotation_item_fields = {
        "Quotation Item": [
            {
                "fieldname": "margin_item_section",
                "label": "Détails Marge",
                "fieldtype": "Section Break",
                "insert_after": "amount",
                "collapsible": 1,
                "description": "Calcul de marge pour cet article"
            },
            {
                "fieldname": "custom_cost_price",
                "label": "Prix de Revient",
                "fieldtype": "Currency",
                "insert_after": "margin_item_section",
                "read_only": 1,
                "precision": 2,
                "description": "Prix de revient unitaire (0€ si non défini)"
            },
            {
                "fieldname": "custom_margin_amount",
                "label": "Marge (Montant)",
                "fieldtype": "Currency",
                "insert_after": "custom_cost_price",
                "read_only": 1,
                "precision": 2,
                "description": "Marge total pour cet article (quantité × marge unitaire)"
            },
            {
                "fieldname": "custom_margin_percentage",
                "label": "Marge (%)",
                "fieldtype": "Percent",
                "insert_after": "custom_margin_amount",
                "read_only": 1,
                "precision": 2,
                "description": "Taux de marge pour cet article"
            }
        ]
    }
    
    # Champs pour Item (articles)
    item_fields = {
        "Item": [
            {
                "fieldname": "cost_management_section",
                "label": "Gestion des Coûts",
                "fieldtype": "Section Break",
                "insert_after": "valuation_rate",
                "collapsible": 1,
                "description": "Configuration des prix de revient pour le calcul des marges"
            },
            {
                "fieldname": "custom_standard_cost",
                "label": "Coût Standard (prioritaire)",
                "fieldtype": "Currency",
                "insert_after": "cost_management_section",
                "precision": 2,
                "description": "Prix de revient prioritaire (remplace valuation_rate si défini)"
            },
            {
                "fieldname": "custom_cost_source",
                "label": "Source du Coût",
                "fieldtype": "Select",
                "insert_after": "custom_standard_cost",
                "options": "\nValuation Rate\nDernier Achat\nCoût Standard\nAucun (0€)",
                "read_only": 1,
                "description": "Source utilisée pour le calcul du prix de revient"
            },
            {
                "fieldname": "custom_margin_warning_threshold",
                "label": "Seuil d'alerte marge (%)",
                "fieldtype": "Float",
                "insert_after": "custom_cost_source",
                "precision": 1,
                "default": 10.0,
                "description": "Seuil en dessous duquel une alerte est générée"
            }
        ]
    }
    
    # Champs pour Sales Order (commandes client - calendrier)
    sales_order_fields = {
        "Sales Order": [
            {
                "fieldname": "calendar_integration_section",
                "label": "Intégration Calendrier",
                "fieldtype": "Section Break", 
                "insert_after": "delivery_date",
                "collapsible": 1,
                "description": "Liaison avec le calendrier des interventions"
            },
            {
                "fieldname": "custom_calendar_event",
                "label": "Événement Calendrier",
                "fieldtype": "Link",
                "options": "Event",
                "insert_after": "calendar_integration_section",
                "read_only": 1,
                "description": "Lien vers l'événement créé dans le calendrier"
            },
            {
                "fieldname": "custom_horaire",
                "label": "Horaire Prévu",
                "fieldtype": "Select",
                "insert_after": "custom_calendar_event",
                "options": "\nMatin\nAprès-midi\nJournée complète",
                "default": "Matin",
                "description": "Créneau horaire pour l'intervention"
            },
            {
                "fieldname": "intervention_details_column",
                "label": "",
                "fieldtype": "Column Break",
                "insert_after": "custom_horaire"
            },
            {
                "fieldname": "custom_intervenant",
                "label": "Intervenant",
                "fieldtype": "Link",
                "options": "Employee",
                "insert_after": "intervention_details_column",
                "description": "Employé assigné à cette intervention"
            },
            {
                "fieldname": "custom_type_de_commande",
                "label": "Type d'Intervention",
                "fieldtype": "Select",
                "insert_after": "custom_intervenant",
                "options": "\nEntretien\nInstallation\nLivraison Granule\nLivraison Fuel\nDépannage",
                "description": "Nature de l'intervention à effectuer"
            },
            {
                "fieldname": "custom_commentaire",
                "label": "Commentaires",
                "fieldtype": "Small Text",
                "insert_after": "custom_type_de_commande",
                "description": "Instructions particulières pour l'intervention"
            }
        ]
    }
    
    # Champs pour Customer (clients - informations supplémentaires)
    customer_fields = {
        "Customer": [
            {
                "fieldname": "intervention_info_section",
                "label": "Informations Interventions",
                "fieldtype": "Section Break",
                "insert_after": "mobile_no",
                "collapsible": 1,
                "description": "Informations utiles pour les interventions"
            },
            {
                "fieldname": "custom_appareil",
                "label": "Type d'Appareil",
                "fieldtype": "Data",
                "insert_after": "intervention_info_section",
                "description": "Type d'appareil installé chez le client"
            },
            {
                "fieldname": "custom_camion",
                "label": "Camion Requis",
                "fieldtype": "Select",
                "insert_after": "custom_appareil",
                "options": "\nAucun\nPetit camion\nGrand camion\nCamion-grue",
                "default": "Aucun",
                "description": "Type de véhicule nécessaire pour l'intervention"
            }
        ]
    }
    
    # Champs pour Employee (employés - équipes)
    employee_fields = {
        "Employee": [
            {
                "fieldname": "teams_assignment_section",
                "label": "Assignation Équipes",
                "fieldtype": "Section Break",
                "insert_after": "designation",
                "collapsible": 1,
                "description": "Équipes auxquelles appartient cet employé"
            },
            {
                "fieldname": "custom_livraisons",
                "label": "Équipe Livraisons",
                "fieldtype": "Check",
                "insert_after": "teams_assignment_section",
                "default": 0,
                "description": "Membre de l'équipe livraisons"
            },
            {
                "fieldname": "custom_installations",
                "label": "Équipe Installations",
                "fieldtype": "Check",
                "insert_after": "custom_livraisons",
                "default": 0,
                "description": "Membre de l'équipe installations"
            },
            {
                "fieldname": "custom_entretiensramonages",
                "label": "Équipe Entretiens/Ramonages",
                "fieldtype": "Check",
                "insert_after": "custom_installations",
                "default": 0,
                "description": "Membre de l'équipe entretiens et ramonages"
            },
            {
                "fieldname": "teams_column_1",
                "label": "",
                "fieldtype": "Column Break",
                "insert_after": "custom_entretiensramonages"
            },
            {
                "fieldname": "custom_depannages_poeles",
                "label": "Équipe Dépannages Poêles",
                "fieldtype": "Check",
                "insert_after": "teams_column_1",
                "default": 0,
                "description": "Membre de l'équipe dépannages poêles"
            },
            {
                "fieldname": "custom_depannages_chauffage",
                "label": "Équipe Dépannages Chauffage",
                "fieldtype": "Check",
                "insert_after": "custom_depannages_poeles",
                "default": 0,
                "description": "Membre de l'équipe dépannages chauffage"
            },
            {
                "fieldname": "custom_electricite",
                "label": "Équipe Électricité",
                "fieldtype": "Check",
                "insert_after": "custom_depannages_chauffage",
                "default": 0,
                "description": "Membre de l'équipe électricité"
            },
            {
                "fieldname": "teams_column_2",
                "label": "",
                "fieldtype": "Column Break",
                "insert_after": "custom_electricite"
            },
            {
                "fieldname": "custom_photovoltaique",
                "label": "Équipe Photovoltaïque",
                "fieldtype": "Check",
                "insert_after": "teams_column_2",
                "default": 0,
                "description": "Membre de l'équipe photovoltaïque"
            },
            {
                "fieldname": "custom_bureau",
                "label": "Équipe Bureau",
                "fieldtype": "Check",
                "insert_after": "custom_photovoltaique",
                "default": 0,
                "description": "Membre de l'équipe bureau"
            },
            {
                "fieldname": "custom_commercial",
                "label": "Équipe Commercial",
                "fieldtype": "Check",
                "insert_after": "custom_bureau",
                "default": 0,
                "description": "Membre de l'équipe commerciale"
            },
            {
                "fieldname": "custom_renovation",
                "label": "Équipe Rénovation",
                "fieldtype": "Check",
                "insert_after": "custom_commercial",
                "default": 0,
                "description": "Membre de l'équipe rénovation"
            }
        ]
    }
    
    # Combiner tous les champs
    all_custom_fields = {}
    all_custom_fields.update(quotation_fields)
    all_custom_fields.update(quotation_item_fields)
    all_custom_fields.update(item_fields)
    all_custom_fields.update(sales_order_fields)
    all_custom_fields.update(customer_fields)
    all_custom_fields.update(employee_fields)
    
    # Créer les champs
    try:
        create_custom_fields(all_custom_fields)
        print("✅ Champs personnalisés créés avec succès")
    except Exception as e:
        print(f"⚠️  Erreur création champs: {str(e)}")
        frappe.log_error(f"Erreur création champs personnalisés: {str(e)}", "Custom Fields Error")

def setup_default_settings():
    """
    Configure les paramètres par défaut du système
    """
    print("⚙️  Configuration des paramètres par défaut...")
    
    try:
        # Paramètres pour le calcul des marges
        margin_settings = {
            "auto_calculate_margins": 1,
            "margin_warning_threshold": 10.0,
            "zero_cost_allowed": 1,
            "include_discounts_in_margin": 1,
            "bundle_cost_calculation_method": "components_sum"
        }
        
        for setting, value in margin_settings.items():
            if not frappe.db.exists("Singles", setting):
                frappe.db.set_single_value("System Settings", setting, value)
        
        # Paramètres pour le calendrier
        calendar_settings = {
            "default_calendar_view": "Employés",
            "auto_create_events": 1,
            "sync_delivery_dates": 1
        }
        
        for setting, value in calendar_settings.items():
            if not frappe.db.exists("Singles", setting):
                frappe.db.set_single_value("System Settings", setting, value)
        
        frappe.db.commit()
        print("✅ Paramètres configurés")
        
    except Exception as e:
        print(f"⚠️  Erreur configuration paramètres: {str(e)}")
        frappe.log_error(f"Erreur configuration paramètres: {str(e)}", "Settings Error")

def setup_roles_and_permissions():
    """
    Configure les rôles et permissions nécessaires
    """
    print("👥 Configuration des rôles et permissions...")
    
    try:
        # Créer des rôles personnalisés si nécessaire
        custom_roles = [
            {
                "role_name": "Margin Analyst",
                "role_description": "Peut analyser les marges et les coûts"
            },
            {
                "role_name": "Calendar Manager", 
                "role_description": "Peut gérer le calendrier des interventions"
            }
        ]
        
        for role_data in custom_roles:
            if not frappe.db.exists("Role", role_data["role_name"]):
                role = frappe.get_doc({
                    "doctype": "Role",
                    "role_name": role_data["role_name"],
                    "disabled": 0,
                    "desk_access": 1
                })
                role.insert(ignore_permissions=True)
                print(f"✅ Rôle créé: {role_data['role_name']}")
        
        frappe.db.commit()
        print("✅ Rôles configurés")
        
    except Exception as e:
        print(f"⚠️  Erreur configuration rôles: {str(e)}")
        frappe.log_error(f"Erreur configuration rôles: {str(e)}", "Roles Error")

def import_master_data():
    """
    Importe les données de base nécessaires
    """
    print("📊 Import des données de base...")
    
    try:
        # Créer des groupes d'articles si nécessaire
        item_groups = [
            "Poêles à Granulés",
            "Chaudières", 
            "Granulés",
            "Fuel/Fioul",
            "Services Entretien",
            "Services Installation"
        ]
        
        for group_name in item_groups:
            if not frappe.db.exists("Item Group", group_name):
                group = frappe.get_doc({
                    "doctype": "Item Group",
                    "item_group_name": group_name,
                    "parent_item_group": "All Item Groups",
                    "is_group": 0
                })
                group.insert(ignore_permissions=True)
                print(f"✅ Groupe d'articles créé: {group_name}")
        
        # Créer des territoires de base
        territories = [
            "ZONE 101", "ZONE 102", "ZONE 103", "ZONE 104", "ZONE 105",
            "ZONE 201", "ZONE 202", "ZONE 203", "ZONE 204", "ZONE 205"
        ]
        
        for territory_name in territories:
            if not frappe.db.exists("Territory", territory_name):
                territory = frappe.get_doc({
                    "doctype": "Territory",
                    "territory_name": territory_name,
                    "parent_territory": "All Territories",
                    "is_group": 0
                })
                territory.insert(ignore_permissions=True)
                print(f"✅ Territoire créé: {territory_name}")
        
        frappe.db.commit()
        print("✅ Données de base importées")
        
    except Exception as e:
        print(f"⚠️  Erreur import données: {str(e)}")
        frappe.log_error(f"Erreur import données de base: {str(e)}", "Master Data Error")

def migrate_existing_quotations():
    """
    Met à jour les devis existants avec les nouveaux champs de marge
    """
    print("🔄 Migration des devis existants...")
    
    try:
        # Récupérer les devis récents sans calcul de marge
        quotations = frappe.get_all("Quotation", 
            filters={
                "docstatus": ["<", 2],
                "creation": [">=", "2024-01-01"],
                "custom_margin_calculated": ["!=", 1]
            },
            fields=["name"],
            limit=50  # Limiter pour éviter les timeouts
        )
        
        print(f"📋 Migration de {len(quotations)} devis...")
        
        migrated_count = 0
        for quotation in quotations:
            try:
                # Recalculer les marges pour ce devis
                from josseaume_energies.margin_calculation_simple import calculate_quotation_margin
                
                result = calculate_quotation_margin(quotation.name)
                if result and result.get("status") == "success":
                    # Marquer comme migré
                    frappe.db.set_value("Quotation", quotation.name, "custom_margin_calculated", 1)
                    migrated_count += 1
                    
            except Exception as e:
                frappe.log_error(f"Erreur migration devis {quotation.name}: {str(e)}", "Quotation Migration Error")
        
        frappe.db.commit()
        print(f"✅ {migrated_count} devis migrés avec succès")
        
    except Exception as e:
        print(f"⚠️  Erreur migration devis: {str(e)}")
        frappe.log_error(f"Erreur migration devis existants: {str(e)}", "Migration Error")

def daily_cost_check():
    """
    Tâche quotidienne : vérifier les articles sans coût
    """
    try:
        from josseaume_energies.margin_calculation_simple import check_items_without_cost
        
        result = check_items_without_cost()
        if result and result.get("status") == "success":
            items_without_cost = result.get("items_without_cost", 0)
            
            if items_without_cost > 0:
                # Envoyer une notification si nécessaire
                frappe.log_error(f"Alerte quotidienne: {items_without_cost} articles sans prix de revient", "Daily Cost Check")
                
                # Optionnel: envoyer un email aux responsables
                if items_without_cost > 10:  # Seuil d'alerte
                    send_cost_alert_email(items_without_cost)
    
    except Exception as e:
        frappe.log_error(f"Erreur vérification quotidienne des coûts: {str(e)}", "Daily Cost Check Error")

def weekly_valuation_sync():
    """
    Tâche hebdomadaire : synchroniser les prix d'achat
    """
    try:
        from josseaume_energies.margin_calculation_simple import sync_valuation_from_last_purchase
        
        result = sync_valuation_from_last_purchase()
        if result and result.get("status") == "success":
            updated_count = result.get("updated_count", 0)
            frappe.log_error(f"Synchronisation hebdomadaire: {updated_count} prix de valorisation mis à jour", "Weekly Valuation Sync")
    
    except Exception as e:
        frappe.log_error(f"Erreur synchronisation hebdomadaire: {str(e)}", "Weekly Sync Error")

def send_cost_alert_email(items_count):
    """
    Envoie un email d'alerte pour les articles sans coût
    """
    try:
        recipients = ["sales@josseaume-energies.com", "admin@josseaume-energies.com"]
        
        subject = f"Alerte: {items_count} articles sans prix de revient"
        
        message = f"""
        <h3>Alerte Articles sans Prix de Revient</h3>
        <p><strong>{items_count} articles</strong> n'ont pas de prix de revient défini.</p>
        <p>Ces articles auront un <strong>coût de 0€</strong> dans les calculs de marge.</p>
        <p>Action recommandée: Mettre à jour les prix de valorisation via Stock > Article</p>
        <p><a href="/app/query-report/Items%20Without%20Cost">Voir le rapport détaillé</a></p>
        """
        
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=message,
            header="Josseaume Energies - Alerte Coûts"
        )
        
    except Exception as e:
        frappe.log_error(f"Erreur envoi email alerte: {str(e)}", "Email Alert Error")

# NOUVELLES fonctions utilitaires
def check_installation_health():
    """
    Vérifie que l'installation est complète et fonctionnelle
    """
    health_report = {
        "status": "healthy",
        "issues": [],
        "recommendations": []
    }
    
    try:
        # Vérifier les champs personnalisés
        required_quotation_fields = ["custom_margin_calculated", "custom_total_cost", "custom_margin_percentage"]
        for field in required_quotation_fields:
            if not frappe.db.has_column("Quotation", field):
                health_report["issues"].append(f"Champ manquant: Quotation.{field}")
                health_report["status"] = "needs_attention"
        
        # Vérifier les prix de valorisation
        items_without_cost = frappe.db.count("Item", {
            "disabled": 0,
            "valuation_rate": ["in", [0, None]]
        })
        
        total_items = frappe.db.count("Item", {"disabled": 0})
        
        if items_without_cost > 0:
            percentage = (items_without_cost / total_items) * 100
            if percentage > 20:
                health_report["issues"].append(f"{items_without_cost} articles sans prix de revient ({percentage:.1f}%)")
                health_report["recommendations"].append("Mettre à jour les prix de valorisation des articles")
        
        # Vérifier les bundles
        bundles_count = frappe.db.count("Product Bundle")
        if bundles_count > 0:
            health_report["recommendations"].append(f"{bundles_count} bundles détectés - vérifiez leurs coûts")
        
        return health_report
        
    except Exception as e:
        health_report["status"] = "error"
        health_report["issues"].append(f"Erreur vérification: {str(e)}")
        return health_report

def repair_installation():
    """
    Répare les problèmes d'installation détectés
    """
    try:
        print("🔧 Réparation de l'installation...")
        
        # Re-créer les champs manquants
        create_custom_fields_for_margins()
        
        # Re-configurer les paramètres
        setup_default_settings()
        
        # Recalculer quelques marges pour tester
        test_quotations = frappe.get_all("Quotation", 
            filters={"docstatus": 1}, 
            limit=5
        )
        
        for quotation in test_quotations:
            try:
                from josseaume_energies.margin_calculation_simple import calculate_quotation_margin
                calculate_quotation_margin(quotation.name)
            except:
                pass
        
        print("✅ Réparation terminée")
        return True
        
    except Exception as e:
        print(f"❌ Erreur réparation: {str(e)}")
        return False