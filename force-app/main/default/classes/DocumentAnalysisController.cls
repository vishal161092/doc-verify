public with sharing class DocumentAnalysisController {
    
    /**
     * Wrapper class for document data
     */
    public class DocumentData {
        @AuraEnabled public String documentId;
        @AuraEnabled public String name;
        @AuraEnabled public String documentType;
        @AuraEnabled public String status;
        @AuraEnabled public String remarks;
        @AuraEnabled public AIAnalysis aiAnalysis;
        @AuraEnabled public DateTime lastModified;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public Long fileSize;
        @AuraEnabled public Boolean hasFile;
    }
    
    /**
     * Wrapper class for document configuration
     */
    public class DocumentConfig {
        @AuraEnabled public String documentType;
        @AuraEnabled public String aiFieldApiName;
        @AuraEnabled public String promptTemplateName;
        @AuraEnabled public Integer displayOrder;
        @AuraEnabled public Boolean isActive;
        @AuraEnabled public Boolean isFinalAISummary;
    }
    
    /**
     * Wrapper class for AI Analysis data
     */
    public class AIAnalysis {
        @AuraEnabled public String content; // Direct prompt response content
    }
    
    /**
     * Get document configurations from custom metadata (excluding AI Summary)
     */
    @AuraEnabled(cacheable=true)
    public static List<DocumentConfig> getDocumentConfigurations() {
        List<DocumentConfig> configs = new List<DocumentConfig>();
        
        try {
            List<Document_Analysis_Config__mdt> metadataRecords = [
                SELECT Document_Type__c, AI_Field_API_Name__c, Prompt_Template_Name__c, Display_Order__c, Is_Active__c, Is_Final_AI_Summary__c
                FROM Document_Analysis_Config__mdt
                WHERE Is_Active__c = true AND Is_Final_AI_Summary__c = false
                ORDER BY Display_Order__c ASC NULLS LAST, Document_Type__c ASC
            ];
            
            for (Document_Analysis_Config__mdt record : metadataRecords) {
                DocumentConfig config = new DocumentConfig();
                config.documentType = record.Document_Type__c;
                config.aiFieldApiName = record.AI_Field_API_Name__c;
                config.promptTemplateName = record.Prompt_Template_Name__c;
                config.displayOrder = record.Display_Order__c != null ? Integer.valueOf(record.Display_Order__c) : 999;
                config.isActive = record.Is_Active__c;
                config.isFinalAISummary = record.Is_Final_AI_Summary__c != null ? record.Is_Final_AI_Summary__c : false;
                configs.add(config);
            }
            
        } catch (Exception e) {
            System.debug('Error getting document configurations: ' + e.getMessage());
        }
        
        return configs;
    }

    /**
     * Get all documents attached to the record with AI analysis data
     */
    @AuraEnabled(cacheable=true)
    public static List<DocumentData> getDocumentsWithAnalysis(String recordId) {
        List<DocumentData> documents = new List<DocumentData>();
        
        try {
            // Get document configurations from custom metadata
            List<DocumentConfig> documentConfigs = getDocumentConfigurations();
            
            // Get all ContentDocumentLinks for the record with ContentVersion details
            List<ContentDocumentLink> docLinks = [
                SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension,
                       ContentDocument.ContentSize, ContentDocument.LastModifiedDate,
                       ContentDocument.LatestPublishedVersionId
                FROM ContentDocumentLink 
                WHERE LinkedEntityId = :recordId
                ORDER BY ContentDocument.LastModifiedDate DESC
            ];
            
            // Get ContentVersions to access Document_Type__c field
            Set<Id> contentVersionIds = new Set<Id>();
            for (ContentDocumentLink docLink : docLinks) {
                if (docLink.ContentDocument.LatestPublishedVersionId != null) {
                    contentVersionIds.add(docLink.ContentDocument.LatestPublishedVersionId);
                }
            }
            
            Map<Id, ContentVersion> contentVersionMap = new Map<Id, ContentVersion>();
            if (!contentVersionIds.isEmpty()) {
                List<ContentVersion> contentVersions = [
                    SELECT Id, Document_Type__c, ContentDocumentId
                    FROM ContentVersion 
                    WHERE Id IN :contentVersionIds
                ];
                for (ContentVersion cv : contentVersions) {
                    contentVersionMap.put(cv.ContentDocumentId, cv);
                }
            }
            
            // Create a map of document types to uploaded files (prioritize files with Document_Type__c field set)
            Map<String, ContentDocumentLink> documentTypeToFileMap = new Map<String, ContentDocumentLink>();
            Map<String, ContentDocumentLink> fallbackFileMap = new Map<String, ContentDocumentLink>();
            
            for (ContentDocumentLink docLink : docLinks) {
                String docType = null;
                
                // First try to get document type from ContentVersion custom field
                ContentVersion cv = contentVersionMap.get(docLink.ContentDocumentId);
                if (cv != null && String.isNotBlank(cv.Document_Type__c)) {
                    // This file has Document_Type__c set - prioritize it
                    docType = cv.Document_Type__c;
                    documentTypeToFileMap.put(docType, docLink);
                } else {
                    // Fallback to file name analysis only if no file with Document_Type__c is found
                    String determinedDocType = determineDocumentType(docLink.ContentDocument.Title);
                    for (DocumentConfig config : documentConfigs) {
                        if (determinedDocType.toUpperCase().contains(config.documentType.toUpperCase()) || 
                            config.documentType.toUpperCase().contains(determinedDocType.toUpperCase())) {
                            // Only use this as fallback if no file with Document_Type__c field is available
                            if (!documentTypeToFileMap.containsKey(config.documentType)) {
                                fallbackFileMap.put(config.documentType, docLink);
                            }
                            break;
                        }
                    }
                }
            }
            
            // Add fallback files for document types that don't have files with Document_Type__c set
            for (String docType : fallbackFileMap.keySet()) {
                if (!documentTypeToFileMap.containsKey(docType)) {
                    documentTypeToFileMap.put(docType, fallbackFileMap.get(docType));
                }
            }
            
            // Determine object type and get AI analysis data
            Map<String, AIAnalysis> aiAnalysisMap = getAIAnalysisDataWithConfigs(recordId, documentConfigs);
            
            // Create document data list for configured document types
            for (DocumentConfig config : documentConfigs) {
                DocumentData doc = new DocumentData();
                doc.documentType = config.documentType;
                
                // Check if file exists for this document type
                ContentDocumentLink fileLink = documentTypeToFileMap.get(config.documentType);
                
                if (fileLink != null) {
                    // File exists - use file details
                    doc.documentId = fileLink.ContentDocumentId;
                    doc.name = fileLink.ContentDocument.Title;
                    doc.lastModified = fileLink.ContentDocument.LastModifiedDate;
                    doc.fileExtension = fileLink.ContentDocument.FileExtension;
                    doc.fileSize = fileLink.ContentDocument.ContentSize;
                    doc.status = 'Completed';
                    doc.remarks = 'Document uploaded';
                    doc.hasFile = true;
                } else {
                    // No file - show placeholder
                    doc.documentId = 'placeholder_' + config.documentType.replaceAll(' ', '_').replaceAll('[^a-zA-Z0-9_]', '');
                    doc.name = config.documentType;
                    doc.fileExtension = 'pdf';
                    doc.fileSize = 0;
                    doc.status = 'Pending';
                    doc.remarks = 'Document not uploaded';
                    doc.hasFile = false;
                }
                
                // Get AI analysis for this document type
                doc.aiAnalysis = aiAnalysisMap.get(config.documentType);
                
                documents.add(doc);
            }
            
        } catch (Exception e) {
            System.debug('Error in getDocumentsWithAnalysis: ' + e.getMessage());
            throw new AuraHandledException('Error fetching documents: ' + e.getMessage());
        }
        
        return documents;
    }
    
    /**
     * Get AI analysis data based on record type using document configurations
     */
    private static Map<String, AIAnalysis> getAIAnalysisDataWithConfigs(String recordId, List<DocumentConfig> configs) {
        Map<String, AIAnalysis> analysisMap = new Map<String, AIAnalysis>();
        
        try {
            // Determine the object type
            String objectType = Id.valueOf(recordId).getSObjectType().getDescribe().getName();
            
            // Build dynamic SOQL query based on configurations
            Set<String> fieldsToQuery = new Set<String>{'Id'};
            for (DocumentConfig config : configs) {
                fieldsToQuery.add(config.aiFieldApiName);
            }
            
            String soqlQuery = 'SELECT ' + String.join(new List<String>(fieldsToQuery), ', ') + 
                             ' FROM ' + objectType + ' WHERE Id = :recordId LIMIT 1';
            
            List<SObject> records = Database.query(soqlQuery);
            
            if (!records.isEmpty()) {
                SObject record = records[0];
                
                // Get AI analysis for each configured document type
                for (DocumentConfig config : configs) {
                    String fieldValue = (String) record.get(config.aiFieldApiName);
                    if (String.isNotBlank(fieldValue)) {
                        // Create simple AIAnalysis object with the field value
                        AIAnalysis analysis = new AIAnalysis();
                        analysis.content = fieldValue;
                        
                        analysisMap.put(config.documentType, analysis);
                    }
                }
            }
            
        } catch (Exception e) {
            System.debug('Error getting AI analysis data with configs: ' + e.getMessage());
        }
        
        return analysisMap;
    }

    /**
     * Get AI analysis data based on record type (legacy method for backward compatibility)
     */
    private static Map<String, AIAnalysis> getAIAnalysisData(String recordId) {
        Map<String, AIAnalysis> analysisMap = new Map<String, AIAnalysis>();
        
        try {
            // Determine the object type
            String objectType = Id.valueOf(recordId).getSObjectType().getDescribe().getName();
            
            if (objectType == 'ResidentialLoanApplication') {
                // Get the loan application record for AI analysis data
                ResidentialLoanApplication loanApp = [
                    SELECT AI_Analysis_Data__c, AI_Analysis_Proof_Of_Income__c, 
                           AI_Analysis_Bank_Statement__c, AI_Analysis_Form_60__c, AI_Analysis_KYC__c
                    FROM ResidentialLoanApplication 
                    WHERE Id = :recordId 
                    LIMIT 1
                ];
                analysisMap = parseAIAnalysisDataFromLoanApp(loanApp);
            } else if (objectType == 'Opportunity') {
                // Get the opportunity record for AI analysis data
                Opportunity opp = [
                    SELECT AI_Analysis_Data__c, AI_ProofOfIncome_Analysis__c, AI_BankStatement_Analysis__c
                    FROM Opportunity 
                    WHERE Id = :recordId 
                    LIMIT 1
                ];
                analysisMap = parseAIAnalysisDataFromOpportunity(opp);
            }
            
        } catch (Exception e) {
            System.debug('Error getting AI analysis data: ' + e.getMessage());
        }
        
        return analysisMap;
    }
    
    /**
     * Parse AI analysis data from the loan application record
     */
    private static Map<String, AIAnalysis> parseAIAnalysisDataFromLoanApp(ResidentialLoanApplication loanApp) {
        Map<String, AIAnalysis> analysisMap = new Map<String, AIAnalysis>();
        
        try {
            // Add individual field data
            if (String.isNotBlank(loanApp.AI_Analysis_Proof_Of_Income__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = loanApp.AI_Analysis_Proof_Of_Income__c;
                analysisMap.put('PROOF OF INCOME', analysis);
            }
            if (String.isNotBlank(loanApp.AI_Analysis_Bank_Statement__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = loanApp.AI_Analysis_Bank_Statement__c;
                analysisMap.put('BANK ACCOUNT STATEMENT', analysis);
            }
            if (String.isNotBlank(loanApp.AI_Analysis_Form_60__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = loanApp.AI_Analysis_Form_60__c;
                analysisMap.put('FORM 60', analysis);
            }
            if (String.isNotBlank(loanApp.AI_Analysis_KYC__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = loanApp.AI_Analysis_KYC__c;
                analysisMap.put('KYC', analysis);
            }
            
        } catch (Exception e) {
            System.debug('Error parsing AI analysis data: ' + e.getMessage());
        }
        
        return analysisMap;
    }
    
    /**
     * Parse AI analysis data from the opportunity record
     */
    private static Map<String, AIAnalysis> parseAIAnalysisDataFromOpportunity(Opportunity opp) {
        Map<String, AIAnalysis> analysisMap = new Map<String, AIAnalysis>();
        
        try {
            // Parse specific document type fields
            if (String.isNotBlank(opp.AI_ProofOfIncome_Analysis__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = opp.AI_ProofOfIncome_Analysis__c;
                analysisMap.put('PROOF OF INCOME', analysis);
            }
            
            if (String.isNotBlank(opp.AI_BankStatement_Analysis__c)) {
                AIAnalysis analysis = new AIAnalysis();
                analysis.content = opp.AI_BankStatement_Analysis__c;
                analysisMap.put('BANK ACCOUNT STATEMENT', analysis);
            }
            
        } catch (Exception e) {
            System.debug('Error parsing AI analysis data from Opportunity: ' + e.getMessage());
        }
        
        return analysisMap;
    }
    

    

    
    /**
     * Determine document type based on file name
     */
    private static String determineDocumentType(String fileName) {
        String upperFileName = fileName.toUpperCase();
        
        if (upperFileName.contains('PROOF') && upperFileName.contains('INCOME')) {
            return 'PROOF OF INCOME';
        } else if (upperFileName.contains('BANK') && upperFileName.contains('STATEMENT')) {
            return 'BANK ACCOUNT STATEMENT';
        } else if (upperFileName.contains('FORM') && upperFileName.contains('60')) {
            return 'FORM 60';
        } else if (upperFileName.contains('KYC')) {
            return 'KYC';
        }
        
        // Default return based on common document names
        return 'GENERAL DOCUMENT';
    }
    
    /**
     * Upload file and link to record with proper document type
     * Includes synchronous AI analysis generation
     */
    @AuraEnabled
    public static UploadResult uploadFile(String recordId, String documentType, String fileName, String base64Data, String contentType) {
        try {
            // Create ContentVersion
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            cv.ContentLocation = 'S';
            cv.IsMajorVersion = true;
            
            // Set document type in custom field for proper mapping
            cv.Document_Type__c = documentType;
            cv.Description = 'Document Type: ' + documentType;
            
            insert cv;
            
            // Get ContentDocumentId
            ContentVersion insertedCV = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
            
            // Create ContentDocumentLink
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = insertedCV.ContentDocumentId;
            cdl.LinkedEntityId = recordId;
            cdl.ShareType = 'I'; // Inferred permission
            cdl.Visibility = 'AllUsers';
            
            insert cdl;
            
            UploadResult result = new UploadResult();
            result.contentDocumentId = insertedCV.ContentDocumentId;
            result.success = true;
            result.message = 'File uploaded successfully';
            
            // Generate AI analysis synchronously
            try {
                Boolean aiAnalysisSuccess = generateAIAnalysisForDocument(recordId, documentType, insertedCV.ContentDocumentId, fileName);
                result.aiAnalysisGenerated = aiAnalysisSuccess;
                if (aiAnalysisSuccess) {
                    result.message += ' with AI analysis completed successfully';
                } else {
                    result.message += ' (AI analysis failed - check prompt template configuration)';
                }
            } catch (Exception aiException) {
                System.debug('AI Analysis generation failed: ' + aiException.getMessage());
                result.aiAnalysisGenerated = false;
                result.message += ' (AI analysis failed due to error: ' + aiException.getMessage() + ')';
                // Don't fail the upload if AI analysis fails
            }
            
            return result;
            
        } catch (Exception e) {
            UploadResult result = new UploadResult();
            result.success = false;
            result.message = 'Error uploading file: ' + e.getMessage();
            result.aiAnalysisGenerated = false;
            throw new AuraHandledException(result.message);
        }
    }

    /**
     * Wrapper class for upload results
     */
    public class UploadResult {
        @AuraEnabled public String contentDocumentId;
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public Boolean aiAnalysisGenerated;
    }



    /**
     * Generate AI analysis for uploaded document using prompt template
     */
    public static Boolean generateAIAnalysisForDocument(String recordId, String documentType, String contentDocumentId, String fileName) {
        String aiFieldApiName = null;
        String promptTemplateName = null;
        
        try {
            // Get document configuration to find the mapped AI field and prompt template
            List<DocumentConfig> configs = getDocumentConfigurations();
            
            for (DocumentConfig config : configs) {
                if (config.documentType.equals(documentType)) {
                    aiFieldApiName = config.aiFieldApiName;
                    promptTemplateName = config.promptTemplateName;
                    break;
                }
            }
            
            if (String.isBlank(aiFieldApiName)) {
                System.debug('No AI field mapping found for document type: ' + documentType);
                return false;
            }
            
            if (String.isBlank(promptTemplateName)) {
                System.debug('No prompt template configured for document type: ' + documentType + '. Setting AI analysis to not available.');
                // Set AI analysis to "not available" since no prompt template is configured
                updateAIAnalysisField(recordId, aiFieldApiName, 'AI Analysis not available - No prompt template configured');
                return false;
            }
            
            // Invoke prompt template with configurable name
            String aiAnalysisResult = invokeDocumentAnalysisPromptTemplate(recordId, documentType, fileName, contentDocumentId, promptTemplateName);
            
            if (String.isNotBlank(aiAnalysisResult)) {
                // Update the appropriate AI analysis field with new analysis
                updateAIAnalysisField(recordId, aiFieldApiName, aiAnalysisResult);
                System.debug('AI analysis completed for document type: ' + documentType + ' using prompt: ' + promptTemplateName);
                return true;
            } else {
                System.debug('AI analysis returned empty result for document type: ' + documentType + '. Setting AI analysis to not available.');
                // Set AI analysis to "not available" since prompt template failed or doesn't exist
                updateAIAnalysisField(recordId, aiFieldApiName, 'AI Analysis not available - Prompt template failed or returned empty result');
                return false;
            }
            
        } catch (Exception e) {
            System.debug('Error generating AI analysis: ' + e.getMessage() + '. Setting AI analysis to not available.');
            // Set AI analysis to "not available" since AI generation failed
            try {
                if (String.isNotBlank(aiFieldApiName)) {
                    updateAIAnalysisField(recordId, aiFieldApiName, 'AI Analysis not available - Error: ' + e.getMessage());
                }
            } catch (Exception updateException) {
                System.debug('Error updating AI analysis field: ' + updateException.getMessage());
            }
            return false;
        }
    }

    /**
     * Invoke configurable prompt template for document analysis
     * Note: This method requires Einstein AI features to be enabled in the org
     */
    private static String invokeDocumentAnalysisPromptTemplate(String recordId, String documentType, String fileName, String contentDocumentId, String promptTemplateName) {
        try {
            System.debug('Attempting to invoke prompt template: ' + promptTemplateName + ' for document type: ' + documentType);
            
            // Check if prompt template name is properly configured
            if (String.isNotBlank(promptTemplateName)) {
                System.debug('Valid prompt template configured: ' + promptTemplateName + '. Generating AI analysis...');
                
                // Prepare input for generating prompt template
                ConnectApi.EinsteinPromptTemplateGenerationsInput promptGenerationsInput = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
                
                // Map for holding input parameters - Pass entire ContentDocument record
                Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>();
                
                // Get the entire ContentDocument record (matching the flow exactly)
                ContentDocument contentDoc = [SELECT Id, Title, FileExtension, ContentSize, CreatedDate, LastModifiedDate 
                                           FROM ContentDocument WHERE Id = :contentDocumentId LIMIT 1];
                
                // Pass the ContentDocument record as a Map to avoid list wrapping
                Map<String, Object> contentDocMap = new Map<String, Object>();
                contentDocMap.put('Id', contentDoc.Id);
                contentDocMap.put('Title', contentDoc.Title);
                contentDocMap.put('FileExtension', contentDoc.FileExtension);
                contentDocMap.put('ContentSize', contentDoc.ContentSize);
                contentDocMap.put('CreatedDate', contentDoc.CreatedDate);
                contentDocMap.put('LastModifiedDate', contentDoc.LastModifiedDate);
                
                ConnectApi.WrappedValue fileRecordValue = new ConnectApi.WrappedValue();
                fileRecordValue.value = contentDocMap; // Pass as Map to avoid list wrapping
                System.debug('Using ContentDocument Map for prompt: ' + contentDocMap);
                inputParams.put('Input:File', fileRecordValue);
                
                // Set parameters - Include additionalConfig like AI Summary
                promptGenerationsInput.inputParams = inputParams;
                promptGenerationsInput.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
                promptGenerationsInput.additionalConfig.numGenerations = 1;
                promptGenerationsInput.additionalConfig.enablePiiMasking = false;
                promptGenerationsInput.isPreview = false;
                
                // Call the service to generate messages for the prompt template
                ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generationsOutput = ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateName, promptGenerationsInput);
                
                // Consume response
                ConnectApi.EinsteinLLMGenerationItemOutput response = generationsOutput.generations[0];
                System.debug('Document Analysis Response: ' + response.text);
                
                return response.text;
            } else {
                System.debug('No prompt template name provided');
                return null;
            }
            
        } catch (ConnectApi.ConnectApiException e) {
            System.debug('ConnectApi.ConnectApiException occurred: ' + e.getMessage());
            return null;
            
        } catch (Exception e) {
            System.debug('General Exception occurred: ' + e.getMessage());
            return null;
        }
    }

    /**
     * Generate sample AI analysis response for testing
     * This method will be replaced with actual prompt template invocation
     */
    @TestVisible
    private static String generateSampleAIAnalysisResponse(String documentType, String fileName) {
        Map<String, Object> sampleAnalysis = new Map<String, Object>();
        
        sampleAnalysis.put('status', 'Valid');
        sampleAnalysis.put('rulesPassed', new List<String>{
            'Document appears to be authentic and unaltered with clear signatures and stamps',
            'All required fields are present, readable, and properly formatted with correct data types',
            'File format is acceptable (' + fileName + ') and meets industry standards for document processing',
            'Document type matches expected format for ' + documentType + ' with proper headers and structure',
            'Text quality is high with excellent OCR readability and no compression artifacts',
            'Date formats are consistent and fall within acceptable ranges for document validity',
            'Financial figures are properly formatted with appropriate decimal places and currency symbols',
            'Document layout follows standard industry templates and formatting guidelines'
        });
        sampleAnalysis.put('rulesFailed', new List<String>{
            'Unable to verify digital signature authenticity through automated cryptographic validation',
            'Cross-reference validation with external databases requires manual verification process',
            'Some watermarks or security features could not be automatically validated',
            'Document metadata indicates possible editing history that requires human review'
        });
        sampleAnalysis.put('rulesNotAnalyzed', new List<String>{
            'Advanced OCR verification with machine learning models requires specialized processing',
            'Compliance with latest regulatory standards for ' + documentType + ' documentation',
            'Integration with third-party verification services for enhanced authentication',
            'Deep learning analysis for fraud detection patterns and anomaly identification',
            'Blockchain verification for document provenance and authenticity tracking'
        });
        sampleAnalysis.put('summary', 'Comprehensive document analysis completed for ' + documentType + '. Overall validation: PASSED with high confidence score. Document meets most automated verification criteria with only minor items flagged for manual review by compliance specialists. Recommended for approval pending human verification of flagged items.');
        sampleAnalysis.put('confidence', 'High');
        sampleAnalysis.put('analysisTimestamp', DateTime.now().format());
        sampleAnalysis.put('analysisMethod', 'Automated AI Analysis (Enhanced Sample with Extended Content for Scrollbar Testing)');
        
        return JSON.serialize(sampleAnalysis);
    }

    /**
     * Update AI analysis field on the record
     */
    private static void updateAIAnalysisField(String recordId, String aiFieldApiName, String aiAnalysisResult) {
        try {
            String objectType = Id.valueOf(recordId).getSObjectType().getDescribe().getName();
            
            // Build dynamic update query
            String updateQuery = 'SELECT Id, ' + aiFieldApiName + ' FROM ' + objectType + ' WHERE Id = :recordId LIMIT 1';
            List<SObject> records = Database.query(updateQuery);
            
            if (!records.isEmpty()) {
                SObject record = records[0];
                record.put(aiFieldApiName, aiAnalysisResult);
                update record;
                System.debug('AI analysis field updated successfully: ' + aiFieldApiName);
            }
            
        } catch (Exception e) {
            System.debug('Error updating AI analysis field: ' + e.getMessage());
        }
    }

    /**
     * Get AI Summary configuration and current summary data
     */
    @AuraEnabled
    public static Map<String, Object> getAISummaryData(String recordId) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // Get AI Summary configuration directly from custom metadata
            List<Document_Analysis_Config__mdt> aiSummaryRecords = [
                SELECT Document_Type__c, AI_Field_API_Name__c, Prompt_Template_Name__c, Display_Order__c, Is_Active__c, Is_Final_AI_Summary__c
                FROM Document_Analysis_Config__mdt
                WHERE Is_Active__c = true AND Is_Final_AI_Summary__c = true
                LIMIT 1
            ];
            
            if (aiSummaryRecords.isEmpty()) {
                result.put('success', false);
                result.put('message', 'AI Summary configuration not found');
                return result;
            }
            
            Document_Analysis_Config__mdt aiSummaryRecord = aiSummaryRecords[0];
            DocumentConfig summaryConfig = new DocumentConfig();
            summaryConfig.documentType = aiSummaryRecord.Document_Type__c;
            summaryConfig.aiFieldApiName = aiSummaryRecord.AI_Field_API_Name__c;
            summaryConfig.promptTemplateName = aiSummaryRecord.Prompt_Template_Name__c;
            summaryConfig.displayOrder = aiSummaryRecord.Display_Order__c != null ? Integer.valueOf(aiSummaryRecord.Display_Order__c) : 999;
            summaryConfig.isActive = aiSummaryRecord.Is_Active__c;
            summaryConfig.isFinalAISummary = aiSummaryRecord.Is_Final_AI_Summary__c != null ? aiSummaryRecord.Is_Final_AI_Summary__c : false;
            
            // Check if summary already exists
            String objectType = Id.valueOf(recordId).getSObjectType().getDescribe().getName();
            String query = 'SELECT Id, ' + summaryConfig.aiFieldApiName + ' FROM ' + objectType + ' WHERE Id = :recordId LIMIT 1';
            List<SObject> records = Database.query(query);
            
            String existingSummary = null;
            if (!records.isEmpty()) {
                existingSummary = (String) records[0].get(summaryConfig.aiFieldApiName);
            }
            
            result.put('success', true);
            result.put('config', summaryConfig);
            result.put('existingSummary', existingSummary);
            result.put('hasExistingSummary', String.isNotBlank(existingSummary));
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', 'Error retrieving AI Summary data: ' + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Generate or regenerate AI Summary
     */
    @AuraEnabled
    public static Map<String, Object> generateAISummary(String recordId, Boolean forceRegenerate) {
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            // Get AI Summary configuration
            Map<String, Object> summaryData = getAISummaryData(recordId);
            if (!(Boolean) summaryData.get('success')) {
                return summaryData;
            }
            
            DocumentConfig summaryConfig = (DocumentConfig) summaryData.get('config');
            Boolean hasExistingSummary = (Boolean) summaryData.get('hasExistingSummary');
            
            // Check if we should proceed
            if (hasExistingSummary && !forceRegenerate) {
                result.put('success', false);
                result.put('message', 'AI Summary already exists. Use forceRegenerate=true to overwrite.');
                return result;
            }
            
            // Generate AI Summary using prompt template
            String summaryResult = invokeAISummaryPromptTemplate(recordId, summaryConfig.promptTemplateName);
            
            if (String.isNotBlank(summaryResult)) {
                // Update the AI Summary field
                updateAIAnalysisField(recordId, summaryConfig.aiFieldApiName, summaryResult);
                
                result.put('success', true);
                result.put('summary', summaryResult);
                result.put('message', 'AI Summary generated successfully');
            } else {
                result.put('success', false);
                result.put('message', 'AI Summary generation failed - prompt template not configured or unavailable');
            }
            
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', 'Error generating AI Summary: ' + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Invoke AI Summary prompt template
     */
    private static String invokeAISummaryPromptTemplate(String recordId, String promptTemplateName) {
        try {
            System.debug('Invoking AI Summary prompt template: ' + promptTemplateName + ' for record: ' + recordId);
            
            if (String.isBlank(promptTemplateName)) {
                System.debug('No prompt template configured for AI Summary');
                return null;
            }
            
            // Prepare input for generating prompt template
            ConnectApi.EinsteinPromptTemplateGenerationsInput promptGenerationsInput = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            
            // Map for holding input parameters
            Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>();
            Map<String, String> input = new Map<String, String>();
            
            // Set input parameters for the Opportunity record
            input.put('id', recordId);
            input.put('recordId', recordId);
            input.put('opportunityId', recordId);
            
            // Add wrapped values - match the prompt template's expected input parameter
            ConnectApi.WrappedValue inputValueMap = new ConnectApi.WrappedValue();
            inputValueMap.value = input;
            inputParams.put('Input:Opportunity', inputValueMap); // Match the prompt template's expected parameter name
            
            // Set hyper parameters
            promptGenerationsInput.inputParams = inputParams;
            promptGenerationsInput.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            promptGenerationsInput.additionalConfig.numGenerations = 1;
            promptGenerationsInput.additionalConfig.enablePiiMasking = false;
            // Remove applicationName as it's causing issues - let it use default
            
            // Set if it's a preview or not
            promptGenerationsInput.isPreview = false;
            
            // Call the service to generate messages for the prompt template
            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generationsOutput = ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateName, promptGenerationsInput);
            
            // Consume response
            ConnectApi.EinsteinLLMGenerationItemOutput response = generationsOutput.generations[0];
            System.debug('AI Summary Response: ' + response.text);
            
            return response.text;
            
        } catch (Exception e) {
            System.debug('Error invoking AI Summary prompt template: ' + e.getMessage());
            return null;
        }
    }
    
    /**
     * Generate sample AI summary for testing (DEPRECATED - Use actual prompt templates)
     */
    private static String generateSampleAISummary(String recordId) {
        // This method is deprecated - AI summary should use actual prompt templates
        return 'AI Summary generation requires actual prompt template configuration.';
    }

    /**
     * Create sample AI analysis data for testing
     */
    @AuraEnabled
    public static String createSampleAIAnalysisData(String recordId) {
        try {
            Map<String, Object> sampleData = new Map<String, Object>();
            
            // Sample data for PROOF OF INCOME
            Map<String, Object> proofOfIncomeAnalysis = new Map<String, Object>();
            proofOfIncomeAnalysis.put('status', 'Valid');
            proofOfIncomeAnalysis.put('rulesPassed', new List<String>{
                'All mandatory fields are present on the document',
                'Document is in English and Regional Language',
                'Issuance state (Maharashtra) matches address',
                'Document appears to have no overwriting or alterations',
                'Formatting is consistent',
                'Last 4 digits match on both sides'
            });
            proofOfIncomeAnalysis.put('rulesFailed', new List<String>{
                'Name mismatch: Asha Rao vs Asha Meera Rao. Match score is < 75%',
                'Address mismatch: Present vs Permanent address not matching. Match score < 75%'
            });
            proofOfIncomeAnalysis.put('rulesNotAnalyzed', new List<String>{'NA'});
            sampleData.put('PROOF OF INCOME', proofOfIncomeAnalysis);
            
            // Sample data for BANK ACCOUNT STATEMENT
            Map<String, Object> bankStatementAnalysis = new Map<String, Object>();
            bankStatementAnalysis.put('status', 'Valid');
            bankStatementAnalysis.put('rulesPassed', new List<String>{
                'All mandatory fields are present on the document',
                'Document is in English and Regional Language',
                'Issuance state (Maharashtra) matches address',
                'Document appears to have no overwriting or alterations',
                'Formatting is consistent',
                'Last 4 digits match on both sides'
            });
            bankStatementAnalysis.put('rulesFailed', new List<String>{
                'Name mismatch: Asha Rao vs Asha Meera Rao. Match score is < 75%',
                'Address mismatch: Present vs Permanent address not matching. Match score < 75%'
            });
            bankStatementAnalysis.put('rulesNotAnalyzed', new List<String>{
                'Cannot validate the photo match because the photo from the document is not accessible'
            });
            sampleData.put('BANK ACCOUNT STATEMENT', bankStatementAnalysis);
            
            // Determine object type and update accordingly
            String objectType = Id.valueOf(recordId).getSObjectType().getDescribe().getName();
            
            if (objectType == 'ResidentialLoanApplication') {
                // Update the loan application record
                ResidentialLoanApplication loanApp = new ResidentialLoanApplication();
                loanApp.Id = recordId;
                loanApp.AI_Analysis_Data__c = JSON.serialize(sampleData);
                update loanApp;
            } else if (objectType == 'Opportunity') {
                // Update the opportunity record with specific fields
                Opportunity opp = new Opportunity();
                opp.Id = recordId;
                opp.AI_ProofOfIncome_Analysis__c = JSON.serialize(proofOfIncomeAnalysis);
                opp.AI_BankStatement_Analysis__c = JSON.serialize(bankStatementAnalysis);
                // Keep backwards compatibility
                opp.AI_Analysis_Data__c = JSON.serialize(sampleData);
                update opp;
            }
            
            return 'Sample AI analysis data created successfully';
        } catch (Exception e) {
            throw new AuraHandledException('Error creating sample data: ' + e.getMessage());
        }
    }
}