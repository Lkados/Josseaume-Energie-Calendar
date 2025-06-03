// josseaume_energies/public/js/quotation_columns.js - VERSION CORRIGÉE

frappe.ui.form.on("Quotation", {
	onload: function (frm) {
		// Configuration au chargement initial
		setTimeout(() => {
			try {
				setup_quotation_columns_robust(frm);
			} catch (error) {
				console.error("Erreur configuration colonnes onload:", error);
			}
		}, 800); // Délai augmenté pour s'assurer que tout est chargé
	},

	refresh: function (frm) {
		// Configuration au rafraîchissement avec plusieurs tentatives
		setTimeout(() => {
			try {
				setup_quotation_columns_robust(frm);
			} catch (error) {
				console.error("Erreur configuration colonnes refresh:", error);
			}
		}, 600);

		// Tentative de sauvegarde si la première échoue
		setTimeout(() => {
			try {
				if (!frm._columns_configured) {
					setup_quotation_columns_robust(frm);
				}
			} catch (error) {
				console.error("Erreur configuration colonnes refresh (2e tentative):", error);
			}
		}, 1200);
	},

	// NOUVEAU : Configuration quand la table items est actualisée
	items_on_form_rendered: function (frm) {
		setTimeout(() => {
			try {
				setup_quotation_columns_robust(frm);
			} catch (error) {
				console.error("Erreur configuration colonnes form_rendered:", error);
			}
		}, 200);
	},
});

// Écouteur pour les changements de table items
frappe.ui.form.on("Quotation Item", {
	form_render: function (frm, cdt, cdn) {
		setTimeout(() => {
			try {
				setup_quotation_columns_robust(frm);
			} catch (error) {
				console.error("Erreur configuration colonnes item form_render:", error);
			}
		}, 300);
	},
});

function setup_quotation_columns_robust(frm) {
	try {
		// Vérifier que le formulaire est bien chargé
		if (!frm || !frm.fields_dict || !frm.fields_dict.items) {
			console.log("Formulaire ou table items pas encore prêt");
			return false;
		}

		const items_field = frm.fields_dict.items;
		if (!items_field.grid) {
			console.log("Grid pas encore initialisé");
			return false;
		}

		// Éviter les configurations multiples
		if (frm._columns_configured) {
			console.log("Colonnes déjà configurées");
			return true;
		}

		console.log("🔧 Configuration des colonnes de devis...");

		// Configuration robuste des colonnes
		const success = configure_items_table_columns(frm);

		if (success) {
			frm._columns_configured = true;
			console.log("✅ Configuration des colonnes réussie");

			// Sauvegarder la configuration
			save_columns_configuration(frm);
		}

		return success;
	} catch (error) {
		console.error("Erreur générale configuration colonnes:", error);
		return false;
	}
}

function configure_items_table_columns(frm) {
	try {
		const grid_field = frm.fields_dict.items;
		const grid = grid_field.grid;

		if (!grid || !grid.docfields) {
			console.log("Docfields non disponibles");
			return false;
		}

		// CONFIGURATION STANDARD AMÉLIORÉE
		const COLUMNS_CONFIG = {
			// Colonnes principales toujours visibles
			item_code: { columns: 2, in_list_view: 1, reqd: 1 },
			description: { columns: 3, in_list_view: 1 },
			qty: { columns: 1, in_list_view: 1, reqd: 1 },
			rate: { columns: 1, in_list_view: 1, reqd: 1 },
			amount: { columns: 1, in_list_view: 1, read_only: 1 },

			// Colonnes importantes mais optionnelles
			item_tax_template: { columns: 2, in_list_view: 1 },
			delivery_date: { columns: 1, in_list_view: 1 },

			// Colonnes de marge (si disponibles)
			custom_cost_price: { columns: 1, in_list_view: 1, read_only: 1 },
			custom_margin_percentage: { columns: 1, in_list_view: 1, read_only: 1 },

			// Colonnes à masquer
			base_rate: { in_list_view: 0 },
			base_amount: { in_list_view: 0 },
			discount_percentage: { in_list_view: 0 },
			discount_amount: { in_list_view: 0 },
			net_rate: { in_list_view: 0 },
			net_amount: { in_list_view: 0 },
			pricing_rules: { in_list_view: 0 },
			item_group: { in_list_view: 0 },
			brand: { in_list_view: 0 },
			image: { in_list_view: 0 },
		};

		// Appliquer la configuration
		let configured_count = 0;

		grid.docfields.forEach((field) => {
			const config = COLUMNS_CONFIG[field.fieldname];

			if (config) {
				// Appliquer la configuration définie
				Object.keys(config).forEach((key) => {
					field[key] = config[key];
				});
				configured_count++;

				console.log(`✓ Configuré: ${field.fieldname}`);
			} else {
				// Pour les champs non définis, les masquer par défaut sauf exceptions
				const always_visible = ["idx", "docstatus"];
				if (!always_visible.includes(field.fieldname)) {
					field.in_list_view = 0;
				}
			}
		});

		console.log(`📊 ${configured_count} colonnes configurées`);

		// Forcer la reconstruction de la grille
		if (grid.setup_columns) {
			grid.setup_columns();
		}

		// Actualiser l'en-tête
		if (grid.refresh_header) {
			grid.refresh_header();
		}

		// Actualiser l'affichage
		if (grid.refresh) {
			setTimeout(() => {
				grid.refresh();
			}, 100);
		}

		return true;
	} catch (error) {
		console.error("Erreur configuration table items:", error);
		return false;
	}
}

function save_columns_configuration(frm) {
	try {
		// Sauvegarder dans localStorage pour persistance
		const config_key = `quotation_columns_${frappe.session.user}`;
		const config_data = {
			timestamp: Date.now(),
			configured: true,
			user: frappe.session.user,
		};

		localStorage.setItem(config_key, JSON.stringify(config_data));

		// NOUVEAU : Sauvegarder côté serveur via les User Settings
		frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "User",
				name: frappe.session.user,
				fieldname: "custom_quotation_columns_configured",
				value: 1,
			},
			callback: function (r) {
				if (r.message) {
					console.log("💾 Configuration colonnes sauvegardée côté serveur");
				}
			},
			error: function (err) {
				// Ignorer les erreurs de sauvegarde côté serveur
				console.log("Note: sauvegarde côté serveur optionnelle non disponible");
			},
		});
	} catch (error) {
		console.error("Erreur sauvegarde configuration:", error);
	}
}

// NOUVELLE FONCTION : Vérifier si les champs de marge existent
function check_margin_fields_availability() {
	const margin_fields = [
		"custom_cost_price",
		"custom_margin_amount",
		"custom_margin_percentage",
	];

	const available_fields = [];

	margin_fields.forEach((field) => {
		if (frappe.meta.has_field("Quotation Item", field)) {
			available_fields.push(field);
		}
	});

	console.log(
		`📋 Champs de marge disponibles: ${available_fields.length}/${margin_fields.length}`
	);
	return available_fields;
}

// NOUVELLE FONCTION : Configuration adaptative selon les champs disponibles
function setup_adaptive_columns_config(frm) {
	try {
		const available_margin_fields = check_margin_fields_availability();

		// Configuration de base
		let config = {
			item_code: { columns: 2, in_list_view: 1 },
			description: { columns: 3, in_list_view: 1 },
			qty: { columns: 1, in_list_view: 1 },
			rate: { columns: 1, in_list_view: 1 },
			amount: { columns: 1, in_list_view: 1 },
		};

		// Ajouter les champs de marge si disponibles
		if (available_margin_fields.includes("custom_cost_price")) {
			config.custom_cost_price = { columns: 1, in_list_view: 1, read_only: 1 };
		}

		if (available_margin_fields.includes("custom_margin_percentage")) {
			config.custom_margin_percentage = { columns: 1, in_list_view: 1, read_only: 1 };
		}

		return config;
	} catch (error) {
		console.error("Erreur configuration adaptative:", error);
		return null;
	}
}

// NOUVELLE FONCTION : Diagnostic des problèmes de colonnes
function diagnose_columns_issues(frm) {
	try {
		const diagnosis = {
			form_ready: !!frm,
			items_field: !!frm?.fields_dict?.items,
			grid_available: !!frm?.fields_dict?.items?.grid,
			docfields_available: !!frm?.fields_dict?.items?.grid?.docfields,
			docfields_count: frm?.fields_dict?.items?.grid?.docfields?.length || 0,
			already_configured: !!frm?._columns_configured,
		};

		console.log("🔍 Diagnostic colonnes:", diagnosis);

		// Vérifier les méthodes de grille disponibles
		if (frm?.fields_dict?.items?.grid) {
			const grid = frm.fields_dict.items.grid;
			const methods = {
				setup_columns: typeof grid.setup_columns === "function",
				refresh_header: typeof grid.refresh_header === "function",
				refresh: typeof grid.refresh === "function",
			};
			console.log("🔧 Méthodes grille disponibles:", methods);
		}

		return diagnosis;
	} catch (error) {
		console.error("Erreur diagnostic:", error);
		return null;
	}
}

// FONCTION DEBUG : À utiliser depuis la console
window.debug_quotation_columns = function (frm) {
	if (!frm) {
		frm = cur_frm;
	}

	console.log("=== DEBUG COLONNES QUOTATION ===");

	const diagnosis = diagnose_columns_issues(frm);
	const margin_fields = check_margin_fields_availability();

	if (frm?.fields_dict?.items?.grid?.docfields) {
		console.log("📋 Champs disponibles dans la grille:");
		frm.fields_dict.items.grid.docfields.forEach((field) => {
			console.log(
				`- ${field.fieldname}: in_list_view=${field.in_list_view}, columns=${field.columns}`
			);
		});
	}

	// Tenter une reconfiguration forcée
	console.log("🔄 Tentative de reconfiguration forcée...");
	frm._columns_configured = false;
	setup_quotation_columns_robust(frm);
};

// FONCTION UTILITAIRE : Réinitialiser la configuration
window.reset_quotation_columns = function (frm) {
	if (!frm) {
		frm = cur_frm;
	}

	try {
		// Supprimer la marque de configuration
		frm._columns_configured = false;

		// Supprimer de localStorage
		const config_key = `quotation_columns_${frappe.session.user}`;
		localStorage.removeItem(config_key);

		// Reconfigurer
		setup_quotation_columns_robust(frm);

		frappe.show_alert("Configuration des colonnes réinitialisée", 3);
	} catch (error) {
		console.error("Erreur réinitialisation:", error);
		frappe.show_alert("Erreur lors de la réinitialisation", 3);
	}
};

// Auto-diagnostic au chargement du script
setTimeout(() => {
	console.log("📊 Script quotation_columns.js chargé");
	console.log("💡 Utilisez debug_quotation_columns() pour diagnostiquer les problèmes");
	console.log("🔄 Utilisez reset_quotation_columns() pour réinitialiser");
}, 1000);
