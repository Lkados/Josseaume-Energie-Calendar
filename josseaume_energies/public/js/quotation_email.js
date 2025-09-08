// Script pour personnaliser l'envoi d'email des devis

frappe.ui.form.on('Quotation', {
    refresh: function(frm) {
        // Surcharger la fonction d'envoi d'email
        if (!frm.custom_email_dialog_modified) {
            const original_email_doc = frm.email_doc;
            
            frm.email_doc = function(message) {
                // Appeler la fonction originale
                original_email_doc.apply(frm, arguments);
                
                // Attendre que le dialogue soit créé
                setTimeout(() => {
                    const dialog = frappe.msgprint.dialog;
                    if (dialog && dialog.fields_dict) {
                        // Récupérer les valeurs par défaut depuis le backend
                        frappe.call({
                            method: 'josseaume_energies.quotation_email.get_email_defaults_for_quotation',
                            args: {
                                quotation: frm.doc.name
                            },
                            callback: function(r) {
                                if (r.message) {
                                    // Définir le sujet
                                    if (dialog.fields_dict.subject) {
                                        dialog.set_value('subject', r.message.subject);
                                    }
                                    
                                    // Définir le message
                                    if (dialog.fields_dict.message) {
                                        dialog.set_value('message', r.message.message);
                                    }
                                }
                            }
                        });
                    }
                }, 100);
            };
            
            frm.custom_email_dialog_modified = true;
        }
    }
});

// Alternative : Hook sur le bouton Email
frappe.ui.form.on('Quotation', {
    before_email: function(frm) {
        // Cette fonction sera appelée avant l'ouverture du dialogue d'email
        frm.email_defaults = {
            subject: `Devis N° ${frm.doc.name} - JOSSEAUME ÉNERGIES`,
            message: `Bonjour,

Veuillez trouver ci-joint le document : Devis N° ${frm.doc.name}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire.`
        };
    }
});