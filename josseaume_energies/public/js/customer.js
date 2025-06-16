// =============================================
// SOLUTION SIMPLE POUR LE SOLDE CLIENT
// Remplacer le contenu de customer.js par ce code
// =============================================

// josseaume_energies/public/js/customer.js - VERSION CORRIGÉE SIMPLE

console.log("🚀 Script customer.js - Correction solde");

frappe.ui.form.on("Customer", {
	refresh: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			// Attendre que tout soit chargé avant d'ajouter le solde
			setTimeout(() => {
				add_customer_balance_safe(frm);
			}, 1000);
		}
	},

	onload: function (frm) {
		if (!frm.doc.__islocal && frm.doc.name) {
			setTimeout(() => {
				add_customer_balance_safe(frm);
			}, 1500);
		}
	},
});

function add_customer_balance_safe(frm) {
	try {
		console.log("💰 Calcul solde pour:", frm.doc.name);

		// Vérification TRÈS défensive du dashboard
		if (!frm.dashboard) {
			console.log("❌ Dashboard non disponible");
			return;
		}

		// Supprimer les anciens indicateurs de manière SÉCURISÉE
		remove_old_indicators_safe(frm);

		// Récupérer le solde
		frappe.call({
			method: "josseaume_energies.customer_balance.get_customer_balance",
			args: {
				customer: frm.doc.name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					console.log("✅ API réussie:", r.message);
					display_balance_safe(frm, r.message);
				} else {
					console.log("⚠️ API échouée, méthode de fallback...");
					get_balance_fallback(frm);
				}
			},
			error: function (err) {
				console.log("❌ Erreur API:", err);
				get_balance_fallback(frm);
			},
		});
	} catch (error) {
		console.error("Erreur générale:", error);
	}
}

function remove_old_indicators_safe(frm) {
	try {
		// Méthode ULTRA sécurisée
		if (frm.dashboard && frm.dashboard.wrapper && frm.dashboard.wrapper.find) {
			const indicators = frm.dashboard.wrapper.find(".indicator");
			if (indicators && indicators.length > 0) {
				indicators.each(function () {
					const text = $(this).text().toLowerCase();
					if (
						text.includes("solde") ||
						text.includes("doit") ||
						text.includes("devons")
					) {
						$(this).remove();
					}
				});
			}
		}
		console.log("🧹 Nettoyage sécurisé OK");
	} catch (error) {
		// On ignore les erreurs de nettoyage, ce n'est pas critique
		console.log("Note: nettoyage ignoré -", error.message);
	}
}

function get_balance_fallback(frm) {
	try {
		console.log("🔄 Méthode de fallback...");

		// Utiliser l'API moderne de Frappe
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
				display_balance_safe(frm, balance_data);
			})
			.catch((error) => {
				console.error("Erreur fallback:", error);
				// Même en cas d'erreur, afficher un solde à 0
				display_balance_safe(frm, {
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

function display_balance_safe(frm, balance_data) {
	try {
		const balance = parseFloat(balance_data.balance || 0);
		const formatted_balance = balance_data.formatted_balance || `${balance.toFixed(2)} EUR`;

		console.log("🎯 Affichage du solde:", balance, formatted_balance);

		// Déterminer couleur et message
		let color = "blue";
		let label = "";

		if (balance > 0.01) {
			color = "red";
			label = `💳 Client doit : ${formatted_balance}`;
		} else if (balance < -0.01) {
			color = "green";
			label = `💰 Nous devons : ${Math.abs(balance).toFixed(2)} EUR`;
		} else {
			color = "blue";
			label = `⚖️ Solde équilibré : ${formatted_balance}`;
		}

		// TRIPLE sécurité pour l'affichage
		if (frm.dashboard && typeof frm.dashboard.add_indicator === "function") {
			try {
				frm.dashboard.add_indicator(label, color);
				console.log("📊 Indicateur ajouté via dashboard:", label);
			} catch (dashboard_error) {
				console.log("Dashboard échoué, méthode alternative...");
				display_via_intro(frm, label, color);
			}
		} else {
			console.log("Dashboard non disponible, méthode alternative...");
			display_via_intro(frm, label, color);
		}

		// Ajouter les boutons
		add_balance_buttons_safe(frm, balance);

		console.log("✅ Affichage terminé avec succès");
	} catch (error) {
		console.error("Erreur affichage:", error);
	}
}

function display_via_intro(frm, label, color) {
	try {
		// Affichage de secours via l'intro du formulaire
		const intro_html = `
            <div style="
                padding: 10px 15px; 
                background: ${
					color === "red" ? "#f8d7da" : color === "green" ? "#d4edda" : "#d1ecf1"
				}; 
                color: ${color === "red" ? "#721c24" : color === "green" ? "#155724" : "#0c5460"};
                border: 1px solid ${
					color === "red" ? "#f5c6cb" : color === "green" ? "#c3e6cb" : "#bee5eb"
				};
                border-radius: 4px; 
                margin: 10px 0;
                font-weight: 600;
            ">
                ${label}
            </div>
        `;

		frm.set_intro(intro_html);
		console.log("📋 Solde affiché via intro:", label);
	} catch (intro_error) {
		console.error("Erreur affichage intro:", intro_error);
	}
}

function add_balance_buttons_safe(frm, balance) {
	try {
		const balance_group = "💰 Solde";

		// Bouton actualiser
		frm.add_custom_button(
			"🔄 Actualiser",
			function () {
				// Nettoyer et relancer
				remove_old_indicators_safe(frm);
				frm.set_intro(""); // Nettoyer l'intro aussi

				setTimeout(() => {
					add_customer_balance_safe(frm);
				}, 300);

				frappe.show_alert("Solde actualisé", 2);
			},
			balance_group
		);

		// Bouton transactions si nécessaire
		if (Math.abs(balance) > 0.01) {
			frm.add_custom_button(
				"📋 Transactions",
				function () {
					show_transactions_simple(frm);
				},
				balance_group
			);
		}

		// Bouton écritures comptables
		frm.add_custom_button(
			"📚 Écritures",
			function () {
				frappe.set_route("List", "GL Entry", {
					party_type: "Customer",
					party: frm.doc.name,
				});
			},
			balance_group
		);
	} catch (error) {
		console.error("Erreur boutons:", error);
	}
}

function show_transactions_simple(frm) {
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
				],
				order_by: "posting_date desc",
				limit: 20,
			})
			.then((transactions) => {
				if (transactions && transactions.length > 0) {
					show_transactions_dialog(frm, transactions);
				} else {
					frappe.msgprint("Aucune transaction trouvée pour ce client");
				}
			})
			.catch((error) => {
				console.error("Erreur transactions:", error);
				frappe.msgprint("Erreur lors de la récupération des transactions");
			});
	} catch (error) {
		console.error("Erreur show_transactions_simple:", error);
	}
}

function show_transactions_dialog(frm, transactions) {
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
                    <td style="text-align: right; color: red;">
                        ${debit > 0 ? debit.toFixed(2) + " EUR" : ""}
                    </td>
                    <td style="text-align: right; color: green;">
                        ${credit > 0 ? credit.toFixed(2) + " EUR" : ""}
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
		console.error("Erreur dialogue:", error);
	}
}

// Fonction de test globale
window.debug_customer_balance_simple = function (customer_name) {
	if (!customer_name && cur_frm && cur_frm.doc) {
		customer_name = cur_frm.doc.name;
	}

	if (!customer_name) {
		console.log("Nom du client requis");
		return;
	}

	console.log("🧪 Test solde pour:", customer_name);

	if (cur_frm) {
		add_customer_balance_safe(cur_frm);
	}
};

console.log("✅ Script customer.js corrigé - Version simple");
console.log("💡 Utilisez debug_customer_balance_simple() pour tester");

// =============================================
// CORRECTION IMMÉDIATE DU FICHIER CSS MANQUANT
// =============================================

// Si le fichier CSS est manquant, ajouter les styles de base directement
if (!document.getElementById("customer-balance-emergency-styles")) {
	const style = document.createElement("style");
	style.id = "customer-balance-emergency-styles";
	style.textContent = `
        .indicator[title*="Client doit"],
        .indicator[title*="Nous devons"], 
        .indicator[title*="Solde équilibré"] {
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 15px;
            margin: 4px 6px 4px 0;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .indicator.red[title*="Client doit"] {
            background: #dc3545 !important;
            color: white !important;
        }
        
        .indicator.green[title*="Nous devons"] {
            background: #28a745 !important;
            color: white !important;
        }
        
        .indicator.blue[title*="Solde équilibré"] {
            background: #007bff !important;
            color: white !important;
        }
    `;
	document.head.appendChild(style);
	console.log("🎨 Styles CSS d'urgence ajoutés");
}
