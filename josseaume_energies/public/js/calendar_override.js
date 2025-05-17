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
		onload: function () {
			console.log("✅ Josseaume Calendrier personnalisé actif");

			// Attente active du DOM de fullcalendar
			const interval = setInterval(() => {
				const calendarDom = document.querySelector(".calendar");
				const contentDom = document.querySelector(".layout-main-section");

				if (calendarDom && contentDom) {
					clearInterval(interval); // stop check

					// Charger les événements du jour
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
								(e) => new Date(e.start).getHours() < 13
							);
							const afternoon = events.filter(
								(e) => new Date(e.start).getHours() >= 13
							);

							// Cacher le calendrier natif
							$(".calendar").hide();
							$(".custom-morning-afternoon-view").remove();

							const html = `
                                <div class="custom-morning-afternoon-view row" style="padding: 20px;">
                                    <div class="col-md-6">
                                        <h4>🕗 Matin</h4>
                                        ${morning
											.map(
												(e) => `
                                            <div style="margin-bottom:10px;padding:10px;border:1px solid #ccc;border-radius:5px;">
                                                <strong>${e.title}</strong><br>
                                                <small>${frappe.datetime.str_to_user(
													e.start
												)}</small>
                                            </div>
                                        `
											)
											.join("")}
                                    </div>
                                    <div class="col-md-6">
                                        <h4>🕑 Après-midi</h4>
                                        ${afternoon
											.map(
												(e) => `
                                            <div style="margin-bottom:10px;padding:10px;border:1px solid #ccc;border-radius:5px;">
                                                <strong>${e.title}</strong><br>
                                                <small>${frappe.datetime.str_to_user(
													e.start
												)}</small>
                                            </div>
                                        `
											)
											.join("")}
                                    </div>
                                </div>
                            `;
							$(contentDom).append(html);
						},
					});
				}
			}, 300); // check toutes les 300ms
		},
	},
};
