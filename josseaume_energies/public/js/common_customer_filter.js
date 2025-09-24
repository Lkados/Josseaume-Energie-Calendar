/**
 * Module réutilisable pour le filtrage des clients par commune
 * Utilisé dans Quotation, Sales Order, Sales Invoice
 */

frappe.provide("josseaume.customer_filter");

josseaume.customer_filter = {
    /**
     * Configure le filtrage par commune pour un formulaire
     * @param {Object} frm - Le formulaire ERPNext
     * @param {Object} options - Options de configuration
     */
    setup: function(frm, options = {}) {
        const self = this;

        // Configuration par défaut
        const config = {
            customer_field: options.customer_field || 'customer',
            commune_field: options.commune_field || 'custom_commune_filter',
            position: options.position || 'before_customer',
            auto_clear: options.auto_clear !== false, // true par défaut
            show_clear_button: options.show_clear_button !== false, // true par défaut
            ...options
        };

        // Ajouter le champ commune s'il n'existe pas déjà
        self.add_commune_field(frm, config);

        // Configurer le filtrage du champ client
        self.setup_customer_filtering(frm, config);

        // Ajouter les événements
        self.setup_events(frm, config);
    },

    /**
     * Ajoute le champ commune au formulaire
     */
    add_commune_field: function(frm, config) {
        // Vérifier si le champ existe déjà
        if (frm.fields_dict[config.commune_field]) {
            return;
        }

        // Trouver la position d'insertion
        let target_field = frm.fields_dict[config.customer_field];
        if (!target_field) {
            console.warn(`Champ ${config.customer_field} non trouvé`);
            return;
        }

        // Créer le champ commune
        const commune_field = frappe.ui.form.make_control({
            df: {
                fieldtype: 'Autocomplete',
                fieldname: config.commune_field,
                label: 'Filtrer par Commune',
                placeholder: 'Tapez pour rechercher une commune...',
                options: [], // Sera rempli dynamiquement
                description: 'Sélectionnez une commune pour filtrer les clients'
            },
            parent: target_field.wrapper.parent(),
            only_input: false
        });

        // Insérer le champ avant le champ client
        $(commune_field.wrapper).insertBefore(target_field.wrapper);
        commune_field.make_input();

        // Stocker la référence
        frm.commune_field = commune_field;

        // Charger les communes disponibles
        this.load_communes(frm, config);
    },

    /**
     * Charge la liste des communes disponibles
     */
    load_communes: function(frm, config) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Customer',
                fields: ['custom_city'],
                filters: [['custom_city', '!=', '']],
                distinct: true,
                limit_page_length: 0
            },
            callback: function(r) {
                if (r.message) {
                    const communes = r.message
                        .map(item => item.custom_city)
                        .filter(city => city && city.trim())
                        .sort();

                    // Mettre à jour les options du champ autocomplete
                    if (frm.commune_field && frm.commune_field.input) {
                        $(frm.commune_field.input).autocomplete({
                            source: communes,
                            minLength: 1,
                            select: function(event, ui) {
                                frm.commune_field.set_value(ui.item.value);
                                // Déclencher le filtrage
                                setTimeout(() => {
                                    josseaume.customer_filter.on_commune_change(frm, config);
                                }, 100);
                                return false;
                            }
                        });
                    }
                }
            }
        });
    },

    /**
     * Configure le filtrage du champ client
     */
    setup_customer_filtering: function(frm, config) {
        frm.set_query(config.customer_field, function() {
            const commune = frm.commune_field ? frm.commune_field.get_value() : null;

            if (commune && commune.trim()) {
                // Filtrage par commune
                return {
                    query: 'josseaume_energies.api.search_customers_by_commune',
                    filters: {
                        commune: commune.trim()
                    }
                };
            } else {
                // Pas de filtre spécifique - retourner tous les clients
                return {};
            }
        });
    },

    /**
     * Configure les événements
     */
    setup_events: function(frm, config) {
        const self = this;

        // Événement sur changement de commune
        if (frm.commune_field) {
            frm.commune_field.input.addEventListener('input', function() {
                setTimeout(() => {
                    self.on_commune_change(frm, config);
                }, 300); // Délai pour éviter trop d'appels
            });

            // Bouton pour effacer le filtre
            if (config.show_clear_button) {
                this.add_clear_button(frm, config);
            }
        }
    },

    /**
     * Gestionnaire du changement de commune
     */
    on_commune_change: function(frm, config) {
        const commune = frm.commune_field ? frm.commune_field.get_value() : null;

        if (config.auto_clear && commune !== this.last_commune) {
            // Effacer la sélection de client si la commune a changé
            frm.set_value(config.customer_field, null);
            this.last_commune = commune;
        }

        // Rafraîchir le champ client pour appliquer le nouveau filtre
        if (frm.fields_dict[config.customer_field]) {
            frm.fields_dict[config.customer_field].set_data([]);
        }
    },

    /**
     * Ajoute un bouton pour effacer le filtre
     */
    add_clear_button: function(frm, config) {
        if (!frm.commune_field || !frm.commune_field.wrapper) return;

        const clear_btn = $(`
            <button class="btn btn-xs btn-default" title="Effacer le filtre commune"
                    style="margin-left: 5px; margin-top: 5px;">
                <i class="fa fa-times"></i> Tous les clients
            </button>
        `);

        $(frm.commune_field.wrapper).append(clear_btn);

        clear_btn.on('click', function() {
            frm.commune_field.set_value('');
            frm.set_value(config.customer_field, null);

            // Message de confirmation
            frappe.show_alert({
                message: 'Filtre commune supprimé - Tous les clients disponibles',
                indicator: 'blue'
            }, 3);
        });
    },

    /**
     * Utilitaire pour obtenir les communes d'un client
     */
    get_customer_commune: function(customer_name, callback) {
        if (!customer_name) return;

        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Customer',
                fieldname: 'custom_city',
                filters: { name: customer_name }
            },
            callback: function(r) {
                if (callback && r.message) {
                    callback(r.message.custom_city || '');
                }
            }
        });
    },

    /**
     * Pré-remplir la commune basée sur le client sélectionné
     */
    prefill_commune_from_customer: function(frm, config) {
        const customer = frm.doc[config.customer_field];
        if (customer && frm.commune_field) {
            this.get_customer_commune(customer, function(commune) {
                if (commune && !frm.commune_field.get_value()) {
                    frm.commune_field.set_value(commune);
                }
            });
        }
    }
};

/**
 * Fonction d'aide pour les DocTypes standards
 */
josseaume.customer_filter.setup_for_doctype = function(doctype, frm) {
    const configs = {
        'Quotation': {
            customer_field: 'party_name',
            description: 'Filtrer les clients par commune pour créer un devis'
        },
        'Sales Order': {
            customer_field: 'customer',
            description: 'Filtrer les clients par commune pour créer une commande'
        },
        'Sales Invoice': {
            customer_field: 'customer',
            description: 'Filtrer les clients par commune pour créer une facture'
        }
    };

    const config = configs[doctype] || {};
    josseaume.customer_filter.setup(frm, config);
};