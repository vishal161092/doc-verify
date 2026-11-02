import { LightningElement, api } from 'lwc';

export default class DocumentVerificationReport extends LightningElement {
    @api verificationData;

    get showPanCard() {
        if (!this.verificationData) return false;
        
        let data = this.verificationData;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return false;
            }
        }
        
        return data.pan_card_comparison && data.pan_card_comparison.length > 0;
    }

    get showAadharCard() {
        if (!this.verificationData) return false;
        
        let data = this.verificationData;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return false;
            }
        }
        
        return data.aadhar_card_comparison && data.aadhar_card_comparison.length > 0;
    }
}