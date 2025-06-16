// josseaume_energies/public/js/customer.js - Affichage du solde client avec code couleur

frappe.ui.form.on("Customer", {
	refresh: function (frm) {
		// Ajouter l'affichage du solde client
		if (!frm.doc.__islocal && frm.doc.name) {
			add_customer_balance_indicator(frm);
		}
	},

	onload: function (frm) {
		// Charger le solde au chargement du formulaire
		if (!frm.doc.__islocal && frm.doc.name) {
			setTimeout(() => {
				add_customer_balance_indicator(frm);
			}, 500);
		}
	},
});

function add_customer_balance_indicator(frm) {
	try {
		// Supprimer les anciens indicateurs de solde
		remove_existing_balance_indicators(frm);

		// Récupérer le solde du client
		get_customer_balance(frm, function (balance_data) {
			if (balance_data && balance_data.status === "success") {
				display_balance_indicator(frm, balance_data);
			} else {
				console.log("Impossible de récupérer le solde client");
			}
		});
	} catch (error) {
		console.error("Erreur lors de l'ajout de l'indicateur de solde:", error);
	}
}

function get_customer_balance(frm, callback) {
	try {
		// Appel API pour récupérer le solde
		frappe.call({
			method: "josseaume_energies.customer_balance.get_customer_balance",
			args: {
				customer: frm.doc.name,
			},
			callback: function (r) {
				if (r.message) {
					callback(r.message);
				} else {
					// Fallback : utiliser la méthode ERPNext standard
					get_customer_balance_fallback(frm, callback);
				}
			},
			error: function (err) {
				console.log("Erreur API solde client, utilisation du fallback");
				get_customer_balance_fallback(frm, callback);
			},
		});
	} catch (error) {
		console.error("Erreur get_customer_balance:", error);
		get_customer_balance_fallback(frm, callback);
	}
}

function get_customer_balance_fallback(frm, callback) {
	try {
		// Méthode de fallback utilisant l'API standard ERPNext
		frappe.call({
			method: "erpnext.accounts.utils.get_balance_on",
			args: {
				account: frm.doc.name,
				date: frappe.datetime.get_today(),
			},
			callback: function (r) {
				if (r.message !== undefined) {
					const balance = flt(r.message);
					callback({
						status: "success",
						balance: balance,
						currency: frappe.defaults.get_default("currency") || "EUR",
						formatted_balance: format_currency(balance),
					});
				} else {
					// Dernière tentative : récupérer depuis les comptes clients
					get_customer_balance_from_receivables(frm, callback);
				}
			},
			error: function (err) {
				console.error("Erreur fallback balance:", err);
				get_customer_balance_from_receivables(frm, callback);
			},
		});
	} catch (error) {
		console.error("Erreur get_customer_balance_fallback:", error);
		get_customer_balance_from_receivables(frm, callback);
	}
}

function get_customer_balance_from_receivables(frm, callback) {
	try {
		// Récupérer le solde depuis les entrées comptables
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
						total_debit += flt(entry.debit || 0);
						total_credit += flt(entry.credit || 0);
					});

					const balance = total_debit - total_credit;

					callback({
						status: "success",
						balance: balance,
						currency: frappe.defaults.get_default("currency") || "EUR",
						formatted_balance: format_currency(balance),
						calculation_method: "GL Entries",
					});
				} else {
					// Si tout échoue, retourner un solde de 0
					callback({
						status: "success",
						balance: 0,
						currency: frappe.defaults.get_default("currency") || "EUR",
						formatted_balance: format_currency(0),
						calculation_method: "Default (0)",
					});
				}
			},
			error: function (err) {
				console.error("Erreur récupération GL Entries:", err);
				// Retourner un solde de 0 en cas d'erreur
				callback({
					status: "success",
					balance: 0,
					currency: frappe.defaults.get_default("currency") || "EUR",
					formatted_balance: format_currency(0),
					calculation_method: "Error fallback (0)",
				});
			},
		});
	} catch (error) {
		console.error("Erreur get_customer_balance_from_receivables:", error);
		callback({
			status: "error",
			message: "Impossible de calculer le solde",
		});
	}
}

function display_balance_indicator(frm, balance_data) {
	try {
		const balance = flt(balance_data.balance);
		const formatted_balance = balance_data.formatted_balance;

		// Déterminer la couleur et le texte selon le solde
		let color = "grey";
		let label = "";
		let icon = "";

		if (balance > 0) {
			// Client nous doit de l'argent - ROUGE
			color = "red";
			label = `💳 Client doit : ${formatted_balance}`;
			icon = "fa-arrow-up";
		} else if (balance < 0) {
			// On doit de l'argent au client - VERT
			color = "green";
			label = `💰 Nous devons : ${format_currency(Math.abs(balance))}`;
			icon = "fa-arrow-down";
		} else {
			// Solde équilibré - pas d'affichage ou gris
			color = "blue";
			label = `⚖️ Solde équilibré : ${formatted_balance}`;
			icon = "fa-check-circle";
		}

		// Ajouter l'indicateur au dashboard seulement si solde non nul ou pour information
		if (balance !== 0 || frappe.user.has_role(["System Manager", "Accounts Manager"])) {
			frm.dashboard.add_indicator(__(label), color);

			// Ajouter des informations supplémentaires en petit texte si disponible
			if (balance_data.calculation_method) {
				frm.dashboard.add_comment(
					`<small style="color: #666;">Méthode de calcul: ${balance_data.calculation_method}</small>`,
					"blue"
				);
			}
		}

		// NOUVEAU : Ajouter un bouton pour voir le détail des transactions
		if (balance !== 0) {
			frm.add_custom_button(
				__("Voir transactions"),
				function () {
					show_customer_transactions_detail(frm, balance_data);
				},
				__("Comptabilité")
			);
		}

		// NOUVEAU : Ajouter un bouton pour actualiser le solde
		frm.add_custom_button(
			__("Actualiser solde"),
			function () {
				frm.dashboard.clear_indicator();
				add_customer_balance_indicator(frm);
				frappe.show_alert("Solde actualisé", 2);
			},
			__("Actions")
		);

		console.log(`Solde client ${frm.doc.name}: ${balance} (${formatted_balance})`);
	} catch (error) {
		console.error("Erreur lors de l'affichage de l'indicateur:", error);
	}
}

function show_customer_transactions_detail(frm, balance_data) {
	try {
		// Récupérer les transactions détaillées
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
					"against",
					"remarks",
				],
				order_by: "posting_date desc",
				limit: 50,
			},
			callback: function (r) {
				if (r.message && Array.isArray(r.message)) {
					show_transactions_dialog(frm, r.message, balance_data);
				} else {
					frappe.msgprint("Aucune transaction trouvée pour ce client");
				}
			},
		});
	} catch (error) {
		console.error("Erreur récupération transactions:", error);
		frappe.msgprint("Erreur lors de la récupération des transactions");
	}
}

function show_transactions_dialog(frm, transactions, balance_data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Transactions comptables - ") + frm.doc.customer_name,
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "transactions_html",
				},
			],
		});

		let html = `
			<div style="margin: 15px 0;">
				<div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
					<h4 style="margin: 0 0 10px 0;">Résumé du solde</h4>
					<p><strong>Solde actuel:</strong> ${balance_data.formatted_balance}</p>
					<p><strong>Statut:</strong> ${
						balance_data.balance > 0
							? '<span style="color: red;">Client débiteur</span>'
							: balance_data.balance < 0
							? '<span style="color: green;">Client créditeur</span>'
							: '<span style="color: blue;">Solde équilibré</span>'
					}</p>
				</div>
				
				<h5>Dernières transactions (${transactions.length})</h5>
				<div style="max-height: 400px; overflow-y: auto;">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Date</th>
								<th>Type</th>
								<th>Document</th>
								<th>Compte</th>
								<th>Débit</th>
								<th>Crédit</th>
								<th>Remarques</th>
							</tr>
						</thead>
						<tbody>
		`;

		let running_balance = 0;

		transactions.forEach((transaction) => {
			const debit = flt(transaction.debit || 0);
			const credit = flt(transaction.credit || 0);
			running_balance += debit - credit;

			html += `
				<tr>
					<td>${frappe.datetime.str_to_user(transaction.posting_date)}</td>
					<td>${transaction.voucher_type}</td>
					<td>
						<a href="/app/${transaction.voucher_type.toLowerCase().replace(" ", "-")}/${
				transaction.voucher_no
			}" target="_blank">
							${transaction.voucher_no}
						</a>
					</td>
					<td style="font-size: 11px;">${transaction.account}</td>
					<td style="text-align: right; color: red;">${debit > 0 ? format_currency(debit) : ""}</td>
					<td style="text-align: right; color: green;">${credit > 0 ? format_currency(credit) : ""}</td>
					<td style="font-size: 11px;">${transaction.remarks || ""}</td>
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

		// Ajuster la taille du dialogue
		dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
	} catch (error) {
		console.error("Erreur création dialogue transactions:", error);
	}
}

function remove_existing_balance_indicators(frm) {
	try {
		// Supprimer les indicateurs existants qui contiennent des mots-clés de solde
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

		// Supprimer aussi les commentaires de méthode de calcul
		const comments = frm.dashboard.wrapper.find(".dashboard-comment");
		comments.each(function () {
			const text = $(this).text().toLowerCase();
			if (text.includes("méthode de calcul")) {
				$(this).remove();
			}
		});
	} catch (error) {
		console.error("Erreur suppression indicateurs existants:", error);
	}
}

// Fonction utilitaire pour formater les devises
function format_currency(amount, currency = null) {
	try {
		currency = currency || frappe.defaults.get_default("currency") || "EUR";
		return format_number(amount, null, 2) + " " + currency;
	} catch (error) {
		return (amount || 0).toFixed(2) + " EUR";
	}
}

// Fonction pour gérer les valeurs flottantes
function flt(value, precision = 2) {
	try {
		const num = parseFloat(value) || 0;
		return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
	} catch (error) {
		return 0;
	}
}

// NOUVELLE FONCTION : Auto-refresh périodique du solde (optionnel)
function setup_balance_auto_refresh(frm) {
	try {
		// Actualiser le solde toutes les 5 minutes si le formulaire est ouvert
		if (frm._balance_refresh_interval) {
			clearInterval(frm._balance_refresh_interval);
		}

		frm._balance_refresh_interval = setInterval(() => {
			if (frm && frm.doc && !frm.doc.__islocal && frm.doc.name) {
				console.log("Auto-refresh solde client");
				remove_existing_balance_indicators(frm);
				add_customer_balance_indicator(frm);
			}
		}, 5 * 60 * 1000); // 5 minutes
	} catch (error) {
		console.error("Erreur setup auto-refresh:", error);
	}
}

// Nettoyer l'interval lors de la fermeture du formulaire
$(document).on("page:unload", function () {
	if (cur_frm && cur_frm._balance_refresh_interval) {
		clearInterval(cur_frm._balance_refresh_interval);
	}
});

// Debug: Fonction pour tester manuellement le solde
window.debug_customer_balance = function (customer_name) {
	if (!customer_name && cur_frm && cur_frm.doc) {
		customer_name = cur_frm.doc.name;
	}

	if (!customer_name) {
		console.log("Nom du client requis");
		return;
	}

	console.log("Debug solde pour:", customer_name);

	frappe.call({
		method: "josseaume_energies.customer_balance.get_customer_balance",
		args: {
			customer: customer_name,
		},
		callback: function (r) {
			console.log("Résultat debug solde:", r.message);
		},
	});
};
