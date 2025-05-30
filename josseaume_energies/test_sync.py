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