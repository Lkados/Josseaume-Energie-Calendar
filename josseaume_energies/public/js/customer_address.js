// Script pour gérer les champs d'adresse séparés sur les fiches clients

frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        // Ajouter un bouton pour parser l'adresse existante
        if (frm.doc.primary_address && !frm.doc.custom_street_address) {
            frm.add_custom_button(__('Parser l\'adresse existante'), function() {
                frappe.call({
                    method: 'josseaume_energies.address_fields_setup.parse_existing_address',
                    args: {
                        customer_name: frm.doc.name
                    },
                    callback: function(r) {
                        if (r.message && r.message.status === 'success') {
                            frm.reload_doc();
                            frappe.show_alert({
                                message: 'Adresse analysée et champs mis à jour',
                                indicator: 'green'
                            });
                        }
                    }
                });
            }, __('Actions'));
        }
        
        // Mettre à jour l'affichage de l'adresse complète
        update_full_address_display(frm);
    },
    
    custom_street_address: function(frm) {
        update_full_address_display(frm);
    },
    
    custom_postal_code: function(frm) {
        // Validation du code postal (5 chiffres)
        if (frm.doc.custom_postal_code && !/^\d{5}$/.test(frm.doc.custom_postal_code)) {
            frappe.msgprint(__('Le code postal doit contenir exactement 5 chiffres'));
            frm.set_value('custom_postal_code', '');
        }
        update_full_address_display(frm);
    },
    
    custom_city: function(frm) {
        // Convertir en majuscules automatiquement
        if (frm.doc.custom_city) {
            frm.set_value('custom_city', frm.doc.custom_city.toUpperCase());
        }
        update_full_address_display(frm);
    },
    
    custom_sync_to_address: function(frm) {
        // Synchroniser avec l'adresse principale
        if (!frm.doc.name) {
            frappe.msgprint(__('Veuillez d\'abord enregistrer le client'));
            return;
        }
        
        frappe.call({
            method: 'josseaume_energies.address_fields_setup.sync_customer_address_fields',
            args: {
                customer_name: frm.doc.name
            },
            callback: function(r) {
                if (r.message && r.message.status === 'success') {
                    frappe.show_alert({
                        message: 'Adresse synchronisée avec succès',
                        indicator: 'green'
                    });
                    frm.reload_doc();
                } else if (r.message && r.message.status === 'error') {
                    frappe.msgprint(__('Erreur lors de la synchronisation: ') + r.message.message);
                }
            }
        });
    }
});

function update_full_address_display(frm) {
    // Construire et afficher l'adresse complète
    let address_parts = [];
    
    if (frm.doc.custom_street_address) {
        address_parts.push(frm.doc.custom_street_address);
    }
    
    let city_line = [];
    if (frm.doc.custom_postal_code) {
        city_line.push(frm.doc.custom_postal_code);
    }
    if (frm.doc.custom_city) {
        city_line.push(frm.doc.custom_city);
    }
    
    if (city_line.length > 0) {
        address_parts.push(city_line.join(' '));
    }
    
    const full_address = address_parts.join('\n');
    frm.set_value('custom_full_address_display', full_address);
}

// Hook pour la création automatique d'adresse lors de la sauvegarde
frappe.ui.form.on('Customer', {
    after_save: function(frm) {
        // Si des champs d'adresse sont remplis mais pas d'adresse principale
        if ((frm.doc.custom_street_address || frm.doc.custom_city) && !frm.doc.customer_primary_address) {
            frappe.confirm(
                'Voulez-vous créer une adresse principale avec ces informations ?',
                function() {
                    frappe.call({
                        method: 'josseaume_energies.address_fields_setup.sync_customer_address_fields',
                        args: {
                            customer_name: frm.doc.name
                        },
                        callback: function(r) {
                            if (r.message && r.message.status === 'success') {
                                frappe.show_alert({
                                    message: 'Adresse principale créée',
                                    indicator: 'green'
                                });
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }
    }
});

// Fonction pour remplir automatiquement depuis une adresse sélectionnée
frappe.ui.form.on('Customer', {
    customer_primary_address: function(frm) {
        if (frm.doc.customer_primary_address && frm.doc.primary_address) {
            // Parser l'adresse affichée
            const lines = frm.doc.primary_address.split('\n');
            
            // Essayer d'extraire les composants
            if (lines.length > 0) {
                // Première ligne = rue
                frm.set_value('custom_street_address', lines[0].trim());
                
                // Chercher code postal et ville
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const match = line.match(/^(\d{5})\s+(.+)$/);
                    if (match) {
                        frm.set_value('custom_postal_code', match[1]);
                        frm.set_value('custom_city', match[2].toUpperCase());
                        break;
                    }
                }
            }
        }
    }
});