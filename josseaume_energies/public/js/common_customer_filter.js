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
        if (frm.commune_container || frm.commune_field) {
            return;
        }

        // Trouver la position d'insertion
        let target_field = frm.fields_dict[config.customer_field];
        if (!target_field) {
            console.warn(`Champ ${config.customer_field} non trouvé`);
            return;
        }

        // Créer un conteneur pour le champ commune
        const commune_container = $(`
            <div class="frappe-control" style="margin-bottom: 15px;">
                <div class="form-group">
                    <label class="control-label" style="padding-right: 0px;">Filtrer par Commune</label>
                    <div class="control-input-wrapper">
                        <div class="control-input" style="position: relative;">
                            <input type="text" class="input-with-feedback form-control"
                                   placeholder="Tapez pour rechercher une commune..."
                                   autocomplete="off"
                                   data-fieldname="${config.commune_field}"
                                   style="padding-right: 30px;">
                        </div>
                    </div>
                    <p class="help-box small text-muted">Sélectionnez une commune pour filtrer les clients</p>
                </div>
            </div>
        `);

        // Insérer le conteneur avant le champ client
        commune_container.insertBefore(target_field.wrapper);

        // Stocker les références
        frm.commune_container = commune_container;
        frm.commune_input = commune_container.find('input[data-fieldname="' + config.commune_field + '"]');

        // Créer un objet commune_field compatible
        frm.commune_field = {
            input: frm.commune_input[0],
            wrapper: commune_container[0],
            get_value: function() {
                return frm.commune_input.val() || '';
            },
            set_value: function(value) {
                frm.commune_input.val(value || '');
            }
        };

        // Charger les communes disponibles
        this.load_communes(frm, config);
    },

    /**
     * Charge la liste des communes disponibles
     */
    load_communes: function(frm, config) {
        console.log('Chargement des communes...');

        frappe.call({
            method: 'josseaume_energies.api.get_communes_list',
            callback: function(r) {
                console.log('Réponse communes:', r);
                if (r.message && r.message.status === 'success' && r.message.communes && r.message.communes.length > 0) {
                    const communes = r.message.communes;

                    console.log('Communes trouvées:', communes.length, communes);

                    // Configurer l'autocomplete avec jQuery UI
                    if (frm.commune_input && frm.commune_input.length && typeof frm.commune_input.autocomplete === 'function') {
                        frm.commune_input.autocomplete({
                            source: communes,
                            minLength: 1,
                            select: function(event, ui) {
                                console.log('Commune sélectionnée:', ui.item.value);
                                frm.commune_field.set_value(ui.item.value);
                                // Déclencher le filtrage
                                setTimeout(() => {
                                    josseaume.customer_filter.on_commune_change(frm, config);
                                }, 100);
                                return false;
                            }
                        });
                    } else {
                        // Fallback : utiliser un datalist HTML5
                        console.log('jQuery UI autocomplete non disponible, utilisation de datalist HTML5');
                        const datalistId = 'communes-datalist-' + Math.random().toString(36).substr(2, 9);
                        const datalist = $(`<datalist id="${datalistId}"></datalist>`);

                        communes.forEach(commune => {
                            datalist.append(`<option value="${commune}">${commune}</option>`);
                        });

                        $('body').append(datalist);
                        frm.commune_input.attr('list', datalistId);

                        // Événement de changement
                        frm.commune_input.on('input change', function() {
                            console.log('📝 Commune input changed, valeur:', $(this).val());
                            setTimeout(() => {
                                josseaume.customer_filter.on_commune_change(frm, config);
                            }, 300);
                        });
                    }

                    // Stocker les communes pour référence
                    frm.available_communes = communes;
                    console.log('Autocomplete configuré avec', communes.length, 'communes');
                } else {
                    console.warn('Aucune commune trouvée ou erreur dans la requête');
                    // Fallback : essayer avec une requête SQL directe
                    frappe.call({
                        method: 'frappe.db.sql',
                        args: {
                            query: 'SELECT DISTINCT custom_city FROM tabCustomer WHERE custom_city IS NOT NULL AND custom_city != "" ORDER BY custom_city'
                        },
                        callback: function(r2) {
                            console.log('Fallback SQL result:', r2);
                            if (r2.message && r2.message.length > 0) {
                                const communes = r2.message.map(row => row[0]).filter(city => city && city.trim());
                                if (frm.commune_input && frm.commune_input.length && communes.length > 0) {
                                    frm.commune_input.autocomplete({
                                        source: communes,
                                        minLength: 1,
                                        select: function(event, ui) {
                                            console.log('Commune sélectionnée (fallback):', ui.item.value);
                                            frm.commune_field.set_value(ui.item.value);
                                            setTimeout(() => {
                                                josseaume.customer_filter.on_commune_change(frm, config);
                                            }, 100);
                                            return false;
                                        }
                                    });
                                    frm.available_communes = communes;
                                    console.log('Fallback autocomplete configuré avec', communes.length, 'communes');
                                }
                            }
                        }
                    });
                }
            },
            error: function(err) {
                console.error('Erreur lors du chargement des communes:', err);
            }
        });
    },

    /**
     * Configure le filtrage du champ client
     */
    setup_customer_filtering: function(frm, config) {
        console.log('Configuration du filtrage pour le champ:', config.customer_field);

        // NOUVELLE APPROCHE: Configurer la query après que le formulaire soit complètement chargé
        setTimeout(() => {
            console.log('⏰ Configuration retardée de la query...');

            frm.set_query(config.customer_field, function(doc, cdt, cdn) {
                const commune = frm.commune_field ? frm.commune_field.get_value() : null;
                console.log('🔍 set_query EXECUTÉE - commune actuelle:', commune);
                console.log('🔍 frm.commune_field exists:', !!frm.commune_field);
                console.log('🔍 doc:', doc);
                console.log('🔍 cdt:', cdt);
                console.log('🔍 cdn:', cdn);

                if (commune && commune.trim()) {
                    console.log('✅ Filtrage par commune ACTIVÉ:', commune.trim());
                    // Filtrage par commune avec recherche par préfixe comme dans le calendrier
                    const queryConfig = {
                        query: 'josseaume_energies.api.search_customers_by_commune',
                        filters: {
                            'custom_city': commune.trim() // Utiliser exactement le même nom que dans le calendrier
                        }
                    };
                    console.log('✅ Configuration de la query retournée:', JSON.stringify(queryConfig));
                    return queryConfig;
                } else {
                    console.log('❌ Pas de filtre commune, affichage de tous les clients');
                    // Pas de filtre spécifique - retourner tous les clients
                    return {};
                }
            });

            console.log('⏰ set_query configurée pour:', config.customer_field);
        }, 1000);

        // AJOUT: Fonction de test pour vérifier le filtrage
        window.test_commune_filtering = function() {
            console.log('🧪 Test manuel du filtrage');
            console.log('🧪 Commune field exists:', !!frm.commune_field);
            console.log('🧪 Commune current value:', frm.commune_field ? frm.commune_field.get_value() : 'N/A');
            console.log('🧪 Input element value:', frm.commune_input ? frm.commune_input.val() : 'N/A');

            // Tester la query sur le champ directement
            console.log('🧪 Testing field query...');
            const customerField = frm.fields_dict[config.customer_field];
            console.log('🧪 Customer field object:', customerField);

            if (customerField) {
                console.log('🧪 Field type:', customerField.df.fieldtype);
                console.log('🧪 Field has get_query:', typeof customerField.get_query);

                // Vérifier si une query est définie
                console.log('🧪 frm._queries:', frm._queries);
                console.log('🧪 Query for customer field:', frm._queries ? frm._queries[config.customer_field] : 'No _queries');
            }

            // NOUVEAU: Forcer un test de la query
            console.log('🧪 Force testing query execution...');
            if (frm._queries && frm._queries[config.customer_field]) {
                try {
                    const testResult = frm._queries[config.customer_field](frm.doc, null, null);
                    console.log('🧪 FORCED query result:', testResult);
                } catch (e) {
                    console.log('🧪 Query execution error:', e);
                }
            }

            // NOUVEAU: Test direct de l'API
            window.test_api_directly = function() {
                console.log('🧪 Testing API directly...');
                const commune = frm.commune_field.get_value();
                if (commune) {
                    frappe.call({
                        method: 'josseaume_energies.api.search_customers_by_commune',
                        args: {
                            doctype: 'Customer',
                            txt: '',
                            searchfield: 'name',
                            start: 0,
                            page_len: 10,
                            filters: {
                                'custom_city': commune
                            }
                        },
                        callback: function(r) {
                            console.log('🧪 API Direct Result:', r);
                        }
                    });
                } else {
                    console.log('🧪 No commune selected for API test');
                }
            };
        };
    },

    /**
     * Configure les événements
     */
    setup_events: function(frm, config) {
        const self = this;

        // Événement sur changement de commune
        if (frm.commune_input && frm.commune_input.length) {
            frm.commune_input.on('input', function() {
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
        console.log('🔄 on_commune_change appelée - commune:', commune);
        console.log('🔄 frm.commune_field:', frm.commune_field);
        console.log('🔄 config:', config);

        if (config.auto_clear && commune !== this.last_commune) {
            // Effacer la sélection de client si la commune a changé
            console.log('🗑️ Clearing customer field, commune changed from', this.last_commune, 'to', commune);
            frm.set_value(config.customer_field, null);
            this.last_commune = commune;
        }

        // Rafraîchir le champ client pour appliquer le nouveau filtre
        console.log('🔄 Tentative de rafraîchissement du champ:', config.customer_field);
        console.log('🔄 Current commune value for filtering:', commune);

        // Re-configurer la query immédiatement avec la nouvelle commune
        console.log('🔄 Re-configuration immédiate de la query avec nouvelle commune...');

        frm.set_query(config.customer_field, function(doc, cdt, cdn) {
            const currentCommune = frm.commune_field ? frm.commune_field.get_value() : null;
            console.log('🔍 IMMEDIATE set_query - commune:', currentCommune);

            if (currentCommune && currentCommune.trim()) {
                const queryConfig = {
                    query: 'josseaume_energies.api.search_customers_by_commune',
                    filters: {
                        'custom_city': currentCommune.trim()
                    }
                };
                console.log('✅ IMMEDIATE query config:', JSON.stringify(queryConfig));
                return queryConfig;
            } else {
                return {};
            }
        });

        console.log('✅ Filtre de commune mis à jour et query reconfigurée immédiatement');
    },

    /**
     * Ajoute un bouton pour effacer le filtre
     */
    add_clear_button: function(frm, config) {
        if (!frm.commune_container) return;

        // Vérifier si le bouton existe déjà pour éviter les doublons
        if (frm.commune_container.find('.clear-commune-btn').length > 0) {
            console.log('Bouton "Tous les clients" déjà présent, pas de doublon');
            return;
        }

        const clear_btn = $(`
            <button class="btn btn-xs btn-default clear-commune-btn" title="Effacer le filtre commune"
                    style="margin-left: 5px; margin-top: 5px;">
                <i class="fa fa-times"></i> Tous les clients
            </button>
        `);

        frm.commune_container.find('.control-input').append(clear_btn);

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