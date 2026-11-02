public class de_call_prompt_Apex {

	// API name of the Prompt Builder template to run (create it in your org; see README).
	private static final String PROMPT_TEMPLATE_API_NAME = 'Underwriter_Summary';
	
	@AuraEnabled
	public static String getPromptDetails(String RecId){

		Opportunity opp = [SELECT Id, Bank_Statement_Analysis__c, Health_Analysis__c FROM Opportunity WHERE Id =:RecId ];
		
		ConnectApi.EinsteinPromptTemplateGenerationsInput promptGenerationsInput = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        promptGenerationsInput.isPreview = false;
                        
        Map<String,ConnectApi.WrappedValue> valueMap = new Map<String,ConnectApi.WrappedValue>();

        Map<String, String> account1RecordIdMap = new Map<String, String>();
        account1RecordIdMap.put('id', RecId); // Opp ID

        ConnectApi.WrappedValue account1WrappedValue = new ConnectApi.WrappedValue();
        account1WrappedValue.value = account1RecordIdMap;

        ConnectApi.WrappedValue strWrappedValue1 = new ConnectApi.WrappedValue();
        strWrappedValue1.value = opp.Bank_Statement_Analysis__c;

		ConnectApi.WrappedValue strWrappedValue2 = new ConnectApi.WrappedValue();
        strWrappedValue2.value = opp.Health_Analysis__c;
                                        
        valueMap.put('Input:opp', account1WrappedValue);
        valueMap.put('Input:bankStatement', strWrappedValue1);
		valueMap.put('Input:healthAnalysis', strWrappedValue2); 
                                        
        promptGenerationsInput.inputParams = valueMap;
                                        
        promptGenerationsInput.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
        promptGenerationsInput.additionalConfig.applicationName = 'PromptTemplateGenerationsInvocable';
                                        
        ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generationsOutput = 
        ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(PROMPT_TEMPLATE_API_NAME, promptGenerationsInput); 
                                        
        System.debug('Prompt resolution: ' + generationsOutput.prompt);
                                        
        System.debug('Prompt response: ' + generationsOutput.generations[0].text);

        return generationsOutput.generations[0].text;

	}
}