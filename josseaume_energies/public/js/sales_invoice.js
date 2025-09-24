// josseaume_energies/public/js/sales_invoice.js

frappe.ui.form.on("Sales Invoice", {
    onload: function (frm) {
        // Configurer le filtrage par commune
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.setup_for_doctype('Sales Invoice', frm);
        }
    },

    customer: function(frm) {
        // Pré-remplir la commune quand un client est sélectionné
        if (typeof josseaume !== 'undefined' && josseaume.customer_filter) {
            josseaume.customer_filter.prefill_commune_from_customer(frm, {customer_field: 'customer'});
        }
    }
});