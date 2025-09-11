// Désactiver la sauvegarde automatique des filtres sur la liste des clients
frappe.listview_settings['Customer'] = {
    // Désactiver la sauvegarde des paramètres utilisateur
    save_user_settings: false,
    
    onload: function(listview) {
        console.log("🚀 Liste clients - Désactivation sauvegarde filtres");
        
        // Surcharger la fonction qui sauvegarde les paramètres utilisateur
        if (listview.save_view_user_settings) {
            listview.save_view_user_settings = function() {
                // Ne rien faire - désactive la sauvegarde
                console.log("🚫 Sauvegarde filtres désactivée");
            };
        }
        
        // Désactiver la sauvegarde automatique des filtres
        listview.list_view_settings_enabled = false;
        
        // Surcharger la fonction get_user_settings pour retourner des paramètres vides
        const original_get_user_settings = listview.get_user_settings;
        listview.get_user_settings = function() {
            // Retourner des paramètres par défaut au lieu des paramètres sauvegardés
            return {
                filters: [],
                sort_by: 'modified',
                sort_order: 'desc'
            };
        };
        
        // Effacer les filtres existants au chargement
        listview.clear_filters();
        
        console.log("✅ Configuration filtres - OK");
    },
    
    refresh: function(listview) {
        // À chaque rafraîchissement, s'assurer que la sauvegarde reste désactivée
        if (listview.save_view_user_settings) {
            listview.save_view_user_settings = function() {
                console.log("🚫 Tentative sauvegarde bloquée");
            };
        }
    },
    
    // Désactiver la sauvegarde des colonnes aussi
    before_render: function(listview) {
        listview.save_view_user_settings = function() {
            // Bloquer toute sauvegarde
        };
    }
};

// Script alternatif - vérifier périodiquement si on est sur la liste des clients
$(document).ready(function() {
    // Fonction pour désactiver la sauvegarde
    function disableCustomerListSaving() {
        if (typeof frappe !== 'undefined' && frappe.get_route && frappe.get_route()[0] === 'List' && frappe.get_route()[1] === 'Customer') {
            console.log("📋 Sur la liste des clients - Configuration anti-sauvegarde");
            
            // Désactiver la sauvegarde globalement pour cette page
            if (typeof cur_list !== 'undefined' && cur_list) {
                if (cur_list.save_view_user_settings) {
                    cur_list.save_view_user_settings = function() {
                        console.log("🚫 Sauvegarde filtres bloquée globalement");
                    };
                }
                
                // Surcharger la fonction de sauvegarde des paramètres utilisateur
                if (cur_list.list_view && cur_list.list_view.save_view_user_settings) {
                    cur_list.list_view.save_view_user_settings = function() {
                        console.log("🚫 Sauvegarde ListView bloquée");
                    };
                }
            }
        }
    }
    
    // Vérifier toutes les secondes pendant 5 secondes
    let checkCount = 0;
    const checkInterval = setInterval(function() {
        checkCount++;
        disableCustomerListSaving();
        
        if (checkCount >= 5) {
            clearInterval(checkInterval);
        }
    }, 1000);
});

// Fonction pour effacer manuellement tous les filtres sauvegardés des clients
window.clear_customer_list_settings = function() {
    console.log("🧹 Nettoyage des paramètres sauvegardés des clients");
    
    // Effacer via l'API Frappe
    frappe.call({
        method: 'frappe.desk.listview.remove_user_settings',
        args: {
            doctype: 'Customer'
        },
        callback: function(r) {
            if (r.message) {
                frappe.show_alert('✅ Paramètres clients effacés', 3);
                // Recharger la page pour appliquer les changements
                setTimeout(function() {
                    location.reload();
                }, 1000);
            }
        }
    });
};

console.log("✅ Script customer_list.js chargé - Sauvegarde filtres désactivée");
console.log("💡 Utilisez clear_customer_list_settings() pour effacer les paramètres existants");