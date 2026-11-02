public with sharing class VerificationController {
 
    @AuraEnabled(cacheable=true)
    public static String getVerificationJSON(Id oppId) {
        if (oppId == null) {
            return null;
        }

        try {
            // Query the Opportunity record
            Opportunity opp = [
                SELECT Verification_Summary__c
                FROM Opportunity
                WHERE Id = :oppId
                LIMIT 1
            ];

            String rawJson = opp.Verification_Summary__c;

            if (String.isBlank(rawJson)) {
                return null;
            }

            // Clean the JSON string
            String cleanJson = cleanJSONString(rawJson);

            // Validate if it's proper JSON
            if (isValidJSON(cleanJson)) {
                return cleanJson;
            } else {
                System.debug('Invalid JSON after cleaning: ' + cleanJson);
                return null;
            }

        } catch (Exception e) {
            System.debug('Error in getVerificationJSON: ' + e.getMessage());
            return null;
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getValidationJSON(Id oppId) {
        if (oppId == null) {
            return null;
        }

        try {
            // Query the Opportunity record
            Opportunity opp = [
                SELECT Document_Validation_Summary__c
                FROM Opportunity
                WHERE Id = :oppId
                LIMIT 1
            ];

            String rawJson = opp.Document_Validation_Summary__c;

            if (String.isBlank(rawJson)) {
                return null;
            }

            // Clean the JSON string
            String cleanJson = cleanJSONString(rawJson);

            // Validate if it's proper JSON
            if (isValidJSON(cleanJson)) {
                return cleanJson;
            } else {
                System.debug('Invalid JSON after cleaning: ' + cleanJson);
                return null;
            }

        } catch (Exception e) {
            System.debug('Error in getVerificationJSON: ' + e.getMessage());
            return null;
        }
    }


    /**
     * Comprehensive JSON cleaning method
     * Removes markdown code blocks, extra quotes, and whitespace
     */
    private static String cleanJSONString(String rawJson) {
        if (String.isBlank(rawJson)) {
            return null;
        }

        String cleanJson = rawJson.trim();

        // Remove markdown code block indicators
        // Handles: ```json, ```JSON, ``` json, ```  json, etc.
        cleanJson = cleanJson.replaceAll('(?i)^```\\s*json\\s*', '');
        cleanJson = cleanJson.replaceAll('(?i)^```\\s*', '');
        cleanJson = cleanJson.replaceAll('```\\s*$', '');

        // Remove leading/trailing triple quotes
        cleanJson = cleanJson.replaceAll('^\'\'\'\\s*', '');
        cleanJson = cleanJson.replaceAll('\\s*\'\'\'$', '');

        // Remove leading/trailing double quotes if they wrap the entire JSON
        // But preserve internal quotes
        if (cleanJson.startsWith('"') && cleanJson.endsWith('"')) {
            cleanJson = cleanJson.substring(1, cleanJson.length() - 1);
        }

        // Remove any leading/trailing whitespace, newlines, tabs
        cleanJson = cleanJson.trim();

        // Handle escaped newlines and quotes that might interfere
        cleanJson = cleanJson.replace('\\n', '');
        cleanJson = cleanJson.replace('\\r', '');
        cleanJson = cleanJson.replace('\\"', '"');

        return cleanJson;
    }

    /**
     * Validate if string is proper JSON
     */
    private static Boolean isValidJSON(String jsonString) {
        if (String.isBlank(jsonString)) {
            return false;
        }

        try {
            // Try to parse as JSON
            Object parsedJson = JSON.deserializeUntyped(jsonString);
            return true;
        } catch (Exception e) {
            System.debug('JSON Validation Error: ' + e.getMessage());
            return false;
        }
    }
    
}