// josseaume_energies/public/js/customer.js - VERSION CORRIGÉE

console.log("🚀 Script customer.js CORRIGÉ chargé");

frappe.ui.form.on("Customer", {
	refresh: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			// Attendre un peu que le dashboard soit prêt
			setTimeout(() => {
				add_customer_balance_indicator_fixed(frm);
			}, 800);
		}
	},

	onload: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			setTimeout(() => {
				add_customer_balance_indicator_fixed(frm);
			}, 1200);
		}
	},
});

function add_customer_balance_indicator_fixed(frm) {
	try {
		console.log("💰 Calcul solde pour:", frm.doc.name);

		// Supprimer d'abord tous les anciens indicateurs
		remove_existing_balance_indicators_fixed(frm);

		// Récupérer le solde
		frappe.call({
			method: "josseaume_energies.customer_balance.get_customer_balance",
			args: {
				customer: frm.doc.name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					console.log("✅ Données reçues:", r.message);
					display_balance_indicator_fixed(frm, r.message);
				} else {
					console.log("⚠️ API personnalisée échouée, fallback...");
					get_customer_balance_fallback_fixed(frm);
				}
			},
			error: function (err) {
				console.log("❌ Erreur API personnalisée:", err);
				get_customer_balance_fallback_fixed(frm);
			},
		});
	} catch (error) {
		console.error("Erreur add_customer_balance_indicator_fixed:", error);
	}
}

function get_customer_balance_fallback_fixed(frm) {
	try {
		console.log("🔄 Méthode de fallback GL Entries...");

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "GL Entry",
				filters: {
					party_type: "Customer",
					party: frm.doc.name,
					is_cancelled: 0,
				},
				fields: ["debit", "credit"],
			},
			callback: function (r) {
				if (r.message && Array.isArray(r.message)) {
					let total_debit = 0;
					let total_credit = 0;

					r.message.forEach((entry) => {
						total_debit += parseFloat(entry.debit || 0);
						total_credit += parseFloat(entry.credit || 0);
					});

					const balance = total_debit - total_credit;

					const balance_data = {
						status: "success",
						balance: balance,
						currency: "EUR",
						formatted_balance: `${balance.toFixed(2)} EUR`,
						calculation_method: "GL Entries (Fallback)",
					};

					console.log("✅ Fallback réussi:", balance_data);
					display_balance_indicator_fixed(frm, balance_data);
				} else {
					// Nouveau client, solde = 0
					const balance_data = {
						status: "success",
						balance: 0,
						currency: "EUR",
						formatted_balance: "0.00 EUR",
						calculation_method: "Nouveau client",
					};
					display_balance_indicator_fixed(frm, balance_data);
				}
			},
		});
	} catch (error) {
		console.error("Erreur fallback:", error);
	}
}

function display_balance_indicator_fixed(frm, balance_data) {
	try {
		const balance = parseFloat(balance_data.balance || 0);
		const formatted_balance = balance_data.formatted_balance || `${balance.toFixed(2)} EUR`;

		console.log("🎯 Affichage du solde:", balance, formatted_balance);

		// Déterminer la couleur et le texte selon le solde
		let color = "grey";
		let label = "";

		if (balance > 0.01) {
			// Client nous doit de l'argent - ROUGE
			color = "red";
			label = `💳 Client doit : ${formatted_balance}`;
		} else if (balance < -0.01) {
			// On doit de l'argent au client - VERT
			color = "green";
			label = `💰 Nous devons : ${Math.abs(balance).toFixed(2)} EUR`;
		} else {
			// Solde équilibré - BLEU
			color = "blue";
			label = `⚖️ Solde équilibré : ${formatted_balance}`;
		}

		// Ajouter l'indicateur au dashboard
		console.log("📊 Ajout indicateur:", label, color);
		frm.dashboard.add_indicator(label, color);

		// Ajouter les boutons d'action
		add_balance_action_buttons_fixed(frm, balance, balance_data);

		console.log("✅ Affichage terminé avec succès");
	} catch (error) {
		console.error("Erreur display_balance_indicator_fixed:", error);
	}
}

function add_balance_action_buttons_fixed(frm, balance, balance_data) {
	try {
		// Bouton pour actualiser le solde
		frm.add_custom_button(
			"🔄 Actualiser solde",
			function () {
				remove_existing_balance_indicators_fixed(frm);
				frm.dashboard.clear_indicator();

				setTimeout(() => {
					add_customer_balance_indicator_fixed(frm);
				}, 300);

				frappe.show_alert("Solde actualisé", 2);
			},
			"💰 Solde"
		);

		// Bouton pour voir les transactions si solde non nul
		if (Math.abs(balance) > 0.01) {
			frm.add_custom_button(
				"📋 Voir transactions",
				function () {
					show_customer_transactions_fixed(frm);
				},
				"💰 Solde"
			);
		}

		// Bouton pour voir toutes les écritures
		frm.add_custom_button(
			"📚 Écritures comptables",
			function () {
				frappe.set_route("List", "GL Entry", {
					party_type: "Customer",
					party: frm.doc.name,
				});
			},
			"💰 Solde"
		);
	} catch (error) {
		console.error("Erreur boutons d'action:", error);
	}
}

function show_customer_transactions_fixed(frm) {
	try {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "GL Entry",
				filters: {
					party_type: "Customer",
					party: frm.doc.name,
					is_cancelled: 0,
				},
				fields: [
					"posting_date",
					"voucher_type",
					"voucher_no",
					"account",
					"debit",
					"credit",
					"remarks",
				],
				order_by: "posting_date desc",
				limit: 20,
			},
			callback: function (r) {
				if (r.message && Array.isArray(r.message)) {
					show_transactions_dialog_fixed(frm, r.message);
				} else {
					frappe.msgprint("Aucune transaction trouvée pour ce client");
				}
			},
		});
	} catch (error) {
		console.error("Erreur récupération transactions:", error);
	}
}

function show_transactions_dialog_fixed(frm, transactions) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: `Transactions - ${frm.doc.customer_name || frm.doc.name}`,
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "transactions_html",
				},
			],
		});

		let html = `
            <div style="margin: 15px 0;">
                <h5>Dernières transactions (${transactions.length})</h5>
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Document</th>
                                <th>Débit</th>
                                <th>Crédit</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

		transactions.forEach((transaction) => {
			const debit = parseFloat(transaction.debit || 0);
			const credit = parseFloat(transaction.credit || 0);

			html += `
                <tr>
                    <td>${frappe.datetime.str_to_user(transaction.posting_date)}</td>
                    <td>${transaction.voucher_type}</td>
                    <td>${transaction.voucher_no}</td>
                    <td style="text-align: right; color: red;">${
						debit > 0 ? debit.toFixed(2) + " EUR" : ""
					}</td>
                    <td style="text-align: right; color: green;">${
						credit > 0 ? credit.toFixed(2) + " EUR" : ""
					}</td>
                </tr>
            `;
		});

		html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;

		dialog.fields_dict.transactions_html.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue transactions:", error);
	}
}

function remove_existing_balance_indicators_fixed(frm) {
	try {
		// Supprimer les indicateurs contenant des mots-clés de solde
		const indicators = frm.dashboard.wrapper.find(".indicator");
		indicators.each(function () {
			const text = $(this).text().toLowerCase();
			if (
				text.includes("doit") ||
				text.includes("devons") ||
				text.includes("solde") ||
				text.includes("💳") ||
				text.includes("💰") ||
				text.includes("⚖️")
			) {
				$(this).remove();
			}
		});

		// Supprimer les commentaires de méthode de calcul
		const comments = frm.dashboard.wrapper.find(".dashboard-comment");
		comments.each(function () {
			const text = $(this).text().toLowerCase();
			if (text.includes("méthode de calcul")) {
				$(this).remove();
			}
		});

		console.log("🧹 Anciens indicateurs supprimés");
	} catch (error) {
		console.error("Erreur suppression indicateurs:", error);
	}
}

// Fonction de test globale
window.debug_customer_balance_fixed = function (customer_name) {
	if (!customer_name && cur_frm && cur_frm.doc) {
		customer_name = cur_frm.doc.name;
	}

	if (!customer_name) {
		console.log("Nom du client requis");
		return;
	}

	console.log("🧪 Debug solde pour:", customer_name);

	if (cur_frm) {
		add_customer_balance_indicator_fixed(cur_frm);
	}
};

console.log("✅ Script customer.js CORRIGÉ prêt!");
console.log("💡 Utilisez debug_customer_balance_fixed() pour tester manuellement");
