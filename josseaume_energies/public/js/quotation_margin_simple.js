// josseaume_energies/public/js/quotation_margin_simple.js - VERSION CORRIGÉE

frappe.ui.form.on("Quotation", {
	refresh: function (frm) {
		// CORRECTION 1: Attendre que les boutons standards soient chargés AVANT d'ajouter les nôtres
		setTimeout(function () {
			try {
				// Ajouter les boutons de calcul de marge APRÈS un délai
				add_margin_buttons(frm);

				// Afficher les indicateurs de marge si calculés
				display_margin_indicators(frm);

				// Vérifier la configuration au chargement (de manière non-bloquante)
				setTimeout(function () {
					check_setup_status(frm);
				}, 1000);
			} catch (error) {
				console.error("Erreur dans les fonctions de marge (non-critique):", error);
				// Ne pas bloquer le reste de l'interface en cas d'erreur
			}
		}, 500); // Délai pour laisser ERPNext charger ses boutons d'abord
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
		// CORRECTION 4: Vérifier que le formulaire est bien chargé
		if (!frm || !frm.doc || frm.doc.__islocal) {
			return; // Ne pas ajouter de boutons si le formulaire n'est pas encore sauvegardé
		}

		// CORRECTION 5: Vérifier que les boutons standards existent avant d'ajouter les nôtres
		// Attendre que la toolbar soit présente
		if (!frm.toolbar || !frm.page.btn_group) {
			console.log("Toolbar pas encore prête, report de l'ajout des boutons marge");
			return;
		}

		// CORRECTION 6: Ajouter les boutons de marge dans un groupe séparé pour éviter les conflits
		const marginGroup = __("📊 Marges");

		// Bouton principal DANS le groupe pour éviter les conflits avec les boutons principaux
		frm.add_custom_button(
			__("Calculer Marges"),
			function () {
				show_margin_analysis(frm);
			},
			marginGroup // IMPORTANT: Dans un groupe séparé
		);

		// Autres boutons dans le groupe Marges
		frm.add_custom_button(
			__("Analyse détaillée"),
			function () {
				show_detailed_margin_dialog(frm);
			},
			marginGroup
		);

		frm.add_custom_button(
			__("Gérer valorisations"),
			function () {
				show_valuation_manager(frm);
			},
			marginGroup
		);

		frm.add_custom_button(
			__("Synchroniser valorisations"),
			function () {
				sync_valuations_from_purchases();
			},
			marginGroup
		);

		// CORRECTION 7: Analyse des bundles dans le groupe Marges aussi
		// Vérifier s'il y a des bundles avant d'ajouter le bouton
		setTimeout(function () {
			check_and_add_bundle_button(frm, marginGroup);
		}, 500);
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
				if (r.message && r.message.status === "success") {
					const setup = r.message;

					if (setup.total_bundles > 0 && !frm.custom_bundle_button_added) {
						frm.add_custom_button(
							__("Analyser Bundles"),
							function () {
								show_all_bundles_analysis();
							},
							marginGroup // Dans le groupe Marges
						);
						frm.custom_bundle_button_added = true;
					}
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
	// CORRECTION 8: Protection supplémentaire
	if (!frm || !frm.doc || !frm.doc.name || frm.doc.__islocal) {
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
								? `<button class="btn btn-xs btn-info" onclick="analyze_bundle_item('${item.item_code}')">
								<i class="fa fa-search"></i> Analyser Bundle
							</button>`
								: `<button class="btn btn-xs btn-secondary" onclick="view_item_details('${item.item_code}')">
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
	// Version simplifiée pour éviter les conflits
	show_margin_analysis(frm);
}

function show_valuation_manager(frm) {
	try {
		frappe.msgprint({
			title: __("Gestionnaire de valorisation"),
			message: __(
				"Fonctionnalité en cours de développement. Utilisez Stock > Article pour modifier les prix de valorisation."
			),
		});
	} catch (error) {
		console.error("Erreur gestionnaire valorisation:", error);
	}
}

function sync_valuations_from_purchases() {
	try {
		frappe.confirm(
			__("Synchroniser les prix de valorisation depuis les derniers achats ?"),
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
		frappe.msgprint({
			title: __("Analyse des Bundles"),
			message: __("Fonctionnalité d'analyse globale des bundles en cours de développement."),
		});
	} catch (error) {
		console.error("Erreur analyse bundles:", error);
	}
}
