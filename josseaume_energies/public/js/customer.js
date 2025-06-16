// =============================================
// SOLUTION POUR AFFICHER LE SOLDE CLIENT EN EN-TÊTE
// Remplacer le contenu de customer.js par ce code
// =============================================

// josseaume_energies/public/js/customer.js - VERSION AVEC AFFICHAGE EN-TÊTE

console.log("🚀 Script customer.js - Solde en en-tête");

frappe.ui.form.on("Customer", {
	refresh: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			// Attendre que le formulaire soit complètement chargé
			setTimeout(() => {
				add_customer_balance_header(frm);
			}, 1000);
		}
	},

	onload: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			setTimeout(() => {
				add_customer_balance_header(frm);
			}, 1500);
		}
	},
});

function add_customer_balance_header(frm) {
	try {
		console.log("💰 Calcul solde pour affichage en-tête:", frm.doc.name);

		// Supprimer l'ancien affichage de solde
		remove_old_balance_display();

		// Récupérer le solde
		frappe.call({
			method: "josseaume_energies.customer_balance.get_customer_balance",
			args: {
				customer: frm.doc.name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					console.log("✅ API réussie:", r.message);
					display_balance_in_header(frm, r.message);
				} else {
					console.log("⚠️ API échouée, méthode de fallback...");
					get_balance_fallback_header(frm);
				}
			},
			error: function (err) {
				console.log("❌ Erreur API:", err);
				get_balance_fallback_header(frm);
			},
		});

		// Ajouter les boutons d'action
		add_balance_buttons(frm);
	} catch (error) {
		console.error("Erreur générale:", error);
	}
}

function remove_old_balance_display() {
	try {
		// Supprimer les anciens affichages de solde
		$(".customer-balance-display").remove();
		$(".customer-balance-header").remove();

		console.log("🧹 Nettoyage ancien affichage OK");
	} catch (error) {
		console.log("Note: nettoyage ignoré -", error.message);
	}
}

function get_balance_fallback_header(frm) {
	try {
		console.log("🔄 Méthode de fallback pour en-tête...");

		frappe.db
			.get_list("GL Entry", {
				filters: {
					party_type: "Customer",
					party: frm.doc.name,
					is_cancelled: 0,
				},
				fields: ["debit", "credit"],
			})
			.then((entries) => {
				let total_debit = 0;
				let total_credit = 0;

				entries.forEach((entry) => {
					total_debit += parseFloat(entry.debit || 0);
					total_credit += parseFloat(entry.credit || 0);
				});

				const balance = total_debit - total_credit;

				const balance_data = {
					status: "success",
					balance: balance,
					currency: "EUR",
					formatted_balance: `${balance.toFixed(2)} EUR`,
				};

				console.log("✅ Fallback réussi:", balance_data);
				display_balance_in_header(frm, balance_data);
			})
			.catch((error) => {
				console.error("Erreur fallback:", error);
				display_balance_in_header(frm, {
					status: "success",
					balance: 0,
					currency: "EUR",
					formatted_balance: "0.00 EUR",
				});
			});
	} catch (error) {
		console.error("Erreur fallback:", error);
	}
}

function display_balance_in_header(frm, balance_data) {
	try {
		const balance = parseFloat(balance_data.balance || 0);
		const formatted_balance = balance_data.formatted_balance || `${balance.toFixed(2)} EUR`;

		console.log("🎯 Affichage du solde en en-tête:", balance, formatted_balance);

		// Déterminer couleur et icône
		let color = "#007bff";
		let bgColor = "#e3f2fd";
		let icon = "⚖️";
		let statusText = "Solde équilibré";

		if (balance > 0.01) {
			color = "#dc3545";
			bgColor = "#ffeaea";
			icon = "⚠️";
			statusText = "Client débiteur";
		} else if (balance < -0.01) {
			color = "#28a745";
			bgColor = "#eafaf1";
			icon = "💰";
			statusText = "Crédit client";
			// Pour l'affichage, on montre le montant positif
			const positive_amount = Math.abs(balance).toFixed(2);
			formatted_balance = `${positive_amount} EUR`;
		}

		// Créer l'élément d'affichage du solde
		const balanceHtml = `
			<div class="customer-balance-header" style="
				display: inline-flex;
				align-items: center;
				background: ${bgColor};
				color: ${color};
				padding: 8px 16px;
				margin: 8px 0 8px 16px;
				border-radius: 20px;
				border: 1px solid ${color}40;
				font-weight: 600;
				font-size: 14px;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				gap: 8px;
				animation: fadeInBalance 0.5s ease-out;
			">
				<span style="font-size: 16px;">${icon}</span>
				<span>${statusText}: ${formatted_balance}</span>
			</div>
		`;

		// Méthode 1: Injecter dans l'en-tête principal du formulaire
		const formHeader = frm.wrapper.find(".form-header, .page-title, .title-area").first();
		if (formHeader.length > 0) {
			formHeader.after(balanceHtml);
			console.log("📍 Solde injecté dans l'en-tête principal");
		} else {
			// Méthode 2: Injecter après le titre
			const titleArea = frm.wrapper.find("h1, .page-title-area, .form-title").first();
			if (titleArea.length > 0) {
				titleArea.after(balanceHtml);
				console.log("📍 Solde injecté après le titre");
			} else {
				// Méthode 3: Injecter dans la zone de contenu
				const contentArea = frm.wrapper.find(".form-layout, .layout-main").first();
				if (contentArea.length > 0) {
					contentArea.prepend(balanceHtml);
					console.log("📍 Solde injecté en début de contenu");
				} else {
					// Méthode 4: Fallback - utiliser l'intro du formulaire
					const introHtml = `
						<div style="
							padding: 12px 20px; 
							background: ${bgColor}; 
							color: ${color};
							border: 1px solid ${color}40;
							border-radius: 8px; 
							margin: 15px 0;
							font-weight: 600;
							display: flex;
							align-items: center;
							gap: 10px;
						">
							<span style="font-size: 18px;">${icon}</span>
							<span>${statusText}: ${formatted_balance}</span>
						</div>
					`;
					frm.set_intro(introHtml);
					console.log("📍 Solde affiché via intro (fallback)");
				}
			}
		}

		// Ajouter les styles CSS si nécessaire
		add_balance_styles();

		console.log("✅ Affichage en en-tête terminé avec succès");
	} catch (error) {
		console.error("Erreur affichage en-tête:", error);
	}
}

function add_balance_styles() {
	if (!document.getElementById("customer-balance-header-styles")) {
		const style = document.createElement("style");
		style.id = "customer-balance-header-styles";
		style.textContent = `
			@keyframes fadeInBalance {
				from {
					opacity: 0;
					transform: translateY(-10px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			
			.customer-balance-header:hover {
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
				transition: all 0.3s ease;
			}
			
			.customer-balance-display {
				position: relative;
				z-index: 999;
			}
			
			/* Adaptation responsive */
			@media (max-width: 768px) {
				.customer-balance-header {
					font-size: 12px !important;
					padding: 6px 12px !important;
					margin: 6px 0 6px 8px !important;
				}
			}
		`;
		document.head.appendChild(style);
		console.log("🎨 Styles CSS pour en-tête ajoutés");
	}
}

function add_balance_buttons(frm) {
	try {
		const balance_group = "💰 Solde Client";

		// Bouton actualiser
		frm.add_custom_button(
			"🔄 Actualiser Solde",
			function () {
				remove_old_balance_display();
				frm.set_intro("");

				setTimeout(() => {
					add_customer_balance_header(frm);
				}, 300);

				frappe.show_alert("Solde actualisé", 2);
			},
			balance_group
		);

		// Bouton transactions
		frm.add_custom_button(
			"📋 Voir Transactions",
			function () {
				show_transactions_dialog(frm);
			},
			balance_group
		);

		// Bouton écritures comptables
		frm.add_custom_button(
			"📚 Écritures GL",
			function () {
				frappe.set_route("List", "GL Entry", {
					party_type: "Customer",
					party: frm.doc.name,
				});
			},
			balance_group
		);

		// Bouton rapport de solde
		frm.add_custom_button(
			"📊 Rapport Solde",
			function () {
				generate_balance_report(frm);
			},
			balance_group
		);
	} catch (error) {
		console.error("Erreur boutons:", error);
	}
}

function show_transactions_dialog(frm) {
	try {
		frappe.db
			.get_list("GL Entry", {
				filters: {
					party_type: "Customer",
					party: frm.doc.name,
					is_cancelled: 0,
				},
				fields: [
					"posting_date",
					"voucher_type",
					"voucher_no",
					"debit",
					"credit",
					"remarks",
					"account",
				],
				order_by: "posting_date desc",
				limit: 50,
			})
			.then((transactions) => {
				if (transactions && transactions.length > 0) {
					display_transactions_dialog(frm, transactions);
				} else {
					frappe.msgprint("Aucune transaction trouvée pour ce client");
				}
			})
			.catch((error) => {
				console.error("Erreur transactions:", error);
				frappe.msgprint("Erreur lors de la récupération des transactions");
			});
	} catch (error) {
		console.error("Erreur show_transactions_dialog:", error);
	}
}

function display_transactions_dialog(frm, transactions) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: `💳 Transactions - ${frm.doc.customer_name || frm.doc.name}`,
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "transactions_html",
				},
			],
		});

		// Calculer les totaux
		let total_debit = 0;
		let total_credit = 0;

		transactions.forEach((t) => {
			total_debit += parseFloat(t.debit || 0);
			total_credit += parseFloat(t.credit || 0);
		});

		const balance = total_debit - total_credit;

		let html = `
			<div style="margin: 20px 0;">
				<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
					<h5>📊 Résumé du Solde</h5>
					<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 10px;">
						<div style="text-align: center; padding: 10px; background: #ffeaea; border-radius: 6px;">
							<strong style="color: #dc3545;">Total Débit</strong><br>
							<span style="font-size: 18px; font-weight: bold;">${total_debit.toFixed(2)} EUR</span>
						</div>
						<div style="text-align: center; padding: 10px; background: #eafaf1; border-radius: 6px;">
							<strong style="color: #28a745;">Total Crédit</strong><br>
							<span style="font-size: 18px; font-weight: bold;">${total_credit.toFixed(2)} EUR</span>
						</div>
						<div style="text-align: center; padding: 10px; background: ${
							balance > 0 ? "#ffeaea" : balance < 0 ? "#eafaf1" : "#e3f2fd"
						}; border-radius: 6px;">
							<strong style="color: ${
								balance > 0 ? "#dc3545" : balance < 0 ? "#28a745" : "#007bff"
							};">Solde Final</strong><br>
							<span style="font-size: 18px; font-weight: bold;">${balance.toFixed(2)} EUR</span>
						</div>
					</div>
				</div>
				
				<h5>📋 Détail des Transactions (${transactions.length})</h5>
				<div style="max-height: 500px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px;">
					<table class="table table-bordered table-striped" style="margin: 0; font-size: 13px;">
						<thead style="background: #f8f9fa; position: sticky; top: 0;">
							<tr>
								<th style="padding: 10px 8px;">Date</th>
								<th style="padding: 10px 8px;">Type</th>
								<th style="padding: 10px 8px;">Document</th>
								<th style="padding: 10px 8px;">Compte</th>
								<th style="padding: 10px 8px; text-align: right;">Débit</th>
								<th style="padding: 10px 8px; text-align: right;">Crédit</th>
								<th style="padding: 10px 8px;">Remarques</th>
							</tr>
						</thead>
						<tbody>
		`;

		transactions.forEach((transaction) => {
			const debit = parseFloat(transaction.debit || 0);
			const credit = parseFloat(transaction.credit || 0);

			html += `
				<tr>
					<td style="padding: 8px;">${frappe.datetime.str_to_user(transaction.posting_date)}</td>
					<td style="padding: 8px; font-weight: 500;">${transaction.voucher_type}</td>
					<td style="padding: 8px;">
						<a href="#" onclick="frappe.set_route('Form', '${transaction.voucher_type}', '${
				transaction.voucher_no
			}')" 
						   style="color: #007bff; text-decoration: none;">${transaction.voucher_no}</a>
					</td>
					<td style="padding: 8px; font-size: 11px; color: #6c757d;">${transaction.account || ""}</td>
					<td style="padding: 8px; text-align: right; font-weight: 600; color: #dc3545; font-family: monospace;">
						${debit > 0 ? debit.toFixed(2) + " EUR" : ""}
					</td>
					<td style="padding: 8px; text-align: right; font-weight: 600; color: #28a745; font-family: monospace;">
						${credit > 0 ? credit.toFixed(2) + " EUR" : ""}
					</td>
					<td style="padding: 8px; font-size: 11px; color: #6c757d; max-width: 200px; word-wrap: break-word;">
						${transaction.remarks || ""}
					</td>
				</tr>
			`;
		});

		html += `
					</tbody>
				</table>
			</div>
		`;

		dialog.fields_dict.transactions_html.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue transactions:", error);
	}
}

function generate_balance_report(frm) {
	try {
		frappe.call({
			method: "josseaume_energies.customer_balance.get_customer_balance",
			args: {
				customer: frm.doc.name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					show_balance_report_dialog(frm, r.message);
				} else {
					frappe.msgprint("Erreur lors de la génération du rapport");
				}
			},
		});
	} catch (error) {
		console.error("Erreur rapport:", error);
	}
}

function show_balance_report_dialog(frm, balance_data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: `📊 Rapport de Solde - ${frm.doc.customer_name || frm.doc.name}`,
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "report_html",
				},
			],
		});

		const stats = balance_data.stats || {};
		const balance = parseFloat(balance_data.balance || 0);

		let html = `
			<div style="margin: 20px;">
				<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
					<h4 style="margin: 0 0 15px 0; color: #343a40;">💳 Informations Client</h4>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
						<div>
							<strong>Nom:</strong> ${frm.doc.customer_name || frm.doc.name}<br>
							<strong>Code:</strong> ${frm.doc.name}<br>
							<strong>Type:</strong> ${frm.doc.customer_type || "N/A"}<br>
						</div>
						<div>
							<strong>Devise:</strong> ${balance_data.currency}<br>
							<strong>Méthode de calcul:</strong> ${balance_data.calculation_method || "Standard"}<br>
							<strong>Date de calcul:</strong> ${balance_data.calculation_date || "Aujourd'hui"}<br>
						</div>
					</div>
				</div>

				<div style="background: ${
					balance > 0 ? "#ffeaea" : balance < 0 ? "#eafaf1" : "#e3f2fd"
				}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
					<h3 style="margin: 0; color: ${balance > 0 ? "#dc3545" : balance < 0 ? "#28a745" : "#007bff"};">
						${balance > 0 ? "⚠️ Client Débiteur" : balance < 0 ? "💰 Crédit Client" : "⚖️ Solde Équilibré"}
					</h3>
					<h2 style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold;">
						${balance_data.formatted_balance}
					</h2>
				</div>

				<div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
					<h5>📈 Statistiques</h5>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
						<div>
							<strong>Factures impayées:</strong> ${stats.unpaid_invoices || 0}<br>
							<strong>Montant impayé:</strong> ${
								stats.unpaid_amount
									? stats.unpaid_amount.toFixed(2) + " EUR"
									: "0.00 EUR"
							}<br>
						</div>
						<div>
							${
								stats.last_invoice
									? `
								<strong>Dernière facture:</strong><br>
								${stats.last_invoice.name} - ${
											stats.last_invoice.amount
												? stats.last_invoice.amount.toFixed(2) + " EUR"
												: "N/A"
									  }<br>
								Date: ${stats.last_invoice.date || "N/A"}
							`
									: "<em>Aucune facture trouvée</em>"
							}
						</div>
					</div>
				</div>
			</div>
		`;

		dialog.fields_dict.report_html.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur rapport dialogue:", error);
	}
}

// Fonction de test globale améliorée
window.debug_customer_balance_header = function (customer_name) {
	if (!customer_name && cur_frm && cur_frm.doc) {
		customer_name = cur_frm.doc.name;
	}

	if (!customer_name) {
		console.log("Nom du client requis");
		return;
	}

	console.log("🧪 Test solde en en-tête pour:", customer_name);

	if (cur_frm) {
		add_customer_balance_header(cur_frm);
	}
};

console.log("✅ Script customer.js avec affichage en en-tête - Prêt");
console.log("💡 Utilisez debug_customer_balance_header() pour tester");
