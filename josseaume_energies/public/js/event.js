// josseaume_energies/public/js/event.js

frappe.ui.form.on("Event", {
	refresh: function (frm) {
		// Ajouter le bouton de synchronisation seulement si c'est un événement existant
		if (!frm.doc.__islocal && frm.doc.name) {
			// Vérifier d'abord le statut de synchronisation
			frappe.call({
				method: "josseaume_energies.api.check_sync_status",
				args: {
					doctype: "Event",
					docname: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						const status = r.message.status;

						// Afficher un indicateur de statut
						if (status === "synchronized") {
							frm.dashboard.add_indicator(
								__("Synchronisé avec commande client"),
								"green"
							);
						} else if (status === "out_of_sync") {
							frm.dashboard.add_indicator(
								__("Désynchronisé avec commande client"),
								"orange"
							);

							// Ajouter le bouton de synchronisation
							frm.add_custom_button(
								__("Synchroniser avec commande"),
								function () {
									sync_to_sales_order(frm);
								},
								__("Actions")
							);
						} else if (status === "no_sales_order") {
							frm.dashboard.add_indicator(__("Aucune commande liée"), "blue");
						} else if (status === "event_missing") {
							frm.dashboard.add_indicator(__("Commande liée manquante"), "red");
						}

						// NOUVEAU: Ajouter le bouton pour naviguer vers la commande liée
						if (status === "synchronized" || status === "out_of_sync") {
							// Trouver la commande liée
							find_linked_sales_order(frm, function (sales_order_name) {
								if (sales_order_name) {
									// Ajouter le bouton en position principale (pas dans un groupe)
									frm.add_custom_button(
										__("📄 Voir la commande client"),
										function () {
											frappe.set_route(
												"Form",
												"Sales Order",
												sales_order_name
											);
										}
									).addClass("btn-primary"); // Rendre le bouton plus visible

									// Aussi ajouter dans le groupe Actions pour la cohérence
									frm.add_custom_button(
										__("Ouvrir commande client"),
										function () {
											frappe.set_route(
												"Form",
												"Sales Order",
												sales_order_name
											);
										},
										__("Actions")
									);

									// Ajouter l'information dans l'intro
									frm.set_intro(
										__("Cet événement est lié à la commande client: ") +
											`<a href='/app/sales-order/${sales_order_name}'>${sales_order_name}</a>`,
										"blue"
									);
								}
							});
						}

						// Afficher les détails dans un petit message
						if (
							r.message.message &&
							!frm.intro_area.find(".sync-status-message").length
						) {
							frm.set_intro(
								`<div class="sync-status-message">${r.message.message}</div>`,
								status === "synchronized" ? "green" : "orange"
							);
						}
					}
				},
			});

			// Bouton pour vérifier manuellement le statut
			frm.add_custom_button(
				__("Vérifier synchronisation"),
				function () {
					check_sync_status(frm);
				},
				__("Actions")
			);
		}
	},
});

// NOUVELLE FONCTION: Trouver la commande client liée à cet événement
function find_linked_sales_order(frm, callback) {
	// Méthode 1: Chercher directement via le champ custom_calendar_event
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Sales Order",
			filters: {
				custom_calendar_event: frm.doc.name,
			},
			fields: ["name"],
		},
		callback: function (r) {
			if (r.message && r.message.length > 0) {
				callback(r.message[0].name);
			} else {
				// Méthode 2: Chercher via la description de l'événement
				find_sales_order_from_description(frm, callback);
			}
		},
	});
}

// NOUVELLE FONCTION: Extraire la référence de commande depuis la description
function find_sales_order_from_description(frm, callback) {
	if (!frm.doc.description) {
		callback(null);
		return;
	}

	// Chercher le pattern <strong>Référence:</strong> suivi de l'ID
	const refMatch = frm.doc.description.match(/<strong>Référence:<\/strong>\s*([^<\s]+)/);
	if (refMatch) {
		const potentialRef = refMatch[1].trim();

		// Vérifier que cette commande existe
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Sales Order",
				name: potentialRef,
			},
			callback: function (r) {
				if (r.message) {
					callback(potentialRef);
				} else {
					callback(null);
				}
			},
			error: function () {
				callback(null);
			},
		});
	} else {
		callback(null);
	}
}

function sync_to_sales_order(frm) {
	frappe.show_alert(
		{
			message: __("Synchronisation en cours..."),
			indicator: "blue",
		},
		3
	);

	frappe.call({
		method: "josseaume_energies.api.sync_event_to_sales_order",
		args: {
			event_name: frm.doc.name,
		},
		freeze: true,
		freeze_message: __("Synchronisation avec la commande client..."),
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				frappe.show_alert(
					{
						message: r.message.message,
						indicator: "green",
					},
					5
				);

				frappe.msgprint({
					title: __("Synchronisation réussie"),
					indicator: "green",
					message:
						r.message.message +
						(r.message.old_date && r.message.new_date
							? `<br><small>Ancienne date: ${r.message.old_date}<br>Nouvelle date: ${r.message.new_date}</small>`
							: ""),
				});

				// Rafraîchir pour mettre à jour les indicateurs
				frm.reload_doc();
			} else {
				frappe.msgprint({
					title: __("Erreur de synchronisation"),
					indicator: "red",
					message: r.message ? r.message.message : __("Erreur inconnue"),
				});
			}
		},
	});
}

function check_sync_status(frm) {
	frappe.call({
		method: "josseaume_energies.api.check_sync_status",
		args: {
			doctype: "Event",
			docname: frm.doc.name,
		},
		callback: function (r) {
			if (r.message) {
				let message = r.message.message;

				if (r.message.sales_order_date && r.message.event_date) {
					message += `<br><br><strong>Détails:</strong>`;
					message += `<br>• Date commande: ${r.message.sales_order_date}`;
					message += `<br>• Date événement: ${r.message.event_date}`;
				}

				frappe.msgprint({
					title: __("Statut de synchronisation"),
					indicator: r.message.status === "synchronized" ? "green" : "orange",
					message: message,
				});
			}
		},
	});
}
