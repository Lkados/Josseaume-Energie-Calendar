frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// État global
	let currentDate = new Date();
	let currentYear = currentDate.getFullYear();
	let currentMonth = currentDate.getMonth(); // 0-11

	// Détection et gestion du thème pour ERPNext v15
	function applyTheme() {
		// Méthodes de détection pour ERPNext v15
		const isDarkTheme =
			$("body").hasClass("dark") ||
			(frappe.ui.theme && frappe.ui.theme.current_theme === "Dark") ||
			localStorage.getItem("desk_theme") === "Dark" ||
			(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

		if (isDarkTheme && !$("body").hasClass("dark")) {
			$("body").addClass("dark");
		} else if (!isDarkTheme && $("body").hasClass("dark")) {
			$("body").removeClass("dark");
		}
	}

	// Observer les changements de thème
	function setupThemeObserver() {
		// Observer les changements de classe sur le body
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === "attributes" && mutation.attributeName === "class") {
					applyTheme();
				}
			});
		});

		observer.observe(document.body, { attributes: true });

		// Observer les changements de préférences système
		if (window.matchMedia) {
			window
				.matchMedia("(prefers-color-scheme: dark)")
				.addEventListener("change", applyTheme);
		}

		// Pour ERPNext v15, suivre les changements de thème spécifiques
		$(document).on("theme-change", applyTheme);
	}

	// Appliquer le thème au chargement et configurer l'observateur
	applyTheme();
	setupThemeObserver();

	// Vérifier le thème périodiquement pour s'assurer qu'il reste synchronisé
	setInterval(applyTheme, 2000);

	// Ajouter des contrôles - Suppression de "Mois" des options
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Semaine\nJour",
		default: "Jour",
		change: function () {
			refreshCalendar();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			refreshCalendar();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			refreshCalendar();
		},
	});

	// Ajouter un champ de sélection de date
	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "select_date",
		default: frappe.datetime.get_today(),
		change: function () {
			const selectedDate = page.fields_dict.select_date.get_value();

			if (!selectedDate) return;

			// Convertir la chaîne de date en objet Date
			const dateParts = selectedDate.split("-");
			const year = parseInt(dateParts[0]);
			const month = parseInt(dateParts[1]) - 1; // Les mois dans JS sont 0-11
			const day = parseInt(dateParts[2]);

			// Mettre à jour les variables globales
			currentDate = new Date(year, month, day);
			currentYear = year;
			currentMonth = month;

			// Rafraîchir le calendrier
			refreshCalendar();
		},
	});

	// Conteneur de calendrier
	let calendarContainer = $('<div class="custom-calendar-container"></div>').appendTo(page.body);

	// Navigation
	page.add_inner_button(__("Aujourd'hui"), () => {
		currentDate = new Date();
		currentYear = currentDate.getFullYear();
		currentMonth = currentDate.getMonth();

		// Mettre à jour le champ de date
		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}

		refreshCalendar();
	});

	page.add_inner_button(__("Précédent"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour") {
			currentDate.setDate(currentDate.getDate() - 1);
		} else if (viewType === "Semaine") {
			currentDate.setDate(currentDate.getDate() - 7);
		}

		// Mettre à jour le champ de date
		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}

		refreshCalendar();
	});

	page.add_inner_button(__("Suivant"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour") {
			currentDate.setDate(currentDate.getDate() + 1);
		} else if (viewType === "Semaine") {
			currentDate.setDate(currentDate.getDate() + 7);
		}

		// Mettre à jour le champ de date
		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}

		refreshCalendar();
	});

	// Fonction principale pour rafraîchir le calendrier - Vue Mois supprimée
	function refreshCalendar() {
		const viewType = page.fields_dict.view_type.get_value();
		const territory = page.fields_dict.territory.get_value();
		const employee = page.fields_dict.employee.get_value();

		calendarContainer.empty();

		if (viewType === "Jour") {
			renderTwoColumnDayView(currentDate, territory, employee);
		} else {
			renderWeekView(currentDate, territory, employee);
		}
	}

	// Fonction auxiliaire pour obtenir les noms des participants
	function getParticipantNames(participants) {
		if (!participants || !Array.isArray(participants)) {
			return { clientName: "", technicianName: "" };
		}

		let clientName = "";
		let technicianName = "";

		for (const participant of participants) {
			if (participant.reference_doctype === "Customer") {
				clientName = participant.full_name || participant.reference_docname;
			} else if (participant.reference_doctype === "Employee") {
				technicianName = participant.full_name || participant.reference_docname;
			}
		}

		return { clientName, technicianName };
	}

	// Rendu de la vue journalière à deux colonnes
	function renderTwoColumnDayView(date, territory, employee) {
		const formatDate = (d) => {
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
				.toString()
				.padStart(2, "0")}/${d.getFullYear()}`;
		};

		// Créer l'en-tête
		const dayHeader = $(`
            <div class="calendar-header">
                <h2>Journée du ${formatDate(date)}</h2>
            </div>
        `).appendTo(calendarContainer);

		// Créer le conteneur à deux colonnes
		const twoColumnContainer = $('<div class="two_column_calendar-container"></div>').appendTo(
			calendarContainer
		);

		// Récupérer les événements pour cette journée
		const dateStr = frappe.datetime.obj_to_str(date);

		// Afficher le message de chargement
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		frappe.call({
			method: "josseaume_energies.api.get_day_events",
			args: {
				date: dateStr,
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					console.log("Événements reçus:", events);

					const morningEvents = [];
					const afternoonEvents = [];

					// Séparer les événements du matin et de l'après-midi
					events.forEach((event) => {
						const eventTime = new Date(event.starts_on);
						if (eventTime.getHours() < 12) {
							morningEvents.push(event);
						} else {
							afternoonEvents.push(event);
						}
					});

					// Trier par heure
					morningEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));
					afternoonEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));

					// Ajouter les titres de section
					$('<div data-name="Matin">Matin</div>').appendTo(twoColumnContainer);

					// Ajouter les événements du matin
					if (morningEvents.length > 0) {
						morningEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					} else {
						$('<div class="no-events">Aucun événement le matin</div>').appendTo(
							twoColumnContainer
						);
					}

					// Ajouter la section après-midi
					$('<div data-name="Après-midi">Après-midi</div>').appendTo(twoColumnContainer);

					// Ajouter les événements de l'après-midi
					if (afternoonEvents.length > 0) {
						afternoonEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					} else {
						$('<div class="no-events">Aucun événement l\'après-midi</div>').appendTo(
							twoColumnContainer
						);
					}

					// Si aucun événement n'est trouvé pour la journée
					if (events.length === 0) {
						$(
							'<div class="no-events-message">Aucun événement pour cette journée</div>'
						).appendTo(calendarContainer);
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}
			},
		});
	}

	// Fonction pour rendre une carte d'événement dans la vue à deux colonnes
	function renderTwoColumnEventCard(event, container) {
		// Déterminer la classe de couleur
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		// Récupérer les noms des participants
		const { clientName, technicianName } = getParticipantNames(event.event_participants);

		// Créer la carte d'événement
		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<span class="event-id">${event.name}</span>
				<span class="event-title">${event.subject}</span>
				${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
				${
					technicianName
						? `<div class="technician-info"><i class="fa fa-user-tie"></i> ${technicianName}</div>`
						: ""
				}
			</div>
		`).appendTo(container);

		// Ajouter l'interaction au clic
		eventCard.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});
	}

	// Rendu de la vue hebdomadaire modifiée pour afficher matin/après-midi
	function renderWeekView(date, territory, employee) {
		// Obtenir le premier jour de la semaine (lundi)
		const current = new Date(date);
		const day = current.getDay(); // 0-6 (dim-sam)
		const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour commencer le lundi

		const monday = new Date(current.setDate(diff));
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		// Formatage des dates pour l'affichage
		const formatDate = (date) => {
			return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
				.toString()
				.padStart(2, "0")}`;
		};

		// Créer l'en-tête
		const weekHeader = $(`
            <div class="calendar-header">
                <h2>Semaine du ${formatDate(monday)} au ${formatDate(sunday)}</h2>
            </div>
        `).appendTo(calendarContainer);

		// Créer la structure de la semaine
		const weekContainer = $('<div class="week-container"></div>').appendTo(calendarContainer);

		// En-tête des jours
		const daysHeader = $('<div class="week-days-header"></div>').appendTo(weekContainer);

		const daysOfWeek = [
			"Lundi",
			"Mardi",
			"Mercredi",
			"Jeudi",
			"Vendredi",
			"Samedi",
			"Dimanche",
		];

		// Créer les colonnes pour chaque jour
		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(monday);
			dayDate.setDate(monday.getDate() + i);

			const isToday =
				new Date().getDate() === dayDate.getDate() &&
				new Date().getMonth() === dayDate.getMonth() &&
				new Date().getFullYear() === dayDate.getFullYear();

			$(`
                <div class="week-day-header ${isToday ? "today" : ""}">
                    <div class="day-name">${daysOfWeek[i]}</div>
                    <div class="day-date">${formatDate(dayDate)}</div>
                </div>
            `).appendTo(daysHeader);
		}

		// Container pour les événements
		const weekGrid = $('<div class="week-grid"></div>').appendTo(weekContainer);

		// Créer les colonnes des jours pour les événements
		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(monday);
			dayDate.setDate(monday.getDate() + i);

			const isToday =
				new Date().getDate() === dayDate.getDate() &&
				new Date().getMonth() === dayDate.getMonth() &&
				new Date().getFullYear() === dayDate.getFullYear();

			const dayColumn = $(`
                <div class="week-day-column ${isToday ? "today" : ""}">
                </div>
            `).appendTo(weekGrid);

			// Ajouter les sections matin et après-midi
			const morningSection = $(`
				<div class="day-section-week">
					<div class="section-header-week" data-name="Matin">Matin</div>
					<div class="day-events-container" id="day-${i}-morning"></div>
				</div>
			`).appendTo(dayColumn);

			const afternoonSection = $(`
				<div class="day-section-week">
					<div class="section-header-week" data-name="Après-midi">Après-midi</div>
					<div class="day-events-container" id="day-${i}-afternoon"></div>
				</div>
			`).appendTo(dayColumn);
		}

		// Afficher le message de chargement
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		// Récupérer les événements pour cette semaine
		frappe.call({
			method: "josseaume_energies.api.get_week_events",
			args: {
				start_date: frappe.datetime.obj_to_str(monday),
				end_date: frappe.datetime.obj_to_str(sunday),
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					console.log("Événements de la semaine reçus:", events);

					// Organiser les événements par jour de la semaine et période
					const eventsByDay = Array(7)
						.fill()
						.map(() => ({ morning: [], afternoon: [] }));

					events.forEach((event) => {
						const eventDate = new Date(event.starts_on);
						const dayOfWeek = (eventDate.getDay() + 6) % 7; // Convertir 0-6 (dim-sam) à 0-6 (lun-dim)

						// Séparer en matin et après-midi
						if (eventDate.getHours() < 12) {
							eventsByDay[dayOfWeek].morning.push(event);
						} else {
							eventsByDay[dayOfWeek].afternoon.push(event);
						}
					});

					// Ajouter les événements à chaque colonne
					for (let i = 0; i < 7; i++) {
						const dayEvents = eventsByDay[i];

						// Traiter les événements du matin
						const morningContainer = $(`#day-${i}-morning`);
						if (dayEvents.morning.length > 0) {
							// Trier par heure
							dayEvents.morning.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);

							dayEvents.morning.forEach((event) =>
								renderWeekEventCard(event, morningContainer)
							);
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								morningContainer
							);
						}

						// Traiter les événements de l'après-midi
						const afternoonContainer = $(`#day-${i}-afternoon`);
						if (dayEvents.afternoon.length > 0) {
							// Trier par heure
							dayEvents.afternoon.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);

							dayEvents.afternoon.forEach((event) =>
								renderWeekEventCard(event, afternoonContainer)
							);
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								afternoonContainer
							);
						}
					}

					// Si aucun événement n'est trouvé pour la semaine
					if (events.length === 0) {
						$(
							'<div class="no-events-message">Aucun événement pour cette semaine</div>'
						).appendTo(calendarContainer);
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}
			},
		});
	}

	// Fonction pour rendre une carte d'événement dans la vue semaine
	function renderWeekEventCard(event, container) {
		// Déterminer la classe de couleur
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		// Récupérer les noms des participants
		const { clientName, technicianName } = getParticipantNames(event.event_participants);

		// Créer l'élément d'événement
		const eventElement = $(`
			<div class="week-event ${eventClass}" data-event-id="${event.name}">
				<div class="event-title">${event.subject}</div>
				${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
				${
					technicianName
						? `<div class="technician-info"><i class="fa fa-user-tie"></i> ${technicianName}</div>`
						: ""
				}
			</div>
		`).appendTo(container);

		// Ajouter l'interaction au clic
		eventElement.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});
	}

	// Initialiser le calendrier
	refreshCalendar();
};
