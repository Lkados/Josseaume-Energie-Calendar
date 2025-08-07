frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des interventions",
		single_column: true,
	});

	// État global
	let currentDate = new Date();
	let currentYear = currentDate.getFullYear();
	let currentMonth = currentDate.getMonth(); // 0-11

	// Variables pour éviter les appels multiples
	let isRefreshing = false;
	let refreshTimeout = null;

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

	// Fonction utilitaire pour ajouter un debounce
	function debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Créer une version debouncée de refreshCalendar
	const debouncedRefresh = debounce(() => refreshCalendar(), 300);

	// Ajouter des contrôles - MODIFIÉ pour mettre Employés par défaut
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Employés\nJour\nSemaine\nMois", // Employés en premier
		default: "Employés", // Employés par défaut
		change: function () {
			const newViewType = this.get_value();
			console.log("Changement vue:", newViewType);
			debouncedRefresh();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			console.log("Changement zone:", this.get_value());
			debouncedRefresh();
		},
	});

	// Champ pour filtrer par équipe (visible seulement en vue Employés)
	page.add_field({
		fieldtype: "Select",
		label: "Équipe",
		fieldname: "team_filter",
		options:
			"\nLivraisons\nInstallations\nEntretiens/Ramonages\nDépannages Poêles\nDépannages Chauffage\nÉlectricité\nPhotovoltaïque\nBureau\nCommercial\nRénovation",
		change: function () {
			console.log("Changement équipe:", this.get_value());
			debouncedRefresh();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			console.log("Changement employé:", this.get_value());
			debouncedRefresh();
		},
	});

	// Ajouter un champ de sélection pour le type d'intervention
	page.add_field({
		fieldtype: "Select",
		label: "Type d'intervention",
		fieldname: "event_type",
		options: "\nEntretien\nInstallation\nLivraison Granule\nLivraison Fuel",
		change: function () {
			console.log("Changement type intervention:", this.get_value());
			debouncedRefresh();
		},
	});

	// Ajouter un champ de sélection de date
	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "select_date",
		default: frappe.datetime.get_today(),
		change: function () {
			const selectedDate = this.get_value();
			console.log("Changement date:", selectedDate);

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
			debouncedRefresh();
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

		if (viewType === "Jour" || viewType === "Employés") {
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

		if (viewType === "Jour" || viewType === "Employés") {
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

	// NOUVEAU: Ajouter un bouton pour créer une note
	page.add_inner_button(__("Ajouter Note"), () => {
		// Récupérer les filtres actuels pour pré-remplir le formulaire
		const employee = page.fields_dict.employee.get_value();
		const currentDateStr = frappe.datetime.obj_to_str(currentDate).split(" ")[0];

		// Créer un dialogue pour créer une note
		const dialog = new frappe.ui.Dialog({
			title: __("Ajouter une note"),
			fields: [
				{
					fieldtype: "Link",
					label: __("Employé"),
					fieldname: "employee",
					options: "Employee",
					reqd: 1,
					default: employee || ""
				},
				{
					fieldtype: "Date",
					label: __("Date"),
					fieldname: "note_date",
					default: currentDateStr,
					reqd: 1
				},
				{
					fieldtype: "Select",
					label: __("Horaire"),
					fieldname: "time_slot",
					options: "\nMatin\nAprès-midi\nJournée complète",
					default: "Matin"
				},
				{
					fieldtype: "Data",
					label: __("Titre"),
					fieldname: "title",
					reqd: 1
				},
				{
					fieldtype: "Small Text",
					label: __("Description"),
					fieldname: "content",
					reqd: 1
				}
			],
			primary_action_label: __("Créer Note"),
			primary_action: (values) => {
				// Appeler l'API pour créer la note
				frappe.call({
					method: "josseaume_energies.api.create_employee_note",
					args: {
						employee: values.employee,
						note_date: values.note_date,
						title: values.title,
						content: values.content,
						time_slot: values.time_slot
					},
					callback: function(r) {
						if (r.message && r.message.status === "success") {
							frappe.show_alert({
								message: __("Note créée avec succès"),
								indicator: "green"
							}, 3);
							
							// Rafraîchir le calendrier pour afficher la nouvelle note
							refreshCalendar();
							
							dialog.hide();
						} else {
							const errorMsg = r.message ? r.message.message : "Erreur lors de la création de la note";
							frappe.msgprint({
								title: __("Erreur"),
								indicator: "red",
								message: errorMsg
							});
						}
					},
					error: function(err) {
						console.error("Erreur API:", err);
						frappe.msgprint({
							title: __("Erreur"),
							indicator: "red",
							message: __("Erreur de connexion lors de la création de la note")
						});
					}
				});
			},
			secondary_action_label: __("Annuler")
		});

		dialog.show();
	}, "octicon octicon-note");

	// NOUVELLE FONCTION: Ouvrir un nouveau formulaire de commande avec date, horaire et employé pré-remplis
	function createNewSalesOrder(date, timeSlot, employeeId = null) {
		try {
			// Obtenir les filtres actuels pour pré-remplir
			const territory = page.fields_dict.territory.get_value();
			const employee = employeeId || page.fields_dict.employee.get_value();
			const event_type = page.fields_dict.event_type.get_value();

			// Formatter la date pour ERPNext (YYYY-MM-DD)
			const formattedDate = frappe.datetime.obj_to_str(date).split(" ")[0];

			// Naviguer simplement vers le formulaire de nouvelle commande client
			frappe.set_route("Form", "Sales Order", "new");

			// Après navigation, appliquer les valeurs aux champs sans sauvegarder
			frappe.after_ajax(() => {
				// Attendre que le formulaire soit complètement chargé
				setTimeout(() => {
					if (cur_frm) {
						// Bloquer temporairement la validation pour éviter des avertissements
						cur_frm.set_value("delivery_date", formattedDate);
						cur_frm.set_value("custom_horaire", timeSlot);

						if (territory) cur_frm.set_value("territory", territory);
						if (employee) cur_frm.set_value("custom_intervenant", employee);
						if (event_type) cur_frm.set_value("custom_type_de_commande", event_type);

						// Rafraîchir les champs sans tenter de sauvegarder
						cur_frm.refresh_fields();

						// Afficher un message indiquant que les champs ont été remplis
						frappe.show_alert(
							{
								message: __(
									`Formulaire ouvert pour ${timeSlot.toLowerCase()} le ${formattedDate}`
								),
								indicator: "blue",
							},
							3
						);

						// Console log pour debug
						console.log("Date de livraison définie:", cur_frm.doc.delivery_date);
						console.log("Horaire défini:", cur_frm.doc.custom_horaire);
						console.log("Employé défini:", cur_frm.doc.custom_intervenant);
					}
				}, 1000);
			});
		} catch (error) {
			console.error("Erreur lors de l'ouverture du formulaire:", error);
			frappe.msgprint({
				title: __("Erreur"),
				indicator: "red",
				message: __("Impossible d'ouvrir le formulaire: ") + error.message,
			});
		}
	}

	// NOUVELLE FONCTION: Ajouter les écouteurs de double-clic pour la vue employés
	function addDoubleClickListeners() {
		// Supprimer les anciens écouteurs pour éviter les doublons
		$(document).off("dblclick.calendar");

		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Employés") {
			// Pour la vue employés, ajouter l'ID de l'employé
			$(document).on(
				"dblclick.calendar",
				".employee-section-title[data-name][data-employee]",
				function (e) {
					e.preventDefault();
					e.stopPropagation();

					const sectionName = $(this).attr("data-name");
					const employeeId = $(this).attr("data-employee");
					createNewSalesOrder(currentDate, sectionName, employeeId);
				}
			);
		} else {
			// Pour les autres vues, garder le comportement existant
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
		}

		// Ajouter les styles CSS seulement s'ils n'existent pas déjà
		if (!$("#calendar-doubleclick-styles").length) {
			$(`
				<style id="calendar-doubleclick-styles">
					[data-name="Matin"], 
					[data-name="Après-midi"], 
					[data-name="Journée complète"],
					.section-title[data-name],
					.employee-section-title[data-name] {
						cursor: pointer;
						transition: background-color 0.2s, transform 0.1s;
						user-select: none;
					}
					[data-name="Matin"]:hover, 
					[data-name="Après-midi"]:hover, 
					[data-name="Journée complète"]:hover,
					.section-title[data-name]:hover,
					.employee-section-title[data-name]:hover {
						background-color: rgba(0, 123, 255, 0.1) !important;
						transform: scale(1.02);
					}
					[data-name="Matin"]:active, 
					[data-name="Après-midi"]:active, 
					[data-name="Journée complète"]:active,
					.section-title[data-name]:active,
					.employee-section-title[data-name]:active {
						transform: scale(0.98);
					}
				</style>
			`).appendTo("head");
		}
	}

	// FONCTION MISE À JOUR: Gérer la visibilité des champs selon la vue sélectionnée
	function updateFieldVisibility() {
		try {
			const viewType = page.fields_dict.view_type.get_value();
			console.log("Mise à jour visibilité des champs pour la vue:", viewType);

			// Supprimer les anciens messages d'information
			$(".view-info-message").remove();

			// CORRECTION: Afficher tous les filtres pour toutes les vues
			// Tous les filtres sont toujours visibles

			// Afficher Zone
			if (page.fields_dict.territory && page.fields_dict.territory.wrapper) {
				page.fields_dict.territory.wrapper.show();
			}

			// Afficher Intervenant
			if (page.fields_dict.employee && page.fields_dict.employee.wrapper) {
				page.fields_dict.employee.wrapper.show();
			}

			// Afficher Type d'intervention
			if (page.fields_dict.event_type && page.fields_dict.event_type.wrapper) {
				page.fields_dict.event_type.wrapper.show();
			}

			// Afficher Équipe seulement pour la vue Employés
			if (viewType === "Employés") {
				if (page.fields_dict.team_filter && page.fields_dict.team_filter.wrapper) {
					page.fields_dict.team_filter.wrapper.show();
				}

				// Ajouter un message informatif
				if (page.fields_dict.team_filter && page.fields_dict.team_filter.wrapper) {
					page.fields_dict.team_filter.wrapper.after(`
						<div class="view-info-message" style="
							font-size: 12px; 
							color: #666; 
							margin-top: 5px; 
							padding: 8px; 
							background-color: #f8f9fa; 
							border-radius: 4px;
							border-left: 3px solid #007bff;
						">
							<i class="fa fa-info-circle"></i> Vue Employés : Tous les filtres sont actifs. Le filtre équipe permet de filtrer les employés affichés.
						</div>
					`);
				}
			} else {
				// Masquer Équipe pour les autres vues
				if (page.fields_dict.team_filter && page.fields_dict.team_filter.wrapper) {
					page.fields_dict.team_filter.wrapper.hide();
				}

				// Ajouter un message informatif selon la vue
				let infoMessage = "";
				if (viewType === "Jour") {
					infoMessage =
						'<i class="fa fa-calendar-day"></i> Vue Jour : Tous les filtres sont actifs';
				} else if (viewType === "Semaine") {
					infoMessage =
						'<i class="fa fa-calendar-week"></i> Vue Semaine : Tous les filtres sont actifs';
				} else if (viewType === "Mois") {
					infoMessage =
						'<i class="fa fa-calendar"></i> Vue Mois : Tous les filtres sont actifs';
				}

				if (
					infoMessage &&
					page.fields_dict.event_type &&
					page.fields_dict.event_type.wrapper
				) {
					page.fields_dict.event_type.wrapper.after(`
						<div class="view-info-message" style="
							font-size: 12px; 
							color: #666; 
							margin-top: 5px; 
							padding: 8px; 
							background-color: #f8f9fa; 
							border-radius: 4px;
							border-left: 3px solid #28a745;
						">
							${infoMessage}
						</div>
					`);
				}
			}

			// Ajouter un effet de transition pour rendre le changement plus fluide
			$(".form-control").each(function () {
				$(this).closest(".frappe-control").css("transition", "opacity 0.3s ease");
			});
		} catch (error) {
			console.error("Erreur lors de la mise à jour de la visibilité des champs:", error);
		}
	}

	// NOUVELLE FONCTION: Nettoyage forcé du conteneur
	function forceCleanContainer() {
		try {
			console.log("Nettoyage forcé du conteneur");

			// Supprimer tous les écouteurs d'événements liés au calendrier
			$(document).off("dblclick.calendar");
			$(document).off("click.calendar");

			// Vider complètement le conteneur
			calendarContainer.empty();

			// Forcer la suppression des éléments cachés ou en cours de rendu
			calendarContainer.html("");

			// Supprimer les styles dynamiques précédents
			$("#calendar-doubleclick-styles").remove();

			// Attendre un tick pour s'assurer que le DOM est nettoyé
			setTimeout(() => {
				calendarContainer.removeClass().addClass("custom-calendar-container");
			}, 10);
		} catch (error) {
			console.error("Erreur lors du nettoyage:", error);
		}
	}

	// FONCTION CORRIGÉE: refreshCalendar avec protection contre les appels multiples
	function refreshCalendar() {
		try {
			// Annuler le timeout précédent s'il existe
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}

			// Empêcher les appels multiples simultanés
			if (isRefreshing) {
				console.log("Refresh en cours, appel ignoré");
				return;
			}

			// Débounce : attendre un court délai pour éviter les appels rapides
			refreshTimeout = setTimeout(() => {
				performRefresh();
			}, 100);
		} catch (error) {
			console.error("Erreur lors de l'initialisation du refresh:", error);
			isRefreshing = false;
		}
	}

	// NOUVELLE FONCTION: Effectuer le refresh réel
	function performRefresh() {
		try {
			isRefreshing = true;
			console.log("=== DÉBUT REFRESH CALENDRIER ===");

			const viewType = page.fields_dict.view_type.get_value();
			const territory = page.fields_dict.territory.get_value();
			const employee = page.fields_dict.employee.get_value();
			const event_type = page.fields_dict.event_type.get_value();
			const team_filter = page.fields_dict.team_filter.get_value();

			console.log("Paramètres refresh:", {
				viewType,
				territory,
				employee,
				event_type,
				team_filter,
			});

			// Mettre à jour la visibilité des champs
			updateFieldVisibility();

			// NETTOYAGE COMPLET ET FORCÉ
			forceCleanContainer();

			if (viewType === "Employés") {
				console.log("Rendu vue Employés");
				// CORRECTION: Passer TOUS les filtres à la vue employés
				renderEmployeeDayView(currentDate, territory, employee, event_type, team_filter);
			} else if (viewType === "Jour") {
				console.log("Rendu vue Jour");
				renderTwoColumnDayView(currentDate, territory, employee, event_type);
			} else if (viewType === "Semaine") {
				console.log("Rendu vue Semaine");
				renderWeekViewWithSections(currentDate, territory, employee, event_type);
			} else {
				console.log("Rendu vue Mois");
				renderMonthView(currentYear, currentMonth, territory, employee, event_type);
			}

			console.log("=== FIN REFRESH CALENDRIER ===");
		} catch (error) {
			console.error("Erreur lors du rafraîchissement du calendrier:", error);
			calendarContainer.empty();
			$('<div class="error-message">Erreur lors du chargement du calendrier</div>').appendTo(
				calendarContainer
			);
		} finally {
			// Libérer le verrou après un délai pour s'assurer que tout est terminé
			setTimeout(() => {
				isRefreshing = false;
			}, 500);
		}
	}

	// NOUVELLE FONCTION: Dédupliquer les employés
	function deduplicateEmployees(employees) {
		const seen = new Map();
		const deduplicated = [];

		employees.forEach((employee) => {
			const key = employee.name; // Utiliser l'ID unique de l'employé

			if (!seen.has(key)) {
				seen.set(key, true);
				deduplicated.push(employee);
			} else {
				console.log("Doublon détecté et supprimé:", employee.name, employee.employee_name);
			}
		});

		return deduplicated;
	}

	// NOUVELLE FONCTION: Nettoyer les événements corrompus
	function cleanEvents(events) {
		if (!Array.isArray(events)) {
			return [];
		}

		return events.filter((event) => {
			// Filtrer les événements avec des données suspectes
			if (!event || typeof event !== "object") {
				return false;
			}

			// Vérifier que l'événement a un sujet valide
			if (!event.subject || typeof event.subject !== "string") {
				return false;
			}

			// Filtrer les sujets qui contiennent des commandes git ou autres données corrompues
			const suspiciousPatterns = [
				/git\s+(reset|push|commit|pull)/i,
				/--hard|--force/i,
				/\b[a-f0-9]{7,40}\b/i, // Hash git
			];

			for (const pattern of suspiciousPatterns) {
				if (pattern.test(event.subject)) {
					console.warn("Événement avec données suspectes filtré:", event.subject);
					return false;
				}
			}

			return true;
		});
	}

	// FONCTION AMÉLIORÉE: Nettoyer le texte avec limitation de longueur pour les commentaires
	function sanitizeText(text) {
		if (!text || typeof text !== "string") {
			return "";
		}

		// Supprimer les caractères de contrôle et les séquences suspectes
		let cleaned = text
			.replace(/[\x00-\x1F\x7F]/g, "") // Caractères de contrôle
			.replace(/git\s+reset.*$/gi, "") // Commandes git
			.replace(/<[^>]*>/g, "") // Balises HTML simples
			.trim();

		// Limiter la longueur des commentaires pour l'affichage
		if (cleaned.length > 100) {
			cleaned = cleaned.substring(0, 97) + "...";
		}

		return cleaned;
	}

	// NOUVELLE FONCTION: Détermination plus robuste du type d'événement
	function determineEventClass(event, cleanSubject) {
		try {
			// 1. Vérifier d'abord le type dans les informations de commande client
			if (event.sales_order_info && event.sales_order_info.type) {
				const orderType = event.sales_order_info.type.toLowerCase();

				if (orderType.includes("entretien")) {
					return "event-entretien";
				}
				if (orderType.includes("installation")) {
					return "event-installation";
				}
				if (orderType.includes("livraison")) {
					return "event-livraison";
				}
				if (orderType.includes("dépannage") || orderType.includes("depannage")) {
					return "event-depannage";
				}
			}

			// 2. Analyser le sujet de l'événement
			const subject = cleanSubject.toLowerCase();

			// Codes spécifiques pour les entretiens
			const entretienCodes = ["epg", "ecg", "ecfbt", "ecfc", "ecgazbt", "ecgazc", "ramo"];
			for (const code of entretienCodes) {
				if (subject.includes(code.toLowerCase())) {
					return "event-entretien";
				}
			}

			// Mots-clés pour les entretiens
			if (
				subject.includes("entretien") ||
				subject.includes("ramonage") ||
				subject.includes("maintenance")
			) {
				return "event-entretien";
			}

			// Code spécifique EPGZ
			if (subject.includes("epgz")) {
				return "event-epgz";
			}

			// Mots-clés pour les installations
			if (
				subject.includes("install") ||
				subject.includes("pose") ||
				subject.includes("poêle") ||
				subject.includes("poele") ||
				subject.includes("chaudière") ||
				subject.includes("chaudiere")
			) {
				return "event-installation";
			}

			// Mots-clés pour les livraisons
			if (
				subject.includes("livraison") ||
				subject.includes("livr") ||
				subject.includes("granule") ||
				subject.includes("pellet") ||
				subject.includes("fuel") ||
				subject.includes("fioul")
			) {
				return "event-livraison";
			}

			// Mots-clés pour les dépannages
			if (
				subject.includes("dépannage") ||
				subject.includes("depannage") ||
				subject.includes("réparation") ||
				subject.includes("reparation") ||
				subject.includes("panne")
			) {
				return "event-depannage";
			}

			// 3. Analyser la description si disponible
			if (event.description) {
				const description = event.description.toLowerCase();

				if (
					description.includes("entretien") ||
					description.includes("epg") ||
					description.includes("ecg") ||
					description.includes("ramo")
				) {
					return "event-entretien";
				}
				if (description.includes("epgz")) {
					return "event-epgz";
				}
				if (description.includes("installation") || description.includes("pose")) {
					return "event-installation";
				}
				if (description.includes("livraison")) {
					return "event-livraison";
				}
				if (description.includes("dépannage") || description.includes("depannage")) {
					return "event-depannage";
				}
			}

			// 4. Fallback par défaut
			return "event-default";
		} catch (error) {
			console.error("Erreur lors de la détermination du type d'événement:", error);
			return "event-default";
		}
	}

	// FONCTION AMÉLIORÉE: Récupération des informations d'événement avec commentaires et nouveaux champs client
	function getCleanEventInfo(event) {
		let clientName = "";
		let technicianName = "";
		let comments = "";
		let customerAppareil = "";
		let customerCamion = "";

		try {
			// DEBUG: Log des données reçues
			console.log(
				"getCleanEventInfo pour event:",
				event.name,
				"sales_order_info:",
				event.sales_order_info
			);

			// Priorité 1: Utiliser les informations de la commande client si disponibles
			if (event.sales_order_info) {
				clientName = sanitizeText(event.sales_order_info.customer_name) || "";
				technicianName = sanitizeText(event.sales_order_info.employee_name) || "";

				// AMÉLIORATION: Récupération plus robuste des commentaires
				const rawComments =
					event.sales_order_info.comments ||
					event.sales_order_info.custom_commentaire ||
					"";
				comments = sanitizeText(rawComments);

				// NOUVEAU: Récupération des nouveaux champs client
				customerAppareil = sanitizeText(event.sales_order_info.customer_appareil) || "";
				customerCamion = sanitizeText(event.sales_order_info.customer_camion) || "";

				console.log("Nouveaux champs client extraits:", {
					customerAppareil: customerAppareil,
					customerCamion: customerCamion,
				});
			} else if (event.event_participants && Array.isArray(event.event_participants)) {
				// Priorité 2: Fallback sur les participants de l'événement
				for (const participant of event.event_participants) {
					try {
						if (participant.reference_doctype === "Customer") {
							clientName =
								sanitizeText(
									participant.full_name || participant.reference_docname
								) || "";
						} else if (participant.reference_doctype === "Employee") {
							technicianName =
								sanitizeText(
									participant.full_name || participant.reference_docname
								) || "";
						}
					} catch (participantError) {
						console.warn("Erreur participant:", participantError);
					}
				}
			}

			// AMÉLIORATION: Récupération alternative des commentaires depuis la description de l'événement
			if (!comments && event.description) {
				const descriptionMatch = event.description.match(
					/<strong>Commentaires:<\/strong>\s*([^<]+)/i
				);
				if (descriptionMatch) {
					comments = sanitizeText(descriptionMatch[1].trim());
					console.log("Comments récupérés depuis description:", comments);
				}
			}

			// NOUVEAU: Récupération alternative des champs client depuis la description
			if (!customerAppareil && event.description) {
				const appareilMatch = event.description.match(
					/<strong>Appareil:<\/strong>\s*([^<]+)/i
				);
				if (appareilMatch) {
					customerAppareil = sanitizeText(appareilMatch[1].trim());
				}
			}

			if (!customerCamion && event.description) {
				const camionMatch = event.description.match(
					/<strong>Camion requis:<\/strong>\s*([^<]+)/i
				);
				if (camionMatch) {
					customerCamion = sanitizeText(camionMatch[1].trim());
				}
			}

			// Nettoyer les commentaires qui pourraient contenir des données corrompues
			if (comments) {
				const suspiciousPatterns = [/git\s+(reset|push|commit|pull)/i, /--hard|--force/i];

				for (const pattern of suspiciousPatterns) {
					if (pattern.test(comments)) {
						console.warn("Commentaire suspect nettoyé:", comments);
						comments = ""; // Vider complètement si suspect
						break;
					}
				}
			}

			console.log("Résultat final getCleanEventInfo:", {
				clientName,
				technicianName,
				comments,
				customerAppareil,
				customerCamion,
			});
		} catch (error) {
			console.warn("Erreur lors de l'extraction des infos événement:", error);
		}

		return { clientName, technicianName, comments, customerAppareil, customerCamion };
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

	// FONCTION CORRIGÉE: renderEmployeeDayView avec tous les filtres
	function renderEmployeeDayView(date, territory, employee, event_type, team_filter) {
		try {
			console.log("=== DÉBUT renderEmployeeDayView ===", {
				date,
				territory,
				employee,
				event_type,
				team_filter,
			});

			const formatDate = (d) => {
				return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
					.toString()
					.padStart(2, "0")}/${d.getFullYear()}`;
			};

			// Vérifier que le conteneur est bien vide
			if (calendarContainer.children().length > 0) {
				console.warn("Le conteneur n'était pas vide, nettoyage forcé");
				forceCleanContainer();
			}

			// Créer l'en-tête avec tous les filtres actifs
			let headerTitle = `Employés - ${formatDate(date)}`;
			let activeFilters = [];

			if (team_filter) activeFilters.push(`Équipe: ${team_filter}`);
			if (territory) activeFilters.push(`Zone: ${territory}`);
			if (employee) activeFilters.push(`Intervenant: ${employee}`);
			if (event_type) activeFilters.push(`Type: ${event_type}`);

			if (activeFilters.length > 0) {
				headerTitle += ` (${activeFilters.join(", ")})`;
			}

			const dayHeader = $(`
				<div class="calendar-header">
					<h2>${headerTitle}
						<small style="display: block; font-size: 12px; font-weight: normal; color: #666; margin-top: 5px;">
							Double-cliquez sur une section pour créer une commande client
						</small>
					</h2>
				</div>
			`).appendTo(calendarContainer);

			// Afficher le message de chargement
			const loadingMessage = $(
				'<div class="loading-message">Chargement des employés et événements...</div>'
			).appendTo(calendarContainer);

			const dateStr = frappe.datetime.obj_to_str(date);

			// CORRECTION: Utiliser la fonction API mise à jour qui prend tous les filtres
			frappe.call({
				method: "josseaume_energies.api.get_day_events_by_employees",
				args: {
					date: dateStr,
					team_filter: team_filter,
					territory: territory,
					employee: employee,
					event_type: event_type,
				},
				callback: function (r) {
					try {
						console.log("=== CALLBACK API ===");
						loadingMessage.remove();

						if (r.message && r.message.status === "success") {
							const data = r.message;
							let employees = data.employees || [];
							const eventsByEmployee = data.events_by_employee || {};

							console.log("Données brutes reçues:", data);
							console.log("Employés avant déduplication:", employees.length);

							// CORRECTION 1: Dédupliquer les employés par ID
							employees = deduplicateEmployees(employees);
							console.log("Employés après déduplication:", employees.length);

							if (employees.length === 0) {
								let noEmployeesMessage = "Aucun employé trouvé";
								if (team_filter) {
									noEmployeesMessage += ` pour l'équipe "${team_filter}"`;
								}
								if (employee) {
									noEmployeesMessage += ` correspondant à "${employee}"`;
								}

								$(
									`<div class="no-events-message">${noEmployeesMessage}</div>`
								).appendTo(calendarContainer);
								return;
							}

							// Vérifier si le conteneur a déjà une grille (protection contre double rendu)
							if (calendarContainer.find(".employees-grid-responsive").length > 0) {
								console.warn("Grille d'employés déjà présente, abandon du rendu");
								return;
							}

							// Créer le conteneur en grille pour les employés
							const employeesGrid = $(
								'<div class="employees-grid-responsive"></div>'
							).appendTo(calendarContainer);

							// CORRECTION 2: Utiliser un Set pour éviter les doublons lors de l'affichage
							const processedEmployees = new Set();

							// Créer une colonne pour chaque employé
							employees.forEach((employee_data, index) => {
								try {
									// Éviter les doublons
									if (processedEmployees.has(employee_data.name)) {
										console.log(
											"Employé déjà traité, ignoré:",
											employee_data.name
										);
										return;
									}
									processedEmployees.add(employee_data.name);

									console.log(
										`Création colonne employé ${index + 1}/${
											employees.length
										}:`,
										employee_data.employee_name
									);
									createEmployeeColumn(
										employee_data,
										eventsByEmployee,
										employeesGrid
									);
								} catch (empError) {
									console.error(
										"Erreur lors de la création de la colonne employé:",
										empError
									);
								}
							});

							console.log(
								"Employés effectivement affichés:",
								processedEmployees.size
							);

							// Ajouter les écouteurs APRÈS le rendu complet
							setTimeout(() => {
								addDoubleClickListeners();
							}, 100);
						} else {
							const errorMessage = r.message ? r.message.message : "Erreur inconnue";
							$(
								`<div class="error-message">Erreur lors du chargement des employés: ${errorMessage}</div>`
							).appendTo(calendarContainer);
						}

						console.log("=== FIN CALLBACK API ===");
					} catch (callbackError) {
						console.error("Erreur dans le callback:", callbackError);
						loadingMessage.remove();
						$(
							'<div class="error-message">Erreur lors du traitement des données</div>'
						).appendTo(calendarContainer);
					}
				},
				error: function (err) {
					console.error("Erreur API:", err);
					loadingMessage.remove();
					$('<div class="error-message">Erreur de connexion à l\'API</div>').appendTo(
						calendarContainer
					);
				},
			});

			console.log("=== FIN renderEmployeeDayView (appel API lancé) ===");
		} catch (error) {
			console.error("Erreur générale dans renderEmployeeDayView:", error);
			calendarContainer.empty();
			$(
				'<div class="error-message">Erreur lors de l\'initialisation de la vue</div>'
			).appendTo(calendarContainer);
		}
	}

	// FONCTION CORRIGÉE: createEmployeeColumn avec protection contre les données corrompues
	function createEmployeeColumn(employee, eventsByEmployee, employeesGrid) {
		try {
			const employeeEvents = eventsByEmployee[employee.name] || {
				all_day: [],
				morning: [],
				afternoon: [],
			};

			// CORRECTION 3: Nettoyer les événements corrompus
			const cleanedEvents = {
				all_day: cleanEvents(employeeEvents.all_day || []),
				morning: cleanEvents(employeeEvents.morning || []),
				afternoon: cleanEvents(employeeEvents.afternoon || []),
			};

			// Créer la colonne employé en utilisant les classes CSS existantes
			const employeeColumn = $(`
				<div class="employee-column">
					<div class="employee-header">
						<h4>${sanitizeText(employee.employee_name) || "Nom non défini"}</h4>
						<small>${sanitizeText(employee.designation) || ""}</small>
						${createTeamsDisplay(employee.teams)}
					</div>
					<div class="employee-events"></div>
				</div>
			`).appendTo(employeesGrid);

			const eventsContainer = employeeColumn.find(".employee-events");

			// Ajouter les sections
			createEmployeeSection(
				eventsContainer,
				"Journée complète",
				employee.name,
				cleanedEvents.all_day
			);
			createEmployeeSection(eventsContainer, "Matin", employee.name, cleanedEvents.morning);
			createEmployeeSection(
				eventsContainer,
				"Après-midi",
				employee.name,
				cleanedEvents.afternoon
			);
		} catch (error) {
			console.error("Erreur lors de la création de la colonne employé:", error);
		}
	}

	// Fonction helper pour afficher les équipes
	function createTeamsDisplay(teams) {
		if (teams && teams.length > 0) {
			return `<div style="margin-top: 5px; font-size: 11px; color: #007bff;">${teams.join(
				", "
			)}</div>`;
		}
		return "";
	}

	// Fonction helper pour créer une section employé
	function createEmployeeSection(container, sectionName, employeeId, events) {
		try {
			// Ajouter le titre de section en utilisant la classe CSS existante
			$(`<div class="employee-section-title" data-name="${sectionName}" data-employee="${employeeId}">
				${sectionName}
			</div>`).appendTo(container);

			// Ajouter les événements
			if (events && events.length > 0) {
				events.forEach((event) => {
					renderEmployeeEventCard(event, container);
				});
			} else {
				$('<div class="no-events">Aucun événement</div>').appendTo(container);
			}
		} catch (error) {
			console.error("Erreur lors de la création de la section:", error);
		}
	}

	// FONCTION AMÉLIORÉE: renderEmployeeEventCard avec affichage des commentaires et nouveaux champs client
	function renderEmployeeEventCard(event, container) {
		try {
			if (!event || !container || !event.name) {
				console.warn("Événement/Note invalide ou conteneur manquant");
				return;
			}

			// Vérifier si c'est une note ou un événement
			const isNote = event.is_note === true;
			
			// Nettoyer et valider les données
			const cleanSubject = sanitizeText(event.subject) || (isNote ? "Note sans titre" : "Événement sans titre");

			let eventClass, borderColor, icon, docType;
			
			if (isNote) {
				// Style pour les notes
				eventClass = "employee-note";
				borderColor = "#9c27b0"; // Violet pour les notes
				icon = "fa-sticky-note";
				docType = "Note";
			} else {
				// Style pour les événements (code existant)
				eventClass = determineEventClass(event, cleanSubject);
				
				// Ajouter une classe spécifique pour les événements toute la journée
				if (isAllDayEvent(event)) {
					eventClass += " event-all-day";
				}
				
				icon = "fa-calendar";
				docType = "Event";
			}

			let cardContent = "";
			
			if (isNote) {
				// Contenu spécifique aux notes - seulement titre et description
				const noteContent = event.content ? sanitizeText(event.content) : "";
				
				cardContent = `
					<div style="font-weight: 600; margin-bottom: 3px; color: #9c27b0;">
						<i class="fa ${icon}" style="margin-right: 4px;"></i>${cleanSubject}
					</div>
					${noteContent ? `<div style="color: #666; font-size: 11px; line-height: 1.3; word-wrap: break-word;">${noteContent}</div>` : ""}
				`;
			} else {
				// Contenu spécifique aux événements (code existant)
				const { clientName, technicianName, comments, customerAppareil, customerCamion } =
					getCleanEventInfo(event);

				cardContent = `
					<div style="font-weight: 600; margin-bottom: 3px; color:rgb(165, 165, 165);">
						<i class="fa ${icon}" style="margin-right: 4px;"></i>${cleanSubject}
					</div>
					${
						isAllDayEvent(event)
							? '<div style="color: var(--color-allday); font-size: 10px; margin-bottom: 3px;"><i class="fa fa-calendar-day"></i> Toute la journée</div>'
							: ""
					}
					${
						clientName
							? `<div style="color: #2196f3; font-size: 11px; margin-bottom: 2px;"><i class="fa fa-user" style="margin-right: 4px;"></i> ${clientName}</div>`
							: ""
					}
					${
						customerAppareil
							? `<div style="color:rgb(205, 203, 202); font-size: 10px; margin-bottom: 2px;"><i class="fa fa-cog" style="margin-right: 4px;"></i> ${customerAppareil}</div>`
							: ""
					}
					${
						customerCamion && customerCamion !== "Aucun"
							? `<div style="color: #ff9800; font-size: 10px; margin-bottom: 2px;"><i class="fa fa-truck" style="margin-right: 4px;"></i> ${customerCamion}</div>`
							: ""
					}
					${
						comments && comments.trim() !== ""
							? `<div style="color: #6c757d; font-size: 10px; margin-top: 3px; font-style: italic; line-height: 1.3; word-wrap: break-word;"><i class="fa fa-comment" style="margin-right: 4px;"></i> ${comments}</div>`
							: ""
					}
				`;
			}

			// Créer la carte avec des styles appropriés
			const eventCard = $(`
				<div class="${eventClass}" data-event-id="${event.name}" data-doc-type="${docType}" style="
					margin-bottom: 6px;
					padding: 8px 10px;
					border-radius: 4px;
					border-left: 4px solid ${isNote ? borderColor : ''};
					box-shadow: var(--shadow-sm);
					cursor: pointer;
					transition: all 0.2s;
					font-size: 12px;
					${isNote ? 'background-color: rgba(156, 39, 176, 0.05);' : ''}
				">
					${cardContent}
				</div>
			`).appendTo(container);

			// Ajouter l'interaction au clic
			eventCard.on("click", function () {
				try {
					frappe.set_route("Form", docType, event.name);
				} catch (clickError) {
					console.error("Erreur lors du clic:", clickError);
				}
			});

			// Effet hover amélioré
			eventCard
				.on("mouseenter", function () {
					$(this)
						.css("transform", "translateY(-2px)")
						.css("box-shadow", "var(--shadow-lg)");
				})
				.on("mouseleave", function () {
					$(this)
						.css("transform", "translateY(0)")
						.css("box-shadow", "var(--shadow-sm)");
				});
		} catch (error) {
			console.error("Erreur lors de la création de la carte événement/note:", error);
		}
	}

	// Rendu de la vue journalière à deux colonnes (code existant conservé)
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

	// FONCTION AMÉLIORÉE: renderTwoColumnEventCard pour cohérence des couleurs et nouveaux champs
	function renderTwoColumnEventCard(event, container) {
		// Utiliser la même logique de détection que pour la vue employé
		const cleanSubject = sanitizeText(event.subject) || "Événement sans titre";
		let eventClass = determineEventClass(event, cleanSubject);

		// Ajouter une classe spécifique pour les événements toute la journée
		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		// Récupérer les informations depuis les données directes de la commande client
		const { clientName, technicianName, comments, customerAppareil, customerCamion } =
			getCleanEventInfo(event);

		// Créer la carte d'événement avec les commentaires et nouveaux champs
		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<span class="event-id">${event.name}</span>
				<span class="event-title">${cleanSubject}</span>
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
				${
					customerAppareil
						? `<div class="appareil-info"><i class="fa fa-cog"></i> ${customerAppareil}</div>`
						: ""
				}
				${
					customerCamion && customerCamion !== "Aucun"
						? `<div class="camion-info"><i class="fa fa-truck"></i> ${customerCamion}</div>`
						: ""
				}
				${comments ? `<div class="event-comments"><i class="fa fa-comment"></i> ${comments}</div>` : ""}
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

	// FONCTION AMÉLIORÉE: renderWeekEvent pour cohérence des couleurs et nouveaux champs
	function renderWeekEvent(event, container) {
		// Utiliser la même logique de détection que pour les autres vues
		const cleanSubject = sanitizeText(event.subject) || "Événement sans titre";
		let eventClass = "week-event " + determineEventClass(event, cleanSubject);

		// Ajouter une classe spécifique pour les événements toute la journée
		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		// Récupérer les informations depuis les données directes de la commande client
		const { clientName, technicianName, comments, customerAppareil, customerCamion } =
			getCleanEventInfo(event);

		// Créer l'élément d'événement avec les commentaires et nouveaux champs
		const eventElement = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<div class="event-title">${cleanSubject}</div>
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
				${
					customerAppareil
						? `<div class="appareil-info"><i class="fa fa-cog"></i> ${customerAppareil}</div>`
						: ""
				}
				${
					customerCamion && customerCamion !== "Aucun"
						? `<div class="camion-info"><i class="fa fa-truck"></i> ${customerCamion}</div>`
						: ""
				}
				${comments ? `<div class="event-comments"><i class="fa fa-comment"></i> ${comments}</div>` : ""}
			</div>
		`).appendTo(container);

		// Ajouter l'interaction au clic
		eventElement.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});
	}

	// Vue mensuelle (gardée mais cachée dans les options)
	function renderMonthView(year, month, territory, employee, event_type) {
		// Version simplifiée pour éviter les erreurs
		$(`
			<div class="calendar-header">
				<h2>Vue mensuelle non disponible</h2>
			</div>
			<div style="padding: 20px; text-align: center;">
				<p>La vue mensuelle n'est pas disponible actuellement.</p>
				<p>Veuillez utiliser la vue jour, semaine ou employés.</p>
			</div>
		`).appendTo(calendarContainer);
	}

	// Initialiser le calendrier et les écouteurs
	refreshCalendar();
};
