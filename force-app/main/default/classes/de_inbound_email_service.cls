global class de_inbound_email_service implements Messaging.InboundEmailHandler {

    global Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail email, Messaging.InboundEnvelope envelope) {
        Messaging.InboundEmailResult result = new Messaging.InboundEmailResult();

        try {
            String emailSubject = email.subject;
            String emailBody = email.plainTextBody;
            String senderEmail = envelope.fromAddress;
            String recipientEmail = email.toAddresses[0];
            Id oppID;

            // Check if the subject contains refId and extract it
            if(emailSubject != null && emailSubject.contains('refId:')) {
                String refId = email.subject.substringAfter('refId: ').trim();
                refId = refId.length() >= 18 ? refId.substring(0, 18) : refId;
                oppID = refId;

                // Create EmailMessage
                EmailMessage emailMessage = new EmailMessage(
                    Subject = emailSubject,
                    TextBody = emailBody,
                    FromAddress = senderEmail,
                    ToAddress = recipientEmail,
                    RelatedToId = oppID
                );

                insert emailMessage;

                // Process attachments
                List<ContentVersion> contentVersionsToInsert = new List<ContentVersion>();

                if (email.binaryAttachments != null && email.binaryAttachments.size() > 0) {
                    for (Messaging.InboundEmail.BinaryAttachment attachment : email.binaryAttachments) {
                        ContentVersion cv = new ContentVersion();
                        cv.Title = attachment.fileName;
                        cv.PathOnClient = '/' + attachment.fileName;
                        cv.VersionData = attachment.body;
                        cv.Origin = 'H'; // "H" indicates uploaded from email/attachments
                        contentVersionsToInsert.add(cv);
                    }

                    insert contentVersionsToInsert;

                    // Get ContentDocumentIds
                    List<ContentDocumentLink> contentLinks = new List<ContentDocumentLink>();
                    for (ContentVersion cv : [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :contentVersionsToInsert]) {
                        // Link to Opportunity
                        contentLinks.add(new ContentDocumentLink(
                            ContentDocumentId = cv.ContentDocumentId,
                            LinkedEntityId = oppID,
                            ShareType = 'V'
                        ));

                        // Link to EmailMessage
                        contentLinks.add(new ContentDocumentLink(
                            ContentDocumentId = cv.ContentDocumentId,
                            LinkedEntityId = emailMessage.Id,
                            ShareType = 'V'
                        ));
                    }

                    insert contentLinks;

                    Opportunity oppToUpdate = new Opportunity(
                        Id = oppID,
                        Bank_Statement_Provided__c = true
                    );
                    update oppToUpdate;
                }

                result.success = true;
            } else {
                result.success = false;
                result.message = 'Subject does not contain refId.';
            }

        } catch (Exception e) {
            result.success = false;
            result.message = 'Error: ' + e.getMessage();
        }

        return result;
    }
}