public with sharing class DE_AdvancedFileUploaderCtrl {
    @AuraEnabled  
    public static List<ContentDocument> getFilesFromRecId(String recordId){ 
        System.debug('Record Id is '+recordId);
        Set<Id> recordIds = new Set<Id>{recordId};
        List<ContentDocumentLink> cdlList = [SELECT Id, LinkedEntityId, ContentDocumentId FROM 
                                             ContentDocumentLink WHERE LinkedEntityId IN :recordIds
                                            ];                         
        Set<Id> documentIds = new Set<Id>(); 
        for(ContentDocumentLink cdl:cdlList){  
            documentIds.add(cdl.ContentDocumentId);  
        }    
        return [SELECT Id, Title, FileType FROM ContentDocument WHERE Id IN :documentIds];        
    } 
    
    @AuraEnabled  
    public static List<ContentDocument> getFilesFromDocIds(List<String> docIds){ 
        System.debug('Record Id is '+docIds);
         
        return [SELECT Id, Title, FileType FROM ContentDocument WHERE Id IN :docIds];        
    } 
    
    @AuraEnabled  
    public static void deleteFile(String contentDocumentId){ 
        delete [SELECT Id from ContentDocument WHERE Id = :contentDocumentId];       
    }  
}