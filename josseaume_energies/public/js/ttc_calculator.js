/**
 * Module de calcul des prix TTC (Toutes Taxes Comprises)
 * Calcule automatiquement les prix TTC pour les items de vente
 * Compatible avec Quotation, Sales Order, Sales Invoice
 */

frappe.provide('josseaume_energies.ttc');

/**
 * Obtient le taux de taxe total pour un item
 * @param {Object} frm - Le formulaire parent (Quotation, Sales Order, Sales Invoice)
 * @param {Object} item - L'item de la table enfant
 * @returns {Number} - Taux de taxe en pourcentage (ex: 20 pour 20%)
 */
josseaume_energies.ttc.get_tax_rate = function(frm, item) {
    let tax_rate = 0;

    // 1. Vérifier si l'item a un item_tax_template spécifique
    if (item.item_tax_template) {
        // Récupérer le taux depuis le template (nécessite un appel serveur)
        // Pour l'instant, on utilise la méthode simplifiée ci-dessous
    }

    // 2. Utiliser les taxes du document parent
    if (frm.doc.taxes && frm.doc.taxes.length > 0) {
        frm.doc.taxes.forEach(tax => {
            // Additionner tous les taux de taxe
            if (tax.rate) {
                tax_rate += parseFloat(tax.rate) || 0;
            }
        });
    }

    // 3. Si pas de taxes définies, utiliser le taux standard (20% en France)
    if (tax_rate === 0 && frm.doc.taxes_and_charges) {
        tax_rate = 20; // Taux par défaut TVA France
    }

    return tax_rate;
};

/**
 * Calcule le prix unitaire TTC pour un item
 * @param {Number} rate_ht - Prix unitaire HT
 * @param {Number} tax_rate - Taux de taxe en pourcentage
 * @returns {Number} - Prix unitaire TTC
 */
josseaume_energies.ttc.calculate_rate_ttc = function(rate_ht, tax_rate) {
    if (!rate_ht || rate_ht === 0) {
        return 0;
    }
    return rate_ht * (1 + tax_rate / 100);
};

/**
 * Calcule le montant total TTC pour un item
 * @param {Number} amount_ht - Montant total HT
 * @param {Number} tax_rate - Taux de taxe en pourcentage
 * @returns {Number} - Montant total TTC
 */
josseaume_energies.ttc.calculate_amount_ttc = function(amount_ht, tax_rate) {
    if (!amount_ht || amount_ht === 0) {
        return 0;
    }
    return amount_ht * (1 + tax_rate / 100);
};

/**
 * Met à jour les champs TTC pour un item spécifique
 * @param {Object} frm - Le formulaire parent
 * @param {Object} cdt - Child DocType name
 * @param {Object} cdn - Child Document name
 */
josseaume_energies.ttc.update_item_ttc = function(frm, cdt, cdn) {
    const item = locals[cdt][cdn];

    if (!item) {
        return;
    }

    // Obtenir le taux de taxe
    const tax_rate = josseaume_energies.ttc.get_tax_rate(frm, item);

    // Calculer les prix TTC
    const rate_ttc = josseaume_energies.ttc.calculate_rate_ttc(item.rate || 0, tax_rate);
    const amount_ttc = josseaume_energies.ttc.calculate_amount_ttc(item.amount || 0, tax_rate);

    // Mettre à jour les champs SANS déclencher d'événements
    item.custom_rate_ttc = rate_ttc;
    item.custom_amount_ttc = amount_ttc;
};

/**
 * Met à jour tous les items du document
 * @param {Object} frm - Le formulaire parent
 * @param {String} items_field - Nom du champ contenant les items (ex: 'items')
 */
josseaume_energies.ttc.update_all_items_ttc = function(frm, items_field = 'items') {
    if (!frm.doc[items_field] || frm.doc[items_field].length === 0) {
        return;
    }

    frm.doc[items_field].forEach(item => {
        const tax_rate = josseaume_energies.ttc.get_tax_rate(frm, item);
        const rate_ttc = josseaume_energies.ttc.calculate_rate_ttc(item.rate || 0, tax_rate);
        const amount_ttc = josseaume_energies.ttc.calculate_amount_ttc(item.amount || 0, tax_rate);

        item.custom_rate_ttc = rate_ttc;
        item.custom_amount_ttc = amount_ttc;
    });

    frm.refresh_field(items_field);
};

/**
 * Configure les événements pour le calcul automatique TTC
 * @param {Object} frm - Le formulaire parent
 * @param {String} child_doctype - Nom du DocType enfant (ex: 'Quotation Item')
 * @param {String} items_field - Nom du champ contenant les items
 */
josseaume_energies.ttc.setup_ttc_calculation = function(frm, child_doctype, items_field = 'items') {

    // Flag pour éviter les boucles infinies
    if (!frm.__ttc_calculation_setup) {
        frm.__ttc_calculation_setup = true;
    } else {
        return; // Déjà configuré
    }

    // Recalculer au chargement du document
    if (frm.doc[items_field] && frm.doc[items_field].length > 0) {
        setTimeout(function() {
            josseaume_energies.ttc.update_all_items_ttc(frm, items_field);
        }, 500);
    }
};

console.log('✓ Module TTC Calculator chargé');
