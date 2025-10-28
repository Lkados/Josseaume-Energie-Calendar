/**
 * Module de calcul des prix TTC (Toutes Taxes Comprises)
 * Système BIDIRECTIONNEL avec calcul automatique HT ↔ TTC
 * Compatible avec Quotation, Sales Order, Sales Invoice
 *
 * Fonctionnalités :
 * - Modification HT → recalcule TTC
 * - Modification TTC → recalcule HT
 * - Modification quantité → recalcule tout
 * - Modification taxes → recalcule tous les TTC
 * - Protection contre les boucles infinies via flags de verrouillage
 */

frappe.provide('josseaume_energies.ttc');

/**
 * Obtient le taux de taxe effectif depuis le document
 * @param {Object} frm - Le formulaire parent
 * @returns {Number} - Taux de taxe en pourcentage (ex: 20 pour 20%)
 */
josseaume_energies.ttc.get_tax_rate = function(frm) {
    let tax_rate = 0;

    // Calculer le taux effectif depuis les totaux du document
    if (frm.doc.total_taxes_and_charges && frm.doc.net_total && frm.doc.net_total > 0) {
        // Taux effectif : (Total Taxes / Total HT) * 100
        tax_rate = (frm.doc.total_taxes_and_charges / frm.doc.net_total) * 100;
    }
    // Sinon, utiliser les taux définis dans la table des taxes
    else if (frm.doc.taxes && frm.doc.taxes.length > 0) {
        frm.doc.taxes.forEach(tax => {
            if (tax.rate && !isNaN(tax.rate)) {
                tax_rate += parseFloat(tax.rate);
            }
        });
    }

    // Si toujours pas de taxe, utiliser le taux standard (20% en France)
    if (tax_rate === 0 && frm.doc.taxes_and_charges) {
        tax_rate = 20;
    }

    return tax_rate;
};

/**
 * Calcule le prix TTC depuis le prix HT
 * @param {Number} ht - Prix HT
 * @param {Number} tax_rate - Taux de taxe en %
 * @returns {Number} - Prix TTC
 */
josseaume_energies.ttc.calculate_ttc_from_ht = function(ht, tax_rate) {
    if (!ht || ht === 0) return 0;
    return ht * (1 + tax_rate / 100);
};

/**
 * Calcule le prix HT depuis le prix TTC
 * @param {Number} ttc - Prix TTC
 * @param {Number} tax_rate - Taux de taxe en %
 * @returns {Number} - Prix HT
 */
josseaume_energies.ttc.calculate_ht_from_ttc = function(ttc, tax_rate) {
    if (!ttc || ttc === 0) return 0;
    return ttc / (1 + tax_rate / 100);
};

/**
 * Met à jour le TTC depuis le HT (rate → custom_rate_ttc)
 * Appelé quand l'utilisateur modifie le prix HT
 */
josseaume_energies.ttc.update_ttc_from_rate = function(frm, cdt, cdn) {
    const item = locals[cdt][cdn];

    // FLAG DE VERROUILLAGE : éviter les boucles infinies
    if (item.__ttc_locked) return;

    try {
        item.__ttc_locked = true;

        const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

        // Calculer custom_rate_ttc depuis rate
        item.custom_rate_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.rate || 0, tax_rate);

        // Calculer custom_amount_ttc depuis amount
        item.custom_amount_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.amount || 0, tax_rate);

        frm.refresh_field('items');

    } finally {
        setTimeout(() => { item.__ttc_locked = false; }, 50);
    }
};

/**
 * Met à jour le HT depuis le TTC (custom_rate_ttc → rate)
 * Appelé quand l'utilisateur modifie le prix TTC
 */
josseaume_energies.ttc.update_ht_from_rate_ttc = function(frm, cdt, cdn) {
    const item = locals[cdt][cdn];

    // FLAG DE VERROUILLAGE : éviter les boucles infinies
    if (item.__ttc_locked) return;

    try {
        item.__ttc_locked = true;

        const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

        // Calculer rate depuis custom_rate_ttc
        const new_rate = josseaume_energies.ttc.calculate_ht_from_ttc(item.custom_rate_ttc || 0, tax_rate);

        // Mettre à jour le rate (déclenche le recalcul d'amount par ERPNext)
        frappe.model.set_value(cdt, cdn, 'rate', new_rate);

        // Attendre que ERPNext recalcule amount, puis recalculer custom_amount_ttc
        setTimeout(() => {
            if (!item.__ttc_locked) {
                item.__ttc_locked = true;
                item.custom_amount_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.amount || 0, tax_rate);
                frm.refresh_field('items');
                setTimeout(() => { item.__ttc_locked = false; }, 50);
            }
        }, 200);

    } finally {
        setTimeout(() => { item.__ttc_locked = false; }, 100);
    }
};

/**
 * Met à jour le TTC depuis le montant HT (amount → custom_amount_ttc)
 * Appelé quand quantity ou discount change
 */
josseaume_energies.ttc.update_ttc_from_amount = function(frm, cdt, cdn) {
    const item = locals[cdt][cdn];

    // FLAG DE VERROUILLAGE : éviter les boucles infinies
    if (item.__ttc_locked) return;

    try {
        item.__ttc_locked = true;

        const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

        // Recalculer custom_amount_ttc depuis amount
        item.custom_amount_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.amount || 0, tax_rate);

        // Aussi recalculer custom_rate_ttc depuis rate pour cohérence
        item.custom_rate_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.rate || 0, tax_rate);

        frm.refresh_field('items');

    } finally {
        setTimeout(() => { item.__ttc_locked = false; }, 50);
    }
};

/**
 * Met à jour le HT depuis le montant TTC (custom_amount_ttc → amount)
 * Appelé quand l'utilisateur modifie le montant TTC directement
 */
josseaume_energies.ttc.update_ht_from_amount_ttc = function(frm, cdt, cdn) {
    const item = locals[cdt][cdn];

    // FLAG DE VERROUILLAGE : éviter les boucles infinies
    if (item.__ttc_locked) return;

    try {
        item.__ttc_locked = true;

        const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

        // Calculer le nouveau rate depuis custom_amount_ttc et qty
        if (item.qty && item.qty > 0) {
            const new_amount = josseaume_energies.ttc.calculate_ht_from_ttc(item.custom_amount_ttc || 0, tax_rate);
            const new_rate = new_amount / item.qty;

            // Mettre à jour le rate
            frappe.model.set_value(cdt, cdn, 'rate', new_rate);

            // Recalculer custom_rate_ttc
            setTimeout(() => {
                if (!item.__ttc_locked) {
                    item.__ttc_locked = true;
                    item.custom_rate_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(new_rate, tax_rate);
                    frm.refresh_field('items');
                    setTimeout(() => { item.__ttc_locked = false; }, 50);
                }
            }, 200);
        }

    } finally {
        setTimeout(() => { item.__ttc_locked = false; }, 100);
    }
};

/**
 * Met à jour tous les items quand les taxes changent
 */
josseaume_energies.ttc.update_all_items_on_tax_change = function(frm) {
    if (!frm.doc.items || frm.doc.items.length === 0) return;

    const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

    frm.doc.items.forEach(item => {
        if (item.__ttc_locked) return;

        item.custom_rate_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.rate || 0, tax_rate);
        item.custom_amount_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.amount || 0, tax_rate);
    });

    frm.refresh_field('items');
};

/**
 * Initialise les calculs TTC au chargement du document
 */
josseaume_energies.ttc.initialize_ttc_fields = function(frm) {
    if (!frm.doc.items || frm.doc.items.length === 0) return;

    const tax_rate = josseaume_energies.ttc.get_tax_rate(frm);

    frm.doc.items.forEach(item => {
        // Calculer les TTC seulement si vides
        if (!item.custom_rate_ttc) {
            item.custom_rate_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.rate || 0, tax_rate);
        }
        if (!item.custom_amount_ttc) {
            item.custom_amount_ttc = josseaume_energies.ttc.calculate_ttc_from_ht(item.amount || 0, tax_rate);
        }
    });

    frm.refresh_field('items');
};

console.log('✓ Module TTC Calculator Bidirectionnel chargé');
