import { LightningElement, api, track } from 'lwc';
import getVerificationJSON from '@salesforce/apex/VerificationController.getVerificationJSON';

export default class VerificationDashboard extends LightningElement {
    @api recordId;

    @track panData = [];
    @track aadharData = [];
    @track showPanCard = false;
    @track showAadharCard = false;

    connectedCallback() {
        this.loadVerificationData();
    }

    loadVerificationData() {
        getVerificationJSON({ oppId: this.recordId })
            .then(result => {
                if (!result) return;

                // remove extra '''json and '''
                let jsonString = result.replace(/^'''\s*json\s*/, '').replace(/\s*'''$/, '').trim();

                let data;
                try {
                    data = JSON.parse(jsonString);
                } catch (e) {
                    console.error('Error parsing verification JSON', e);
                    return;
                }

                this.panData = data.pan_card_comparison || [];
                this.aadharData = data.aadhar_card_comparison || [];

                this.showPanCard = this.panData.length > 0;
                this.showAadharCard = this.aadharData.length > 0;

                console.log('this.aadharData--'+this.aadharData);
            })
            .catch(error => console.error(error));
    }
}