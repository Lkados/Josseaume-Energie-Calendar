// Configuration minimale du calendrier
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
		slotDuration: "01:00:00",
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
		},
		selectable: true,
		selectMirror: true,
		select: function (info) {
			// Divisé en matin (avant 12h) et après-midi (après 12h)
			let isPM = info.start.getHours() >= 12;
			let defaultTitle = isPM ? "Rendez-vous Après-midi" : "Rendez-vous Matin";

			frappe.new_doc("Event", {
				subject: defaultTitle,
				starts_on: frappe.datetime.get_datetime_as_string(info.start),
				ends_on: frappe.datetime.get_datetime_as_string(info.end),
			});
		},
	},
	get_events_method: "frappe.desk.doctype.event.event.get_events",
};

// Définir la vue calendrier comme vue par défaut
frappe.listview_settings["Event"] = frappe.listview_settings["Event"] || {};
frappe.listview_settings["Event"].onload = function (listview) {
	if (!frappe.route_options || !frappe.route_options.view) {
		frappe.set_route("List", "Event", "Calendar");
	}
};

// Assurer la compatibilité avec différentes versions de FullCalendar
$(document).on("app_ready", function () {
	// Vérifier si on est sur la page des événements et forcer la vue calendrier
	if (
		frappe.get_route()[0] === "List" &&
		frappe.get_route()[1] === "Event" &&
		!frappe.get_route()[2]
	) {
		frappe.set_route("List", "Event", "Calendar");
	}
});
