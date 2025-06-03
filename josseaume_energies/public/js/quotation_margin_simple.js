// NOUVELLE FONCTION globale pour analyze_bundle_item utilisée dans les dialogues
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
						show_bundle_analysis_dialog(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse du bundle"),
						});
					}
				} catch (error) {
					console.error("Erreur callback bundle analysis global:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API bundle analysis global:", err);
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: __("Erreur de connexion lors de l'analyse du bundle"),
				});
			},
		});
	} catch (error) {
		console.error("Erreur analyze_bundle_item global:", error);
	}
};

// NOUVELLE FONCTION globale pour view_item_details utilisée dans les dialogues
window.view_item_details = function (item_code) {
	try {
		frappe.set_route("Form", "Item", item_code);
	} catch (error) {
		console.error("Erreur ouverture article global:", error);
		frappe.msgprint({
			title: __("Erreur"),
			indicator: "red",
			message: __("Impossible d'ouvrir l'article"),
		});
	}
}; // josseaume_energies/public/js/quotation_margin_simple.js - VERSION CORRIGÉE

frappe.ui.form.on("Quotation", {
	refresh: function (frm) {
		// CORRECTION 1: Attendre que les boutons standards soient chargés AVANT d'ajouter les nôtres
		// Mais avec un délai plus court pour éviter les retards
		setTimeout(function () {
			try {
				// Ajouter les boutons de calcul de marge APRÈS un délai court
				add_margin_buttons(frm);

				// Afficher les indicateurs de marge si calculés
				display_margin_indicators(frm);

				// Vérifier la configuration au chargement (de manière non-bloquante)
				setTimeout(function () {
					check_setup_status(frm);
				}, 800);
			} catch (error) {
				console.error("Erreur dans les fonctions de marge (non-critique):", error);
				// Ne pas bloquer le reste de l'interface en cas d'erreur
			}
		}, 200); // Délai réduit de 500ms à 200ms
	},

	validate: function (frm) {
		// CORRECTION 2: Calculer automatiquement les marges de manière non-bloquante
		try {
			// Utiliser setTimeout pour ne pas bloquer la validation
			setTimeout(function () {
				calculate_quotation_margins(frm);
			}, 100);
		} catch (error) {
			console.error("Erreur calcul marge lors de la validation:", error);
			// Ne pas empêcher la sauvegarde
		}
	},
});

frappe.ui.form.on("Quotation Item", {
	item_code: function (frm, cdt, cdn) {
		// CORRECTION 3: Calcul non-bloquant avec gestion d'erreur
		setTimeout(function () {
			try {
				calculate_item_margin(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge article:", error);
			}
		}, 100);
	},

	rate: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge prix:", error);
			}
		}, 100);
	},

	qty: function (frm, cdt, cdn) {
		setTimeout(function () {
			try {
				calculate_item_margin(frm, cdt, cdn);
			} catch (error) {
				console.error("Erreur calcul marge quantité:", error);
			}
		}, 100);
	},
});

function add_margin_buttons(frm) {
	try {
		// CORRECTION 4: Vérifier que le formulaire est bien chargé (mais plus permissif)
		if (!frm || !frm.doc) {
			return;
		}

		// Pour les nouveaux devis non sauvegardés, afficher quand même certains boutons
		const isNewDoc = frm.doc.__islocal;

		// CORRECTION 5: Vérifications moins restrictives
		if (!frm.page) {
			console.log("Page pas encore prête, report de l'ajout des boutons marge");
			setTimeout(function () {
				add_margin_buttons(frm);
			}, 200);
			return;
		}

		// CORRECTION 6: Ajouter les boutons de marge dans un groupe séparé pour éviter les conflits
		const marginGroup = __("📊 Marges");

		// Pour les documents non sauvegardés, afficher seulement les boutons qui ne nécessitent pas la sauvegarde
		if (isNewDoc) {
			// Boutons qui fonctionnent même sur un nouveau document
			frm.add_custom_button(
				__("Gérer prix d'achat"),
				function () {
					show_valuation_manager(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Synchroniser prix d'achat"),
				function () {
					sync_valuations_from_purchases();
				},
				marginGroup
			);
		} else {
			// Pour les documents sauvegardés, afficher tous les boutons SAUF Calculer Marges
			frm.add_custom_button(
				__("Analyse détaillée"),
				function () {
					show_detailed_margin_dialog(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Analyser Kits"),
				function () {
					show_all_bundles_analysis();
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Gérer prix d'achat"),
				function () {
					show_valuation_manager(frm);
				},
				marginGroup
			);

			frm.add_custom_button(
				__("Synchroniser prix d'achat"),
				function () {
					sync_valuations_from_purchases();
				},
				marginGroup
			);
		}

		// CORRECTION 7: Le bouton bundles est maintenant ajouté directement dans le menu principal
		// Plus besoin de vérification supplémentaire
	} catch (error) {
		console.error("Erreur lors de l'ajout des boutons de marge:", error);
		// Continuer sans bloquer l'interface
	}
}

// NOUVELLE FONCTION: Vérifier et ajouter le bouton bundle si nécessaire
function check_and_add_bundle_button(frm, marginGroup) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						const setup = r.message;

						// Si il y a des bundles et que le bouton n'a pas encore été ajouté
						if (setup.total_bundles > 0 && !frm.custom_bundle_button_added) {
							console.log(
								`${setup.total_bundles} bundles détectés, ajout du bouton d'analyse`
							);
						}
					}
				} catch (error) {
					console.error("Erreur callback check bundle:", error);
				}
			},
			error: function (err) {
				// Ignorer silencieusement les erreurs de bundle
				console.log("Vérification bundles ignorée:", err);
			},
		});
	} catch (error) {
		console.log("Erreur vérification bundle (ignorée):", error);
	}
}

function calculate_quotation_margins(frm) {
	// CORRECTION 8: Protection moins restrictive
	if (!frm || !frm.doc) {
		return;
	}

	// Pour les nouveaux documents, ne pas calculer automatiquement
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
					update_margin_fields(frm, r.message);

					// Actualiser l'affichage
					display_margin_indicators(frm);
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

function calculate_item_margin(frm, cdt, cdn) {
	try {
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

						// Afficher un indicateur de marge (non-bloquant)
						setTimeout(function () {
							show_item_margin_indicator(item, data);
						}, 100);
					} else if (r.message && r.message.status === "warning") {
						// Article sans prix de valorisation (non-bloquant)
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

function update_margin_fields(frm, margin_data) {
	try {
		// CORRECTION 9: Vérifier l'existence des champs avant de les mettre à jour
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
	} catch (error) {
		console.error("Erreur mise à jour champs marge:", error);
	}
}

function display_margin_indicators(frm) {
	try {
		// CORRECTION 10: Protection contre les erreurs d'affichage
		if (!frm || !frm.dashboard) {
			return;
		}

		// Supprimer les anciens indicateurs de marge seulement
		// ÉVITER de supprimer TOUS les indicateurs car cela pourrait supprimer ceux d'ERPNext
		$('.indicator[title*="Marge"], .indicator[title*="Coût"]').remove();

		// Ajouter les nouveaux indicateurs selon les valeurs calculées
		const margin_percentage = frm.doc.custom_margin_percentage;
		const margin_status = frm.doc.custom_margin_status;

		if (margin_percentage !== undefined && margin_percentage !== null) {
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
	} catch (error) {
		console.error("Erreur affichage indicateurs:", error);
	}
}

function show_margin_analysis(frm) {
	try {
		if (!frm || !frm.doc) {
			frappe.msgprint(__("Erreur : formulaire non disponible"));
			return;
		}

		if (frm.doc.__islocal) {
			frappe.msgprint(__("Veuillez d'abord sauvegarder le devis"));
			return;
		}

		if (!frm.doc.name) {
			frappe.msgprint(__("Erreur : document sans nom"));
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
				try {
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
				} catch (error) {
					console.error("Erreur callback analyse marge:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API analyse marge:", err);
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: __("Erreur de connexion lors du calcul des marges"),
				});
			},
		});
	} catch (error) {
		console.error("Erreur show_margin_analysis:", error);
	}
}

// CORRECTION 11: Toutes les autres fonctions avec gestion d'erreur améliorée

function show_margin_summary_dialog(data) {
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

		// Générer le contenu HTML (code existant conservé mais dans un try-catch)
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
								<th>Type</th>
								<th>Qté</th>
								<th>Prix vente</th>
								<th>Prix valorisation</th>
								<th>Marge</th>
								<th>Taux</th>
								<th>Statut</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
		`;

		data.items_analysis.forEach((item) => {
			const isBundle = item.is_bundle || false;
			const bundleIcon = isBundle ? "📦" : "📄";
			const bundleLabel = isBundle ? "Bundle" : "Article";

			html += `
				<tr class="item-row ${item.margin_status}">
					<td><strong>${item.item_code}</strong><br><small>${item.item_name || ""}</small></td>
					<td><span style="font-size: 12px;">${bundleIcon} ${bundleLabel}</span></td>
					<td>${item.qty}</td>
					<td>${format_currency(item.rate)}</td>
					<td>${format_currency(item.cost_price)}</td>
					<td>${format_currency(item.margin_amount)}</td>
					<td><span class="margin-percentage">${item.margin_percentage.toFixed(1)}%</span></td>
					<td><span class="status-badge ${item.margin_status}">${get_status_label(
				item.margin_status
			)}</span></td>
					<td>
						${
							isBundle
								? `<button class="btn btn-xs btn-info" onclick="window.analyze_bundle_item('${item.item_code}')">
								<i class="fa fa-search"></i> Analyser Bundle
							</button>`
								: `<button class="btn btn-xs btn-secondary" onclick="window.view_item_details('${item.item_code}')">
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
	} catch (error) {
		console.error("Erreur création dialogue marge:", error);
		frappe.msgprint({
			title: __("Erreur"),
			indicator: "red",
			message: __("Erreur lors de l'affichage du dialogue"),
		});
	}
}

// Les autres fonctions restent identiques mais avec des try-catch similaires...
// (Je vais inclure quelques-unes des plus importantes avec les corrections)

function check_setup_status(frm) {
	try {
		// CORRECTION 12: Vérification non-bloquante
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						const setup = r.message;

						if (!setup.ready_for_use) {
							// Ne pas afficher d'avertissement automatiquement pour éviter de polluer l'interface
							console.log("Configuration marge incomplète:", setup);
						}

						// Gérer les bundles de manière silencieuse
						if (setup.total_bundles > 0) {
							console.log(
								`Bundles détectés: ${setup.total_bundles} total, ${setup.bundles_with_cost} avec coût`
							);
						}
					}
				} catch (error) {
					console.error("Erreur callback check_setup:", error);
				}
			},
			error: function (err) {
				// Ignorer silencieusement les erreurs de configuration
				console.log("Erreur check_setup (ignorée):", err);
			},
		});
	} catch (error) {
		console.log("Erreur générale check_setup (ignorée):", error);
	}
}

// Fonctions utilitaires (identiques à la version précédente)
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
	try {
		return format_number(amount, null, 2) + " €";
	} catch (error) {
		return (amount || 0).toFixed(2) + " €";
	}
}

function show_item_margin_indicator(item, margin_data) {
	try {
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
	} catch (error) {
		console.error("Erreur indicateur marge article:", error);
	}
}

function show_no_valuation_warning(item) {
	try {
		// Afficher un avertissement discret pour un article sans valorisation
		const row = $(`[data-fieldname="items"] [data-name="${item.name}"]`);
		if (row.length) {
			row.find(".valuation-warning").remove();
			row.find(".grid-row-check").after(
				'<span class="valuation-warning" style="color: orange; font-size: 10px;" title="Aucun prix de valorisation">⚠️</span>'
			);
		}
	} catch (error) {
		console.error("Erreur avertissement valorisation:", error);
	}
}

// CORRECTION FINALE: Ajouter les autres fonctions nécessaires avec gestion d'erreur...
function analyze_bundle_item(item_code) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.analyze_bundle_item",
			args: {
				item_code: item_code,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundle_analysis_dialog(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse du bundle"),
						});
					}
				} catch (error) {
					console.error("Erreur callback bundle:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API bundle:", err);
			},
		});
	} catch (error) {
		console.error("Erreur analyze_bundle_item:", error);
	}
}

function view_item_details(item_code) {
	try {
		frappe.set_route("Form", "Item", item_code);
	} catch (error) {
		console.error("Erreur ouverture article:", error);
		frappe.msgprint({
			title: __("Erreur"),
			indicator: "red",
			message: __("Impossible d'ouvrir l'article"),
		});
	}
}

// Autres fonctions simplifiées ou supprimées pour éviter les conflits...
function show_bundle_analysis_dialog(data) {
	try {
		// Version simplifiée pour éviter les erreurs
		frappe.msgprint({
			title: __("Analyse Bundle - ") + data.item_code,
			message: `
				<p><strong>Code:</strong> ${data.item_code}</p>
				<p><strong>Nom:</strong> ${data.item_name}</p>
				<p><strong>Composants:</strong> ${data.components_count}</p>
				<p><strong>Coût total:</strong> ${format_currency(data.total_cost)}</p>
			`,
		});
	} catch (error) {
		console.error("Erreur dialogue bundle:", error);
	}
}

function show_detailed_margin_dialog(frm) {
	try {
		if (!frm || !frm.doc) {
			frappe.msgprint(__("Erreur : formulaire non disponible"));
			return;
		}

		if (frm.doc.__islocal) {
			frappe.msgprint(__("Veuillez d'abord sauvegarder le devis"));
			return;
		}

		// Dialogue avec options avancées
		const dialog = new frappe.ui.Dialog({
			title: __("Gestion avancée des marges"),
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "actions_html",
					options: `
						<div class="margin-actions">
							<p>Actions disponibles pour l'analyse des marges :</p>
							<div style="text-align: center; padding: 20px;">
								<button class="btn btn-primary" style="margin: 5px;" onclick="recalculate_all_margins_advanced('${frm.doc.name}')">🔄 Recalculer les marges</button>
								<button class="btn btn-info" style="margin: 5px;" onclick="show_valuation_analysis_advanced()">📊 Analyse des valorisations</button>
								<button class="btn btn-warning" style="margin: 5px;" onclick="sync_all_valuations_advanced()">💰 Synchroniser valorisations</button>
								<button class="btn btn-success" style="margin: 5px;" onclick="show_margin_report_advanced('${frm.doc.name}')">📋 Rapport détaillé</button>
							</div>
						</div>
					`,
				},
			],
		});

		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue avancé:", error);
	}
}

// Actions globales pour le dialogue avancé
window.recalculate_all_margins_advanced = function (quotation_name) {
	try {
		frappe.show_alert("Recalcul en cours...", 3);

		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
			args: {
				quotation_name: quotation_name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					frappe.show_alert("Marges recalculées avec succès", 3);
					if (cur_frm) {
						cur_frm.reload_doc();
					}
				} else {
					frappe.msgprint(__("Erreur lors du recalcul"));
				}
			},
		});
	} catch (error) {
		console.error("Erreur recalcul:", error);
	}
};

window.show_valuation_analysis_advanced = function () {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.check_margin_setup",
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					const setup = r.message;
					frappe.msgprint({
						title: __("Analyse des valorisations"),
						size: "large",
						message: `
							<div style="padding: 20px;">
								<h4>📊 Statistiques Articles</h4>
								<p><strong>Articles totaux:</strong> ${setup.total_items}</p>
								<p><strong>Articles avec valorisation:</strong> ${setup.items_with_valuation}</p>
								<p><strong>Couverture:</strong> ${setup.valuation_coverage}</p>
								
								<hr>
								
								<h4>📦 Statistiques Bundles</h4>
								<p><strong>Bundles totaux:</strong> ${setup.total_bundles || 0}</p>
								<p><strong>Bundles avec coût calculable:</strong> ${setup.bundles_with_cost || 0}</p>
								<p><strong>Couverture bundles:</strong> ${setup.bundle_coverage || "0%"}</p>
								
								${
									setup.total_bundles > 0
										? `
									<div style="margin-top: 15px;">
										<button class="btn btn-primary" onclick="show_all_bundles_analysis_advanced()">
											<i class="fa fa-search"></i> Analyser tous les bundles
										</button>
									</div>
								`
										: ""
								}
							</div>
						`,
					});
				}
			},
		});
	} catch (error) {
		console.error("Erreur analyse valorisation:", error);
	}
};

window.sync_all_valuations_advanced = function () {
	sync_valuations_from_purchases();
};

window.show_margin_report_advanced = function (quotation_name) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.calculate_quotation_margin",
			args: {
				quotation_name: quotation_name,
			},
			callback: function (r) {
				if (r.message && r.message.status === "success") {
					show_margin_summary_dialog(r.message);
				} else {
					frappe.msgprint(__("Erreur lors de la génération du rapport"));
				}
			},
		});
	} catch (error) {
		console.error("Erreur rapport marge:", error);
	}
};

window.show_all_bundles_analysis_advanced = function () {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.get_all_bundles_analysis",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundles_overview_dialog(r.message);
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de l'analyse des bundles"),
						});
					}
				} catch (error) {
					console.error("Erreur callback bundles advanced:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API bundles advanced:", err);
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: __("Erreur de connexion lors de l'analyse des bundles"),
				});
			},
		});
	} catch (error) {
		console.error("Erreur bundles analysis advanced:", error);
	}
};

function show_valuation_manager(frm) {
	try {
		// Récupérer la liste des articles pour mise à jour des prix d'achat
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.export_items_for_valuation_update",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_valuation_dialog(r.message.items);
					} else {
						// Fallback : afficher un dialogue simple si l'API ne fonctionne pas
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
							`,
							primary_action: {
								label: __("Synchroniser Prix d'achat"),
								action: function () {
									sync_valuations_from_purchases();
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
				// Afficher quand même le dialogue de base
				frappe.msgprint({
					title: __("Gestionnaire des prix d'achat"),
					message: __(
						"Fonctionnalité en cours de développement. Utilisez Stock > Article pour modifier les prix d'achat."
					),
				});
			},
		});
	} catch (error) {
		console.error("Erreur gestionnaire prix d'achat:", error);
	}
}

function show_valuation_dialog(items) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Gestionnaire des prix d'achat"),
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
	} catch (error) {
		console.error("Erreur dialogue prix d'achat:", error);
		frappe.msgprint(__("Erreur lors de l'affichage du gestionnaire"));
	}
}

function generate_valuation_manager_html(items) {
	try {
		let html = `
			<div class="valuation-manager">
				<p>Gérez les prix d'achat de vos articles :</p>
				<div style="max-height: 400px; overflow-y: auto;">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Article</th>
								<th>Nom</th>
								<th>Prix d'achat actuel</th>
								<th>Prix vente standard</th>
								<th>Nouveau prix d'achat</th>
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
	} catch (error) {
		console.error("Erreur génération HTML:", error);
		return "<p>Erreur lors de la génération du contenu</p>";
	}
}

function update_valuations_from_dialog(dialog) {
	try {
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

function sync_valuations_from_purchases() {
	try {
		frappe.confirm(
			__("Synchroniser les prix d'achat depuis les derniers achats ?"),
			function () {
				frappe.call({
					method: "josseaume_energies.margin_calculation_simple.sync_valuation_from_last_purchase",
					callback: function (r) {
						try {
							if (r.message && r.message.status === "success") {
								frappe.show_alert(r.message.message, 5);
							} else {
								frappe.msgprint({
									title: __("Erreur"),
									indicator: "red",
									message: r.message
										? r.message.message
										: __("Erreur de synchronisation"),
								});
							}
						} catch (error) {
							console.error("Erreur callback sync:", error);
						}
					},
					error: function (err) {
						console.error("Erreur API sync:", err);
					},
				});
			}
		);
	} catch (error) {
		console.error("Erreur sync_valuations:", error);
	}
}

function show_all_bundles_analysis() {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.get_all_bundles_analysis",
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundles_overview_dialog(r.message);
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
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: __("Erreur de connexion lors de l'analyse des kits"),
				});
			},
		});
	} catch (error) {
		console.error("Erreur show_all_bundles_analysis:", error);
	}
}

function show_bundles_overview_dialog(data) {
	try {
		const dialog = new frappe.ui.Dialog({
			title: __("Vue d'ensemble des Kits"),
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
					<div class="col-md-4">
						<div class="margin-card excellent">
							<h4>📦 Kits Total</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.total_bundles}</p>
						</div>
					</div>
					<div class="col-md-4">
						<div class="margin-card good">
							<h4>💰 Avec Prix</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.bundles_with_price}</p>
						</div>
					</div>
					<div class="col-md-4">
						<div class="margin-card acceptable">
							<h4>🔧 Avec Coût</h4>
							<p style="font-size: 24px; font-weight: bold; text-align: center;">${data.bundles_with_cost}</p>
						</div>
					</div>
				</div>
				
				<h5>📋 Liste des Kits</h5>
				<div class="items-margin-table">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Code Kit</th>
								<th>Nom</th>
								<th>Composants</th>
								<th>Coût Total</th>
								<th>Prix Vente</th>
								<th>Marge %</th>
								<th>Statut</th>
								<th>Actions</th>
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
			const statusLabel = hasPrice ? get_status_label(bundle.margin_status) : "Pas de prix";

			html += `
				<tr class="item-row ${statusClass}">
					<td><strong>${bundle.item_code}</strong></td>
					<td>${bundle.item_name}</td>
					<td style="text-align: center;">${bundle.components_count}</td>
					<td>${format_currency(bundle.total_cost)}</td>
					<td>${priceDisplay}</td>
					<td>${marginDisplay}</td>
					<td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
					<td>
						<button class="btn btn-xs btn-info" onclick="window.analyze_bundle_item('${bundle.item_code}')">
							<i class="fa fa-search"></i> Analyser
						</button>
						<button class="btn btn-xs btn-secondary" onclick="window.view_item_details('${bundle.item_code}')">
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
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue kits overview:", error);
		frappe.msgprint({
			title: __("Erreur"),
			indicator: "red",
			message: __("Erreur lors de l'affichage du dialogue"),
		});
	}
}

function analyze_bundle_item(item_code) {
	try {
		frappe.call({
			method: "josseaume_energies.margin_calculation_simple.analyze_bundle_item",
			args: {
				item_code: item_code,
			},
			callback: function (r) {
				try {
					if (r.message && r.message.status === "success") {
						show_bundle_analysis_dialog(r.message);
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
					console.error("Erreur callback kit analysis:", error);
				}
			},
			error: function (err) {
				console.error("Erreur API kit analysis:", err);
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: __("Erreur de connexion lors de l'analyse du kit"),
				});
			},
		});
	} catch (error) {
		console.error("Erreur analyze_bundle_item:", error);
	}
}

function show_bundle_analysis_dialog(data) {
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
					}">${get_status_label(data.margin_info.margin_status)}</span></p>
				</div>
			`;
		}

		// CORRECTION IMPORTANTE : Vérifier que bundle_details existe
		if (
			data.bundle_details &&
			data.bundle_details.components &&
			data.bundle_details.components.length > 0
		) {
			html += `
				<h5>🔧 Composants du Kit</h5>
				<div class="items-margin-table">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>Code Composant</th>
								<th>Nom</th>
								<th>Quantité</th>
								<th>Prix d'achat Unitaire</th>
								<th>Coût Total</th>
								<th>% du Total</th>
							</tr>
						</thead>
						<tbody>
			`;

			data.bundle_details.components.forEach((component) => {
				const percentage =
					data.total_cost > 0 ? (component.total_cost / data.total_cost) * 100 : 0;

				html += `
					<tr>
						<td><strong>${component.item_code || "N/A"}</strong></td>
						<td>${component.item_name || "Nom non disponible"}</td>
						<td>${component.qty || 0}</td>
						<td>${format_currency(component.cost_price || 0)}</td>
						<td>${format_currency(component.total_cost || 0)}</td>
						<td>${percentage.toFixed(1)}%</td>
					</tr>
				`;
			});

			html += `
					</tbody>
					<tfoot>
						<tr style="font-weight: bold; background-color: #f8f9fa;">
							<td colspan="4">TOTAL</td>
							<td>${format_currency(data.total_cost || 0)}</td>
							<td>100%</td>
						</tr>
					</tfoot>
				</table>
			</div>
			`;
		} else {
			html += `
				<div class="margin-card">
					<h5>⚠️ Composants non disponibles</h5>
					<p>Les détails des composants de ce kit ne sont pas disponibles.</p>
					<p>Cela peut être dû à :</p>
					<ul>
						<li>Kit non configuré correctement</li>
						<li>Composants sans prix d'achat</li>
						<li>Problème de configuration des Product Bundle</li>
					</ul>
				</div>
			`;
		}

		html += `</div>`;

		dialog.fields_dict.bundle_analysis.$wrapper.html(html);
		dialog.show();
	} catch (error) {
		console.error("Erreur dialogue kit analysis:", error);
		frappe.msgprint({
			title: __("Erreur"),
			indicator: "red",
			message: __("Erreur lors de l'affichage de l'analyse du kit"),
		});
	}
}
