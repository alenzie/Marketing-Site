// Trust Center content — copy is VERBATIM from Sultan Cheema's 2026-08-19 packet.
// Do not edit the prose here without his sign-off. British spellings (organisational,
// programme, authorisation) are intentional: the copy was approved as written.
// The only NEW copy in this file is the three `desc` strings on DOCS — written for the
// landing page document cards, which the packet did not have. Flagged for review.

export interface KvRow { k: string; v: string }
export interface TrustSection { title: string; paras: string[]; kv?: KvRow[]; tail?: string }
export interface TrustDoc {
  title: string; crumb: string; lede: string;
  meta: KvRow[]; callout: string; sections: TrustSection[];
}
export interface TrustPanel {
  label: string; title: string; lede: string;
  badges?: boolean; items?: boolean;
}

export const DOCS = [
  { href: '/trust/security-exhibit', label: 'Security Exhibit', desc: 'Technical and organisational measures protecting the platform. Written to be read without an NDA.' },
  { href: '/trust/quality-statement', label: 'Quality Statement', desc: 'How the software is designed, released, monitored and improved under ISO 13485:2016.' },
  { href: '/trust/data-processing-addendum', label: 'Data Processing Addendum', desc: 'What we do with patient data, and the commitments we make as a HIPAA Business Associate.' },
];

// Annotated (not `satisfies`) so LANDING.panels[key] resolves to TrustPanel and the
// optional `badges` / `items` flags are readable off either panel.
export const PANELS: Record<'overview' | 'compliance', TrustPanel> = {
  overview: {
    label: 'Overview',
    title: 'Compliance Posture at a Glance',
    lede: 'The current status of our core quality, security and assurance activities. Items still in progress are labelled clearly. We do not claim certifications we have not earned.',
    badges: true,
  },
  compliance: {
    label: 'Compliance',
    title: 'Compliance',
    lede: 'Frameworks and assurance activities governing the NSight360 platform.',
    items: true,
  },
};

export const LANDING = {
  title: 'Trust at Ophthalytics',
  lede: 'Ophthalytics develops and operates NSight360, cloud-hosted Software as a Medical Device for earlier retinal disease detection. This page sets out how we protect patients and their data across quality, security and privacy.',
  meta: [
    { k: 'Quality System', v: 'ISO 13485:2016' },
    { k: 'Device Type', v: 'Software as a Medical Device' },
    { k: 'Data Classification', v: 'PHI, Restricted' },
    { k: 'Cloud Provider', v: 'Amazon Web Services' },
    { k: 'Last Assessed', v: 'Q2 2026' },
  ],
  panelOrder: ['overview', 'compliance'] as const,
  panels: PANELS,
};

export const BADGES = [
  { n: 'ISO 13485:2016 QMS', s: 'Established', t: 'done' },
  { n: 'HIPAA-Aligned Practices', s: 'In Place', t: 'done' },
  { n: 'Independent Penetration Testing', s: 'Completed', t: 'done' },
  { n: 'SOC 2 Type II', s: 'In Progress', t: 'prog' },
];

export const ITEMS = [
  { t: 'HIPAA', d: 'Administrative, physical, and technical safeguards are implemented in line with the HIPAA Security Rule. A Business Associate Agreement is executed with our cloud infrastructure provider.' },
  { t: 'SOC 2 Type II', pill: 'In Progress', d: 'A SOC 2 Type II readiness programme is underway, covering the Security trust services criteria. Controls are being implemented and evidenced ahead of an independent audit. The report will be published here on completion.' },
  { t: 'Independent Penetration Testing', d: 'The platform and its screening modules have undergone independent penetration testing covering authentication, authorisation, API security, and access control. Findings are tracked to closure through a formal remediation process, with re-testing to verify fixes.' },
];

export const SECURITY = {
  title: 'Security Exhibit',
  crumb: 'Security Exhibit',
  lede: 'The technical and organisational measures that protect the NSight360 platform and the data entrusted to it. Written so a reviewer can understand our security posture without an NDA.',
  meta: [
    { k: 'Applies To', v: 'NSight360 Platform' },
    { k: 'Data Class', v: 'PHI, Restricted' },
    { k: 'Hosting', v: 'United States' },
    { k: 'Last Reviewed', v: 'Q2 2026' },
  ],
  callout: 'Ophthalytics processes Protected Health Information on behalf of healthcare providers. This Exhibit sets out, in plain terms, how that data is protected across the platform, its infrastructure and the people who operate it.',
  sections: [
    { title: 'Purpose and Scope', paras: [
      'This Security Exhibit describes the technical and organisational measures that Ophthalytics applies to protect the NSight360 platform and the data entrusted to it. It is written to give customers, prospects and their vendor risk teams a clear account of how the service is secured, without requiring an NDA to read.',
      'The scope of this Exhibit is the NSight360 platform and its screening modules, the production environment in which they run, and the operational processes that support them. It does not cover the retinal cameras that capture images, the customer devices and browsers used to access the service, or the healthcare facility networks those devices sit on. Responsibility for those elements rests with the customer and their suppliers.',
    ] },
    { title: 'Security Governance', paras: [
      'Security is owned by a Product Security function that reports to top management and is organisationally independent of engineering. This separation means that a decision to withhold a release on security grounds cannot be overruled by the team that produced the change.',
      'Security requirements are set out in documented policies covering access control, secure development, logging, incident response and data handling. Policies are reviewed on a defined cycle and after any material change to the platform or its threat landscape. The full policy set is available to customers under NDA.',
    ] },
    { title: 'Data Classification and Handling', paras: [
      'The platform processes Protected Health Information (PHI), including retinal images and patient demographics. All such data is classified as Restricted, the highest sensitivity tier, and is handled accordingly throughout its lifecycle.',
      'Restricted data is never used outside the purpose for which it was provided. Production data is not copied into development or test environments, and no live PHI is used for testing. Where realistic data is needed for engineering work, it is synthetic or de-identified.',
    ] },
    { title: 'Identity, Access and Authentication', paras: [
      'Access follows the principle of least privilege. Every user and operator is assigned a role scoped to their clinical or operational function, and permissions derive from that role rather than from the individual. Patient data is exposed only to roles with a legitimate need to see it.',
      'Multi-factor authentication is enforced on administrative and privileged accounts, which are the highest-risk access paths. Access rights are reviewed on a recurring basis and reconciled against current responsibilities, and access is removed promptly on role change or departure. Access to patient records is logged to support monitoring, investigation and audit.',
    ] },
    { title: 'Encryption and Key Management', paras: [
      'All traffic between client devices and the platform is protected with current transport encryption, and plaintext transmission of patient data is not permitted. Data at rest, including image storage and the application database, is encrypted using industry-standard algorithms.',
      'Encryption keys are managed through the managed key services of our cloud infrastructure provider, with access to key material restricted to the roles that require it and logged in the same way as other privileged actions.',
    ] },
    { title: 'Cloud Infrastructure and Network Security', paras: [
      'The platform is hosted entirely on Amazon Web Services in a United States region. It runs inside a private virtual network with segmentation between tiers, and public entry is limited to a load-balanced ingress protected by a web application firewall.',
      "The production environment is isolated from development and test. Administrative access to production infrastructure is restricted, authenticated and logged. A Business Associate Agreement is executed with the cloud infrastructure provider, and the physical security of the underlying data centres is the provider's responsibility under that agreement.",
    ] },
    { title: 'Secure Development and Change Management', paras: [
      'Changes to the platform move through a defined development lifecycle with peer code review, automated testing and static analysis before release. The depth of verification applied to a given component reflects its safety and security significance.',
      'Releases are controlled through a documented process with a pre-release checklist and a recorded release decision. Where a design input derives from a security control, that link is recorded so the control cannot be removed without the associated risk being reassessed.',
    ] },
    { title: 'Vulnerability Management and Penetration Testing', paras: [
      "Dependencies are monitored for known vulnerabilities, and a software bill of materials is maintained for the platform's components. Identified issues are triaged by severity and remediated within timeframes set by their risk.",
      'The platform and its screening modules undergo independent penetration testing covering authentication, authorisation, API security and access control. Findings are tracked to closure through a formal remediation process, and fixes are confirmed by re-testing. A summary of the most recent test is available to customers under NDA.',
    ] },
    { title: 'Logging, Monitoring and Detection', paras: [
      'Security-relevant events across the application and infrastructure are logged centrally and retained for investigation and audit. Monitoring and alerting are configured so that anomalous or unauthorised activity is surfaced to the team responsible for responding to it.',
      'Access to logs is itself restricted and recorded, and logs are protected against tampering so that they remain reliable as a record of what occurred.',
    ] },
    { title: 'Incident Response and Breach Notification', paras: [
      'A documented incident response process defines how events are detected, triaged, escalated, contained and resolved, and how lessons are fed back into the platform and its controls.',
      'Where an incident involves Protected Health Information, affected customers are notified in accordance with HIPAA and the terms of the applicable agreement, within the timeframes those terms require. Suspected vulnerabilities can be reported to us at any time at support@ophthalytics.com.',
    ] },
    { title: 'Resilience, Backup and Continuity', paras: [
      'Patient data is backed up on a regular schedule, and backups are encrypted and protected to the same standard as production data. Recovery procedures are defined so that service and data can be restored within objectives agreed with customers.',
      'The platform is built on managed, redundant cloud services to reduce the impact of individual component failures on availability.',
    ] },
    { title: 'Personnel Security and Training', paras: [
      'Personnel with access to Restricted data are subject to appropriate pre-engagement checks and are bound by confidentiality obligations. Access is granted only after those obligations are in place and only to the extent the role requires.',
      'Staff receive security and privacy training on joining and on a recurring basis thereafter, with additional guidance for roles that carry elevated access or handle PHI directly.',
    ] },
    { title: 'Subprocessors', paras: [
      'Ophthalytics uses a limited set of subprocessors to deliver the service, the most significant being the cloud infrastructure provider that hosts the platform. Subprocessors that may process PHI are engaged under written agreements that flow down the relevant confidentiality and security obligations, including a Business Associate Agreement where required.',
      'A current list of subprocessors is maintained and made available to customers, and customers are informed of material changes so that they can exercise any rights the agreement gives them.',
    ] },
    { title: 'Assurance, Audit and Certification', paras: [
      'Ophthalytics maintains a quality management system established in accordance with ISO 13485:2016, described in our Quality Statement, within which security is treated as an integrated discipline rather than a separate function.',
      'A SOC 2 Type II readiness programme is underway, covering the Security trust services criteria, with controls being implemented and evidenced ahead of an independent audit. The report will be published on completion. Until then, we support customer assurance through this Exhibit, a self-assessment questionnaire, and evidence released under NDA.',
    ] },
  ],
};

export const QUALITY = {
  title: 'Quality Statement',
  crumb: 'Quality Statement',
  lede: 'How the NSight360 Software as a Medical Device is designed, developed, released, monitored and improved under a quality management system established in accordance with ISO 13485:2016.',
  meta: [
    { k: 'Quality System', v: 'ISO 13485:2016' },
    { k: 'Device Type', v: 'Software as a Medical Device' },
    { k: 'Manual Rev', v: '2.0' },
    { k: 'Effective', v: '23 Mar 2026' },
  ],
  callout: 'Ophthalytics develops Software as a Medical Device and does not manufacture physical devices or hardware. Our quality management system governs the safety and performance of that software and the integrity of the data it handles.',
  sections: [
    { title: 'Overview and Scope', paras: [
      'Ophthalytics develops and operates NSight360, a cloud-hosted Software as a Medical Device (SaMD) that supports the detection, evaluation and clinical interpretation of retinal disease from ophthalmic images. The platform comprises a common backend together with functionally related modules, namely NSight360, Ocula360, Ophthal360 and 2nd Opinion, developed, released and maintained together as a single medical device family.',
      "The quality of the platform's outputs, the safety of patients, and the integrity of the underlying data are interdependent. We therefore treat medical device quality, software safety and data integrity as a single integrated discipline rather than as separate administrative functions.",
    ] },
    { title: 'Regulatory Framework', paras: [
      'As the developer of Software as a Medical Device, Ophthalytics maintains a quality management system established in accordance with ISO 13485:2016, with ISO 9000:2015 as the supporting normative reference. The Quality Manual is the top-level document of that system.',
      'Ophthalytics does not design, manufacture, distribute or service physical medical devices, hardware, sterile products or installation-dependent products. Requirements of ISO 13485:2016 that apply exclusively to such products are recorded as non-applicable, with justification, in the Quality Manual.',
    ] },
    { title: 'Quality Policy', paras: [
      'Top management has established a Quality Policy that is communicated, understood and applied across the organisation. Everyone working under Ophthalytics is accountable for upholding it. The policy commits Ophthalytics:',
    ], kv: [
      { k: 'Regulatory Compliance', v: 'To comply with applicable regulatory requirements for medical devices and to maintain the effectiveness of the quality management system under ISO 13485:2016.' },
      { k: 'Safe and Secure by Default', v: 'To design systems so that the safety and performance of the device, and the confidentiality and integrity of data entrusted to us, are protected by default.' },
      { k: 'Lifecycle Risk Management', v: 'To apply risk management throughout the product lifecycle as an integrated part of product realisation.' },
      { k: 'Independent Examination', v: 'To subject our own controls to independent examination and to act on what that examination finds.' },
      { k: 'Open Communication', v: 'To communicate openly and promptly with customers when our processes or their data are affected by change.' },
      { k: 'Continual Improvement', v: 'To continually improve the suitability, adequacy and effectiveness of the quality management system.' },
    ] },
    { title: 'Quality Objectives', paras: [
      'Top management establishes measurable quality objectives that are consistent with the Quality Policy and are tracked and reviewed at management review. The current objective areas are:',
    ], kv: [
      { k: 'Product Conformity and Device Performance', v: 'Rate of nonconforming outputs, time to correction, and algorithmic performance against defined acceptance criteria.' },
      { k: 'Patient Safety', v: 'Number and severity of hazard-related nonconformities, and timeliness of any required regulatory reporting.' },
      { k: 'Data Integrity and Protection', v: 'Confirmed integrity or confidentiality events and the closure status of assessment findings.' },
      { k: 'CAPA Effectiveness', v: 'Proportion of corrective actions closed within the planned interval and verified as effective.' },
      { k: 'Personnel Competence', v: 'Proportion of personnel current against assigned competence requirements.' },
    ] },
    { title: 'Medical Device File and Document Control', paras: [
      'A Medical Device File covers the platform and its modules as a single family, containing or referencing the device description and intended use, product specifications, monitoring procedures and, where applicable, servicing records. Module-specific content is maintained as identified sub-sections of that file.',
      'Documents and records are controlled through documented procedures governing review, approval, versioning, availability at the point of use, and protection against loss or unintended use of obsolete versions. Records are retained for at least the lifetime of the device as we define it, and not less than the periods required by the applicable regulations and by contract.',
    ] },
    { title: 'Risk Management', paras: [
      'Risk management is applied across the full product lifecycle as an integrated part of product realisation, not as a separate administrative step. A risk-based approach governs the control of quality management processes and of product realisation, and the results are captured in the risk management file.',
      'Product Security assesses security risk as an input to that file and holds the authority to withhold a release where a security acceptance criterion is not met. Feedback from production and post-production activities feeds back into risk management, monitoring and improvement, closing the loop from field experience to design.',
    ] },
    { title: 'Design Controls and Clinical Evaluation', paras: [
      'Design and development is planned and controlled under ISO 13485 clause 7.3. Design plans define stages, reviews, verification, validation and transfer activities, the traceability of outputs to inputs, and the software safety classification assigned to each software item.',
      "Verification includes unit, integration and system testing, static analysis and code review at a depth appropriate to each item's classification. Validation confirms that the product meets its intended use on representative product. Algorithmic components are validated against a defined reference standard, including performance across demographic and epidemiological subgroups representative of the intended screening population.",
      'Automated outputs are presented to a qualified reader for review and are not acted upon as a final clinical determination without that review. This human-in-the-loop principle is designed into the workflow rather than added around it.',
    ] },
    { title: 'Monitoring, Feedback and Continual Improvement', paras: [
      'Feedback, complaints and post-market information are collected, evaluated and acted upon through documented procedures. Nonconforming outputs are identified, controlled and dispositioned, and rework runs through the design change process rather than as an ad-hoc modification.',
      'The quality management system is examined through a planned internal audit programme in which auditors do not audit their own work, and it is reviewed by top management at planned intervals for continuing suitability, adequacy and effectiveness. Corrective and preventive actions are managed to root cause and verified for effectiveness.',
    ] },
    { title: 'Independent Quality and Security Functions', paras: [
      'The Quality and Product Security functions report to top management and are organisationally independent of engineering. A determination that an output fails its acceptance criteria cannot be overridden by the function that produced it.',
      'The full Quality Manual and supporting procedures are available for review under NDA. This Statement is a public summary and is superseded by the controlled documents themselves where the two differ.',
    ] },
  ],
};

export const DPA = {
  title: 'Data Processing Addendum',
  crumb: 'Data Processing Addendum',
  lede: 'How Ophthalytics processes personal and health data on behalf of customers using the NSight360 platform, and the commitments we make about how that data is handled.',
  meta: [
    { k: 'Framework', v: 'HIPAA' },
    { k: 'Our Role', v: 'Business Associate' },
    { k: 'Data Location', v: 'United States' },
    { k: 'Last Updated', v: 'Q2 2026' },
  ],
  callout: 'This Addendum describes our data processing commitments in plain language. It sits alongside the services agreement with each customer and is read together with our Security Exhibit.',
  sections: [
    { title: 'Purpose and Definitions', paras: [
      'This Data Processing Addendum describes how Ophthalytics processes personal and health data on behalf of its customers when they use the NSight360 platform. It is intended to sit alongside the services agreement between Ophthalytics and the customer and to be read with our Security Exhibit.',
      'Terms such as Protected Health Information (PHI), Covered Entity and Business Associate carry the meanings given to them under the U.S. Health Insurance Portability and Accountability Act (HIPAA) and its implementing regulations. Where the two documents differ, the executed agreement between the parties governs.',
    ] },
    { title: 'Roles of the Parties', paras: [
      "In most engagements the customer is the Covered Entity or acts on behalf of one, and Ophthalytics acts as a Business Associate, processing PHI only to provide the service. The customer determines the purposes for which patient data is processed, and Ophthalytics processes it on the customer's documented instructions.",
      'Where data protection laws other than HIPAA apply to a particular engagement, the parties will give effect to the equivalent controller and processor roles through the applicable agreement.',
    ] },
    { title: 'Categories of Data and Individuals', paras: [
      'The platform processes the following categories of data, all of which are classified as Restricted:',
    ], kv: [
      { k: 'Retinal Images', v: 'Ophthalmic fundus images submitted for analysis and clinical interpretation.' },
      { k: 'Patient Demographics', v: 'Identifying and contextual information needed to associate an image with an individual and a report.' },
      { k: 'Report and Result Data', v: 'The diagnostic outputs generated by the platform and the reader interpretation associated with them.' },
      { k: 'Account and Access Data', v: 'Information about the clinicians and operators who use the service, used to authenticate and authorise access.' },
    ], tail: "The individuals whose data is processed are the patients screened through the customer, and the customer's own users of the service." },
    { title: 'Scope and Purpose of Processing', paras: [
      'Ophthalytics processes patient data solely to provide, maintain, secure and support the NSight360 service, and for no other purpose. Patient data is not sold, and it is not used for advertising or for any secondary purpose that is not part of delivering the service to the customer.',
      "Any use of data to improve the platform's algorithms is carried out only where permitted by the applicable agreement and applicable law, using de-identified or otherwise appropriately safeguarded data.",
    ] },
    { title: 'HIPAA Business Associate Obligations', paras: [
      'As a Business Associate, Ophthalytics uses and discloses PHI only as permitted by the Business Associate Agreement and by law, implements administrative, physical and technical safeguards in line with the HIPAA Security Rule, and reports to the customer any use or disclosure not provided for in the agreement.',
      "Ophthalytics ensures that subcontractors that create, receive, maintain or transmit PHI on its behalf agree in writing to the same restrictions and conditions, and makes its internal practices and records available as required to support the customer's HIPAA obligations.",
    ] },
    { title: 'Security Measures', paras: [
      'The technical and organisational measures Ophthalytics applies to protect patient data are set out in full in the Security Exhibit, which forms part of this Addendum. In summary they include least-privilege role-based access with multi-factor authentication on privileged accounts, encryption of data in transit and at rest, isolation of production from development and test, centralised logging, independent penetration testing, and a documented incident response process.',
      'These measures are reviewed and updated over time. Ophthalytics will not materially reduce the overall level of protection for patient data during the term of the agreement.',
    ] },
    { title: 'Confidentiality and Personnel', paras: [
      'Access to patient data is limited to personnel who need it to deliver or support the service, and those personnel are bound by confidentiality obligations that survive the end of their engagement.',
      'Personnel receive privacy and security training on joining and on a recurring basis, with additional guidance for roles that handle PHI directly.',
    ] },
    { title: 'Subprocessors', paras: [
      'Ophthalytics engages a limited set of subprocessors to deliver the service, the most significant being the cloud infrastructure provider that hosts the platform. Subprocessors that may process PHI are engaged under written agreements that flow down the relevant obligations, including a Business Associate Agreement where required.',
      'A current list of subprocessors is available to customers on request. Ophthalytics informs customers of material changes to that list so that customers can exercise any objection rights the agreement provides.',
    ] },
    { title: 'Data Location and International Transfers', paras: [
      'The platform and the patient data it processes are hosted on cloud infrastructure located in the United States. Ophthalytics does not transfer patient data outside that location except as necessary to provide the service and as permitted by the applicable agreement.',
      'Where an engagement requires data to remain in a particular jurisdiction, that requirement is addressed in the services agreement.',
    ] },
    { title: 'Individual Rights', paras: [
      'Requests from patients to access, amend or obtain an accounting of disclosures of their information are directed to and handled by the Covered Entity, since it holds the direct relationship with the patient. Ophthalytics supports the customer in responding to such requests to the extent the data sits within the platform.',
      'Ophthalytics does not respond directly to patient requests concerning PHI unless instructed to do so by the customer or required by law.',
    ] },
    { title: 'Retention, Return and Deletion', paras: [
      'Patient data is retained only for as long as needed to provide the service and to meet the retention periods set by the applicable agreement and by law, including the record retention obligations of our quality management system.',
      "On termination of the agreement, Ophthalytics returns or securely destroys the patient data it holds, at the customer's choice and where return or destruction is feasible. Secure destruction of media follows recognised sanitisation practice so that data cannot be reconstructed.",
    ] },
    { title: 'Incident and Breach Notification', paras: [
      'Ophthalytics maintains a documented process for detecting, investigating and responding to security incidents. Where an incident results in a breach of unsecured PHI, Ophthalytics notifies the affected customer without undue delay and within the timeframes required by HIPAA and the agreement, and provides the information the customer needs to meet its own notification obligations.',
      'Notifications include the information available at the time and are updated as an investigation progresses.',
    ] },
    { title: 'Audit and Assurance', paras: [
      'Ophthalytics supports customer due diligence through this Addendum, the Security Exhibit, a self-assessment questionnaire, and supporting evidence released under NDA. A SOC 2 Type II readiness programme is underway and the resulting report will be made available on completion.',
      "Where the agreement provides audit rights, those are exercised in a manner that protects the confidentiality and security of other customers' data and the integrity of the production environment.",
    ] },
    { title: 'Changes and Contact', paras: [
      'Ophthalytics may update this Addendum to reflect changes in its practices, its subprocessors or the law. Material changes are communicated to customers through the channels set out in the agreement.',
      'Questions about this Addendum, requests for the current subprocessor list, and data protection enquiries can be sent to support@ophthalytics.com.',
    ] },
  ],
};

export const DOC_DATA = { security: SECURITY, quality: QUALITY, dpa: DPA };
