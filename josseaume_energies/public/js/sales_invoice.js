// josseaume_energies/public/js/sales_invoice.js

frappe.ui.form.on("Sales Invoice", {
    onload: function (frm) {
        // Configurer le filtrage par commune
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.setup_for_doctype('Sales Invoice', frm);
        }

        // Configurer les événements TTC bidirectionnels
        if (typeof setup_ttc_item_events !== 'undefined') {
            setup_ttc_item_events('Sales Invoice Item');
        }
    },

    refresh: function(frm) {
        // Initialiser les prix TTC au chargement
        if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
            josseaume_energies.ttc.initialize_ttc_fields(frm);
        }
    },

    // Recalculer tous les TTC quand les taxes changent
    taxes_and_charges: function(frm) {
        if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
            setTimeout(() => {
                josseaume_energies.ttc.update_all_items_on_tax_change(frm);
            }, 300);
        }
    },

    customer: function(frm) {
        // Pré-remplir la commune quand un client est sélectionné
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.prefill_commune_from_customer(frm, {customer_field: 'customer'});
        }
    }
});