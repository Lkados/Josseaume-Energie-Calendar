// josseaume_energies/public/js/event_calendar.js

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
	get_events_method: "frappe.desk.doctype.event.event.get_events",
};

// Attend que l'application soit chargée
$(document).on("app_ready", function () {
	// Fonction principale pour intercepter et personnaliser la vue
	function setupCustomDayView() {
		// Vérifier qu'on est sur la page calendrier d'événements
		var route = frappe.get_route();
		if (!(route[0] === "List" && route[1] === "Event" && route[2] === "Calendar")) {
			return;
		}

		// Attendre que FullCalendar soit initialisé
		if (!window.cur_list || !cur_list.calendar) {
			setTimeout(setupCustomDayView, 500);
			return;
		}

		// Référence au calendrier
		var calendarAPI = cur_list.calendar;

		// Enregistrer un écouteur pour les changements de vue
		calendarAPI.on("viewDidMount", function (info) {
			// Si c'est la vue jour, appliquer notre personnalisation
			if (info.view.type === "timeGridDay") {
				customizeDayView();
			}
		});

		// Si la vue initiale est déjà 'jour', appliquer tout de suite
		if (calendarAPI.view.type === "timeGridDay") {
			customizeDayView();
		}
	}

	// Fonction pour personnaliser la vue jour
	function customizeDayView() {
		// 1. Masquer toutes les étiquettes horaires
		$(".fc-timegrid-slot-label").css("visibility", "hidden");

		// 2. Ajouter nos sections personnalisées
		if ($(".custom-calendar-sections").length === 0) {
			var html = `
                <div class="custom-calendar-sections">
                    <div class="matin-section">
                        <h3>Matin</h3>
                        <div class="time-range">8h00 - 13h00</div>
                    </div>
                    <div class="apres-midi-section">
                        <h3>Après-midi</h3>
                        <div class="time-range">14h00 - 20h00</div>
                    </div>
                </div>
            `;
			$(".fc-timegrid-axis-frame").append(html);
		}

		// 3. Personnaliser l'apparence des événements selon leur heure
		$(".fc-timegrid-event").each(function () {
			var event = $(this);
			var eventTime = event.find(".fc-event-time").text();
			var hour = parseInt(eventTime.split(":")[0]);

			if (hour < 13) {
				event.addClass("morning-event");
			} else {
				event.addClass("afternoon-event");
			}
		});
	}

	// Définir un gestionnaire pour la création d'événements
	$(document).on("click", ".fc-timegrid-slot", function (e) {
		// Arrêter la propagation pour éviter les comportements par défaut
		e.stopPropagation();

		// Déterminer la section (matin/après-midi) en fonction de la position du clic
		var slot = $(this);
		var slotTime = slot.attr("data-time");
		var hour = parseInt(slotTime.split(":")[0]);

		var title, startHour, endHour;

		if (hour < 13) {
			title = "Rendez-vous Matin";
			startHour = 8;
			endHour = 13;
		} else {
			title = "Rendez-vous Après-midi";
			startHour = 14;
			endHour = 20;
		}

		// Récupérer la date actuelle du calendrier
		var currentDate = cur_list.calendar.getDate();
		var dateStr = moment(currentDate).format("YYYY-MM-DD");

		// Créer l'événement
		frappe.new_doc("Event", {
			subject: title,
			starts_on: dateStr + " " + startHour + ":00:00",
			ends_on: dateStr + " " + endHour + ":00:00",
		});
	});

	// Lancer la configuration après un court délai
	setTimeout(setupCustomDayView, 1000);

	// Relancer la configuration après chaque changement de route
	frappe.router.on("change", function () {
		setTimeout(setupCustomDayView, 1000);
	});
});
