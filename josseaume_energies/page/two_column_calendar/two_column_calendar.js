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

	// Ajouter des contrôles - Garder Mois mais privilégier Jour
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Jour\nSemaine\nMois", // Garder Mois pour éviter les erreurs
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

	// Ajouter un champ de sélection pour le type d'intervention
	page.add_field({
		fieldtype: "Select",
		label: "Type d'intervention",
		fieldname: "event_type",
		options: "\nEntretien\nInstallation\nLivraison Granule\nLivraison Fuel",
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
		} else {
			currentMonth--;
			if (currentMonth < 0) {
				currentMonth = 11;
				currentYear--;
			}
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
		} else {
			currentMonth++;
			if (currentMonth > 11) {
				currentMonth = 0;
				currentYear++;
			}
		}

		// Mettre à jour le champ de date
		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}

		refreshCalendar();
	});

	// NOUVELLE FONCTION: Créer une commande client avec des valeurs par défaut
	function createNewSalesOrder(date, timeSlot) {
		try {
			// Obtenir les filtres actuels pour pré-remplir
			const territory = page.fields_dict.territory.get_value();
			const employee = page.fields_dict.employee.get_value();
			const event_type = page.fields_dict.event_type.get_value();

			// Formatter la date pour ERPNext (YYYY-MM-DD)
			const formattedDate = frappe.datetime.obj_to_str(date).split(" ")[0];

			// Création directe du document avec valeurs par défaut
			frappe.db.get_doc("DocType", "Sales Order").then((doc) => {
				// Créer un objet avec les valeurs par défaut
				const defaultValues = {
					delivery_date: formattedDate,
					custom_horaire: timeSlot,
				};

				// Ajouter les valeurs optionnelles si elles existent
				if (territory) defaultValues.territory = territory;
				if (employee) defaultValues.custom_intervenant = employee;
				if (event_type) defaultValues.custom_type_de_commande = event_type;

				// Créer le document avec les valeurs par défaut
				frappe.new_doc("Sales Order", defaultValues, (doc) => {
					// Après création et chargement, force l'actualisation des valeurs
					setTimeout(() => {
						if (cur_frm) {
							// Rétablir les valeurs au cas où elles n'ont pas été prises en compte
							cur_frm.set_value("delivery_date", formattedDate);
							cur_frm.set_value("custom_horaire", timeSlot);

							if (territory) cur_frm.set_value("territory", territory);
							if (employee) cur_frm.set_value("custom_intervenant", employee);
							if (event_type)
								cur_frm.set_value("custom_type_de_commande", event_type);

							// Forcer un refresh et un update
							cur_frm.refresh_fields();
							cur_frm.save_or_update();

							// Console log pour debug
							console.log("Date de livraison définie:", cur_frm.doc.delivery_date);
							console.log("Horaire défini:", cur_frm.doc.custom_horaire);

							// Message de confirmation
							frappe.show_alert(
								{
									message: __(
										`Commande client créée pour ${timeSlot.toLowerCase()} le ${formattedDate}`
									),
									indicator: "green",
								},
								3
							);
						}
					}, 1000); // Augmentation du délai à 1000ms
				});
			});
		} catch (error) {
			console.error("Erreur lors de la création de la commande client:", error);
			frappe.msgprint({
				title: __("Erreur"),
				indicator: "red",
				message: __("Impossible de créer la commande client: ") + error.message,
			});
		}
	}

	// NOUVELLE FONCTION: Ajouter les écouteurs de double-clic (version sécurisée)
	function addDoubleClickListeners() {
		// Supprimer les anciens écouteurs pour éviter les doublons
		$(document).off("dblclick.calendar");

		// Ajouter les nouveaux écouteurs avec namespace
		$(document).on("dblclick.calendar", '[data-name="Matin"]', function (e) {
			e.preventDefault();
			e.stopPropagation();
			createNewSalesOrder(currentDate, "Matin");
		});

		$(document).on("dblclick.calendar", '[data-name="Après-midi"]', function (e) {
			e.preventDefault();
			e.stopPropagation();
			createNewSalesOrder(currentDate, "Après-midi");
		});

		$(document).on("dblclick.calendar", '[data-name="Journée complète"]', function (e) {
			e.preventDefault();
			e.stopPropagation();
			createNewSalesOrder(currentDate, "Journée complète");
		});

		// Pour la vue semaine
		$(document).on("dblclick.calendar", ".section-title[data-name]", function (e) {
			e.preventDefault();
			e.stopPropagation();

			const sectionName = $(this).attr("data-name");
			const dayColumn = $(this).closest(".week-day-column");
			const dayIndex = $(".week-day-column").index(dayColumn);

			// Calculer la date du jour correspondant
			const viewType = page.fields_dict.view_type.get_value();
			if (viewType === "Semaine" && dayIndex >= 0) {
				// Obtenir le premier jour de la semaine (lundi)
				const current = new Date(currentDate);
				const day = current.getDay();
				const diff = current.getDate() - day + (day === 0 ? -6 : 1);
				const monday = new Date(current.setDate(diff));
				const targetDate = new Date(monday.setDate(monday.getDate() + dayIndex));

				createNewSalesOrder(targetDate, sectionName);
			}
		});

		// Ajouter les styles CSS seulement s'ils n'existent pas déjà
		if (!$("#calendar-doubleclick-styles").length) {
			$(`
				<style id="calendar-doubleclick-styles">
					[data-name="Matin"], 
					[data-name="Après-midi"], 
					[data-name="Journée complète"],
					.section-title[data-name] {
						cursor: pointer;
						transition: background-color 0.2s, transform 0.1s;
						user-select: none;
					}
					[data-name="Matin"]:hover, 
					[data-name="Après-midi"]:hover, 
					[data-name="Journée complète"]:hover,
					.section-title[data-name]:hover {
						background-color: rgba(0, 123, 255, 0.1) !important;
						transform: scale(1.02);
					}
					[data-name="Matin"]:active, 
					[data-name="Après-midi"]:active, 
					[data-name="Journée complète"]:active,
					.section-title[data-name]:active {
						transform: scale(0.98);
					}
				</style>
			`).appendTo("head");
		}
	}

	// Fonction principale pour rafraîchir le calendrier - Garder la structure existante
	function refreshCalendar() {
		const viewType = page.fields_dict.view_type.get_value();
		const territory = page.fields_dict.territory.get_value();
		const employee = page.fields_dict.employee.get_value();
		const event_type = page.fields_dict.event_type.get_value();

		calendarContainer.empty();

		if (viewType === "Jour") {
			renderTwoColumnDayView(currentDate, territory, employee, event_type);
		} else if (viewType === "Semaine") {
			renderWeekViewWithSections(currentDate, territory, employee, event_type);
		} else {
			renderMonthView(currentYear, currentMonth, territory, employee, event_type);
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

	// Fonction pour vérifier si un événement est toute la journée
	function isAllDayEvent(event) {
		return (
			event.all_day === 1 ||
			event.all_day === true ||
			event.all_day === "1" ||
			String(event.all_day).toLowerCase() === "true"
		);
	}

	// Rendu de la vue journalière à deux colonnes
	function renderTwoColumnDayView(date, territory, employee, event_type) {
		const formatDate = (d) => {
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
				.toString()
				.padStart(2, "0")}/${d.getFullYear()}`;
		};

		// Créer l'en-tête
		const dayHeader = $(`
            <div class="calendar-header">
                <h2>Journée du ${formatDate(date)} 
                    <small style="display: block; font-size: 12px; font-weight: normal; color: #666; margin-top: 5px;">
                        Double-cliquez sur une section pour créer une commande client
                    </small>
                </h2>
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
				event_type: event_type,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					console.log("Événements reçus:", events);

					const morningEvents = [];
					const afternoonEvents = [];
					const allDayEvents = [];

					// IMPORTANT: Séparer d'abord les événements par type
					const regularEvents = [];

					// Étape 1: Filtrer les événements toute la journée
					events.forEach((event) => {
						if (isAllDayEvent(event)) {
							console.log("Événement toute journée:", event.subject);
							allDayEvents.push(event);
						} else {
							// Si ce n'est pas un événement toute la journée, l'ajouter aux événements réguliers
							regularEvents.push(event);
						}
					});

					// Étape 2: Classifier les événements réguliers (non toute la journée)
					regularEvents.forEach((event) => {
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

					// Ajouter la section journée complète si nécessaire
					if (allDayEvents.length > 0) {
						$('<div data-name="Journée complète">Journée complète</div>').appendTo(
							twoColumnContainer
						);

						allDayEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					}

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

				// Ajouter les écouteurs après le rendu
				addDoubleClickListeners();
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

		// Ajouter une classe spécifique pour les événements toute la journée
		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		// Récupérer les noms des participants
		const { clientName, technicianName } = getParticipantNames(event.event_participants);

		// Créer la carte d'événement
		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<span class="event-id">${event.name}</span>
				<span class="event-title">${event.subject}</span>
				${
					isAllDayEvent(event)
						? '<span class="event-all-day-indicator"><i class="fa fa-calendar-day"></i> Toute la journée</span>'
						: ""
				}
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

	// Vue semaine avec sections matin/après-midi (implémentation simplifiée)
	function renderWeekViewWithSections(date, territory, employee, event_type) {
		// Obtenir le premier jour de la semaine (lundi)
		const current = new Date(date);
		const day = current.getDay(); // 0-6 (dim-sam)
		const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour commencer le lundi

		const monday = new Date(current.setDate(diff));
		const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));

		// Formatage des dates pour l'affichage
		const formatDate = (date) => {
			return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
				.toString()
				.padStart(2, "0")}`;
		};

		// Créer l'en-tête
		const weekHeader = $(`
            <div class="calendar-header">
                <h2>Semaine du ${formatDate(monday)} au ${formatDate(sunday)}
                    <small style="display: block; font-size: 12px; font-weight: normal; color: #666; margin-top: 5px;">
                        Double-cliquez sur une section pour créer une commande client
                    </small>
                </h2>
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
			const dayDate = new Date(new Date(monday).setDate(monday.getDate() + i));

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
				event_type: event_type,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					console.log("Événements de la semaine reçus:", events);

					// Organiser les événements par jour
					const eventsByDay = {};

					// Initialiser la structure pour chaque jour
					for (let i = 0; i < 7; i++) {
						const dayDate = new Date(new Date(monday).setDate(monday.getDate() + i));
						const dayStr = frappe.datetime.obj_to_str(dayDate).split(" ")[0];
						eventsByDay[dayStr] = { morning: [], afternoon: [], allday: [] };
					}

					// Répartir les événements par jour et période
					events.forEach((event) => {
						const eventDate = new Date(event.starts_on);
						const dayStr = event.starts_on.split(" ")[0];

						if (eventsByDay[dayStr]) {
							if (isAllDayEvent(event)) {
								eventsByDay[dayStr].allday.push(event);
							} else if (eventDate.getHours() < 12) {
								eventsByDay[dayStr].morning.push(event);
							} else {
								eventsByDay[dayStr].afternoon.push(event);
							}
						}
					});

					// Créer les colonnes pour chaque jour
					for (let i = 0; i < 7; i++) {
						const dayDate = new Date(new Date(monday).setDate(monday.getDate() + i));
						const dayStr = frappe.datetime.obj_to_str(dayDate).split(" ")[0];
						const dayEvents = eventsByDay[dayStr];

						const isToday =
							new Date().getDate() === dayDate.getDate() &&
							new Date().getMonth() === dayDate.getMonth() &&
							new Date().getFullYear() === dayDate.getFullYear();

						// Créer la colonne
						const dayColumn = $(`
							<div class="week-day-column ${isToday ? "today" : ""}">
                                <div class="day-section">
                                    <div class="section-title" data-name="Journée complète">Journée complète</div>
                                    <div class="section-events allday-events"></div>
                                </div>
								<div class="day-section">
									<div class="section-title" data-name="Matin">Matin</div>
									<div class="section-events morning-events"></div>
								</div>
								<div class="day-section">
									<div class="section-title" data-name="Après-midi">Après-midi</div>
									<div class="section-events afternoon-events"></div>
								</div>
							</div>
						`).appendTo(weekGrid);

						// Ajouter les événements toute la journée
						const alldayContainer = dayColumn.find(".allday-events");
						if (dayEvents.allday && dayEvents.allday.length > 0) {
							dayEvents.allday.forEach((event) => {
								renderWeekEvent(event, alldayContainer);
							});
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								alldayContainer
							);
						}

						// Ajouter les événements du matin
						const morningContainer = dayColumn.find(".morning-events");
						if (dayEvents.morning && dayEvents.morning.length > 0) {
							dayEvents.morning.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);
							dayEvents.morning.forEach((event) => {
								renderWeekEvent(event, morningContainer);
							});
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								morningContainer
							);
						}

						// Ajouter les événements de l'après-midi
						const afternoonContainer = dayColumn.find(".afternoon-events");
						if (dayEvents.afternoon && dayEvents.afternoon.length > 0) {
							dayEvents.afternoon.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);
							dayEvents.afternoon.forEach((event) => {
								renderWeekEvent(event, afternoonContainer);
							});
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								afternoonContainer
							);
						}
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}

				// Ajouter les écouteurs après le rendu
				addDoubleClickListeners();
			},
		});
	}

	// Fonction pour rendre un événement dans la vue semaine
	function renderWeekEvent(event, container) {
		// Déterminer la classe de couleur
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		// Ajouter une classe spécifique pour les événements toute la journée
		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		// Récupérer les noms des participants
		const { clientName, technicianName } = getParticipantNames(event.event_participants);

		// Créer l'élément d'événement
		const eventElement = $(`
			<div class="week-event ${eventClass}" data-event-id="${event.name}">
				<div class="event-title">${event.subject}</div>
				${
					isAllDayEvent(event)
						? '<span class="event-all-day-indicator"><i class="fa fa-calendar-day"></i> Toute la journée</span>'
						: ""
				}
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

	// Vue mensuelle (gardée mais cachée dans les options)
	function renderMonthView(year, month, territory, employee, event_type) {
		// Garder le code original de renderMonthView ici
		// [...]

		// Version simplifiée pour éviter les erreurs
		$(`
			<div class="calendar-header">
				<h2>Vue mensuelle non disponible</h2>
			</div>
			<div style="padding: 20px; text-align: center;">
				<p>La vue mensuelle n'est pas disponible actuellement.</p>
				<p>Veuillez utiliser la vue jour ou semaine.</p>
			</div>
		`).appendTo(calendarContainer);
	}

	// Initialiser le calendrier et les écouteurs
	refreshCalendar();
};
