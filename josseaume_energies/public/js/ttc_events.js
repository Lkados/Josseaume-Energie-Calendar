/**
 * Événements partagés pour le calcul TTC bidirectionnel
 * À utiliser dans Sales Order Item et Sales Invoice Item
 */

// Configuration des événements TTC pour un DocType d'item
function setup_ttc_item_events(doctype_item) {
	// Événements communs à tous les doctypes d'items
	const events = {
		// Modification du prix HT → recalcule TTC
		rate: function(frm, cdt, cdn) {
			setTimeout(() => {
				if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
					josseaume_energies.ttc.update_ttc_from_rate(frm, cdt, cdn);
				}
			}, 100);
		},

		// Modification de amount (qty, discount) → recalcule TTC
		amount: function(frm, cdt, cdn) {
			setTimeout(() => {
				if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
					josseaume_energies.ttc.update_ttc_from_amount(frm, cdt, cdn);
				}
			}, 100);
		},

		// Modification du prix TTC → recalcule HT
		custom_rate_ttc: function(frm, cdt, cdn) {
			setTimeout(() => {
				if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
					josseaume_energies.ttc.update_ht_from_rate_ttc(frm, cdt, cdn);
				}
			}, 100);
		},

		// Modification du montant TTC → recalcule HT
		custom_amount_ttc: function(frm, cdt, cdn) {
			setTimeout(() => {
				if (typeof josseaume_energies !== 'undefined' && josseaume_energies.ttc) {
					josseaume_energies.ttc.update_ht_from_amount_ttc(frm, cdt, cdn);
				}
			}, 100);
		}
	};

	// Appliquer les événements
	frappe.ui.form.on(doctype_item, events);
}

console.log('✓ Module TTC Events chargé');
