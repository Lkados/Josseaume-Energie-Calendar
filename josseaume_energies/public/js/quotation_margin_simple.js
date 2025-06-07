// josseaume_energies/public/js/quotation_margin_simple.js - VERSION AMÉLIORÉE AVEC REMISES

frappe.ui.form.on("Quotation", {
	refresh: function (frm) {
		// Attendre que les boutons standards soient chargés
		setTimeout(function () {
			try {
				// Ajouter les boutons de calcul de marge
				add_margin_buttons_improved(frm);

				// Afficher les indicateurs de marge si calculés
				display_margin_indicators_improved(frm);

				// Vérifier la configuration au chargement
				setTimeout(function () {
					check_setup_status_improved(frm);
				}, 800);
			} catch (error) {
				console.error("Erreur dans les fonctions de marge (non-critique):", error);
			}
		}, 200);
	},

	validate: function (frm) {
		// Calculer automatiquement les marges de manière non-bloquante
		try {
			setTimeout(function () {
				calculate_quotation_margins_improved(frm);
			}, 100);
		} catch (error) {
			console.error("Erreur calcul marge lors de la validation:", error);
		}
	},
});

frappe.ui.form.on("Quotation Item", {
	item_code: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin_improved(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge article:", error);
			}
		}, 100);
	},

	rate: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin_improved(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge prix:", error);
			}
		}, 100);
	},

	qty: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin_improved(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge quantité:", error);
			}
		}, 100);
	},

	// NOUVEAU : Recalculer lors des changements de remise
	discount_percentage: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin_improved(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge remise%:", error);
			}
		}, 100);
	},

	discount_amount: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin_improved(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge remise montant:", error);
			}
		}, 100);
	},
});

function add_margin_buttons_improved(frm) {
	try {
		if (!frm || !frm.doc) {
			return;
		}

		if (!frm.page) {
			console.log("Page pas encore prête, report de l'ajout des boutons marge");
			setTimeout(function () {
				add_margin_buttons_improved(frm);
			}, 200);
			return;
		}

		const marginGroup = __("📊 Marges");
		const isNewDoc = frm.doc.__islocal;

		if (isNewDoc) {
			// Boutons qui fonctionnent même sur un nouveau document
			frm.add_custom_button(
				__("Gérer prix d'achat"),
				function () {
					show_valuation_manager_improved(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Articles sans coût"),
				function () {
					show_items_without_cost();
				},
				marginGroup
			);
		} else {
			// Pour les documents sauvegardés, afficher tous les boutons
			frm.add_custom_button(
				__("Analyse détaillée"),
				function () {
					show_detailed_margin_dialog_improved(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Analyse remises"),
				function () {
					show_discounts_analysis(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Articles sans coût"),
				function () {
					show_items_without_cost();
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Analyser Kits"),
				function () {
					show_all_bundles_analysis_improved();
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Gérer prix d'achat"),
				function () {
					show_valuation_manager_improved(frm);
				},
				marginGroup
			);
		}
	} catch (error) {
		console.error("Erreur lors de l'ajout des boutons de marge:", error);
	}
}

function calculate_quotation_margins_improved(frm) {
	if (!frm || !frm.doc) {
		return;
	}

	if (frm.doc.__islocal) {
		console.log("Document non sauvegardé, calcul de marge reporté");
		return;
	}

	if (!frm.doc.name) {
		return;
	}

	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
		args: {
			quotation_name: frm.doc.name,
		},
		callback: function (r) {
			try {
				if (r.message && r.message.status === "success") {
					// Mettre à jour les champs du formulaire
					update_margin_fields_improved(frm, r.message);

					// Actualiser l'affichage
					display_margin_indicators_improved(frm);

					// NOUVEAU : Afficher les alertes s'il y en a
					if (r.message.global_alerts && r.message.global_alerts.length > 0) {
						show_margin_alerts(r.message.global_alerts);
					}
				}
			} catch (error) {
				console.error("Erreur dans callback calcul marge:", error);
			}
		},
		error: function (err) {
			console.error("Erreur API calcul marge:", err);
		},
	});
}

function calculate_item_margin_improved(frm, cdt, cdn) {
	try {
		const item = locals[cdt][cdn];

		if (!item.item_code || !item.rate) {
			return;
		}

		// NOUVEAU : Récupérer les informations de remise
		const discount_percentage = flt(item.discount_percentage || 0);
		const discount_amount = flt(item.discount_amount || 0);

		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.calculate_item_margin",
			args: {
				item_code: item.item_code,
				selling_price: item.rate,
				qty: item.qty || 1,
				discount_percentage: discount_percentage,
				discount_amount: discount_amount,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						// Mettre à jour les champs personnalisés de l'article
						const data = r.message;

						if (frappe.meta.has_field(cdt, "custom_cost_price")) {
							frappe.model.set_value(cdt, cdn, "custom_cost_price", data.cost_price);
						}
						if (frappe.meta.has_field(cdt, "custom_margin_amount")) {
							frappe.model.set_value(
								cdt,
								cdn,
								"custom_margin_amount",
								data.margin_amount
							);
						}
						if (frappe.meta.has_field(cdt, "custom_margin_percentage")) {
							frappe.model.set_value(
								cdt,
								cdn,
								"custom_margin_percentage",
								data.margin_percentage
							);
						}

						// Afficher un indicateur de marge amélioré
						setTimeout(function () {
							show_item_margin_indicator_improved(item, data);
						}, 100);
					} else if (r.message && r.message.status === "warning") {
						setTimeout(function () {
							show_no_valuation_warning(item);
						}, 100);
					}
				} catch (error) {
					console.error("Erreur callback marge article:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API marge article:", err);
			},
		});
	} catch (error) {
		console.error("Erreur générale calcul marge article:", error);
	}
}

function update_margin_fields_improved(frm, margin_data) {
	try {
		// Champs existants
		if (frappe.meta.has_field("Quotation", "custom_total_cost")) {
			frm.set_value("custom_total_cost", margin_data.total_cost);
		}
		if (frappe.meta.has_field("Quotation", "custom_margin_amount")) {
			frm.set_value("custom_margin_amount", margin_data.global_margin_amount);
		}
		if (frappe.meta.has_field("Quotation", "custom_margin_percentage")) {
			frm.set_value("custom_margin_percentage", margin_data.global_margin_percentage);
		}
		if (frappe.meta.has_field("Quotation", "custom_margin_status")) {
			frm.set_value("custom_margin_status", margin_data.global_margin_status);
		}

		// NOUVEAUX champs pour les remises
		if (frappe.meta.has_field("Quotation", "custom_total_gross")) {
			frm.set_value("custom_total_gross", margin_data.total_selling_gross);
		}
		if (frappe.meta.has_field("Quotation", "custom_total_discount")) {
			frm.set_value(
				"custom_total_discount",
				margin_data.discount_stats.total_discount
			);
		}
	} catch (error) {
		console.error("Erreur mise à jour champs marge:", error);
	}
}

function display_margin_indicators_improved(frm) {
	try {
		if (!frm || !frm.dashboard) {
			return;
		}

		// Supprimer les anciens indicateurs de marge
		$('.indicator[title*="Marge"], .indicator[title*="Coût"], .indicator[title*="Remise"]').remove();

		// Indicateurs de marge
		const margin_percentage = frm.doc.custom_margin_percentage;
		const margin_status = frm.doc.custom_margin_status;

		if (margin_percentage !== undefined && margin_percentage !== null) {
			let color = "grey";
			let label = `Marge: ${margin_percentage.toFixed(1)}%`;

			switch (margin_status) {
				case "exceptional":
					color = "purple";
					label = `🚀 Marge exceptionnelle: ${margin_percentage.toFixed(1)}%`;
					break;
				case "excellent":
					color = "green";
					label = `✨ Excellente marge: ${margin_percentage.toFixed(1)}%`;
					break;
				case "good":
					color = "blue";
					label = `👍 Bonne marge: ${margin_percentage.toFixed(1)}%`;
					break;
				case "acceptable":
					color = "orange";
					label = `⚠️ Marge acceptable: ${margin_percentage.toFixed(1)}%`;
					break;
				case "low":
					color = "red";
					label = `⚠️ Marge faible: ${margin_percentage.toFixed(1)}%`;
					break;
				case "negative":
					color = "red";
					label = `❌ Marge négative: ${margin_percentage.toFixed(1)}%`;
					break;
			}

			frm.dashboard.add_indicator(__(label), color);
		}

		// NOUVEAU : Indicateurs de coût et remise
		if (frm.doc.custom_total_cost) {
			frm.dashboard.add_indicator(
				__(`Coût total: ${format_currency(frm.doc.custom_total_cost)}`),
				"grey"
			);
		}

		if (frm.doc.custom_total_discount && frm.doc.custom_total_discount > 0) {
			const discount_percentage =
				frm.doc.custom_total_gross > 0
					? (frm.doc.custom_total_discount / frm.doc.custom_total_gross) * 100
					: 0;
			frm.dashboard.add_indicator(
				__(`Remise: ${format_currency(frm.doc.custom_total_discount)} (${discount_percentage.toFixed(1)}%)`),
				"orange"
			);
		}
	} catch (error) {
		console.error("Erreur affichage indicateurs:", error);
	}
}

// NOUVELLE FONCTION : Afficher les alertes de marge
function show_margin_alerts(alerts) {
	try {
		if (alerts.length === 0) return;

		let message = "<h5>⚠️ Alertes de marge</h5><ul>";
		alerts.forEach((alert) => {
			message += `<li>${alert}</li>`;
		});
		message += "</ul>";

		frappe.show_alert(
			{
				message: message,
				indicator: "orange",
			},
			5
		);
	} catch (error) {
		console.error("Erreur affichage alertes:", error);
	}
}

// NOUVELLE FONCTION : Analyse des remises
function show_discounts_analysis(frm) {
	try {
		if (!frm || !frm.doc || frm.doc.__islocal) {
			frappe.msgprint(__("Veuillez d'abord sauvegarder le devis"));
			return;
		}

		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.analyze_quotation_discounts",
			args: {
				quotation_name: frm.doc.name,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_discounts_dialog(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse des remises"),
						});
					}
				} catch (error) {
					console.error("Erreur callback analyse remises:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API analyse remises:", err);
			},
		});
	} catch (error) {
		console.error("Erreur show_discounts_analysis:", error);
	}
}

function show_discounts_dialog(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Analyse des remises - ") + data.quotation_name,
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "discounts_analysis",
				},
			],
		});

		let html = `
			<div class="margin-analysis">
				<div class="row">
					<div class="col-md-6">
						<div class="margin-card">
							<h4>💰 Résumé Remises</h4>
							<p><strong>Total brut:</strong> ${format_currency(data.total_gross)}</p>
							<p><strong>Total net:</strong> ${format_currency(data.total_net)}</p>
							<p><strong>Remise totale:</strong> ${format_currency(data.total_discount)}</p>
							<p><strong>Taux remise global:</strong> <span class="margin-percentage">${data.global_discount_percentage.toFixed(
								2
							)}%</span></p>
						</div>
					</div>
					<div class="col-md-6">
						<div class="margin-card">
							<h4>📊 Statistiques</h4>
							<p><strong>Articles totaux:</strong> ${data.total_items}</p>
							<p><strong>Articles avec remise:</strong> ${data.items_with_discount}</p>
							<p><strong>Remise globale:</strong> ${format_currency(data.global_discount)}</p>
						</div>
					</div>
				</div>
		`;

		if (data.discount_analysis.length > 0) {
			html += `
				<h5>📋 Détail par article avec remise</h5>
				<div class="items-margin-table">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Article</th>
								<th>Montant brut</th>
								<th>Montant net</th>
								<th>Remise</th>
								<th>Taux remise</th>
							</tr>
						</thead>
						<tbody>
			`;

			data.discount_analysis.forEach((item) => {
				html += `
					<tr>
						<td>
							<strong>${item.item_code}</strong><br>
							<small style="color: #666;">${item.item_name || ""}</small>
						</td>
						<td style="text-align: right;">${format_currency(item.gross_amount)}</td>
						<td style="text-align: right;">${format_currency(item.net_amount)}</td>
						<td style="text-align: right;">${format_currency(item.discount_amount)}</td>
						<td style="text-align: center;">
							<span class="margin-percentage">${item.discount_percentage.toFixed(1)}%</span>
						</td>
					</tr>
				`;
			});

			html += `
					</tbody>
				</table>
			</div>
			`;
		} else {
			html += `
				<div class="margin-card">
					<h5>ℹ️ Aucune remise détectée</h5>
					<p>Ce devis ne contient aucune remise au niveau des articles.</p>
				</div>
			`;
		}

		html += `</div>`;

		dialog.fields_dict.discounts_analysis.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue remises:", error);
	}
}

// NOUVELLE FONCTION : Afficher les articles sans coût
function show_items_without_cost() {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.check_items_without_cost",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_items_without_cost_dialog(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de la vérification des articles"),
						});
					}
				} catch (error) {
					console.error("Erreur callback articles sans coût:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API articles sans coût:", err);
			},
		});
	} catch (error) {
		console.error("Erreur show_items_without_cost:", error);
	}
}

function show_items_without_cost_dialog(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Articles sans prix de revient"),
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "items_without_cost",
				},
			],
		});

		let html = `
			<div class="margin-analysis">
				<div class="margin-card ${data.items_without_cost > 0 ? 'low' : 'good'}">
					<h4>📊 Statistiques Prix de Revient</h4>
					<p><strong>Total articles:</strong> ${data.total_items}</p>
					<p><strong>Avec prix de revient:</strong> ${data.items_with_cost}</p>
					<p><strong>Sans prix de revient:</strong> ${data.items_without_cost}</p>
					<p><strong>Couverture:</strong> <span class="margin-percentage">${data.coverage_percentage.toFixed(
						1
					)}%</span></p>
				</div>
		`;

		if (data.items_without_cost > 0) {
			html += `
				<div class="margin-card">
					<h5>⚠️ Impact sur les marges</h5>
					<p>Les articles sans prix de revient auront un <strong>coût de 0€</strong> dans les calculs de marge.</p>
					<p>Cela donnera une <strong>marge de 100%</strong> pour ces articles (vente pure).</p>
					<p>Considérez mettre à jour les prix de revient pour une analyse plus précise.</p>
				</div>
			`;

			html += `
				<h5>📋 Articles sans prix de revient (${data.items_without_cost_details.length})</h5>
				<div class="items-margin-table">
					<div style="max-height: 400px; overflow-y: auto;">
						<table class="table table-bordered">
							<thead>
								<tr>
									<th>Code Article</th>
									<th>Nom</th>
									<th>Groupe</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
			`;

			data.items_without_cost_details.forEach((item) => {
				html += `
					<tr>
						<td><strong>${item.item_code}</strong></td>
						<td>${item.item_name || ""}</td>
						<td>${item.item_group || ""}</td>
						<td>
							<button class="btn btn-xs btn-primary" onclick="open_item_for_edit('${item.item_code}')">
								<i class="fa fa-edit"></i> Modifier
							</button>
						</td>
					</tr>
				`;
			});

			html += `
					</tbody>
				</table>
			</div>
			</div>
			`;
		} else {
			html += `
				<div class="margin-card good">
					<h5>✅ Excellent !</h5>
					<p>Tous vos articles ont un prix de revient défini.</p>
					<p>Les calculs de marge seront précis.</p>
				</div>
			`;
		}

		html += `</div>`;

		dialog.fields_dict.items_without_cost.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue articles sans coût:", error);
	}
}

// FONCTION GLOBALE : Ouvrir un article pour modification
window.open_item_for_edit = function (item_code) {
	try {
		frappe.set_route("Form", "Item", item_code);
	} catch (error) {
		console.error("Erreur ouverture article:", error);
	}
};

function show_item_margin_indicator_improved(item, margin_data) {
	try {
		const row = $(`[data-fieldname="items"] [data-name="${item.name}"]`);
		if (row.length) {
			row.find(".margin-indicator").remove();

			let indicator_class = `margin-indicator ${margin_data.margin_status}`;
			let indicator_text = `${margin_data.margin_percentage.toFixed(1)}%`;

			// NOUVEAU : Ajouter des icônes selon le statut
			let icon = "";
			switch (margin_data.margin_status) {
				case "exceptional":
					icon = "🚀";
					break;
				case "excellent":
					icon = "✨";
					break;
				case "good":
					icon = "👍";
					break;
				case "acceptable":
					icon = "⚠️";
					break;
				case "low":
					icon = "⚠️";
					break;
				case "negative":
					icon = "❌";
					break;
			}

			// NOUVEAU : Afficher les alertes dans l'indicateur
			let title = `Marge: ${margin_data.margin_percentage.toFixed(1)}%`;
			if (margin_data.alerts && margin_data.alerts.length > 0) {
				title += `\nAlertes: ${margin_data.alerts.join(", ")}`;
			}
			if (margin_data.discount_info && margin_data.discount_info.has_discount) {
				title += `\nRemise: ${margin_data.discount_info.discount_percentage}% + ${margin_data.discount_info.discount_amount}€`;
			}

			let indicator_html = `<span class="${indicator_class}" title="${title}">${icon} ${indicator_text}</span>`;

			row.find(".grid-row-check").after(indicator_html);
		}
	} catch (error) {
		console.error("Erreur indicateur marge article:", error);
	}
}

function show_no_valuation_warning(item) {
	try {
		const row = $(`[data-fieldname="items"] [data-name="${item.name}"]`);
		if (row.length) {
			row.find(".valuation-warning").remove();
			row.find(".grid-row-check").after(
				'<span class="valuation-warning" style="color: orange; font-size: 10px;" title="Coût = 0€ (pas de prix de valorisation)">💰0€</span>'
			);
		}
	} catch (error) {
		console.error("Erreur avertissement valorisation:", error);
	}
}

// FONCTIONS EXISTANTES AMÉLIORÉES

function show_detailed_margin_dialog_improved(frm) {
	try {
		if (!frm || !frm.doc || frm.doc.__islocal) {
			frappe.msgprint(__("Veuillez d'abord sauvegarder le devis"));
			return;
		}

		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
			args: {
				quotation_name: frm.doc.name,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_margin_summary_dialog_improved(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors du calcul des marges"),
						});
					}
				} catch (error) {
					console.error("Erreur callback marge détaillée:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API marge détaillée:", err);
			},
		});
	} catch (error) {
		console.error("Erreur show_detailed_margin_dialog_improved:", error);
	}
}

function show_margin_summary_dialog_improved(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Analyse des marges - ") + data.quotation_name,
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "margin_summary",
				},
			],
		});

		let html = `
			<div class="margin-analysis">
				<div class="row">
					<div class="col-md-4">
						<div class="margin-card global-margin ${data.global_margin_status}">
							<h4>📊 Résumé Global</h4>
							<p><strong>Total brut:</strong> ${format_currency(data.total_selling_gross)}</p>
							<p><strong>Total net:</strong> ${format_currency(data.total_selling_net)}</p>
							<p><strong>Total coût:</strong> ${format_currency(data.total_cost)}</p>
							<p><strong>Marge:</strong> ${format_currency(data.global_margin_amount)}</p>
							<p><strong>Taux de marge:</strong> <span class="margin-percentage">${data.global_margin_percentage.toFixed(
								2
							)}%</span></p>
							<p><strong>Statut:</strong> <span class="status-badge ${
								data.global_margin_status
							}">${get_status_label_improved(data.global_margin_status)}</span></p>
						</div>
					</div>
					<div class="col-md-4">
						<div class="margin-card">
							<h4>💰 Remises</h4>
							<p><strong>Remise totale:</strong> ${format_currency(
								data.discount_stats.total_discount
							)}</p>
							<p><strong>Taux remise:</strong> <span class="margin-percentage">${data.discount_stats.discount_percentage_global.toFixed(
								2
							)}%</span></p>
							<p><strong>Avec remises:</strong> ${
								data.discount_stats.has_discounts ? "✅ Oui" : "❌ Non"
							}</p>
						</div>
					</div>
					<div class="col-md-4">
						<div class="margin-tips">
							<h5>💡 Recommandations</h5>
							${get_margin_recommendations_improved(data.global_margin_percentage)}
						</div>
					</div>
				</div>
		`;

		// NOUVEAU : Afficher les alertes globales
		if (data.global_alerts && data.global_alerts.length > 0) {
			html += `
				<div class="margin-card low">
					<h5>⚠️ Alertes</h5>
					<ul>
			`;
			data.global_alerts.forEach((alert) => {
				html += `<li>${alert}</li>`;
			});
			html += `
					</ul>
				</div>
			`;
		}

		html += `
			<hr>
			<h5>📋 Détail par article (${data.items_count} articles)</h5>
			<div class="items-margin-table">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Article</th>
							<th>Type</th>
							<th>Qté</th>
							<th>Prix brut</th>
							<th>Prix net</th>
							<th>Coût</th>
							<th>Marge</th>
							<th>Taux</th>
							<th>Statut</th>
							<th>Alertes</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
		`;

		data.items_analysis.forEach((item) => {
			const isBundle = item.is_bundle || false;
			const bundleIcon = isBundle ? "📦" : "📄";
			const bundleLabel = isBundle ? "Kit" : "Article";

			// NOUVEAU : Afficher les alertes de l'article
			let alertsHtml = "";
			if (item.alerts && item.alerts.length > 0) {
				alertsHtml = item.alerts
					.map((alert) => `<small style="color: orange;">⚠️ ${alert}</small>`)
					.join("<br>");
			}

			html += `
				<tr class="item-row ${item.margin_status}">
					<td style="min-width: 150px;">
						<strong>${item.item_code}</strong><br>
						<small style="color: #666;">${item.item_name || ""}</small>
					</td>
					<td style="width: 60px; text-align: center;">
						<span style="font-size: 11px;">${bundleIcon} ${bundleLabel}</span>
					</td>
					<td style="width: 50px; text-align: center;">${item.qty}</td>
					<td style="width: 90px; text-align: right;">${format_currency(
						item.amount_gross / item.qty
					)}</td>
					<td style="width: 90px; text-align: right;">${format_currency(
						item.amount_net / item.qty
					)}</td>
					<td style="width: 90px; text-align: right;">${format_currency(item.cost_price)}</td>
					<td style="width: 80px; text-align: right;">${format_currency(item.margin_amount)}</td>
					<td style="width: 60px; text-align: center;">
						<span class="margin-percentage">${item.margin_percentage.toFixed(1)}%</span>
					</td>
					<td style="width: 80px; text-align: center;">
						<span class="status-badge ${item.margin_status}">${get_status_label_improved(
				item.margin_status
			)}</span>
					</td>
					<td style="width: 120px;">
						${alertsHtml}
					</td>
					<td style="width: 120px; text-align: center;">
						${
							isBundle
								? `<button class="btn btn-xs btn-info" onclick="window.analyze_bundle_item('${item.item_code}')" style="font-size: 10px; padding: 2px 6px; margin: 1px;">
								<i class="fa fa-search"></i> Kit
							</button>`
								: `<button class="btn btn-xs btn-secondary" onclick="window.view_item_details('${item.item_code}')" style="font-size: 10px; padding: 2px 6px; margin: 1px;">
								<i class="fa fa-eye"></i> Détails
							</button>`
						}
					</td>
				</tr>
			`;
		});

		html += `
					</tbody>
				</table>
			</div>
		</div>
		`;

		dialog.fields_dict.margin_summary.$wrapper.html(html);
		dialog.show();

		dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
		dialog.$wrapper.find(".table").css({
			"font-size": "12px",
			"margin-bottom": "0",
		});
	} catch (error) {
		console.error("Erreur création dialogue marge amélioré:", error);
	}
}

function get_status_label_improved(status) {
	const labels = {
		exceptional: "🚀 Exceptionnel",
		excellent: "✨ Excellent",
		good: "👍 Bon",
		acceptable: "⚠️ Acceptable",
		low: "⚠️ Faible",
		negative: "❌ Négatif",
	};
	return labels[status] || status;
}

function get_margin_recommendations_improved(margin_percentage) {
	if (margin_percentage >= 50) {
		return `<p class="text-success">🚀 Marge exceptionnelle ! Excellent travail.</p>`;
	} else if (margin_percentage >= 30) {
		return `<p class="text-success">✅ Excellente marge ! Continuez ainsi.</p>`;
	} else if (margin_percentage >= 20) {
		return `<p class="text-info">👍 Bonne marge. Vous pouvez éventuellement ajuster légèrement les prix.</p>`;
	} else if (margin_percentage >= 10) {
		return `<p class="text-warning">⚠️ Marge acceptable mais améliorable. Considérez réviser vos coûts ou prix de vente.</p>`;
	} else if (margin_percentage >= 0) {
		return `<p class="text-danger">⚠️ Marge trop faible. Action recommandée : réviser les prix ou négocier les coûts.</p>`;
	} else {
		return `<p class="text-danger">❌ Marge négative ! Action urgente requise.</p>`;
	}
}

function check_setup_status_improved(frm) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						const setup = r.message;

						if (!setup.ready_for_use && setup.quotation_fields_missing.length > 0) {
							console.log("Configuration marge incomplète:", setup);
						}

						// Afficher les améliorations si disponibles
						if (setup.improvements && setup.improvements.length > 0) {
							console.log("Améliorations marge:", setup.improvements);
						}

						if (setup.total_bundles > 0) {
							console.log(
								`Bundles détectés: ${setup.total_bundles} total, ${setup.bundles_with_cost} avec coût`
							);
						}

						// NOUVEAU : Afficher les statistiques d'articles sans coût
						if (setup.items_without_valuation > 0) {
							console.log(
								`${setup.items_without_valuation} articles sans prix de revient (coût = 0€)`
							);
						}
					}
				} catch (error) {
					console.error("Erreur callback check_setup:", error);
				}
			},
			error: function (err) {
				console.log("Erreur check_setup (ignorée):", err);
			},
		});
	} catch (error) {
		console.log("Erreur générale check_setup (ignorée):", error);
	}
}

function show_valuation_manager_improved(frm) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_valuation_dialog_improved(r.message.items);
					} else {
						frappe.msgprint({
							title: __("Gestionnaire des prix d'achat"),
							message: `
								<p>Pour gérer les prix d'achat :</p>
								<ol>
									<li>Allez dans <strong>Stock > Article</strong></li>
									<li>Ouvrez l'article souhaité</li>
									<li>Dans l'onglet "Prix d'achat", modifiez le champ <strong>Valuation Rate</strong></li>
									<li>Sauvegardez</li>
								</ol>
								<p><strong>Nouveauté :</strong> Les articles sans prix auront un coût de 0€ (marge de 100%).</p>
							`,
							primary_action: {
								label: __("Voir articles sans coût"),
								action: function () {
									show_items_without_cost();
								},
							},
						});
					}
				} catch (error) {
					console.error("Erreur callback prix d'achat:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API prix d'achat:", err);
			},
		});
	} catch (error) {
		console.error("Erreur gestionnaire prix d'achat:", error);
	}
}

function show_valuation_dialog_improved(items) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Gestionnaire des prix d'achat amélioré"),
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "valuation_manager",
					options: generate_valuation_manager_html_improved(items),
				},
			],
			primary_action_label: __("Mettre à jour"),
			primary_action: function () {
				update_valuations_from_dialog_improved(dialog);
			},
		});

		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue prix d'achat:", error);
	}
}

function generate_valuation_manager_html_improved(items) {
	try {
		// Séparer les articles avec et sans coût
		const itemsWithCost = items.filter((item) => item.valuation_rate > 0);
		const itemsWithoutCost = items.filter((item) => !item.valuation_rate || item.valuation_rate <= 0);

		let html = `
			<div class="valuation-manager">
				<div class="margin-card">
					<h4>📊 Résumé</h4>
					<p><strong>Total articles:</strong> ${items.length}</p>
					<p><strong>Avec prix d'achat:</strong> ${itemsWithCost.length}</p>
					<p><strong>Sans prix d'achat:</strong> ${itemsWithoutCost.length} (coût = 0€)</p>
				</div>
		`;

		if (itemsWithoutCost.length > 0) {
			html += `
				<div class="margin-card low">
					<h5>⚠️ Articles prioritaires (sans prix d'achat)</h5>
					<div style="max-height: 200px; overflow-y: auto;">
						<table class="table table-bordered">
							<thead>
								<tr>
									<th>Article</th>
									<th>Nom</th>
									<th>Prix vente</th>
									<th>Nouveau prix d'achat</th>
								</tr>
							</thead>
							<tbody>
			`;

			itemsWithoutCost.slice(0, 20).forEach((item) => {
				html += `
					<tr style="background-color: #fff3cd;">
						<td><strong>${item.item_code}</strong></td>
						<td>${item.item_name || ""}</td>
						<td>${format_currency(item.standard_rate || 0)}</td>
						<td>
							<input type="number" class="form-control valuation-input" data-item="${
								item.item_code
							}" step="0.01" value="0" style="width: 100%; font-size: 11px; background-color: #fff;">
						</td>
					</tr>
				`;
			});

			html += `
					</tbody>
				</table>
			</div>
			`;

			if (itemsWithoutCost.length > 20) {
				html += `<p><em>... et ${itemsWithoutCost.length - 20} autres articles sans prix.</em></p>`;
			}

			html += `</div>`;
		}

		html += `
			<div class="margin-card">
				<h5>📋 Tous les articles (${items.length})</h5>
				<div style="max-height: 300px; overflow-y: auto;">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Article</th>
								<th>Nom</th>
								<th>Prix actuel</th>
								<th>Prix vente</th>
								<th>Nouveau prix</th>
							</tr>
						</thead>
						<tbody>
		`;

		items.forEach((item) => {
			const hasNoCost = !item.valuation_rate || item.valuation_rate <= 0;
			html += `
				<tr ${hasNoCost ? 'style="background-color: #fff3cd;"' : ""}>
					<td><strong>${item.item_code}</strong></td>
					<td>${item.item_name || ""}</td>
					<td>${format_currency(item.valuation_rate || 0)}</td>
					<td>${format_currency(item.standard_rate || 0)}</td>
					<td>
						<input type="number" class="form-control valuation-input" data-item="${
							item.item_code
						}" step="0.01" value="${
				item.valuation_rate || 0
			}" style="width: 100%; font-size: 11px;">
					</td>
				</tr>
			`;
		});

		html += `
					</tbody>
				</table>
			</div>
		</div>
		`;

		return html;
	} catch (error) {
		console.error("Erreur génération HTML amélioré:", error);
		return "<p>Erreur lors de la génération du contenu</p>";
	}
}

function update_valuations_from_dialog_improved(dialog) {
	try {
		const items_data = [];

		dialog.$wrapper.find(".valuation-input").each(function () {
			const item_code = $(this).data("item");
			const valuation_rate = $(this).val();

			if (item_code && valuation_rate !== "") {
				items_data.push({
					item_code: item_code,
					valuation_rate: parseFloat(valuation_rate) || 0, // Accepter 0
				});
			}
		});

		if (items_data.length > 0) {
			frappe.call({
				method: "josseaume_energies.margin_calculation_simple.bulk_update_valuation_rates",
				args: {
					items_data: items_data,
				},
				callback: function (r) {
					try {
						if (r.message && r.message.status === "success") {
							frappe.show_alert(
								`${r.message.updated_count} prix d'achat mis à jour`,
								3
							);
							dialog.hide();
						} else {
							frappe.msgprint(__("Erreur lors de la mise à jour"));
						}
					} catch (error) {
						console.error("Erreur callback update:", error);
					}
				},
				error: function (err) {
					console.error("Erreur API update:", err);
				},
			});
		} else {
			frappe.msgprint(__("Aucune modification à sauvegarder"));
		}
	} catch (error) {
		console.error("Erreur update prix d'achat:", error);
	}
}

function show_all_bundles_analysis_improved() {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.get_all_bundles_analysis",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundles_overview_dialog_improved(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse des kits"),
						});
					}
				} catch (error) {
					console.error("Erreur callback kits:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API kits:", err);
			},
		});
	} catch (error) {
		console.error("Erreur show_all_bundles_analysis_improved:", error);
	}
}

function show_bundles_overview_dialog_improved(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Vue d'ensemble des Kits améliorée"),
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "bundles_overview",
				},
			],
		});

		let html = `
			<div class="margin-analysis">
				<div class="row">
					<div class="col-md-3">
						<div class="margin-card excellent">
							<h4>📦 Kits Total</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.total_bundles}</p>
						</div>
					</div>
					<div class="col-md-3">
						<div class="margin-card good">
							<h4>💰 Avec Prix</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.bundles_with_price}</p>
						</div>
					</div>
					<div class="col-md-3">
						<div class="margin-card acceptable">
							<h4>🔧 Avec Coût</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.bundles_with_cost}</p>
						</div>
					</div>
					<div class="col-md-3">
						<div class="margin-card low">
							<h4>⚠️ Sans Coût</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${
								data.total_bundles - data.bundles_with_cost
							}</p>
						</div>
					</div>
				</div>
				
				<h5>📋 Liste des Kits</h5>
				<div class="items-margin-table">
					<div style="overflow-x: auto;">
						<table class="table table-bordered" style="min-width: 1200px; font-size: 12px;">
							<thead>
								<tr>
									<th style="min-width: 120px;">Code Kit</th>
									<th style="min-width: 200px;">Nom</th>
									<th style="width: 80px; text-align: center;">Composants</th>
									<th style="width: 100px; text-align: right;">Coût Total</th>
									<th style="width: 100px; text-align: right;">Prix Vente</th>
									<th style="width: 70px; text-align: center;">Marge %</th>
									<th style="width: 80px; text-align: center;">Statut</th>
									<th style="width: 100px; text-align: center;">Composants sans coût</th>
									<th style="width: 150px; text-align: center;">Actions</th>
								</tr>
							</thead>
							<tbody>
		`;

		data.bundles_analysis.forEach((bundle) => {
			const hasPrice = bundle.has_selling_price;
			const priceDisplay = hasPrice
				? format_currency(bundle.standard_selling_price)
				: "Non défini";
			const marginDisplay = hasPrice ? `${bundle.margin_percentage.toFixed(1)}%` : "-";
			const statusClass = hasPrice ? bundle.margin_status : "unknown";
			const statusLabel = hasPrice ? get_status_label_improved(bundle.margin_status) : "Pas de prix";

			// NOUVEAU : Afficher les composants sans coût
			const componentsWithoutCost = bundle.components_without_cost || 0;
			const totalComponents = bundle.components_count || 0;

			html += `
				<tr class="item-row ${statusClass}">
					<td style="min-width: 120px;">
						<strong>${bundle.item_code}</strong>
					</td>
					<td style="min-width: 200px;">
						${bundle.item_name}
					</td>
					<td style="width: 80px; text-align: center;">
						${totalComponents}
					</td>
					<td style="width: 100px; text-align: right;">
						${format_currency(bundle.total_cost)}
						${bundle.total_cost === 0 ? '<br><small style="color: orange;">⚠️ Coût = 0€</small>' : ""}
					</td>
					<td style="width: 100px; text-align: right;">
						${priceDisplay}
					</td>
					<td style="width: 70px; text-align: center;">
						<span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #f8f9fa;">${marginDisplay}</span>
					</td>
					<td style="width: 80px; text-align: center;">
						<span class="status-badge ${statusClass}" style="font-size: 10px; padding: 2px 4px;">${statusLabel}</span>
					</td>
					<td style="width: 100px; text-align: center;">
						${
							componentsWithoutCost > 0
								? `<span style="color: orange; font-size: 11px;">⚠️ ${componentsWithoutCost}/${totalComponents}</span>`
								: `<span style="color: green; font-size: 11px;">✅ Tous</span>`
						}
					</td>
					<td style="width: 150px; text-align: center;">
						<button class="btn btn-xs btn-info" onclick="window.analyze_bundle_item('${
							bundle.item_code
						}')" style="font-size: 10px; padding: 2px 6px; margin: 1px;">
							<i class="fa fa-search"></i> Analyser
						</button>
						<button class="btn btn-xs btn-secondary" onclick="window.view_item_details('${
							bundle.item_code
						}')" style="font-size: 10px; padding: 2px 6px; margin: 1px;">
							<i class="fa fa-external-link"></i> Ouvrir
						</button>
					</td>
				</tr>
			`;
		});

		html += `
					</tbody>
				</table>
			</div>
		</div>
		`;

		dialog.fields_dict.bundles_overview.$wrapper.html(html);

		dialog.$wrapper.find(".modal-dialog").css("max-width", "98vw");
		dialog.$wrapper.find(".table").css({
			"font-size": "12px",
			"margin-bottom": "0",
		});

		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue kits overview amélioré:", error);
	}
}

// FONCTIONS UTILITAIRES
function format_currency(amount) {
	try {
		return format_number(amount, null, 2) + " €";
	} catch (error) {
		return (amount || 0).toFixed(2) + " €";
	}
}

// FONCTIONS GLOBALES (pour les dialogues)
window.analyze_bundle_item = function (item_code) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.analyze_bundle_item",
			args: {
				item_code: item_code,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundle_analysis_dialog_improved(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse du kit"),
						});
					}
				} catch (error) {
					console.error("Erreur callback kit analysis global:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API kit analysis global:", err);
			},
		});
	} catch (error) {
		console.error("Erreur analyze_bundle_item global:", error);
	}
};

window.view_item_details = function (item_code) {
	try {
		frappe.set_route("Form", "Item", item_code);
	} catch (error) {
		console.error("Erreur ouverture article global:", error);
	}
};

function show_bundle_analysis_dialog_improved(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Analyse Kit - ") + data.item_code,
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "bundle_analysis",
				},
			],
		});

		let html = `
			<div class="margin-analysis">
				<div class="margin-card bundle-info">
					<h4>📦 Informations Kit</h4>
					<p><strong>Code article:</strong> ${data.item_code}</p>
					<p><strong>Nom:</strong> ${data.item_name}</p>
					<p><strong>Prix de vente standard:</strong> ${format_currency(
						data.standard_selling_price || 0
					)}</p>
					<p><strong>Coût total calculé:</strong> ${format_currency(data.total_cost || 0)}</p>
					<p><strong>Nombre de composants:</strong> ${data.components_count || 0}</p>
					<p><strong>Composants avec coût:</strong> ${data.components_with_cost || 0}</p>
					<p><strong>Composants sans coût:</strong> ${data.components_without_cost || 0}</p>
				</div>
		`;

		if (data.margin_info) {
			html += `
				<div class="margin-card ${data.margin_info.margin_status}">
					<h4>💰 Analyse de Marge</h4>
					<p><strong>Marge en montant:</strong> ${format_currency(data.margin_info.margin_amount)}</p>
					<p><strong>Taux de marge:</strong> <span class="margin-percentage">${data.margin_info.margin_percentage.toFixed(
						2
					)}%</span></p>
					<p><strong>Statut:</strong> <span class="status-badge ${
						data.margin_info.margin_status
					}">${get_status_label_improved(data.margin_info.margin_status)}</span></p>
				</div>
			`;
		}

		if (
			data.bundle_details &&
			data.bundle_details.components &&
			data.bundle_details.components.length > 0
		) {
			html += `
				<h5>🔧 Composants du Kit</h5>
				<div class="items-margin-table">
					<div style="overflow-x: auto;">
						<table class="table table-bordered" style="min-width: 900px; font-size: 12px;">
							<thead>
								<tr>
									<th style="min-width: 120px;">Code Composant</th>
									<th style="min-width: 180px;">Nom</th>
									<th style="width: 70px; text-align: center;">Quantité</th>
									<th style="width: 110px; text-align: right;">Prix d'achat Unit.</th>
									<th style="width: 100px; text-align: right;">Coût Total</th>
									<th style="width: 80px; text-align: center;">% du Total</th>
									<th style="width: 80px; text-align: center;">Statut</th>
								</tr>
							</thead>
							<tbody>
			`;

			data.bundle_details.components.forEach((component) => {
				const percentage =
					data.total_cost > 0 ? (component.total_cost / data.total_cost) * 100 : 0;
				const hasCost = component.has_cost || component.cost_price > 0;
				const statusIcon = hasCost ? "✅" : "⚠️";
				const statusText = hasCost ? "Avec coût" : "Sans coût";

				html += `
					<tr ${!hasCost ? 'style="background-color: #fff3cd;"' : ""}>
						<td style="min-width: 120px;">
							<strong>${component.item_code || "N/A"}</strong>
						</td>
						<td style="min-width: 180px;">
							${component.item_name || "Nom non disponible"}
						</td>
						<td style="width: 70px; text-align: center;">
							${component.qty || 0}
						</td>
						<td style="width: 110px; text-align: right;">
							${format_currency(component.cost_price || 0)}
						</td>
						<td style="width: 100px; text-align: right;">
							${format_currency(component.total_cost || 0)}
						</td>
						<td style="width: 80px; text-align: center;">
							<span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #f8f9fa;">${percentage.toFixed(
								1
							)}%</span>
						</td>
						<td style="width: 80px; text-align: center;">
							<span style="font-size: 10px;">${statusIcon} ${statusText}</span>
						</td>
					</tr>
				`;
			});

			html += `
					</tbody>
					<tfoot>
						<tr style="font-weight: bold; background-color: #f8f9fa;">
							<td colspan="4" style="text-align: right; padding-right: 10px;">TOTAL</td>
							<td style="width: 100px; text-align: right;">${format_currency(data.total_cost || 0)}</td>
							<td style="width: 80px; text-align: center;">100%</td>
							<td></td>
						</tr>
					</tfoot>
				</table>
			</div>
			</div>
			`;
		} else {
			html += `
				<div class="margin-card">
					<h5>⚠️ Composants non disponibles</h5>
					<p>Les détails des composants de ce kit ne sont pas disponibles.</p>
				</div>
			`;
		}

		html += `</div>`;

		dialog.fields_dict.bundle_analysis.$wrapper.html(html);

		dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
		dialog.$wrapper.find(".table").css({
			"font-size": "12px",
			"margin-bottom": "0",
		});

		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue kit analysis amélioré:", error);
	}
}