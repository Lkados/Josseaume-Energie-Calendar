// josseaume_energies/public/js/sales_order.js

frappe.ui.form.on("Sales Order", {
	refresh: function (frm) {
		if (frm.doc.docstatus === 1) {
			// Seulement pour les documents validés
			frm.add_custom_button(
				__("Créer Événement Calendrier"),
				function () {
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
				},
				__("Actions")
			);
		}
	},
});
