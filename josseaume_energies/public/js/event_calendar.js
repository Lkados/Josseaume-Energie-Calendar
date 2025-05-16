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
		initialView: "timeGridDay",
		slotMinTime: "00:00:00",
		slotMaxTime: "24:00:00",
		// Utiliser seulement deux créneaux horaires pour la journée
		slotDuration: "12:00:00",
		// Remplacer le contenu des étiquettes de créneaux
		slotLabelContent: function (arg) {
			// Simplifier au maximum pour éviter les erreurs
			if (arg.date.getHours() < 12) {
				return { html: "<strong>Matin</strong>" };
			} else {
				return { html: "<strong>Après-midi</strong>" };
			}
		},
		// Permettre de cliquer sur les créneaux pour créer des événements
		selectable: true,
		select: function (info) {
			frappe.new_doc("Event", {
				starts_on: frappe.datetime.get_datetime_as_string(info.start),
				ends_on: frappe.datetime.get_datetime_as_string(info.end),
			});
		},
	},
	get_events_method: "frappe.desk.doctype.event.event.get_events",
};

// Définir la vue Calendrier comme vue par défaut
frappe.listview_settings["Event"] = frappe.listview_settings["Event"] || {};
frappe.listview_settings["Event"].onload = function (listview) {
	if (!frappe.route_options || !frappe.route_options.view) {
		frappe.set_route("List", "Event", "Calendar");
	}
};

// Préserver la fonctionnalité d'ajout d'événement
$(document).on("click", ".fc-timeGridDay-view .fc-timegrid-slot", function (e) {
	if (!frappe.views.calendar["Event"].calendar) return;

	const calendar = frappe.views.calendar["Event"].calendar;
	const event = calendar.getEvents();
	const date = calendar.getDate();

	// Obtenir le moment du clic
	const slot = $(e.target).closest(".fc-timegrid-slot");
	const hour = parseInt(slot.attr("data-time").split(":")[0]) || 8;

	// Créer un nouvel événement
	frappe.new_doc("Event", {
		starts_on:
			frappe.datetime.add_days(frappe.datetime.nowdate(), date.getDay() - moment().day()) +
			" " +
			hour +
			":00:00",
		ends_on:
			frappe.datetime.add_days(frappe.datetime.nowdate(), date.getDay() - moment().day()) +
			" " +
			(hour + 1) +
			":00:00",
	});
});
