#!/usr/bin/env python3
"""
Script pour diagnostiquer et corriger les problèmes de socket.io
"""

import frappe

def check_socketio_settings():
    """
    Vérifie et corrige les paramètres socket.io
    """
    
    print("🔍 Diagnostic Socket.IO")
    print("-" * 50)
    
    # 1. Vérifier les paramètres système
    site_config = frappe.get_site_config()
    
    print("📋 Configuration du site:")
    print(f"  socketio_port: {site_config.get('socketio_port', 'Non défini')}")
    print(f"  webserver_port: {site_config.get('webserver_port', 'Non défini')}")
    
    # 2. Vérifier si le service socket.io tourne
    import subprocess
    try:
        result = subprocess.run(['supervisorctl', 'status', 'frappe-bench-socketio'], 
                              capture_output=True, text=True)
        print(f"\n🔌 Status Socket.IO: {result.stdout}")
    except:
        print("\n⚠️ Impossible de vérifier le status de socket.io")
    
    # 3. Désactiver temporairement les notifications temps réel si problème
    print("\n💡 Pour désactiver temporairement les notifications temps réel:")
    print("   bench --site erp.josseaume-energies.com set-config enable_socketio false")
    print("\n💡 Pour réactiver:")
    print("   bench --site erp.josseaume-energies.com set-config enable_socketio true")
    
    return True

if __name__ == "__main__" or frappe.local.site:
    check_socketio_settings()