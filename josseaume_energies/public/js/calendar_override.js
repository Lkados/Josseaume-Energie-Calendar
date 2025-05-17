/* josseaume_energies/public/css/calendar_custom.css */

/* Styles pour les sections personnalisées */
.custom-calendar-sections {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.matin-section, .apres-midi-section {
    position: absolute;
    left: 0;
    width: 90px;
    text-align: center;
    padding: 5px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
}

.matin-section {
    top: 110px;
    background-color: rgba(200, 230, 255, 0.2);
    border: 1px solid #b0d0f0;
}

.apres-midi-section {
    top: 330px;
    background-color: rgba(255, 230, 200, 0.2);
    border: 1px solid #f0d0b0;
}

.matin-section h3, .apres-midi-section h3 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
}

.matin-section h3 {
    color: #4a6ddc;
}

.apres-midi-section h3 {
    color: #d67e46;
}

.time-range {
    font-size: 12px;
    color: #777;
}

/* Coloration des événements selon leur section */
.morning-event {
    border-left: 4px solid #4a6ddc !important;
}

.afternoon-event {
    border-left: 4px solid #d67e46 !important;
}

/* Amélioration des événements */
.fc-timegrid-event {
    border-radius: 4px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    padding: 2px 6px !important;
}

/* Masquer les étiquettes horaires existantes */
.fc-timegrid-slot-label-cushion {
    visibility: hidden;
}

/* Élargir la colonne des étiquettes */
.fc .fc-timegrid-axis-cushion {
    min-width: 90px !important;
}

/* Style au survol des plages horaires */
.fc-timegrid-slot:hover {
    background-color: rgba(180, 180, 180, 0.1) !important;
    cursor: pointer;
}