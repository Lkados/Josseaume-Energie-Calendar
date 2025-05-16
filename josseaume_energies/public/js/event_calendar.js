frappe.ui.form.on("Event", {
	onload_post_render: function (frm) {
		// Définir la vue par défaut sur Calendrier
		if (frappe.route_options && !frappe.route_options.view) {
			frappe.set_route("List", "Event", "Calendar");
		}
	},
});

// Personnaliser la vue Calendrier
frappe.views.calendar["Event"] = {
	field_map: {
		start: "starts_on",
		end: "ends_on",
		id: "name",
		title: "subject",
		allDay: "all_day",
		status: "event_type",
		color: "color",
	},
	options: {
		initialView: "timeGridDay", // Vue jour par défaut dans le calendrier
		slotMinTime: "06:00:00", // Début à 6h
		slotMaxTime: "20:00:00", // Fin à 20h
		slotDuration: "01:00:00", // Créneaux d'une heure (plus naturel)
		views: {
			timeGridDay: {
				type: "timeGrid",
				duration: { days: 1 },
				// Division en deux sections
				slotDuration: "06:00:00", // Chaque section dure 6h
				slotLabelContent: function (arg) {
					var hour = arg.date.getHours();
					if (hour >= 6 && hour < 13) {
						return { html: "<strong>Matin</strong>" };
					} else if (hour >= 13 && hour < 20) {
						return { html: "<strong>Après-midi</strong>" };
					}
				},
			},
		},
	},
	get_events_method: "frappe.desk.doctype.event.event.get_events",
};
