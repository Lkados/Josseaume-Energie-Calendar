// josseaume_energies/public/js/sales_order.js

frappe.ui.form.on("Sales Order", {
	refresh: function (frm) {
		if (frm.doc.docstatus === 1) {
			// Bouton pour créer un événement calendrier (existant)
			frm.add_custom_button(
				__("Créer Événement Calendrier"),
				function () {
					create_calendar_event(frm);
				},
				__("Actions")
			);
		}

		// NOUVELLE FONCTION: Afficher le rapport de synchronisation des articles
		function show_items_sync_report(frm) {
			frappe.call({
				method: "josseaume_energies.api.get_items_sync_report",
				args: {
					sales_order_name: frm.doc.name,
				},
				callback: function (r) {
					if (r.message && r.message.status === "success") {
						const report = r.message;

						let message = `<h4>Rapport de synchronisation des articles</h4>`;
						message += `<p><strong>Date principale:</strong> ${
							report.main_delivery_date || "Non définie"
						}</p>`;
						message += `<p><strong>Total articles:</strong> ${report.total_items}</p>`;
						message += `<p><strong>Synchronisés:</strong> ${report.synchronized_items}</p>`;
						message += `<p><strong>Désynchronisés:</strong> ${report.out_of_sync_items}</p>`;

						if (report.items_details && report.items_details.length > 0) {
							message += `<hr><h5>Détail par article:</h5><table class="table table-bordered">`;
							message += `<thead><tr><th>Code article</th><th>Date livraison</th><th>Statut</th><th>Écart</th></tr></thead><tbody>`;

							report.items_details.forEach((item) => {
								const statusIcon = item.is_synchronized ? "✅" : "⚠️";
								const statusText = item.is_synchronized
									? "Synchronisé"
									: "Désynchronisé";
								const ecart = item.date_difference || "-";

								message += `<tr>
							<td>${item.item_code}</td>
							<td>${item.delivery_date || "Non définie"}</td>
							<td>${statusIcon} ${statusText}</td>
							<td>${ecart}</td>
						</tr>`;
							});

							message += `</tbody></table>`;
						}

						frappe.msgprint({
							title: __("Rapport de synchronisation"),
							indicator: report.out_of_sync_items > 0 ? "orange" : "green",
							message: message,
						});
					} else {
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: r.message
								? r.message.message
								: __("Erreur lors de la génération du rapport"),
						});
					}
				},
			});
		}

		// NOUVELLE FONCTION: Forcer la synchronisation de tous les articles
		function force_sync_all_items(frm) {
			frappe.confirm(
				__(
					"Êtes-vous sûr de vouloir synchroniser tous les articles avec la date principale de livraison ?"
				),
				function () {
					frappe.show_alert(
						{
							message: __("Synchronisation des articles en cours..."),
							indicator: "blue",
						},
						3
					);

					frappe.call({
						method: "josseaume_energies.api.force_sync_all_items",
						args: {
							sales_order_name: frm.doc.name,
						},
						freeze: true,
						freeze_message: __("Synchronisation des articles..."),
						callback: function (r) {
							if (r.message && r.message.status === "success") {
								frappe.show_alert(
									{
										message: r.message.message,
										indicator: "green",
									},
									5
								);

								let details = `<p>${r.message.message}</p>`;
								details += `<p><strong>Articles traités:</strong> ${r.message.total_items}</p>`;

								if (
									r.message.updates_details &&
									r.message.updates_details.length > 0
								) {
									details += `<hr><h5>Détails des modifications:</h5><ul>`;
									r.message.updates_details.forEach((update) => {
										details += `<li><strong>${update.item_code}:</strong> ${update.old_date} → ${update.new_date}</li>`;
									});
									details += `</ul>`;
								}

								frappe.msgprint({
									title: __("Synchronisation terminée"),
									indicator: "green",
									message: details,
								});

								// Rafraîchir pour voir les changements
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
			);

			// NOUVEAU: Vérifier le statut de synchronisation si un événement existe
			if (frm.doc.custom_calendar_event) {
				check_and_display_sync_status(frm);
			}
		}
	},
});

// Fonction existante pour créer un événement
function create_calendar_event(frm) {
	// Afficher un indicateur de chargement
	frappe.show_alert(
		{
			message: __("Création de l'événement en cours..."),
			indicator: "blue",
		},
		3
	);

	// Appeler l'API pour créer l'événement
	frappe.call({
		method: "josseaume_energies.api.create_event_from_sales_order",
		args: {
			docname: frm.doc.name,
		},
		freeze: true,
		freeze_message: __("Création de l'événement..."),
		callback: function (r) {
			if (r.message && r.message.status === "success") {
				// Afficher un message de succès
				frappe.show_alert(
					{
						message: __("Événement créé avec succès"),
						indicator: "green",
					},
					5
				);

				// Afficher un message avec le lien vers l'événement
				frappe.msgprint(
					__("Événement calendrier créé: ") +
						`<a href='/app/event/${r.message.event_name}'>${r.message.event_name}</a><br><br>` +
						r.message.message
				);

				// Recharger le formulaire pour afficher le lien vers l'événement si disponible
				frm.reload_doc();
			} else {
				// Afficher un message d'erreur
				frappe.msgprint({
					title: __("Erreur"),
					indicator: "red",
					message: r.message
						? r.message.message
						: __("Erreur lors de la création de l'événement"),
				});
			}
		},
	});
}

// NOUVELLE FONCTION: Vérifier et afficher le statut de synchronisation
function check_and_display_sync_status(frm) {
	frappe.call({
		method: "josseaume_energies.api.check_sync_status",
		args: {
			doctype: "Sales Order",
			docname: frm.doc.name,
		},
		callback: function (r) {
			if (r.message) {
				const status = r.message.status;

				// Afficher un indicateur de statut
				if (status === "synchronized") {
					frm.dashboard.add_indicator(__("Synchronisé avec événement"), "green");
				} else if (status === "out_of_sync") {
					frm.dashboard.add_indicator(__("Désynchronisé avec événement"), "orange");

					// Ajouter le bouton de synchronisation
					frm.add_custom_button(
						__("Synchroniser avec événement"),
						function () {
							sync_to_event(frm);
						},
						__("Actions")
					);
				} else if (status === "event_missing") {
					frm.dashboard.add_indicator(__("Événement lié manquant"), "red");

					// Proposer de nettoyer la référence
					frm.add_custom_button(
						__("Nettoyer référence événement"),
						function () {
							clean_event_reference(frm);
						},
						__("Actions")
					);
				}

				// Ajouter un lien vers l'événement si il existe
				if (status === "synchronized" || status === "out_of_sync") {
					frm.add_custom_button(
						__("Voir l'événement"),
						function () {
							frappe.set_route("Form", "Event", frm.doc.custom_calendar_event);
						},
						__("Actions")
					);

					// NOUVEAU: Boutons pour la gestion des articles
					frm.add_custom_button(
						__("Rapport articles"),
						function () {
							show_items_sync_report(frm);
						},
						__("Synchronisation")
					);

					frm.add_custom_button(
						__("Synchroniser tous les articles"),
						function () {
							force_sync_all_items(frm);
						},
						__("Synchronisation")
					);
				}

				// Afficher les détails dans un petit message
				if (r.message.message) {
					frm.set_intro(
						r.message.message,
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
			check_sync_status_manual(frm);
		},
		__("Actions")
	);
}

// NOUVELLE FONCTION: Synchroniser vers l'événement
function sync_to_event(frm) {
	frappe.show_alert(
		{
			message: __("Synchronisation en cours..."),
			indicator: "blue",
		},
		3
	);

	frappe.call({
		method: "josseaume_energies.api.sync_sales_order_to_event",
		args: {
			sales_order_name: frm.doc.name,
		},
		freeze: true,
		freeze_message: __("Synchronisation avec l'événement..."),
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

// NOUVELLE FONCTION: Vérification manuelle du statut
function check_sync_status_manual(frm) {
	frappe.call({
		method: "josseaume_energies.api.check_sync_status",
		args: {
			doctype: "Sales Order",
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

// NOUVELLE FONCTION: Nettoyer la référence d'événement manquant
function clean_event_reference(frm) {
	frappe.confirm(
		__("Êtes-vous sûr de vouloir supprimer la référence vers l'événement manquant ?"),
		function () {
			frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Sales Order",
					name: frm.doc.name,
					fieldname: "custom_calendar_event",
					value: "",
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: __("Référence nettoyée"),
								indicator: "green",
							},
							3
						);
						frm.reload_doc();
					}
				},
			});
		}
	);
}
