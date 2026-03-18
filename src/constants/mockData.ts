import { VerifiableCredential, IssuerType, ActivityLog, ActivityGraphPoint } from '@/types';

const now = new Date();
const futureDate = (years: number, months = 0) => {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + years);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};
const pastDate = (years: number) => {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
};
// Near-expiry: within 90 days
const nearExpiryDate = () => {
  const d = new Date(now);
  d.setDate(d.getDate() + 45);
  return d.toISOString();
};
// Expired: past
const expiredDate = () => {
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

export const MOCK_CREDENTIALS: VerifiableCredential[] = [
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0001-0000-0000-000000000001',
    type: ['VerifiableCredential', 'NationalIDCredential'],
    issuer: { id: 'did:example:gov-de', name: 'German Federal Government', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(2),
    expirationDate: futureDate(3),
    credentialSubject: { id: 'did:example:user1', givenName: 'Anna', familyName: 'Müller', dateOfBirth: '1990-05-15', nationality: 'DE' },
    status: 'active',
    visual: { title: 'National ID Card', description: 'German Federal Identity', gradientKey: 'eu' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0002-0000-0000-000000000002',
    type: ['VerifiableCredential', 'PassportCredential'],
    issuer: { id: 'did:example:gov-de', name: 'German Federal Government', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(9),
    credentialSubject: { id: 'did:example:user1', passportNumber: 'DE1234567', nationality: 'DE', expiryDate: futureDate(9) },
    status: 'active',
    visual: { title: 'Passport', description: 'German International Passport', gradientKey: 'blue' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0003-0000-0000-000000000003',
    type: ['VerifiableCredential', 'DriverLicenseCredential'],
    issuer: { id: 'did:example:kba-de', name: 'Kraftfahrt-Bundesamt', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(3),
    expirationDate: futureDate(7),
    credentialSubject: { id: 'did:example:user1', licenseNumber: 'B0987654321', categories: ['B', 'AM'], issueDate: pastDate(3) },
    status: 'active',
    visual: { title: "Driver's License", description: 'EU Driving License', gradientKey: 'slate' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0004-0000-0000-000000000004',
    type: ['VerifiableCredential', 'UniversityDegreeCredential'],
    issuer: { id: 'did:example:tu-berlin', name: 'TU Berlin', type: IssuerType.EDUCATION, country: 'DE' },
    issuanceDate: pastDate(2),
    expirationDate: futureDate(50),
    credentialSubject: { id: 'did:example:user1', degree: 'Bachelor of Science', field: 'Computer Science', graduationDate: pastDate(2) },
    status: 'active',
    visual: { title: 'University Degree', description: 'B.Sc. Computer Science', gradientKey: 'indigo' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0005-0000-0000-000000000005',
    type: ['VerifiableCredential', 'ProfessionalCertificateCredential'],
    issuer: { id: 'did:example:coursera', name: 'Coursera', type: IssuerType.EDUCATION, country: 'US' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(2),
    credentialSubject: { id: 'did:example:user1', certificateName: 'Machine Learning Specialization', issuer: 'Stanford University', completionDate: pastDate(1) },
    status: 'active',
    visual: { title: 'ML Certificate', description: 'Machine Learning Specialization', gradientKey: 'purple' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0006-0000-0000-000000000006',
    type: ['VerifiableCredential', 'HealthInsuranceCredential'],
    issuer: { id: 'did:example:aok-de', name: 'AOK Deutschland', type: IssuerType.HEALTH, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(1),
    credentialSubject: { id: 'did:example:user1', insuranceId: 'AOK123456789', plan: 'Statutory Health Insurance', coverageType: 'Full' },
    status: 'active',
    visual: { title: 'Health Insurance', description: 'AOK Statutory Insurance', gradientKey: 'green' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0007-0000-0000-000000000007',
    type: ['VerifiableCredential', 'VaccinationCredential'],
    issuer: { id: 'did:example:rki-de', name: 'Robert Koch Institute', type: IssuerType.HEALTH, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(3),
    credentialSubject: { id: 'did:example:user1', vaccine: 'COVID-19', doses: 3, lastDose: pastDate(1) },
    status: 'active',
    visual: { title: 'Vaccination Card', description: 'COVID-19 Vaccination', gradientKey: 'teal' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0008-0000-0000-000000000008',
    type: ['VerifiableCredential', 'BankAccountCredential'],
    issuer: { id: 'did:example:deutsche-bank', name: 'Deutsche Bank', type: IssuerType.FINANCIAL, country: 'DE' },
    issuanceDate: pastDate(3),
    expirationDate: futureDate(2),
    credentialSubject: { id: 'did:example:user1', iban: 'DE89370400440532013000', accountType: 'Current Account', currency: 'EUR' },
    status: 'active',
    visual: { title: 'Bank Account', description: 'Deutsche Bank Current Account', gradientKey: 'sky' },
  },
  // #9 near-expiry (within 90 days)
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0009-0000-0000-000000000009',
    type: ['VerifiableCredential', 'ResidencePermitCredential'],
    issuer: { id: 'did:example:auslaenderbehoerde', name: 'Ausländerbehörde Berlin', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(2),
    expirationDate: nearExpiryDate(),
    credentialSubject: { id: 'did:example:user1', permitType: 'Niederlassungserlaubnis', issuedIn: 'Berlin', validUntil: nearExpiryDate() },
    status: 'active',
    visual: { title: 'Residence Permit', description: 'Settlement Permit', gradientKey: 'orange' },
  },
  // #10 near-expiry (within 90 days)
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0010-0000-0000-000000000010',
    type: ['VerifiableCredential', 'SocialSecurityCredential'],
    issuer: { id: 'did:example:drv-de', name: 'Deutsche Rentenversicherung', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(5),
    expirationDate: nearExpiryDate(),
    credentialSubject: { id: 'did:example:user1', socialSecurityNumber: 'DE123456780', pensionPoints: 12.5 },
    status: 'active',
    visual: { title: 'Social Security', description: 'Rentenversicherung Card', gradientKey: 'amber' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0011-0000-0000-000000000011',
    type: ['VerifiableCredential', 'TransportPassCredential'],
    issuer: { id: 'did:example:bvg-berlin', name: 'BVG Berlin', type: IssuerType.TRANSPORT, country: 'DE' },
    issuanceDate: pastDate(0),
    expirationDate: futureDate(1),
    credentialSubject: { id: 'did:example:user1', passType: 'Monthly Unlimited', zones: 'AB', validFrom: pastDate(0) },
    status: 'active',
    visual: { title: 'Transport Pass', description: 'BVG Monthly Ticket', gradientKey: 'cyan' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0012-0000-0000-000000000012',
    type: ['VerifiableCredential', 'EmploymentCredential'],
    issuer: { id: 'did:example:siemens', name: 'Siemens AG', type: IssuerType.EMPLOYMENT, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(4),
    credentialSubject: { id: 'did:example:user1', employer: 'Siemens AG', position: 'Software Engineer', startDate: pastDate(1), employmentType: 'Full-time' },
    status: 'active',
    visual: { title: 'Employment Certificate', description: 'Siemens AG Employment', gradientKey: 'zinc' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0013-0000-0000-000000000013',
    type: ['VerifiableCredential', 'TaxCredential'],
    issuer: { id: 'did:example:finanzamt-berlin', name: 'Finanzamt Berlin', type: IssuerType.FINANCIAL, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(1),
    credentialSubject: { id: 'did:example:user1', taxId: 'DE81930001045', taxYear: new Date().getFullYear() - 1, status: 'Filed' },
    status: 'active',
    visual: { title: 'Tax Certificate', description: 'Annual Tax Filing', gradientKey: 'gold' },
  },
  // #14 expired
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0014-0000-0000-000000000014',
    type: ['VerifiableCredential', 'LibraryCardCredential'],
    issuer: { id: 'did:example:stadtbibliothek-berlin', name: 'Stadtbibliothek Berlin', type: IssuerType.EDUCATION, country: 'DE' },
    issuanceDate: pastDate(2),
    expirationDate: expiredDate(),
    credentialSubject: { id: 'did:example:user1', cardNumber: 'LIB-2022-98765', memberSince: pastDate(2) },
    status: 'active',
    visual: { title: 'Library Card', description: 'Berlin City Library', gradientKey: 'lime' },
  },
  // #15 revoked
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0015-0000-0000-000000000015',
    type: ['VerifiableCredential', 'ParkingPermitCredential'],
    issuer: { id: 'did:example:senatsverwaltung-berlin', name: 'Senatsverwaltung Berlin', type: IssuerType.TRANSPORT, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(1),
    credentialSubject: { id: 'did:example:user1', permitZone: 'Mitte', vehiclePlate: 'B-AN-1234', permitType: 'Resident Parking' },
    status: 'revoked',
    visual: { title: 'Parking Permit', description: 'Berlin Resident Parking', gradientKey: 'red' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0016-0000-0000-000000000016',
    type: ['VerifiableCredential', 'TravelVisaCredential'],
    issuer: { id: 'did:example:embassy-fr', name: 'French Embassy', type: IssuerType.TRAVEL, country: 'FR' },
    issuanceDate: pastDate(0),
    expirationDate: futureDate(0, 6),
    credentialSubject: { id: 'did:example:user1', visaType: 'Schengen Tourist', purpose: 'Tourism', maxStay: '90 days' },
    status: 'active',
    visual: { title: 'Travel Visa', description: 'Schengen Tourist Visa', gradientKey: 'rose' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0017-0000-0000-000000000017',
    type: ['VerifiableCredential', 'EHICCredential'],
    issuer: { id: 'did:example:kvbb', name: 'KV Brandenburg', type: IssuerType.HEALTH, country: 'DE' },
    issuanceDate: pastDate(1),
    expirationDate: futureDate(4),
    credentialSubject: { id: 'did:example:user1', cardNumber: 'EHIC-DE-123456', validInCountries: 'EU/EEA', cardType: 'European Health Insurance Card' },
    status: 'active',
    visual: { title: 'EHIC Card', description: 'European Health Insurance', gradientKey: 'emerald' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0018-0000-0000-000000000018',
    type: ['VerifiableCredential', 'DisabilityCardCredential'],
    issuer: { id: 'did:example:versorgungsamt-berlin', name: 'Versorgungsamt Berlin', type: IssuerType.GOVERNMENT, country: 'DE' },
    issuanceDate: pastDate(3),
    expirationDate: futureDate(2),
    credentialSubject: { id: 'did:example:user1', disabilityDegree: '50%', benefits: ['parking', 'public_transport'], issuedBy: 'Versorgungsamt Berlin' },
    status: 'active',
    visual: { title: 'Disability Card', description: 'Schwerbehindertenausweis', gradientKey: 'pink' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0019-0000-0000-000000000019',
    type: ['VerifiableCredential', 'FreelanceRegistrationCredential'],
    issuer: { id: 'did:example:finanzamt-charlottenburg', name: 'Finanzamt Charlottenburg', type: IssuerType.EMPLOYMENT, country: 'DE' },
    issuanceDate: pastDate(2),
    expirationDate: futureDate(3),
    credentialSubject: { id: 'did:example:user1', businessName: 'Anna Müller Consulting', taxNumber: '14/234/12345', registrationDate: pastDate(2) },
    status: 'active',
    visual: { title: 'Freelance Registration', description: 'Gewerbeanmeldung', gradientKey: 'gray' },
  },
  {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:11111111-0020-0000-0000-000000000020',
    type: ['VerifiableCredential', 'BirthCertificateCredential'],
    issuer: { id: 'did:example:standesamt-berlin', name: 'Standesamt Berlin', type: IssuerType.IDENTITY, country: 'DE' },
    issuanceDate: pastDate(30),
    expirationDate: futureDate(70),
    credentialSubject: { id: 'did:example:user1', birthDate: '1990-05-15', birthPlace: 'Berlin', registrationNumber: 'STAN-1990-123456' },
    status: 'active',
    visual: { title: 'Birth Certificate', description: 'Geburtsurkunde', gradientKey: 'blue' },
  },
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-001',
    credentialId: 'urn:uuid:11111111-0001-0000-0000-000000000001',
    credentialName: 'National ID Card',
    action: 'PRESENTED',
    institution: 'Berlin Airport Security',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-002',
    credentialId: 'urn:uuid:11111111-0006-0000-0000-000000000006',
    credentialName: 'Health Insurance',
    action: 'PRESENTED',
    institution: 'Charité Hospital Berlin',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-003',
    credentialId: 'urn:uuid:11111111-0004-0000-0000-000000000004',
    credentialName: 'University Degree',
    action: 'RECEIVED',
    institution: 'TU Berlin',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-004',
    credentialId: 'urn:uuid:11111111-0015-0000-0000-000000000015',
    credentialName: 'Parking Permit',
    action: 'REVOKED',
    institution: 'Senatsverwaltung Berlin',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-005',
    credentialId: 'urn:uuid:11111111-0003-0000-0000-000000000003',
    credentialName: "Driver's License",
    action: 'PRESENTED',
    institution: 'DEKRA Vehicle Inspection',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-006',
    credentialId: 'urn:uuid:11111111-0017-0000-0000-000000000017',
    credentialName: 'EHIC Card',
    action: 'RECEIVED',
    institution: 'KV Brandenburg',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_GRAPH_DATA: ActivityGraphPoint[] = [
  { day: 'Mon', value: 3 },
  { day: 'Tue', value: 5 },
  { day: 'Wed', value: 2 },
  { day: 'Thu', value: 6 },
  { day: 'Fri', value: 4 },
  { day: 'Sat', value: 8 },
  { day: 'Sun', value: 1 },
];
