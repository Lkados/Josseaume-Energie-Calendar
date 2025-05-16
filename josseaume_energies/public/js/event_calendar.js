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
		slotDuration: "12:00:00", // Deux créneaux de 12h chacun
		allDaySlot: true,
		dayHeaders: true,
		// Configuration spécifique pour la vue jour
		views: {
			timeGridDay: {
				// Utiliser un format personnalisé pour les étiquettes d'heures
				slotLabelFormat: function (date) {
					return ""; // Retourner une chaîne vide pour cacher les labels d'origine
				},
				// Personnaliser complètement le contenu des étiquettes
				slotLabelContent: function (arg) {
					// Simplifier pour éviter les erreurs
					if (arg.date.getHours() === 0) {
						return {
							html: "<strong style='color:#4a6ddc;font-size:14px;'>Matin</strong>",
						};
					} else if (arg.date.getHours() === 12) {
						return {
							html: "<strong style='color:#4a6ddc;font-size:14px;'>Après-midi</strong>",
						};
					}
					return { html: "" };
				},
			},
		},
		// Permettre de cliquer sur les créneaux pour créer des événements
		selectable: true,
		select: function (info) {
			// Déterminer si c'est matin ou après-midi
			let period = "Matin";
			let startHour = 8;
			let endHour = 12;

			if (info.start.getHours() >= 12) {
				period = "Après-midi";
				startHour = 14;
				endHour = 18;
			}

			// Créer l'événement avec des heures raisonnables selon la période
			frappe.new_doc("Event", {
				subject: "Nouvel événement - " + period,
				starts_on: frappe.datetime.get_datetime_as_string(
					moment(info.start).hour(startHour).minute(0).second(0).toDate()
				),
				ends_on: frappe.datetime.get_datetime_as_string(
					moment(info.start).hour(endHour).minute(0).second(0).toDate()
				),
			});
		},
		// Ajout d'une classe CSS personnalisée aux créneaux
		slotClassNames: function (arg) {
			if (arg.date.getHours() < 12) {
				return ["morning-slot"];
			} else {
				return ["afternoon-slot"];
			}
		},
	},
	get_events_method: "frappe.desk.doctype.event.event.get_events",
	// Stocker une référence au calendrier après son initialisation
	onload: function (cal) {
		frappe.views.calendar["Event"].calendar = cal;
	},
};

// Définir la vue Calendrier comme vue par défaut
frappe.listview_settings["Event"] = frappe.listview_settings["Event"] || {};
frappe.listview_settings["Event"].onload = function (listview) {
	if (!frappe.route_options || !frappe.route_options.view) {
		frappe.set_route("List", "Event", "Calendar");
	}
};

// Ajouter du CSS personnalisé directement dans le JavaScript
$(document).ready(function () {
	// Injecter le CSS pour les créneaux horaires
	$("<style>")
		.prop("type", "text/css")
		.html(
			`
            /* Styles pour les créneaux Matin/Après-midi */
            .fc-timegrid-slot.morning-slot {
                background-color: rgba(243, 249, 255, 0.2);
            }
            .fc-timegrid-slot.afternoon-slot {
                background-color: rgba(255, 248, 243, 0.2);
            }
            /* Élargir la colonne des heures */
            .fc .fc-timegrid-axis-cushion {
                min-width: 80px !important;
                font-weight: bold;
            }
            /* Cacher les heures inutiles */
            .fc-timegrid-slot-label[data-time]:not([data-time="00:00:00"]):not([data-time="12:00:00"]) .fc-timegrid-slot-label-frame {
                visibility: hidden;
            }
        `
		)
		.appendTo("head");
});

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
