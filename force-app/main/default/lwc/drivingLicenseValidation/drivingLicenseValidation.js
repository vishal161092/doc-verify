import { LightningElement, api } from 'lwc';

export default class DrivingLicenseValidation extends LightningElement {
    @api data; // entire JSON for drivingLicense

    // ------- STATUS CLASS -------
    get statusClass() {
        return this.data?.success ? 'status success' : 'status error';
    }

    // ------- FLAG CLASSES -------
    get blankClass() {
        return this.data?.flags?.isBlank ? 'flag bad' : 'flag good';
    }

    get blurredClass() {
        return this.data?.flags?.isBlurred ? 'flag bad' : 'flag good';
    }

    get expiredClass() {
        return this.data?.flags?.isExpired ? 'flag bad' : 'flag good';
    }

    get incompleteClass() {
        return this.data?.flags?.isIncomplete ? 'flag bad' : 'flag good';
    }
}