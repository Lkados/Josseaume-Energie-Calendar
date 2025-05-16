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
	style_map: {
		Public: "success",
		Private: "info",
	},
	order_by: "ends_on",
	get_events_method: "frappe.desk.doctype.event.event.get_events",

	// Options FullCalendar personnalisées
	options: {
		slotDuration: "06:00:00", // Deux créneaux de 6h (matin/après-midi)
		slotMinTime: "06:00:00", // Commence à 6h
		slotMaxTime: "18:00:00", // Termine à 18h
		initialView: "timeGridDay",
	},

	// Personnalisation du contenu des étiquettes d'heures
	slotLabelContent: function (arg) {
		return {
			html:
				arg.date.getHours() < 12
					? "<strong>Matin</strong>"
					: "<strong>Après-midi</strong>",
		};
	},
};
