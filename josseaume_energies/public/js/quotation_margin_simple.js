// josseaume_energies/public/js/quotation_margin_simple.js

frappe.ui.form.on("Quotation", {
	refresh: function (frm) {
		// Ajouter les boutons de calcul de marge
		add_margin_buttons(frm);

		// Afficher les indicateurs de marge si calculés
		display_margin_indicators(frm);

		// Vérifier la configuration au chargement
		check_setup_status(frm);
	},

	validate: function (frm) {
		// Calculer automatiquement les marges avant sauvegarde
		calculate_quotation_margins(frm);
	},
});

frappe.ui.form.on("Quotation Item", {
	item_code: function (frm, cdt, cdn) {
		// Calculer la marge quand un article est sélectionné
		calculate_item_margin(frm, cdt, cdn);
	},

	rate: function (frm, cdt, cdn) {
		// Recalculer la marge quand le prix change
		calculate_item_margin(frm, cdt, cdn);
	},

	qty: function (frm, cdt, cdn) {
		// Recalculer la marge quand la quantité change
		calculate_item_margin(frm, cdt, cdn);
	},
});

function add_margin_buttons(frm) {
	// Bouton principal pour calculer les marges
	frm.add_custom_button(__("🔍 Calculer Marges"), function () {
		show_margin_analysis(frm);
	}).addClass("btn-info");

	// Boutons dans le groupe Actions
	frm.add_custom_button(
		__("Analyse détaillée des marges"),
		function () {
			show_detailed_margin_dialog(frm);
		},
		__("Actions")
	);

	// Bouton pour gérer les prix de valorisation
	frm.add_custom_button(
		__("Gérer prix de valorisation"),
		function () {
			show_valuation_manager(frm);
		},
		__("Actions")
	);

	// Bouton pour synchroniser les valorisations
	frm.add_custom_button(
		__("Synchroniser valorisations"),
		function () {
			sync_valuations_from_purchases();
		},
		__("Actions")
	);
}

function calculate_quotation_margins(frm) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
		args: {
			quotation_name: frm.doc.name,
		},
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				// Mettre à jour les champs du formulaire
				update_margin_fields(frm, r.message);

				// Actualiser l'affichage
				display_margin_indicators(frm);
			}
		},
	});
}

function calculate_item_margin(frm, cdt, cdn) {
	const item = locals[cdt][cdn];

	if (!item.item_code || !item.rate) {
		return;
	}

	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.calculate_item_margin",
		args: {
			item_code: item.item_code,
			selling_price: item.rate,
			qty: item.qty || 1,
		},
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				// Mettre à jour les champs personnalisés de l'article
				const data = r.message;

				if (frappe.meta.has_field(cdt, "custom_cost_price")) {
					frappe.model.set_value(cdt, cdn, "custom_cost_price", data.cost_price);
				}
				if (frappe.meta.has_field(cdt, "custom_margin_amount")) {
					frappe.model.set_value(cdt, cdn, "custom_margin_amount", data.margin_amount);
				}
				if (frappe.meta.has_field(cdt, "custom_margin_percentage")) {
					frappe.model.set_value(
						cdt,
						cdn,
						"custom_margin_percentage",
						data.margin_percentage
					);
				}

				// Afficher un indicateur de marge
				show_item_margin_indicator(item, data);
			} else if (r.message && r.message.status === "warning") {
				// Article sans prix de valorisation
				console.warn(`Article ${item.item_code}: ${r.message.message}`);
				show_no_valuation_warning(item);
			}
		},
	});
}

function update_margin_fields(frm, margin_data) {
	// Mettre à jour les champs personnalisés du devis
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
}

function display_margin_indicators(frm) {
	// Supprimer les anciens indicateurs
	frm.dashboard.clear_indicator();

	// Ajouter les nouveaux indicateurs selon les valeurs calculées
	const margin_percentage = frm.doc.custom_margin_percentage;
	const margin_status = frm.doc.custom_margin_status;

	if (margin_percentage !== undefined) {
		let color = "grey";
		let label = `Marge: ${margin_percentage.toFixed(1)}%`;

		switch (margin_status) {
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

	// Ajouter d'autres indicateurs utiles
	if (frm.doc.custom_total_cost) {
		frm.dashboard.add_indicator(
			__(`Coût total: ${format_currency(frm.doc.custom_total_cost)}`),
			"grey"
		);
	}
}

function show_margin_analysis(frm) {
	if (!frm.doc.name || frm.doc.__islocal) {
		frappe.msgprint(__("Veuillez d'abord sauvegarder le devis"));
		return;
	}

	frappe.show_alert(
		{
			message: __("Calcul des marges en cours..."),
			indicator: "blue",
		},
		3
	);

	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
		args: {
			quotation_name: frm.doc.name,
		},
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				show_margin_summary_dialog(r.message);
			} else {
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: r.message
						? r.message.message
						: __("Erreur lors du calcul des marges"),
				});
			}
		},
	});
}

function show_margin_summary_dialog(data) {
	const dialog = new frappe.ui.Dialog({
		title: __("Analyse des marges - ") + data.quotation_name,
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "margin_summary",
			},
		],
	});

	// Générer le contenu HTML
	let html = `
		<div class="margin-analysis">
			<div class="row">
				<div class="col-md-6">
					<div class="margin-card global-margin ${data.global_margin_status}">
						<h4>📊 Résumé Global</h4>
						<p><strong>Total vente:</strong> ${format_currency(data.total_selling)}</p>
						<p><strong>Total coût:</strong> ${format_currency(data.total_cost)}</p>
						<p><strong>Marge:</strong> ${format_currency(data.global_margin_amount)}</p>
						<p><strong>Taux de marge:</strong> <span class="margin-percentage">${data.global_margin_percentage.toFixed(
							2
						)}%</span></p>
						<p><strong>Statut:</strong> <span class="status-badge ${
							data.global_margin_status
						}">${get_status_label(data.global_margin_status)}</span></p>
					</div>
				</div>
				<div class="col-md-6">
					<div class="margin-tips">
						<h5>💡 Recommandations</h5>
						${get_margin_recommendations(data.global_margin_percentage)}
					</div>
				</div>
			</div>
			
			<hr>
			
			<h5>📋 Détail par article (${data.items_count} articles)</h5>
			<div class="items-margin-table">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Article</th>
							<th>Qté</th>
							<th>Prix vente</th>
							<th>Prix valorisation</th>
							<th>Marge</th>
							<th>Taux</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
	`;

	data.items_analysis.forEach((item) => {
		html += `
			<tr class="item-row ${item.margin_status}">
				<td><strong>${item.item_code}</strong><br><small>${item.item_name || ""}</small></td>
				<td>${item.qty}</td>
				<td>${format_currency(item.rate)}</td>
				<td>${format_currency(item.cost_price)}</td>
				<td>${format_currency(item.margin_amount)}</td>
				<td><span class="margin-percentage">${item.margin_percentage.toFixed(1)}%</span></td>
				<td><span class="status-badge ${item.margin_status}">${get_status_label(
			item.margin_status
		)}</span></td>
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
}

function show_valuation_manager(frm) {
	// Gestionnaire des prix de valorisation
	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update",
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				show_valuation_dialog(r.message.items);
			}
		},
	});
}

function show_valuation_dialog(items) {
	const dialog = new frappe.ui.Dialog({
		title: __("Gestionnaire des prix de valorisation"),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "valuation_manager",
				options: generate_valuation_manager_html(items),
			},
		],
		primary_action_label: __("Mettre à jour"),
		primary_action: function () {
			update_valuations_from_dialog(dialog);
		},
	});

	dialog.show();
}

function generate_valuation_manager_html(items) {
	let html = `
		<div class="valuation-manager">
			<p>Gérez les prix de valorisation de vos articles :</p>
			<div style="max-height: 400px; overflow-y: auto;">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Article</th>
							<th>Nom</th>
							<th>Prix valorisation actuel</th>
							<th>Prix vente standard</th>
							<th>Nouveau prix valorisation</th>
						</tr>
					</thead>
					<tbody>
	`;

	items.forEach((item) => {
		html += `
			<tr>
				<td>${item.item_code}</td>
				<td>${item.item_name || ""}</td>
				<td>${format_currency(item.valuation_rate || 0)}</td>
				<td>${format_currency(item.standard_rate || 0)}</td>
				<td><input type="number" class="form-control valuation-input" data-item="${
					item.item_code
				}" step="0.01" value="${item.valuation_rate || 0}"></td>
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
}

function update_valuations_from_dialog(dialog) {
	const items_data = [];

	dialog.$wrapper.find(".valuation-input").each(function () {
		const item_code = $(this).data("item");
		const valuation_rate = $(this).val();

		if (item_code && valuation_rate) {
			items_data.push({
				item_code: item_code,
				valuation_rate: parseFloat(valuation_rate),
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
				if (r.message && r.message.status === "success") {
					frappe.show_alert(
						`${r.message.updated_count} prix de valorisation mis à jour`,
						3
					);
					dialog.hide();
				}
			},
		});
	}
}

function sync_valuations_from_purchases() {
	frappe.confirm(
		__("Synchroniser les prix de valorisation depuis les derniers achats ?"),
		function () {
			frappe.call({
				method: "josseaume_energies.margin_calculation_simple.sync_valuation_from_last_purchase",
				callback: function (r) {
					if (r.message && r.message.status === "success") {
						frappe.show_alert(r.message.message, 5);
						frappe.msgprint({
							title: __("Synchronisation terminée"),
							indicator: "green",
							message: r.message.message,
						});
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur de synchronisation"),
						});
					}
				},
			});
		}
	);
}

function check_setup_status(frm) {
	// Vérifier la configuration au chargement
	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				const setup = r.message;

				if (!setup.ready_for_use) {
					show_setup_warning(setup);
				} else if (setup.items_with_valuation === 0) {
					show_valuation_warning();
				}
			}
		},
	});
}

function show_setup_warning(setup) {
	let message = "Configuration du calcul de marge incomplète:<br>";

	if (setup.quotation_fields_missing.length > 0) {
		message += `• Champs Devis manquants: ${setup.quotation_fields_missing.join(", ")}<br>`;
	}

	if (setup.quotation_item_fields_missing.length > 0) {
		message += `• Champs Articles manquants: ${setup.quotation_item_fields_missing.join(
			", "
		)}<br>`;
	}

	message += "<br>Veuillez créer les champs personnalisés nécessaires.";

	frappe.msgprint({
		title: __("Configuration requise"),
		indicator: "orange",
		message: message,
	});
}

function show_valuation_warning() {
	frappe.msgprint({
		title: __("Aucun prix de valorisation"),
		indicator: "orange",
		message: __(
			"Aucun article n'a de prix de valorisation défini. Utilisez 'Synchroniser valorisations' ou définissez les prix manuellement dans Stock > Article."
		),
	});
}

function show_no_valuation_warning(item) {
	// Afficher un avertissement discret pour un article sans valorisation
	const row = $(`[data-fieldname="items"] [data-name="${item.name}"]`);
	if (row.length) {
		row.find(".valuation-warning").remove();
		row.find(".grid-row-check").after(
			'<span class="valuation-warning" style="color: orange; font-size: 10px;" title="Aucun prix de valorisation">⚠️</span>'
		);
	}
}

// Fonctions utilitaires (identiques à la version complète)
function get_status_label(status) {
	const labels = {
		excellent: "✨ Excellent",
		good: "👍 Bon",
		acceptable: "⚠️ Acceptable",
		low: "⚠️ Faible",
		negative: "❌ Négatif",
	};
	return labels[status] || status;
}

function get_margin_recommendations(margin_percentage) {
	if (margin_percentage >= 30) {
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

function format_currency(amount) {
	return format_number(amount, null, 2) + " €";
}

function show_item_margin_indicator(item, margin_data) {
	// Afficher un petit indicateur de marge à côté de l'article
	const row = $(`[data-fieldname="items"] [data-name="${item.name}"]`);
	if (row.length) {
		row.find(".margin-indicator").remove(); // Supprimer l'ancien

		let indicator_class = `margin-indicator ${margin_data.margin_status}`;
		let indicator_html = `<span class="${indicator_class}" title="Marge: ${margin_data.margin_percentage.toFixed(
			1
		)}%">${margin_data.margin_percentage.toFixed(1)}%</span>`;

		row.find(".grid-row-check").after(indicator_html);
	}
}

function show_detailed_margin_dialog(frm) {
	// Dialogue avec options avancées
	const dialog = new frappe.ui.Dialog({
		title: __("Gestion avancée des marges"),
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "actions_html",
				options: `
					<div class="margin-actions">
						<p>Actions disponibles :</p>
						<button class="btn btn-primary" onclick="recalculate_all_margins()">🔄 Recalculer les marges</button>
						<button class="btn btn-info" onclick="show_valuation_analysis()">📊 Analyse des valorisations</button>
						<button class="btn btn-warning" onclick="sync_all_valuations()">💰 Synchroniser toutes les valorisations</button>
					</div>
				`,
			},
		],
	});

	dialog.show();
}

// Actions globales
function recalculate_all_margins() {
	frappe.show_alert("Recalcul en cours...", 3);
	cur_frm.trigger("validate");
}

function show_valuation_analysis() {
	frappe.call({
		method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				const setup = r.message;
				frappe.msgprint({
					title: __("Analyse des valorisations"),
					message: `
						<p><strong>Articles totaux:</strong> ${setup.total_items}</p>
						<p><strong>Articles avec valorisation:</strong> ${setup.items_with_valuation}</p>
						<p><strong>Couverture:</strong> ${setup.valuation_coverage}</p>
					`,
				});
			}
		},
	});
}

function sync_all_valuations() {
	sync_valuations_from_purchases();
}
