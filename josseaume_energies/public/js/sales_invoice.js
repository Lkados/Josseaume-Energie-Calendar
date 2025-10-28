// josseaume_energies/public/js/sales_invoice.js

frappe.ui.form.on("Sales Invoice", {
    onload: function (frm) {
        // Configurer le filtrage par commune
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.setup_for_doctype('Sales Invoice', frm);
        }

        // Configurer le calcul automatique des prix TTC
        if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
            josseaume_energies.ttc.setup_ttc_calculation(frm, 'Sales Invoice Item', 'items');
        }
    },

    refresh: function(frm) {
        // Calculer les prix TTC
        if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
            josseaume_energies.ttc.update_all_items_ttc(frm, 'items');
        }
    },

    customer: function(frm) {
        // Pré-remplir la commune quand un client est sélectionné
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.prefill_commune_from_customer(frm, {customer_field: 'customer'});
        }
    }
});