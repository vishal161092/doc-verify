import { LightningElement, api } from 'lwc';
import einsteinMainGif from "@salesforce/resourceUrl/Einstein_Main";
import einsteinLoadin from "@salesforce/resourceUrl/Einstein_Loading";
import getPromptDetails from "@salesforce/apex/de_call_prompt_Apex.getPromptDetails";

export default class De_Underwriter_LWC extends LightningElement {

    @api recordId;
    einsteinMainGif = einsteinMainGif;
    einsteinLoadin = einsteinLoadin;

    baseUrl = "";
    volume = 100;
    audioLoaded = false;
    summaryTrans = false;
    einsteinLoading = false;
    audioElement;
    summary;

    load1_1 = true;
    load1_2 = false;
    load2_1 = true;
    load2_2 = false;
    load3_1 = true;
    load3_2 = false;
    load4_1 = true;
    load5_2 = false;

    first_timeSpan = 1000;
    timeSpan = 2000;

    handleClick(event) {
        
        // this.response = 'Processing your question… One moment.';
        this.einsteinLoading = true;
        this.response = '';

        getPromptDetails({ RecId: this.recordId })
		.then(result => {
			this.response = result.replace(/^```html\s*/, '').replace(/\s*```$/, '');;
            console.log('Result >> '+result);	
            this.einsteinLoading = false;
		})
		.catch(error => {
			console.log('Error >> '+ JSON.stringify(error));
		})
    }

delayTime() {

    setTimeout(() => {
        this.load1_1 = true;
        this.load1_2 = false;
        this.load2_1 = true;
        this.load2_2 = false;
        this.load3_1 = true;
        this.load3_2 = false;
        this.load4_1 = true;
        this.load5_2 = false;

        setTimeout(() => {

        this.load1_1 = false;
        this.load1_2 = true;
        this.load2_1 = true;
        this.load2_2 = false;
        this.load3_1 = true;
        this.load3_2 = false;
        this.load4_1 = true;
        this.load5_2 = false;

        setTimeout(() => {

        this.load1_1 = false;
        this.load1_2 = true;
        this.load2_1 = false;
        this.load2_2 = true;
        this.load3_1 = true;
        this.load3_2 = false;
        this.load4_1 = true;
        this.load5_2 = false;

        setTimeout(() => {

        this.load1_1 = false;
        this.load1_2 = true;
        this.load2_1 = false;
        this.load2_2 = true;
        this.load3_1 = false;
        this.load3_2 = true;
        this.load4_1 = true;
        this.load5_2 = false;

    }, this.timeSpan);

    }, this.timeSpan);

    }, this.first_timeSpan);

    }, this.first_timeSpan);
}
}