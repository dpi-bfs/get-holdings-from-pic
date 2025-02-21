export type Consignment = {
  MaxCaseId: string;
  Material: string;
  TypePickupDropOff: string;
  MaterialType: string;
  Quantity: number;
  QuantityUnit: string;
};

export type ApplicationStatusHistory = {
  Title: number;
  ApplicationStatus: string;
  DateTime: string;
  ApplicationStatusItemId: number;
};

export type PermitCaseDetail = {
  SubmissionId: string;
  Instrument: string;
  ApplicationSubmissionDate: string;
  RequestedStartDate: string;
  RequestedEndDate: string;
  Consignments: Consignment[];
  ApplicationStatusHistory: ApplicationStatusHistory[];
};

