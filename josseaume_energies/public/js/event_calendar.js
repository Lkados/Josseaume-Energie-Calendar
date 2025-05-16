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
		slotMinTime: "06:00:00",
		slotMaxTime: "20:00:00",
		// Diviser la journée en deux parties seulement (matin et après-midi)
		slotDuration: "07:00:00",
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
		},
		allDaySlot: true,
		views: {
			timeGridDay: {
				// Configurer la vue jour avec seulement deux créneaux
				slotLabelFormat: function (info) {
					// Ne pas utiliser slotLabelContent car il peut causer des problèmes avec l'UI
					const hour = info.date.getHours();
					if (hour >= 6 && hour < 13) {
						return "Matin";
					} else if (hour >= 13 && hour < 20) {
						return "Après-midi";
					}
					return "";
				},
			},
		},
	},
	get_events_method: "frappe.desk.doctype.event.event.get_events",
};

// Assurez-vous que la vue Calendrier est définie par défaut
frappe.listview_settings["Event"] = frappe.listview_settings["Event"] || {};
frappe.listview_settings["Event"].onload = function (listview) {
	if (!frappe.route_options || !frappe.route_options.view) {
		frappe.route_options = frappe.route_options || {};
		frappe.route_options.view = "Calendar";
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
