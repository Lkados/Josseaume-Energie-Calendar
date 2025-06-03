frappe.ui.form.on("Quotation", {
	onload: function (frm) {
		// Appliquer la configuration standard au chargement
		setup_standard_quotation_columns(frm);
	},

	refresh: function (frm) {
		// Réappliquer en cas de rafraîchissement
		setTimeout(() => setup_standard_quotation_columns(frm), 500);
	},
});

function setup_standard_quotation_columns(frm) {
	try {
		// Configuration standardisée pour TOUS les utilisateurs
		const STANDARD_COLUMNS_CONFIG = {
			items: [
				{ fieldname: "item_code", width: 2, label: "Code Article" },
				{ fieldname: "description", width: 3, label: "Description" },
				{ fieldname: "qty", width: 1, label: "Quantité" },
				{ fieldname: "rate", width: 1, label: "Prix (EUR)" },
				{ fieldname: "amount", width: 1, label: "Montant" },
				{ fieldname: "item_tax_template", width: 2, label: "Modèle de taxe" },
			],
		};

		// Appliquer la configuration à la table items
		force_grid_columns(frm, "items", STANDARD_COLUMNS_CONFIG.items);

		console.log("📋 Configuration standard des colonnes appliquée");
	} catch (error) {
		console.log("Erreur configuration colonnes:", error);
	}
}

function force_grid_columns(frm, table_fieldname, columns_config) {
	try {
		const grid_field = frm.fields_dict[table_fieldname];
		if (!grid_field || !grid_field.grid) {
			console.log(`Table ${table_fieldname} non trouvée`);
			return;
		}

		const grid = grid_field.grid;

		// 1. Configurer les métadonnées des champs
		if (grid.docfields) {
			grid.docfields.forEach((field) => {
				const config = columns_config.find((col) => col.fieldname === field.fieldname);
				if (config) {
					// Champs visibles avec leur largeur
					field.columns = config.width;
					field.in_list_view = 1;
					field.read_only = field.read_only || 0;
				} else {
					// Masquer les autres champs
					field.in_list_view = 0;
				}
			});
		}

		// 2. Forcer la reconfiguration
		if (grid.setup_columns) {
			grid.setup_columns();
		}

		// 3. Actualiser l'affichage
		if (grid.refresh_header) {
			grid.refresh_header();
		}

		// 4. Sauvegarder la configuration utilisateur
		save_user_column_config(table_fieldname, columns_config);
	} catch (error) {
		console.error(`Erreur configuration table ${table_fieldname}:`, error);
	}
}

function save_user_column_config(table_name, config) {
	try {
		// Sauvegarder dans le localStorage pour persistance
		const config_key = `standard_columns_${table_name}`;
		localStorage.setItem(config_key, JSON.stringify(config));

		// Optionnel: Sauvegarder côté serveur via API
		frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "User",
				name: frappe.session.user,
				fieldname: "custom_standard_columns_enabled",
				value: 1,
			},
			callback: function (r) {
				console.log("Configuration utilisateur sauvegardée");
			},
		});
	} catch (error) {
		console.log("Erreur sauvegarde config:", error);
	}
}
