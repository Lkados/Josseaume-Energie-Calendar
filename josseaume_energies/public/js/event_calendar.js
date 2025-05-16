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
	gantt: false,
	order_by: "starts_on",
	get_events_method: "frappe.desk.doctype.event.event.get_events",

	// Configuration de base
	options: {
		initialView: "timeGridDay",
		slotMinTime: "00:00:00",
		slotMaxTime: "24:00:00",
		slotDuration: "08:00:00",
		selectable: true,
		select: function (info) {
			let title, startHour, endHour;
			const hour = info.start.getHours();

			if (hour < 8) {
				title = "Journée complète";
				startHour = 8;
				endHour = 20;
			} else if (hour >= 8 && hour < 16) {
				title = "Rendez-vous Matin";
				startHour = 8;
				endHour = 13;
			} else {
				title = "Rendez-vous Après-midi";
				startHour = 14;
				endHour = 20;
			}

			frappe.new_doc("Event", {
				subject: title,
				starts_on: frappe.datetime.get_datetime_as_string(
					moment(info.start).hour(startHour).minute(0).second(0).toDate()
				),
				ends_on: frappe.datetime.get_datetime_as_string(
					moment(info.start).hour(endHour).minute(0).second(0).toDate()
				),
			});
		},
	},
};

// Fonction pour remplacer les étiquettes
function updateLabels() {
	// Remplacer directement le contenu HTML des étiquettes
	$('[data-time="00:00:00"] .fc-timegrid-slot-label-cushion').html(
		"<strong>Toute la journée</strong>"
	);
	$('[data-time="08:00:00"] .fc-timegrid-slot-label-cushion').html("<strong>Matin</strong>");
	$('[data-time="16:00:00"] .fc-timegrid-slot-label-cushion').html(
		"<strong>Après-midi</strong>"
	);
}

// Exécuter la fonction après le chargement initial du calendrier
$(document).on("app_ready", function () {
	setTimeout(updateLabels, 1000);
});

// Exécuter la fonction après chaque changement de vue
$(document).on("click", ".fc-button", function () {
	setTimeout(updateLabels, 300);
});

// S'assurer que les étiquettes sont remplacées même après rafraîchissement AJAX
$(document).ajaxComplete(function () {
	setTimeout(updateLabels, 300);
});
