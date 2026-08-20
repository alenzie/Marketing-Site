// HubSpot form wiring — used by FormBlock.astro and the footer newsletter form.
//
// These are PUBLIC identifiers, safe to ship client-side: the submission endpoint
// (api.hsforms.com/submissions/v3/integration/submit) is HubSpot's unauthenticated
// endpoint for custom-coded forms. The app's access token lives in .env and must
// never appear here.
//
// Forms were created by the "Ophthalytics Site Integration" app (see hubspot/ in
// this repo). Manage them in HubSpot under Marketing → Forms.

export const HUBSPOT_PORTAL_ID = '40170226';

export const HUBSPOT_FORMS = {
  /** Header/footer "Contact" modal — Connect With Us */
  contact: 'b896bd2d-98df-4e71-81f9-6c2b80aeb5c7',
  /** "Book a demo" modal */
  demo: '77fea900-8769-4498-a69d-0dff4107ca5d',
  /** Footer newsletter signup */
  newsletter: '5c100e3b-5cd8-4c12-a1e4-f869f826f144',
} as const;

export type HubspotFormKey = keyof typeof HUBSPOT_FORMS;

export const hubspotSubmitUrl = (formId: string) =>
  `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formId}`;
