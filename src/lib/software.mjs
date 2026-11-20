// A pop-up is eligible only after Jan confirms the specific read/write claim.
export const software = {
  Home: ['ServiceTitan','Housecall Pro','Jobber','QuickBooks','Google','HubSpot','Gusto','Stripe'],
  Sales: ['ServiceTitan','Housecall Pro','Jobber','HubSpot','GoHighLevel','CallRail'],
  Marketing: ['Google Business Profile','Google Ads','Meta','Mailchimp','Yelp'],
  Operations: ['ServiceTitan','Housecall Pro','Jobber','Samsara','Verizon Connect','CompanyCam'],
  Finance: ['QuickBooks','Xero','Stripe','Square','BILL'],
  'Human Resources': ['Gusto','ADP','Paychex','Indeed','ZipRecruiter']
};
export const confirmedPopups = new Set();
