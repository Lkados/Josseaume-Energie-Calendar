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

	// Configuration des options FullCalendar
	options: {
		initialView: "timeGridDay",
		slotMinTime: "00:00:00",
		slotMaxTime: "24:00:00",
		// Diviser la journée en 3 grandes sections
		slotDuration: "08:00:00",
		// Personnalisation de l'affichage
		allDayText: "Toute la journée",
		// Permettre de cliquer pour créer des événements
		selectable: true,
		select: function (info) {
			let title, startHour, endHour;

			// Déterminer la plage horaire en fonction de l'heure du clic
			const hour = info.start.getHours();

			if (hour < 8) {
				// Toute la journée
				title = "Événement journée complète";
				startHour = 8;
				endHour = 20;
			} else if (hour >= 8 && hour < 13) {
				// Matin
				title = "Rendez-vous Matin";
				startHour = 8;
				endHour = 13;
			} else {
				// Après-midi
				title = "Rendez-vous Après-midi";
				startHour = 14;
				endHour = 20;
			}

			// Créer l'événement avec les heures ajustées
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

// Attendre que la page soit chargée pour remplacer les étiquettes des créneaux
$(document).ready(function () {
	// S'exécuter après un délai pour s'assurer que le calendrier est bien chargé
	setTimeout(function () {
		// Remplacer les textes des étiquettes
		$('.fc-timegrid-slot-label[data-time="00:00:00"] .fc-timegrid-slot-label-cushion').html(
			"<strong>Toute la journée</strong>"
		);
		$('.fc-timegrid-slot-label[data-time="08:00:00"] .fc-timegrid-slot-label-cushion').html(
			"<strong>Matin</strong>"
		);
		$('.fc-timegrid-slot-label[data-time="16:00:00"] .fc-timegrid-slot-label-cushion').html(
			"<strong>Après-midi</strong>"
		);
	}, 500);
});

// Fonction pour remplacer les étiquettes
function replaceLabels() {
	// Nettoyer toutes les étiquettes horaires sauf celles que nous voulons
	$(
		'.fc-timegrid-slot-label:not([data-time="00:00:00"]):not([data-time="08:00:00"]):not([data-time="16:00:00"])'
	).css("visibility", "hidden");

	// Remplacer les textes des étiquettes que nous voulons garder
	$('.fc-timegrid-slot-label[data-time="00:00:00"] .fc-timegrid-slot-label-cushion').html(
		"<strong>Toute la journée</strong>"
	);
	$('.fc-timegrid-slot-label[data-time="08:00:00"] .fc-timegrid-slot-label-cushion').html(
		"<strong>Matin</strong>"
	);
	$('.fc-timegrid-slot-label[data-time="16:00:00"] .fc-timegrid-slot-label-cushion').html(
		"<strong>Après-midi</strong>"
	);
}

// Exécuter à chaque changement de vue ou navigation dans le calendrier
$(document).on(
	"click",
	".fc-next-button, .fc-prev-button, .fc-today-button, .fc-timeGridDay-button, .fc-timeGridWeek-button, .fc-dayGridMonth-button",
	function () {
		setTimeout(replaceLabels, 200);
	}
);

// Exécuter initialement après chargement complet
$(document).ready(function () {
	setTimeout(replaceLabels, 500);
});
