frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	console.log("🚀 Début chargement calendrier");

	try {
		var page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Calendrier des Interventions",
			single_column: true,
		});
		console.log("✅ Page créée");

		// État global simple
		let currentDate = new Date();
		console.log("✅ Date initialisée");

		// Ajouter les champs un par un avec gestion d'erreur
		try {
			page.add_field({
				fieldtype: "Select",
				label: "Vue",
				fieldname: "view_type",
				options: "Jour\nEmployés\nSemaine",
				default: "Employés", // Employés par défaut
				change: function () {
					console.log("Vue changée vers:", this.get_value());
					refreshCalendar();
				},
			});
			console.log("✅ Champ Vue ajouté");
		} catch (e) {
			console.error("❌ Erreur champ Vue:", e);
		}

		try {
			page.add_field({
				fieldtype: "Select",
				label: "Équipe",
				fieldname: "team_filter",
				options:
					"\nLivraisons\nInstallations\nEntretiens/Ramonages\nDépannages Poêles\nDépannages Chauffage\nÉlectricité\nPhotovoltaïque\nBureau\nCommercial\nRénovation",
				change: function () {
					console.log("Équipe changée vers:", this.get_value());
					refreshCalendar();
				},
			});
			console.log("✅ Champ Équipe ajouté");
		} catch (e) {
			console.error("❌ Erreur champ Équipe:", e);
		}

		try {
			page.add_field({
				fieldtype: "Date",
				label: "Date",
				fieldname: "select_date",
				default: frappe.datetime.get_today(),
				change: function () {
					console.log("Date changée vers:", this.get_value());
					const selectedDate = this.get_value();
					if (selectedDate) {
						const dateParts = selectedDate.split("-");
						currentDate = new Date(
							parseInt(dateParts[0]),
							parseInt(dateParts[1]) - 1,
							parseInt(dateParts[2])
						);
						refreshCalendar();
					}
				},
			});
			console.log("✅ Champ Date ajouté");
		} catch (e) {
			console.error("❌ Erreur champ Date:", e);
		}

		// Conteneur de calendrier
		let calendarContainer = $('<div class="custom-calendar-container"></div>').appendTo(
			page.body
		);
		console.log("✅ Conteneur créé");

		// Boutons de navigation avec gestion d'erreur
		try {
			page.add_inner_button(__("Aujourd'hui"), () => {
				console.log("Bouton Aujourd'hui cliqué");
				currentDate = new Date();
				if (page.fields_dict.select_date) {
					page.fields_dict.select_date.set_value(
						frappe.datetime.obj_to_str(currentDate)
					);
				}
				refreshCalendar();
			});
			console.log("✅ Bouton Aujourd'hui ajouté");
		} catch (e) {
			console.error("❌ Erreur bouton Aujourd'hui:", e);
		}

		try {
			page.add_inner_button(__("Précédent"), () => {
				console.log("Bouton Précédent cliqué");
				currentDate.setDate(currentDate.getDate() - 1);
				if (page.fields_dict.select_date) {
					page.fields_dict.select_date.set_value(
						frappe.datetime.obj_to_str(currentDate)
					);
				}
				refreshCalendar();
			});
			console.log("✅ Bouton Précédent ajouté");
		} catch (e) {
			console.error("❌ Erreur bouton Précédent:", e);
		}

		try {
			page.add_inner_button(__("Suivant"), () => {
				console.log("Bouton Suivant cliqué");
				currentDate.setDate(currentDate.getDate() + 1);
				if (page.fields_dict.select_date) {
					page.fields_dict.select_date.set_value(
						frappe.datetime.obj_to_str(currentDate)
					);
				}
				refreshCalendar();
			});
			console.log("✅ Bouton Suivant ajouté");
		} catch (e) {
			console.error("❌ Erreur bouton Suivant:", e);
		}

		// Fonction principale de rafraîchissement
		function refreshCalendar() {
			console.log("🔄 refreshCalendar appelée");
			try {
				const viewType = page.fields_dict.view_type
					? page.fields_dict.view_type.get_value()
					: "Employés";
				console.log("Vue actuelle:", viewType);

				calendarContainer.empty();

				if (viewType === "Employés") {
					renderEmployeesView();
				} else {
					renderDayView();
				}
			} catch (error) {
				console.error("❌ Erreur dans refreshCalendar:", error);
				calendarContainer.html(`
					<div style="padding: 20px; text-align: center; color: red;">
						<h3>Erreur de chargement</h3>
						<p>Erreur: ${error.message}</p>
						<p>Vérifiez la console pour plus de détails.</p>
					</div>
				`);
			}
		}

		// Vue Employés - VERSION SUPER SIMPLE POUR TESTER
		function renderEmployeesView() {
			console.log("🧑‍💼 Rendu vue employés");
			try {
				const formatDate = (d) => {
					return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
						.toString()
						.padStart(2, "0")}/${d.getFullYear()}`;
				};

				const team_filter = page.fields_dict.team_filter
					? page.fields_dict.team_filter.get_value()
					: "";

				// En-tête
				calendarContainer.html(`
					<div class="calendar-header">
						<h2>Vue Employés - ${formatDate(currentDate)} ${team_filter ? `(Équipe: ${team_filter})` : ""}</h2>
					</div>
					<div style="padding: 20px;">
						<div class="loading-message">Chargement des employés...</div>
					</div>
				`);

				console.log("Appel API employés...");

				// Appel API sécurisé
				frappe.call({
					method: "josseaume_energies.api.get_employees_with_team_filter",
					args: {
						team_filter: team_filter || null,
					},
					callback: function (r) {
						console.log("Réponse API employés:", r);
						try {
							if (r.message && r.message.status === "success") {
								displayEmployeesSimple(r.message.employees);
							} else {
								calendarContainer
									.find(".loading-message")
									.html(
										`<div style="color: red;">Erreur API: ${
											r.message ? r.message.message : "Réponse invalide"
										}</div>`
									);
							}
						} catch (error) {
							console.error("❌ Erreur traitement réponse:", error);
							calendarContainer
								.find(".loading-message")
								.html(
									`<div style="color: red;">Erreur traitement: ${error.message}</div>`
								);
						}
					},
					error: function (error) {
						console.error("❌ Erreur API employés:", error);
						calendarContainer
							.find(".loading-message")
							.html(
								`<div style="color: red;">Erreur réseau: ${
									error.message || "Connexion échouée"
								}</div>`
							);
					},
				});
			} catch (error) {
				console.error("❌ Erreur dans renderEmployeesView:", error);
				calendarContainer.html(`
					<div style="padding: 20px; color: red;">
						Erreur vue employés: ${error.message}
					</div>
				`);
			}
		}

		// Affichage simple des employés - VERSION BASIQUE
		function displayEmployeesSimple(employees) {
			console.log("📊 Affichage employés:", employees);
			try {
				if (!employees || employees.length === 0) {
					calendarContainer.html(`
						<div class="calendar-header">
							<h2>Vue Employés</h2>
						</div>
						<div style="padding: 20px; text-align: center;">
							<p>Aucun employé trouvé pour ce filtre.</p>
						</div>
					`);
					return;
				}

				let html = `
					<div class="calendar-header">
						<h2>Vue Employés - ${employees.length} employé(s)</h2>
					</div>
					<div style="padding: 15px;">
						<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
				`;

				employees.forEach(function (employee, index) {
					console.log(`Rendu employé ${index + 1}:`, employee.employee_name);

					const teams = employee.teams ? employee.teams.join(", ") : "Aucune équipe";

					html += `
						<div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
							<div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
								<h4 style="margin: 0; color: #333;">${employee.employee_name}</h4>
								<small style="color: #666;">${employee.designation || ""}</small>
								<div style="margin-top: 5px; font-size: 11px; color: #007bff;">${teams}</div>
							</div>
							
							<div style="margin-bottom: 10px;">
								<div style="padding: 8px; background: #f8f9fa; margin: 5px 0; border-radius: 4px; border-left: 3px solid #6c757d; cursor: pointer;"
									 onclick="console.log('Journée complète cliquée pour ${employee.name}')">
									<strong>Journée complète</strong>
									<div style="font-size: 12px; color: #666; margin-top: 3px;">Aucun événement</div>
								</div>
								
								<div style="padding: 8px; background: #f8f9fa; margin: 5px 0; border-radius: 4px; border-left: 3px solid #007bff; cursor: pointer;"
									 onclick="console.log('Matin cliqué pour ${employee.name}')">
									<strong>Matin</strong>
									<div style="font-size: 12px; color: #666; margin-top: 3px;">Aucun événement</div>
								</div>
								
								<div style="padding: 8px; background: #f8f9fa; margin: 5px 0; border-radius: 4px; border-left: 3px solid #ffc107; cursor: pointer;"
									 onclick="console.log('Après-midi cliqué pour ${employee.name}')">
									<strong>Après-midi</strong>
									<div style="font-size: 12px; color: #666; margin-top: 3px;">Aucun événement</div>
								</div>
							</div>
						</div>
					`;
				});

				html += `
						</div>
						<div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
							💡 Double-cliquez sur une section pour créer une commande
						</div>
					</div>
				`;

				calendarContainer.html(html);
				console.log("✅ Employés affichés avec succès");
			} catch (error) {
				console.error("❌ Erreur dans displayEmployeesSimple:", error);
				calendarContainer.html(`
					<div style="padding: 20px; color: red;">
						Erreur affichage: ${error.message}
					</div>
				`);
			}
		}

		// Vue jour simplifiée
		function renderDayView() {
			console.log("📅 Rendu vue jour");
			try {
				const formatDate = (d) => {
					return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
						.toString()
						.padStart(2, "0")}/${d.getFullYear()}`;
				};

				calendarContainer.html(`
					<div class="calendar-header">
						<h2>Vue Jour - ${formatDate(currentDate)}</h2>
					</div>
					<div style="padding: 20px;">
						<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
							<h3>Toute la journée</h3>
							<div style="color: #666; font-style: italic;">Aucun événement</div>
						</div>
						<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
							<h3>Matin</h3>
							<div style="color: #666; font-style: italic;">Aucun événement</div>
						</div>
						<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
							<h3>Après-midi</h3>
							<div style="color: #666; font-style: italic;">Aucun événement</div>
						</div>
					</div>
				`);
				console.log("✅ Vue jour affichée");
			} catch (error) {
				console.error("❌ Erreur dans renderDayView:", error);
			}
		}

		// Initialisation sécurisée
		console.log("🎯 Initialisation du calendrier...");
		try {
			refreshCalendar();
			console.log("✅ Calendrier initialisé avec succès");
		} catch (error) {
			console.error("❌ Erreur lors de l'initialisation:", error);
			calendarContainer.html(`
				<div style="padding: 20px; text-align: center; color: red;">
					<h3>Erreur fatale d'initialisation</h3>
					<p>${error.message}</p>
					<pre>${error.stack}</pre>
				</div>
			`);
		}
	} catch (mainError) {
		console.error("🚨 ERREUR CRITIQUE:", mainError);
		// Affichage d'erreur même si tout échoue
		$(wrapper).html(`
			<div style="padding: 20px; text-align: center; color: red; font-family: monospace;">
				<h2>🚨 ERREUR CRITIQUE</h2>
				<p><strong>Message:</strong> ${mainError.message}</p>
				<p><strong>Ligne:</strong> ${mainError.line || "Inconnue"}</p>
				<pre style="text-align: left; background: #f8f8f8; padding: 10px; margin: 10px 0;">${
					mainError.stack
				}</pre>
				<hr>
				<p><strong>Actions à effectuer:</strong></p>
				<ol style="text-align: left;">
					<li>Ouvrir la console du navigateur (F12)</li>
					<li>Vérifier s'il y a d'autres erreurs</li>
					<li>Vérifier que l'API est accessible</li>
					<li>Redémarrer ERPNext: bench restart</li>
				</ol>
			</div>
		`);
	}
};
