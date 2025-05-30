# -*- coding: utf-8 -*-
"""
Script de création automatique des groupes d'articles avec leurs comptes comptables
Basé sur le plan comptable fourni dans le PDF (éléments barrés exclus)
À exécuter dans bench console [votre-site]
"""

import frappe
from frappe import _

def create_item_groups_with_accounts():
    """
    Crée automatiquement tous les groupes d'articles avec leurs comptes comptables
    """
    
    # Données extraites du PDF - Plan comptable complet (SANS les éléments barrés)
    groups_data = [
        # 1. COMBUSTIBLES
        # 1.1 Fioul et dérivés
        {
            "group_name": "Combustibles/Fioul/Standard",
            "parent_group": "Combustibles",
            "category": "Combustibles/Fioul/Standard",
            "expense_account": "607100 - ACHATS FIOUL DOMESTIQUE - JE",
            "income_account": "707100 - VENTES FIOUL DOMESTIQUE - JE"
        },
        {
            "group_name": "Combustibles/Fioul/Hiver",
            "parent_group": "Combustibles",
            "category": "Combustibles/Fioul/Hiver",
            "expense_account": "607200 - ACHATS FIOUL HIVER - JE",
            "income_account": "707200 - FIOUL HIVER - JE"
        },
        {
            "group_name": "Combustibles/Fioul/Bio",
            "parent_group": "Combustibles",
            "category": "Combustibles/Fioul/Bio",
            "expense_account": "607220 - ACHAT BIOFIOUL - JE",
            "income_account": "707220 - BIOFIOUL - JE"
        },
        {
            "group_name": "Combustibles/Lubrifiants",
            "parent_group": "Combustibles",
            "category": "Combustibles/Lubrifiants",
            "expense_account": "607515 - ACHAT LUBRIFIANTS - JE",
            "income_account": "707515 - VENTE LUBRIFIANT - JE"
        },
        
        # 1.2 Carburants
        {
            "group_name": "Combustibles/Carburants/Gazole",
            "parent_group": "Combustibles",
            "category": "Combustibles/Carburants/Gazole",
            "expense_account": "607300 - ACHATS DE GAZOLE - JE",
            "income_account": "707300 - VENTES GAZOLE - JE"
        },
        {
            "group_name": "Combustibles/Carburants/GNR",
            "parent_group": "Combustibles",
            "category": "Combustibles/Carburants/GNR",
            "expense_account": "607310 - ACHAT GAZOLE NON ROUTIER - JE",
            "income_account": "707310 - VENTE DE GAZOLE NON ROUTIER - JE"
        },
        
        # 1.3 Chauffage bois et dérivés
        {
            "group_name": "Combustibles/Bois/Bûches",
            "parent_group": "Combustibles",
            "category": "Combustibles/Bois/Bûches",
            "expense_account": "607810 - ACHAT DE BOIS DE CHAUFFAGE - JE",
            "income_account": "707810 - VENTES DE BOIS DE CHAUFFAGE - JE"
        },
        {
            "group_name": "Combustibles/Bois/GranuléVrac",
            "parent_group": "Combustibles",
            "category": "Combustibles/Bois/GranuléVrac",
            "expense_account": "607820 - ACHAT DE GRANULES DE BOIS - JE",
            "income_account": "707811 - GRANULES DE BOIS POUR POELE - JE"
        },
        {
            "group_name": "Combustibles/Bois/GranuléIntra",
            "parent_group": "Combustibles",
            "category": "Combustibles/Bois/GranuléIntra",
            "expense_account": "607821 - ACHAT DE GRANULES DE BOIS INTRA - JE",
            "income_account": "707811 - GRANULES DE BOIS POUR POELE - JE"
        },
        {
            "group_name": "Combustibles/Bois/BûchesComprimées",
            "parent_group": "Combustibles",
            "category": "Combustibles/Bois/BûchesComprimées",
            "expense_account": "607812 - ACHAT DE BUCHES COMPRIMES - JE",
            "income_account": "707810 - VENTES DE BOIS DE CHAUFFAGE - JE"
        },
        
        # 1.4 Gaz
        {
            "group_name": "Combustibles/Gaz",
            "parent_group": "Combustibles",
            "category": "Combustibles/Gaz",
            "expense_account": "607700 - ACHATS GAZ - JE",
            "income_account": "707700 - VENTES GAZ - JE"
        },
        
        # 2. ÉQUIPEMENTS DE CHAUFFAGE
        # 2.1 Poêles et chaudières
        {
            "group_name": "Equipements/Bois/PoelesBois5.5%",
            "parent_group": "Equipements",
            "category": "Equipements/Bois/PoelesBois5.5%",
            "expense_account": "607814 - ACHAT POELE A BOIS - JE",
            "income_account": "707814 - VENTE DE POELE A BOIS 5.5% - JE"
        },
        {
            "group_name": "Equipements/Bois/PoelesBois20%",
            "parent_group": "Equipements",
            "category": "Equipements/Bois/PoelesBois20%",
            "expense_account": "607814 - ACHAT POELE A BOIS - JE",
            "income_account": "707813 - VENTE DE POELE A BOIS 20% - JE"
        },
        {
            "group_name": "Equipements/Granulés/Poeles5.5%",
            "parent_group": "Equipements",
            "category": "Equipements/Granulés/Poeles5.5%",
            "expense_account": "607911 - ACHAT POELE A GRANULES FRANCE - JE",
            "income_account": "707812 - POELE A GRANULES TVA 5.5% - JE"
        },
        {
            "group_name": "Equipements/Granulés/Poeles20%",
            "parent_group": "Equipements",
            "category": "Equipements/Granulés/Poeles20%",
            "expense_account": "607911 - ACHAT POELE A GRANULES FRANCE - JE",
            "income_account": "707815 - VENTE DE POELE A GRANULES 20% - JE"
        },
        {
            "group_name": "Equipements/Granulés/Chaudières",
            "parent_group": "Equipements",
            "category": "Equipements/Granulés/Chaudières",
            "expense_account": "607850 - ACHAT CHAUDIERE A GRANULES - JE",
            "income_account": "707850 - CHAUDIERES A GRANULES - JE"
        },
        
        # 2.2 Solaire
        {
            "group_name": "Equipements/Solaire/Thermique10%",
            "parent_group": "Equipements",
            "category": "Equipements/Solaire/Thermique10%",
            "expense_account": "607915 - ACHAT PANNEAU SOLAIRE THERMIQUE - JE",
            "income_account": "707914 - VENTE PANNEAU SOLAIRE THERMIQUE 10% - JE"
        },
        {
            "group_name": "Equipements/Solaire/Thermique",
            "parent_group": "Equipements",
            "category": "Equipements/Solaire/Thermique",
            "expense_account": "607915 - ACHAT PANNEAU SOLAIRE THERMIQUE - JE",
            "income_account": "707915 - VENTE PANNEAU SOLAIRE THERMIQUE - JE"
        },
        {
            "group_name": "Equipements/Solaire/Photovoltaique",
            "parent_group": "Equipements",
            "category": "Equipements/Solaire/Photovoltaique",
            "expense_account": "607916 - ACHAT PANNEAU SOLAIRE PHOTOVOLTAIQUE - JE",
            "income_account": "707916 - VENTE PANNEAU SOLAIRE PHOTOVOLTAIQUE - JE"
        },
        {
            "group_name": "Equipements/Solaire/Photovoltaique20%",
            "parent_group": "Equipements",
            "category": "Equipements/Solaire/Photovoltaique20%",
            "expense_account": "607916 - ACHAT PANNEAU SOLAIRE PHOTOVOLTAIQUE - JE",
            "income_account": "707917 - VENTE PANNEAU SOLAIRE PHOTOVOLTAIQUE 20% - JE"
        },
        
        # 3. MATÉRIAUX ET ACCESSOIRES
        # 3.1 Matériaux pour installations
        {
            "group_name": "Materiaux/Poeles/5.5%",
            "parent_group": "Materiaux",
            "category": "Materiaux/Poeles/5.5%",
            "expense_account": "607920 - ACHAT DE MATERIAUX POUR POELES 7% - JE",
            "income_account": "707920 - MATERIAUX POUR POELES 5.5% - JE"
        },
        {
            "group_name": "Materiaux/Poeles/20%",
            "parent_group": "Materiaux",
            "category": "Materiaux/Poeles/20%",
            "expense_account": "607924 - ACHAT DE MATERIAUX POUR POELES 20% - JE",
            "income_account": "707924 - MATERIAUX POUR POELES 20% - JE"
        },
        {
            "group_name": "Materiaux/DoubleParoi/5.5%",
            "parent_group": "Materiaux",
            "category": "Materiaux/DoubleParoi/5.5%",
            "expense_account": "607922 - ACHAT MATERIAUX DOUBLE PAROI POELE 7% - JE",
            "income_account": "707922 - MATERIAUX DOUBLE PAROI POELES 5.5% - JE"
        },
        {
            "group_name": "Materiaux/PV/10%",
            "parent_group": "Materiaux",
            "category": "Materiaux/PV/10%",
            "expense_account": "607918 - MATERIAUX PR PV 20% - JE",
            "income_account": "707918 - MATERIAUX POUR PV 10% - JE"
        },
        {
            "group_name": "Materiaux/PV/20%",
            "parent_group": "Materiaux",
            "category": "Materiaux/PV/20%",
            "expense_account": "607919 - MATERIAUX PR PV 20% - JE",
            "income_account": "707919 - MATERIAUX POUR PV 20% - JE"
        },
        {
            "group_name": "Materiaux/Rénovation",
            "parent_group": "Materiaux",
            "category": "Materiaux/Rénovation",
            "expense_account": "607938 - ACHAT DE MATERIAUX POUR RENOVATION 20% - JE",
            "income_account": "707938 - MATERIAUX POUR RENOVATION 20% - JE"
        },
        
        # 3.2 Pièces et accessoires
        {
            "group_name": "Accessoires/Chauffage",
            "parent_group": "Accessoires",
            "category": "Accessoires/Chauffage",
            "expense_account": "607900 - ACHATS ACCESSOIRES - JE",
            "income_account": "707900 - ACCESSOIRES - JE"
        },
        {
            "group_name": "Accessoires/PiècesDétachées",
            "parent_group": "Accessoires",
            "category": "Accessoires/PiècesDétachées",
            "expense_account": "607929 - ACHAT PIECES DETACHEES FRANCE - JE",
            "income_account": "707931 - PIECES DETACHEES POELES - JE"
        },
        {
            "group_name": "Accessoires/Entretien",
            "parent_group": "Accessoires",
            "category": "Accessoires/Entretien",
            "expense_account": "607932 - ACHAT MATERIEL PR ENTRETIEN CHAUFFAGE - JE",
            "income_account": "707932 - VENTE DE MATERIEL PR ENTRETIEN CHAUFFAGE - JE"
        },
        {
            "group_name": "Accessoires/Plomberie",
            "parent_group": "Accessoires",
            "category": "Accessoires/Plomberie",
            "expense_account": "607937 - ACHAT MATERIEL CHAUFFAGE/PLOMBERIE - JE",
            "income_account": "707936 - CHAUFFAGE - JE"
        },
        {
            "group_name": "Accessoires/Electricité",
            "parent_group": "Accessoires",
            "category": "Accessoires/Electricité",
            "expense_account": "607939 - ACHAT MATERIEL D'ELECTRICITE - JE",
            "income_account": "707939 - ELECTRICITE - JE"
        },
        
        # 4. SERVICES ET PRESTATIONS
        {
            "group_name": "Services/Entretien5.5.5%",
            "parent_group": "Services",
            "category": "Services/Entretien5.5.5%",
            "expense_account": "604000 - ACHAT D'ETUDES ET PRESTATIONS DE SERVICE - JE",
            "income_account": "706000 - ENTRETIEN POELE A GRANULES 5.5% - JE"
        },
        {
            "group_name": "Services/Prestations20%",
            "parent_group": "Services",
            "category": "Services/Prestations20%",
            "expense_account": "604000 - ACHAT D'ETUDES ET PRESTATIONS DE SERVICE - JE",
            "income_account": "706100 - PRESTATIONS DE SERVICES 20% - JE"
        },
        {
            "group_name": "Services/Ramonage",
            "parent_group": "Services",
            "category": "Services/Ramonage",
            "expense_account": "604000 - ACHAT D'ETUDES ET PRESTATIONS DE SERVICE - JE",
            "income_account": "706110 - RAMONAGES 10% - JE"
        },
        {
            "group_name": "Services/Électricité10%",
            "parent_group": "Services",
            "category": "Services/Électricité10%",
            "expense_account": "604000 - ACHAT D'ETUDES ET PRESTATIONS DE SERVICE - JE",
            "income_account": "706200 - PRESTATIONS DE SERVICES ELEC 10% - JE"
        },
        {
            "group_name": "Services/Électricité20%",
            "parent_group": "Services",
            "category": "Services/Électricité20%",
            "expense_account": "604000 - ACHAT D'ETUDES ET PRESTATIONS DE SERVICE - JE",
            "income_account": "706101 - PRESTATIONS DE SERVICES ELEC 20% - JE"
        },
        
        # 5. CERTIFICATS D'ÉCONOMIE D'ÉNERGIE (CEE)
        {
            "group_name": "CEE/Achat",
            "parent_group": "CEE",
            "category": "CEE/Achat",
            "expense_account": "607830 - ACHAT DE CEE - JE",
            "income_account": "707830 - VENTES CEE - JE"
        },
        {
            "group_name": "CEE/Intra",
            "parent_group": "CEE",
            "category": "CEE/Intra",
            "expense_account": "607831 - ACHAT DE CEE INTRA - JE",
            "income_account": "707830 - VENTES CEE - JE"
        },
        {
            "group_name": "CEE/AprèsDREAL",
            "parent_group": "CEE",
            "category": "CEE/AprèsDREAL",
            "expense_account": "607832 - ACHAT CEE APRES DREAL - JE",
            "income_account": "707830 - VENTES CEE - JE"
        },
        {
            "group_name": "CEE/GWhCumac",
            "parent_group": "CEE",
            "category": "CEE/GWhCumac",
            "expense_account": "607840 - ACHAT GWH CUMAC (CEE) - JE",
            "income_account": "707830 - VENTES CEE - JE"
        },
        
        # 6. DIVERS
        {
            "group_name": "Divers/Palettes",
            "parent_group": "Divers",
            "category": "Divers/Palettes",
            "expense_account": "",
            "income_account": "708100 - VENTE DE PALETTES - JE"
        },
        {
            "group_name": "Divers/Jauge",
            "parent_group": "Divers",
            "category": "Divers/Jauge",
            "expense_account": "",
            "income_account": "707840 - VENTES JAUGE FIOUL - JE"
        },
        {
            "group_name": "Divers/Consignations",
            "parent_group": "Divers",
            "category": "Divers/Consignations",
            "expense_account": "",
            "income_account": "707710 - CONSIGNATIONS - JE"
        }
    ]
    
    # Créer d'abord les groupes parents
    parent_groups = ["Combustibles", "Equipements", "Materiaux", "Accessoires", "Services", "CEE", "Divers"]
    
    print("🏗️ CRÉATION DES GROUPES D'ARTICLES (ÉLÉMENTS BARRÉS EXCLUS)")
    print("=" * 60)
    
    created_groups = []
    errors = []
    
    try:
        # Créer les groupes parents
        for parent in parent_groups:
            try:
                if not frappe.db.exists("Item Group", parent):
                    parent_doc = frappe.get_doc({
                        "doctype": "Item Group",
                        "item_group_name": parent,
                        "is_group": 1
                    })
                    parent_doc.insert()
                    print(f"✅ Groupe parent créé: {parent}")
                    created_groups.append(parent)
                else:
                    print(f"ℹ️ Groupe parent existe déjà: {parent}")
            except Exception as e:
                error_msg = f"❌ Erreur création groupe parent {parent}: {str(e)}"
                print(error_msg)
                errors.append(error_msg)
        
        # Créer les groupes enfants avec leurs comptes
        for group_data in groups_data:
            try:
                group_name = group_data["group_name"]
                
                if not frappe.db.exists("Item Group", group_name):
                    # Créer le groupe d'articles
                    group_doc = frappe.get_doc({
                        "doctype": "Item Group",
                        "item_group_name": group_name,
                        "parent_item_group": group_data["parent_group"],
                        "is_group": 0
                    })
                    group_doc.insert()
                    
                    # Ajouter la configuration comptable
                    if group_data["category"]:
                        accounting_detail = frappe.get_doc({
                            "doctype": "Categorie comptable Tiers et code comptable Produit",
                            "parent": group_name,
                            "parenttype": "Item Group",
                            "parentfield": "special_item_accountancy_code_details",
                            "categorie_comptable_tiers": group_data["category"],
                            "compte_de_charges": group_data["expense_account"] if group_data["expense_account"] else None,
                            "compte_de_produits": group_data["income_account"] if group_data["income_account"] else None
                        })
                        accounting_detail.insert()
                    
                    print(f"✅ Groupe créé: {group_name}")
                    print(f"   📂 Parent: {group_data['parent_group']}")
                    print(f"   🏷️ Catégorie: {group_data['category']}")
                    print(f"   💸 Charges: {group_data['expense_account']}")
                    print(f"   💰 Produits: {group_data['income_account']}")
                    print()
                    
                    created_groups.append(group_name)
                    
                else:
                    print(f"ℹ️ Groupe existe déjà: {group_name}")
                    
            except Exception as e:
                error_msg = f"❌ Erreur création {group_data['group_name']}: {str(e)}"
                print(error_msg)
                errors.append(error_msg)
        
        # Commit des changements
        frappe.db.commit()
        
        # Résumé
        print("=" * 60)
        print("📊 RÉSUMÉ DE LA CRÉATION")
        print("=" * 60)
        print(f"✅ Groupes créés avec succès: {len(created_groups)}")
        print(f"❌ Erreurs rencontrées: {len(errors)}")
        
        if errors:
            print("\n🚨 ERREURS DÉTAILLÉES:")
            for error in errors:
                print(f"  {error}")
        
        print(f"\n✨ ÉLÉMENTS EXCLUS (barrés dans le PDF):")
        print(f"  ❌ Combustibles/Fioul/4Saisons")
        print(f"  ❌ Combustibles/Carburants/Pétrole")
        print(f"  ❌ Combustibles/Charbon")
        print(f"  ❌ Equipements/Granulés/PoelesMixte")
        print(f"  ❌ Materiaux/DoubleParoi/20%")
        
        print(f"\n🎉 CRÉATION TERMINÉE!")
        print(f"Vous pouvez maintenant utiliser ces groupes pour vos articles.")
        
        return {
            "success": True,
            "created_groups": created_groups,
            "errors": errors,
            "total_created": len(created_groups),
            "total_errors": len(errors),
            "excluded_items": 5
        }
        
    except Exception as e:
        frappe.db.rollback()
        error_msg = f"❌ Erreur générale: {str(e)}"
        print(error_msg)
        return {
            "success": False,
            "error": error_msg
        }


def delete_all_created_groups():
    """
    Fonction de nettoyage - Supprime tous les groupes créés (en cas de problème)
    ATTENTION: À utiliser avec précaution !
    """
    parent_groups = ["Combustibles", "Equipements", "Materiaux", "Accessoires", "Services", "CEE", "Divers"]
    
    print("🗑️ SUPPRESSION DES GROUPES CRÉÉS")
    print("⚠️ ATTENTION: Cette action est irréversible !")
    print("=" * 50)
    
    # Supprimer les configurations comptables d'abord
    for parent in parent_groups:
        try:
            # Supprimer les configurations comptables
            accounting_configs = frappe.get_all(
                "Categorie comptable Tiers et code comptable Produit",
                filters={"parenttype": "Item Group"},
                fields=["name", "parent"]
            )
            
            for config in accounting_configs:
                if any(parent in config.parent for parent in parent_groups):
                    frappe.delete_doc("Categorie comptable Tiers et code comptable Produit", config.name)
                    print(f"🗑️ Config supprimée: {config.parent}")
        except Exception as e:
            print(f"❌ Erreur suppression configs: {str(e)}")
    
    # Supprimer les groupes
    all_groups = frappe.get_all("Item Group", fields=["name", "parent_item_group"])
    
    for group in all_groups:
        if any(parent in group.name for parent in parent_groups):
            try:
                frappe.delete_doc("Item Group", group.name)
                print(f"🗑️ Groupe supprimé: {group.name}")
            except Exception as e:
                print(f"❌ Erreur suppression {group.name}: {str(e)}")
    
    frappe.db.commit()
    print("✅ Suppression terminée")


# Fonction principale à exécuter
if __name__ == "__main__":
    # Pour créer tous les groupes
    result = create_item_groups_with_accounts()
    
    # Pour supprimer tous les groupes (décommenter si nécessaire)
    # delete_all_created_groups()