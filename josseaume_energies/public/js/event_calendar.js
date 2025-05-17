frappe.views.calendar["Event"] = {
	field_map: {
		start: "starts_on",
		end: "ends_on",
		id: "name",
		title: "subject",
		allDay: "all_day",
	},
	options: {
		defaultView: "agendaDay",
		onload: function (calendar) {
			console.log("Calendrier personnalisé Josseaume Énergies chargé");

			setTimeout(() => {
				const today = frappe.datetime.get_today();
				frappe.call({
					method: "frappe.desk.calendar.get_events",
					args: {
						start: today,
						end: today,
						doctype: "Event",
					},
					callback: function (r) {
						const events = r.message || [];
						const morning = events.filter(
							(evt) => new Date(evt.start).getHours() < 13
						);
						const afternoon = events.filter(
							(evt) => new Date(evt.start).getHours() >= 13
						);

						// Cache le calendrier FullCalendar
						$(".calendar").hide();

						// Supprime le contenu si déjà injecté
						$(".custom-morning-afternoon-view").remove();

						// Injecte le nouveau HTML
						const html = `
                            <div class="custom-morning-afternoon-view row" style="margin: 20px;">
                                <div class="col-md-6">
                                    <h4 style="margin-bottom:10px;">Matin</h4>
                                    ${morning
										.map(
											(e) =>
												`<div style="margin-bottom:5px;"><strong>${
													e.title
												}</strong><br>${frappe.datetime.str_to_user(
													e.start
												)}</div>`
										)
										.join("")}
                                </div>
                                <div class="col-md-6">
                                    <h4 style="margin-bottom:10px;">Après-midi</h4>
                                    ${afternoon
										.map(
											(e) =>
												`<div style="margin-bottom:5px;"><strong>${
													e.title
												}</strong><br>${frappe.datetime.str_to_user(
													e.start
												)}</div>`
										)
										.join("")}
                                </div>
                            </div>
                        `;

						$(".layout-main-section").append(html);
					},
				});
			}, 500); // attendre le rendu du calendrier initial
		},
	},
};
