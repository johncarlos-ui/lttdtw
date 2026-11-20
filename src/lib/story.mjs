export const stops = [
  { department: 'Marketing', captions: [
    { text: 'Tuesday, 8:41 p.m.', at: 0 },
    { text: 'Someone searches "no hot water."', at: 0.07 },
    { text: 'Your ad.', at: 0.2 },
    { text: 'Your page.', at: 0.31 },
    { text: 'A lead.', at: 0.43 }
  ], detail: ['no hot water', 'Dana R., Maple Street.'], software: ['Google Ads'] },
  { department: 'Sales', captions: [
    { text: 'Lead scored: homeowner, ready now, 12-year-old water heater.', at: 0 },
    { text: 'Answered in seconds.', at: 0.20 },
    { text: 'Job #4127 booked for 8:00 a.m.', at: 0.51 }
  ], detail: ['No hot water since this afternoon.', 'We can have a tech there at 8:00 a.m. tomorrow. Want it?', 'Yes please.'], software: ['HubSpot','GoHighLevel','ServiceTitan','Housecall Pro','Jobber'] },
  { department: 'Operations', captions: [
    { text: 'Job #4127 is stop 2 of 6.', at: 0 },
    { text: '22 minutes of driving removed.', at: 0.29 },
    { text: 'Proposed to your dispatcher.', at: 0.44 }
  ], detail: ['Stop 2 of 6', '22 minutes of driving removed'], software: ['Samsara'] },
  { department: 'Operations', captions: [
    { text: 'Photos in.', at: 0 },
    { text: 'Invoice #4127 drafted for your office:', at: 0.22 },
    { text: 'water heater replaced, $2,850.', at: 0.46 }
  ], detail: ['Invoice #4127','Water heater replaced','$2,850'], software: ['Housecall Pro','Jobber'] },
  { department: 'Finance and Marketing', captions: [
    { text: 'Paid, 2:15 p.m.:', at: 0 },
    { text: '$2,850.', at: 0.16 },
    { text: 'Traced back to a $41 Google Ads click.', at: 0.44 }
  ], detail: ['Paid, 2:15 p.m.','$2,850','$41 Google Ads click'], software: ['QuickBooks','Google Ads'] }
];
export const metrics = [
  { label: 'Revenue recovered this month', from: 31480, to: 34330, money: true },
  { label: 'Expenses eliminated this month', from: 1240, to: 1240, money: true },
  { label: 'Hours given back this month', from: 61, to: 61 },
  { label: 'Leads from Google Ads this month', from: 46, to: 47 },
  { label: 'Jobs booked this week', from: 38, to: 39 },
  { label: 'Ad spend to revenue on job #4127', text: '$41 to $2,850' },
  { label: 'Cash in QuickBooks', from: 84120, to: 86970, money: true }
];
export const displayMetric = (metric, n) => metric.text ?? (metric.money ? '$' : '') + Math.round(n).toLocaleString('en-US');
