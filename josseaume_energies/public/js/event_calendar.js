// josseaume_energie_calendar/public/js/event_calendar.js

frappe.ready(function () {
	// Dès que le Desk est prêt, essayer d'attacher notre logique au calendrier d'Event
	function attachDayViewHandler() {
		// Vérifier qu'on est sur List / Event / Calendar
		var route = frappe.get_route();
		if (!(route[0] === "List" && route[1] === "Event" && route[2] === "Calendar")) {
			return;
		}
		// Attendre que le calendrier FullCalendar soit initialisé dans le DOM
		var calendarDiv = $("#calendar");
		if (!calendarDiv.length || !calendarDiv.fullCalendar) {
			setTimeout(attachDayViewHandler, 500);
			return;
		}
		// Définir le callback viewRender pour intercepter l'affichage
		calendarDiv.fullCalendar("option", "viewRender", function (view) {
			// Si on est en vue journalière (agendaDay), appliquer la customisation
			if (view.name === "agendaDay") {
				applyTwoColumns();
			} else {
				// Sinon, restaurer l'affichage standard si nécessaire
				calendarDiv.find(".fc-agendaDay-view").show();
				calendarDiv.find(".two-col-container").remove();
			}
		});
		// Si la vue actuelle au chargement est déjà jour, appliquer tout de suite
		var currentView = calendarDiv.fullCalendar("getView");
		if (currentView && currentView.name === "agendaDay") {
			applyTwoColumns();
		}
	}

	function applyTwoColumns() {
		var calendarDiv = $("#calendar");
		if (!calendarDiv.length) return;

		// Cacher la vue par défaut de FullCalendar (agendaDay)
		calendarDiv.find(".fc-agendaDay-view").hide();
		// Récupérer tous les événements chargés par FullCalendar
		var events = calendarDiv.fullCalendar("clientEvents");
		// Séparer matin (< 13h) et après-midi (>= 13h)
		var morningEvents = events.filter(function (e) {
			return e.start.format("H") < 13;
		});
		var afternoonEvents = events.filter(function (e) {
			return e.start.format("H") >= 13;
		});
		// Trier par heure de début croissante
		morningEvents.sort(function (a, b) {
			return a.start - b.start;
		});
		afternoonEvents.sort(function (a, b) {
			return a.start - b.start;
		});

		// Générer le HTML des deux colonnes
		var html = "<div class='two-col-container'>";
		// Colonne Matin
		html += "<div class='column matin'><h3>Matin</h3><ul>";
		morningEvents.forEach(function (e) {
			var start = e.start.format("HH:mm");
			var end = e.end ? e.end.format("HH:mm") : "";
			html += "<li>";
			html += "<strong>" + start;
			if (end) html += " - " + end;
			html += "</strong>: ";
			// Lien vers l'événement (form Event)
			html += "<a href='#Form/Event/" + e.id + "'>" + e.title + "</a>";
			html += "</li>";
		});
		html += "</ul></div>";
		// Colonne Après-midi
		html += "<div class='column apres-midi'><h3>Après-midi</h3><ul>";
		afternoonEvents.forEach(function (e) {
			var start = e.start.format("HH:mm");
			var end = e.end ? e.end.format("HH:mm") : "";
			html += "<li>";
			html += "<strong>" + start;
			if (end) html += " - " + end;
			html += "</strong>: ";
			html += "<a href='#Form/Event/" + e.id + "'>" + e.title + "</a>";
			html += "</li>";
		});
		html += "</ul></div>";
		html += "</div>";

		// Ajouter le HTML sous le calendrier (ou à la place)
		calendarDiv.find(".fc-view-container").append(html);
	}

	// Lancer l'attachement après un léger délai (pour être sûr que frappe.ready a configuré le route)
	setTimeout(attachDayViewHandler, 1000);
});
