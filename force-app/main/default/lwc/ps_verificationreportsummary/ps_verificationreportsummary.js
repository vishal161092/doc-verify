import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

// Account fields
//import VERIFICATION_RESPONSE_FIELD from '@salesforce/schema/ResidentialLoanApplication.Comment_from_assessor__c';
import VERIFICATION_RESPONSE_FIELD from '@salesforce/schema/Opportunity.AI_Application_Summary__c';

export default class Ps_verificationreportsummary extends LightningElement {
    @api recordId; // Gets the Account Id

    summary = null;
    details = null;

    @wire(getRecord, { recordId: '$recordId', fields: [VERIFICATION_RESPONSE_FIELD] })
    wiredAccount({ error, data }) {
        if (data) {
            console.log('data',data);
            //const verificationResponse = data.fields.Comment_from_assessor__c.value;
            const verificationResponse = data.fields.AI_Application_Summary__c.value;
            try {
                // this.summary = parsedData.Summary.Summary.map((item, index) => ({
                //     key: index,
                //     attributeName: item['Attribute Name'],
                //     aadhar: item.Aadhar !== null ? (item.Aadhar ? '✔️' : '❌') : 'N/A',
                //     pan: item.PAN !== null ? (item.PAN ? '✔️' : '❌') : 'N/A',
                //     voterId: item['Voter Id'] !== null ? (item['Voter Id'] ? '✔️' : '❌') : 'N/A'
                // }));
                const parsedData = JSON.parse(verificationResponse);
                this.details = Object.keys(parsedData.Details).map((docType) => ({
                    documentType: docType,
                    dataAvailable: parsedData.Details[docType]['Data Available'] === 'Y',
                    attributes: parsedData.Details[docType].Attributes.map((attr) => ({
                        attributeName: attr['Attribute Name'],
                        valueInApplication: attr['Value in Application'],
                        valueInDocument: attr['Value in Document'],
                        matching: attr.Matching ? '✔️' : '❌'
                    }))
                }));              
            } catch (err) {
                console.error('Error parsing Verification_Response__c JSON', err);
                this.summary = null;
                this.details = null;
            }
        } else if (error) {
            console.error('Error fetching Account data', error);
        }
    }
   
}