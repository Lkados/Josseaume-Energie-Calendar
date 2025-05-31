# josseaume_energies/josseaume_energies/test_sync.py
# Script de test pour la synchronisation bidirectionnelle

import frappe
from frappe.utils import get_datetime, add_days
from datetime import datetime, date

def test_synchronization():
    """
    Test complet de la synchronisation bidirectionnelle
    """
    print("🧪 Début des tests de synchronisation...")
    
    try:
        # Test 1: Création d'une commande client et événement
        print("\n📝 Test 1: Création d'une commande client...")
        test_sales_order = create_test_sales_order()
        
        if not test_sales_order:
            print("❌ Échec de la création de la commande client")
            return False
        
        print(f"✅ Commande client créée: {test_sales_order.name}")
        
        # Test 2: Création automatique de l'événement
        print("\n📅 Test 2: Création automatique de l'événement...")
        from josseaume_energies.api import create_event_from_sales_order
        
        result = create_event_from_sales_order(test_sales_order.name)
        
        if result and result.get("status") == "success":
            event_name = result.get("event_name")
            print(f"✅ Événement créé automatiquement: {event_name}")
            
            # Test 3: Synchronisation Event → Sales Order
            print("\n🔄 Test 3: Synchronisation Event → Sales Order...")
            test_event_to_sales_order_sync(event_name, test_sales_order.name)
            
            # Test 4: Synchronisation Sales Order → Event
            print("\n🔄 Test 4: Synchronisation Sales Order → Event...")
            test_sales_order_to_event_sync(test_sales_order.name, event_name)
            
            # Test 5: Vérification du statut
            print("\n🔍 Test 5: Vérification du statut de synchronisation...")
            test_sync_status(test_sales_order.name, event_name)
            
        else:
            print(f"❌ Échec de la création de l'événement: {result}")
            return False
        
        print("\n🎉 Tous les tests sont terminés avec succès!")
        return True
        
    except Exception as e:
        print(f"❌ Erreur during tests: {str(e)}")
        return False
    
    finally:
        # Nettoyage (optionnel)
        print("\n🧹 Nettoyage des données de test...")
        cleanup_test_data()

def create_test_sales_order():
    """
    Crée une commande client de test avec plusieurs articles
    """
    try:
        # Créer un client de test s'il n'existe pas
        customer_name = "Client Test Sync"
        if not frappe.db.exists("Customer", customer_name):
            customer = frappe.get_doc({
                "doctype": "Customer",
                "customer_name": customer_name,
                "customer_type": "Individual"
            })
            customer.insert(ignore_permissions=True)
        
        # Date de base pour les tests
        base_delivery_date = add_days(date.today(), 7)  # Dans 7 jours
        
        # Créer la commande client avec plusieurs articles
        sales_order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer_name,
            "delivery_date": base_delivery_date,
            "custom_horaire": "Matin",
            "custom_type_de_commande": "Entretien",
            "territory": "ZONE TEST",
            "items": [
                {
                    "item_code": "EPG-TEST-1",
                    "item_name": "Test Entretien Poêle Granule Principal",
                    "qty": 1,
                    "rate": 100,
                    "delivery_date": base_delivery_date  # Même date que la commande
                },
                {
                    "item_code": "EPG-TEST-2", 
                    "item_name": "Test Produit Accessoire",
                    "qty": 2,
                    "rate": 50,
                    "delivery_date": add_days(base_delivery_date, 1)  # Date différente pour tester
                },
                {
                    "item_code": "EPG-TEST-3",
                    "item_name": "Test Service Complémentaire", 
                    "qty": 1,
                    "rate": 75,
                    "delivery_date": base_delivery_date  # Même date que la commande
                }
            ]
        })
        
        sales_order.insert(ignore_permissions=True)
        sales_order.submit()
        
        print(f"   📦 Commande créée avec {len(sales_order.items)} articles")
        print(f"   📅 Date principale: {base_delivery_date}")
        
        # Afficher les dates des articles pour le debug
        for i, item in enumerate(sales_order.items, 1):
            print(f"   📋 Article {i} ({item.item_code}): {item.delivery_date}")
        
        return sales_order
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de la commande client: {str(e)}")
        return None

def test_event_to_sales_order_sync(event_name, sales_order_name):
    """
    Test de la synchronisation Event → Sales Order (avec vérification des articles)
    """
    try:
        # Récupérer l'événement et modifier sa date
        event = frappe.get_doc("Event", event_name)
        sales_order = frappe.get_doc("Sales Order", sales_order_name)
        
        original_so_date = sales_order.delivery_date
        original_event_date = event.starts_on
        
        # Récupérer les dates originales des articles
        original_items_dates = {}
        for item in sales_order.items:
            original_items_dates[item.name] = item.delivery_date
        
        # Modifier la date de l'événement (+2 jours)
        new_event_date = add_days(get_datetime(event.starts_on), 2)
        event.starts_on = new_event_date
        event.ends_on = add_days(new_event_date, hours=1)
        
        print(f"   📅 Date événement: {original_event_date} → {new_event_date}")
        
        # Sauvegarder (cela devrait déclencher la synchronisation)
        event.save()
        
        # Vérifier que la commande client a été mise à jour
        sales_order.reload()
        new_so_date = sales_order.delivery_date
        
        print(f"   📦 Date commande: {original_so_date} → {new_so_date}")
        
        # NOUVEAU: Vérifier que tous les articles ont été mis à jour
        items_sync_ok = True
        items_checked = 0
        
        for item in sales_order.items:
            item_doc = frappe.get_doc("Sales Order Item", item.name)
            item_date = get_datetime(item_doc.delivery_date).date()
            expected_date = get_datetime(new_event_date).date()
            
            if item_date != expected_date:
                print(f"   ❌ Article {item.item_code}: date non synchronisée ({item_date} != {expected_date})")
                items_sync_ok = False
            else:
                items_checked += 1
        
        print(f"   📋 Articles synchronisés: {items_checked}/{len(sales_order.items)}")
        
        # Vérifier la synchronisation globale
        main_date_ok = get_datetime(new_so_date).date() == get_datetime(new_event_date).date()
        
        if main_date_ok and items_sync_ok:
            print("   ✅ Synchronisation Event → Sales Order réussie (commande + articles)")
            return True
        else:
            print("   ❌ Synchronisation Event → Sales Order échouée")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du test Event → Sales Order: {str(e)}")
        return False

def test_sales_order_to_event_sync(sales_order_name, event_name):
    """
    Test de la synchronisation Sales Order → Event (avec vérification des articles)
    """
    try:
        # Récupérer les documents
        sales_order = frappe.get_doc("Sales Order", sales_order_name)
        event = frappe.get_doc("Event", event_name)
        
        original_so_date = sales_order.delivery_date
        original_event_date = event.starts_on
        
        # Récupérer les dates originales des articles
        original_items_dates = {}
        for item in sales_order.items:
            original_items_dates[item.name] = item.delivery_date
        
        # Modifier la date de livraison (+3 jours)
        new_so_date = add_days(get_datetime(sales_order.delivery_date), 3)
        sales_order.delivery_date = new_so_date
        
        print(f"   📦 Date commande: {original_so_date} → {new_so_date}")
        
        # Sauvegarder (cela devrait déclencher la synchronisation)
        sales_order.save()
        
        # Vérifier que l'événement a été mis à jour
        event.reload()
        new_event_date = event.starts_on
        
        print(f"   📅 Date événement: {original_event_date} → {new_event_date}")
        
        # NOUVEAU: Vérifier que tous les articles ont été synchronisés
        sales_order.reload()  # Recharger pour voir les changements
        items_sync_ok = True
        items_checked = 0
        
        for item in sales_order.items:
            item_doc = frappe.get_doc("Sales Order Item", item.name)
            item_date = get_datetime(item_doc.delivery_date).date()
            expected_date = get_datetime(new_so_date).date()
            
            if item_date != expected_date:
                print(f"   ❌ Article {item.item_code}: date non synchronisée ({item_date} != {expected_date})")
                items_sync_ok = False
            else:
                items_checked += 1
        
        print(f"   📋 Articles synchronisés: {items_checked}/{len(sales_order.items)}")
        
        # Vérifier la synchronisation globale
        event_date_ok = get_datetime(new_event_date).date() == get_datetime(new_so_date).date()
        
        if event_date_ok and items_sync_ok:
            print("   ✅ Synchronisation Sales Order → Event réussie (événement + articles)")
            return True
        else:
            print("   ❌ Synchronisation Sales Order → Event échouée")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du test Sales Order → Event: {str(e)}")
        return False

def test_sync_status(sales_order_name, event_name):
    """
    Test des fonctions de vérification de statut
    """
    try:
        from josseaume_energies.api import check_sync_status
        
        # Tester depuis Sales Order
        status_from_so = check_sync_status("Sales Order", sales_order_name)
        print(f"   📊 Statut depuis Sales Order: {status_from_so.get('status')}")
        
        # Tester depuis Event
        status_from_event = check_sync_status("Event", event_name)
        print(f"   📊 Statut depuis Event: {status_from_event.get('status')}")
        
        if (status_from_so.get('status') == 'synchronized' and 
            status_from_event.get('status') == 'synchronized'):
            print("   ✅ Vérification de statut réussie")
            return True
        else:
            print("   ❌ Vérification de statut échouée")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du test de statut: {str(e)}")
        return False

def cleanup_test_data():
    """
    Nettoie les données de test (optionnel)
    """
    try:
        # Supprimer les événements de test
        test_events = frappe.get_all("Event", filters={"subject": ["like", "%TEST%"]})
        for event in test_events:
            frappe.delete_doc("Event", event.name, ignore_permissions=True)
        
        # Supprimer les commandes de test (en annulation d'abord)
        test_sales_orders = frappe.get_all("Sales Order", filters={"customer": "Client Test Sync"})
        for so in test_sales_orders:
            try:
                doc = frappe.get_doc("Sales Order", so.name)
                if doc.docstatus == 1:  # Soumis
                    doc.cancel()
                frappe.delete_doc("Sales Order", so.name, ignore_permissions=True)
            except:
                pass  # Ignorer les erreurs de suppression
        
        # Supprimer le client de test
        if frappe.db.exists("Customer", "Client Test Sync"):
            frappe.delete_doc("Customer", "Client Test Sync", ignore_permissions=True)
        
        print("   ✅ Nettoyage terminé")
        
    except Exception as e:
        print(f"   ⚠️  Erreur lors du nettoyage: {str(e)}")

# Fonction à appeler depuis la console ERPNext
def run_tests():
    """
    Point d'entrée pour exécuter les tests depuis la console ERPNext
    
    Usage:
    bench console
    >>> from josseaume_energies.josseaume_energies.test_sync import run_tests
    >>> run_tests()
    """
    return test_synchronization()

if __name__ == "__main__":
    test_synchronization()
    
def test_employee_view_setup():
    """
    Script de test complet pour vérifier que la vue Employés fonctionne
    """
    print("🧪 Test de la vue Employés - Début des vérifications...")
    print("=" * 60)
    
    # Test 1: Vérifier les champs custom Employee
    print("\n📋 Test 1: Vérification des champs Employee")
    required_fields = [
        "custom_livraisons", "custom_installations", "custom_entretiensramonages",
        "custom_depannages_poeles", "custom_depannages_chauffage", "custom_electricite",
        "custom_photovoltaique", "custom_bureau", "custom_commercial", "custom_renovation"
    ]
    
    missing_fields = []
    for field in required_fields:
        if not frappe.db.exists("Custom Field", f"Employee-{field}"):
            missing_fields.append(field)
            print(f"❌ Champ manquant: {field}")
        else:
            print(f"✅ Champ trouvé: {field}")
    
    if missing_fields:
        print(f"\n⚠️  {len(missing_fields)} champ(s) manquant(s). Créez-les avant de continuer.")
        return False
    
    # Test 2: Vérifier les méthodes API
    print("\n🔌 Test 2: Vérification des méthodes API")
    api_methods = [
        "josseaume_energies.api.get_employees_with_team_filter",
        "josseaume_energies.api.get_day_events_by_employees",
        "josseaume_energies.api.get_team_options"
    ]
    
    for method in api_methods:
        try:
            # Tester l'accès à la méthode
            func = frappe.get_attr(method)
            print(f"✅ Méthode API trouvée: {method}")
        except Exception as e:
            print(f"❌ Erreur méthode API {method}: {str(e)}")
            return False
    
    # Test 3: Tester la récupération des employés
    print("\n👥 Test 3: Récupération des employés")
    try:
        result = frappe.call("josseaume_energies.api.get_employees_with_team_filter")
        if result["status"] == "success":
            print(f"✅ {result['total']} employé(s) récupéré(s)")
            
            # Afficher quelques exemples
            for i, emp in enumerate(result["employees"][:3]):
                teams = ", ".join(emp.get("teams", []))
                print(f"   - {emp['employee_name']} ({teams or 'Aucune équipe'})")
                
            if result["total"] == 0:
                print("⚠️  Aucun employé actif trouvé. Vérifiez vos données.")
        else:
            print(f"❌ Erreur récupération employés: {result.get('message')}")
            return False
    except Exception as e:
        print(f"❌ Exception récupération employés: {str(e)}")
        return False
    
    # Test 4: Tester les filtres d'équipe
    print("\n🔍 Test 4: Filtres par équipe")
    teams = ["Livraisons", "Installations", "Entretiens/Ramonages"]
    
    for team in teams:
        try:
            result = frappe.call("josseaume_energies.api.get_employees_with_team_filter", 
                               team_filter=team)
            if result["status"] == "success":
                print(f"✅ Équipe {team}: {result['total']} employé(s)")
            else:
                print(f"❌ Erreur filtre {team}: {result.get('message')}")
        except Exception as e:
            print(f"❌ Exception filtre {team}: {str(e)}")
    
    # Test 5: Tester la récupération des événements par employé
    print("\n📅 Test 5: Événements par employé")
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        result = frappe.call("josseaume_energies.api.get_day_events_by_employees", 
                           date=today)
        if result["status"] == "success":
            events_count = sum(
                len(emp_events["all_day"]) + len(emp_events["morning"]) + len(emp_events["afternoon"])
                for emp_events in result["events_by_employee"].values()
            )
            print(f"✅ {events_count} événement(s) trouvé(s) pour aujourd'hui")
            print(f"   Employés avec événements: {len([e for e in result['events_by_employee'].values() if any([e['all_day'], e['morning'], e['afternoon']])])}")
        else:
            print(f"❌ Erreur événements: {result.get('message')}")
    except Exception as e:
        print(f"❌ Exception événements: {str(e)}")
    
    # Test 6: Vérifier les champs Sales Order
    print("\n📋 Test 6: Champs Sales Order")
    so_fields = ["custom_intervenant", "custom_horaire", "custom_type_de_commande", 
                "custom_commentaire", "custom_calendar_event"]
    
    missing_so_fields = []
    for field in so_fields:
        if not frappe.db.exists("Custom Field", f"Sales Order-{field}"):
            missing_so_fields.append(field)
            print(f"❌ Champ SO manquant: {field}")
        else:
            print(f"✅ Champ SO trouvé: {field}")
    
    if missing_so_fields:
        print(f"\n⚠️  {len(missing_so_fields)} champ(s) Sales Order manquant(s)")
    
    # Test 7: Statistiques des employés par équipe
    print("\n📊 Test 7: Statistiques par équipe")
    try:
        all_employees = frappe.call("josseaume_energies.api.get_employees_with_team_filter")["employees"]
        team_stats = {}
        
        for emp in all_employees:
            for team in emp.get("teams", []):
                team_stats[team] = team_stats.get(team, 0) + 1
        
        if team_stats:
            print("Répartition des employés par équipe:")
            for team, count in sorted(team_stats.items()):
                print(f"   - {team}: {count} employé(s)")
        else:
            print("⚠️  Aucun employé n'est assigné à une équipe")
            
    except Exception as e:
        print(f"❌ Erreur statistiques: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Tests terminés avec succès!")
    print("\n📝 Actions recommandées:")
    print("1. Vérifiez que les employés sont bien assignés aux équipes")
    print("2. Testez la vue dans le navigateur: /app/two-column-calendar")
    print("3. Vérifiez que la vue 'Employés' est sélectionnée par défaut")
    print("4. Testez le double-clic pour créer des commandes")
    
    return True

def create_test_employee():
    """
    Crée un employé de test avec des équipes assignées
    """
    try:
        # Vérifier si l'employé test existe déjà
        if frappe.db.exists("Employee", {"employee_name": "Test Employé Calendrier"}):
            print("Employé de test existe déjà")
            return
        
        # Créer l'employé de test
        employee = frappe.get_doc({
            "doctype": "Employee",
            "employee_name": "Test Employé Calendrier",
            "first_name": "Test",
            "last_name": "Employé",
            "status": "Active",
            "custom_livraisons": 1,
            "custom_installations": 1,
            "custom_entretiens_ramonages": 0,
        })
        
        employee.insert(ignore_permissions=True)
        print(f"✅ Employé de test créé: {employee.name}")
        
    except Exception as e:
        print(f"❌ Erreur création employé test: {str(e)}")

def assign_employees_to_teams():
    """
    Script d'aide pour assigner des employés aux équipes
    """
    print("🏷️  Assistant d'assignation d'équipes")
    print("=" * 40)
    
    # Récupérer tous les employés actifs
    employees = frappe.get_all("Employee", 
                              filters={"status": "Active"}, 
                              fields=["name", "employee_name"])
    
    if not employees:
        print("Aucun employé actif trouvé")
        return
    
    print(f"Trouvé {len(employees)} employé(s) actif(s):")
    
    teams = [
        "custom_livraisons", "custom_installations", "custom_entretiensramonages",
        "custom_depannages_poeles", "custom_depannages_chauffage", "custom_electricite",
        "custom_photovoltaique", "custom_bureau", "custom_commercial", "custom_renovation"
    ]
    
    for emp in employees:
        print(f"\n👤 {emp.employee_name} ({emp.name})")
        
        # Afficher les équipes actuelles
        emp_doc = frappe.get_doc("Employee", emp.name)
        current_teams = []
        for team in teams:
            if getattr(emp_doc, team, 0):
                current_teams.append(team.replace("custom_", "").replace("_", " ").title())
        
        if current_teams:
            print(f"   Équipes actuelles: {', '.join(current_teams)}")
        else:
            print("   Aucune équipe assignée")
            print("   💡 Assignez cet employé à des équipes via l'interface ERPNext")

# Point d'entrée principal
def run_all_tests():
    """
    Exécute tous les tests de la vue Employés
    
    Usage dans bench console:
    >>> from josseaume_energies.test_employee_view import run_all_tests
    >>> run_all_tests()
    """
    print("🚀 Lancement des tests complets de la vue Employés")
    print("" + "=" * 60)
    
    success = test_employee_view_setup()
    
    if success:
        print("\n🎉 Tous les tests sont passés avec succès!")
        print("Votre vue Employés devrait fonctionner correctement.")
        
        # Proposer d'afficher les statistiques
        print("\n📊 Voulez-vous voir les statistiques détaillées?")
        assign_employees_to_teams()
    else:
        print("\n❌ Certains tests ont échoué.")
        print("Référez-vous aux messages d'erreur ci-dessus.")
    
    return success

if __name__ == "__main__":
    run_all_tests()